'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { User, TrendingUp } from 'lucide-react'

type NewUser = {
  id: string
  first_name: string
  last_name: string
  country_code: string
  created_at: string
}

export default function NewUsersCarousel() {
  const [users, setUsers] = useState<NewUser[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const supabase = createClient()

  useEffect(() => {
    loadNewUsers()
    
    // Auto-scroll ogni 4 secondi
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % users.length)
    }, 4000)

    return () => clearInterval(interval)
  }, [users.length])

  const loadNewUsers = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, country_code, created_at')
      .order('created_at', { ascending: false })
      .limit(10)
    
    if (data) setUsers(data)
  }

  if (users.length === 0) return null

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase()
  }

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
    
    if (diffInHours < 1) return 'Adesso'
    if (diffInHours < 24) return `${diffInHours}h fa`
    const diffInDays = Math.floor(diffInHours / 24)
    return `${diffInDays}g fa`
  }

  return (
    <div className="bg-white/5 backdrop-blur-lg rounded-2xl border border-white/10 p-6">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="w-5 h-5 text-green-400" />
        <h3 className="text-lg font-bold text-white">Ultimi Iscritti</h3>
      </div>

      <div className="relative h-32 overflow-hidden">
        <div 
          className="flex transition-transform duration-500 ease-in-out"
          style={{ transform: `translateX(-${currentIndex * 100}%)` }}
        >
          {users.map((user) => (
            <div key={user.id} className="w-full flex-shrink-0 px-2">
              <div className="bg-gradient-to-r from-indigo-500/20 to-purple-500/20 rounded-xl p-4 border border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg shadow-lg">
                    {getInitials(user.first_name, user.last_name)}
                  </div>
                  <div className="flex-1">
                    <div className="text-white font-semibold">
                      {user.first_name} {user.last_name}
                    </div>
                    <div className="text-sm text-gray-300 flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {user.country_code || 'Italia'}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-green-400 font-medium">
                      Nuovo membro
                    </div>
                    <div className="text-xs text-gray-400">
                      {getTimeAgo(user.created_at)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Indicatori */}
      <div className="flex justify-center gap-2 mt-4">
        {users.slice(0, 5).map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentIndex(index)}
            className={`w-2 h-2 rounded-full transition-all ${
              currentIndex === index ? 'bg-white w-6' : 'bg-white/30'
            }`}
          />
        ))}
      </div>
    </div>
  )
}