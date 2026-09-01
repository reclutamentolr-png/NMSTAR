'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Swiper, SwiperSlide } from 'swiper/react'
import { Autoplay, Pagination, EffectFade } from 'swiper/modules'
import { Sparkles } from 'lucide-react'

// ✅ Importa gli stili CSS di Swiper (OBBLIGATORIO)
import 'swiper/css'
import 'swiper/css/pagination'
import 'swiper/css/effect-fade'

type User = {
  id: string
  first_name: string | null
  last_name: string | null
  referral_code: string | null
  country_code: string | null
  created_at: string
  username: string | null
}

export default function LatestUsersSwiper() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadUsers = async () => {
      try {
        const supabase = createClient()
        const { data, error } = await supabase.rpc('get_public_latest_users', {
          p_limit: 10,
        })

        if (error) {
          console.error('❌ Errore RPC:', error)
        } else {
          console.log('✅ Utenti caricati:', data?.length || 0)
          setUsers((data as User[]) || [])
        }
      } catch (err) {
        console.error('❌ Eccezione:', err)
      } finally {
        setLoading(false)
      }
    }

    loadUsers()
  }, [])

  if (loading) {
    return (
      <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-6 border border-white/10 w-full max-w-md mx-auto">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-5 h-5 text-yellow-400 animate-pulse" />
          <h3 className="text-lg font-bold text-white">Ultimi Entrati</h3>
        </div>
        <div className="h-32 bg-white/10 rounded-xl animate-pulse"></div>
      </div>
    )
  }

  if (users.length === 0) {
    return (
      <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-6 border border-white/10 w-full max-w-md mx-auto text-center">
        <p className="text-gray-400 text-sm">Nessun utente registrato</p>
      </div>
    )
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-4 sm:p-6 border border-white/10">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-5 h-5 text-yellow-400" />
          <h3 className="text-lg font-bold text-white">
            Ultimi Entrati ({users.length})
          </h3>
        </div>

        {/* ✅ SWIPER CAROUSEL con autoplay */}
        <Swiper
          modules={[Autoplay, Pagination, EffectFade]}
          spaceBetween={20}
          slidesPerView={1}
          autoplay={{
            delay: 3500,
            disableOnInteraction: false, // Continua anche dopo touch
            pauseOnMouseEnter: true,
          }}
          pagination={{
            clickable: true,
            dynamicBullets: true,
          }}
          effect="fade"
          fadeEffect={{ crossFade: true }}
          loop={users.length > 1}
          className="rounded-xl"
        >
          {users.map((user) => (
            <SwiperSlide key={user.id}>
              <div className="bg-gradient-to-br from-white/10 to-white/5 rounded-xl p-5 border border-white/10 hover:border-white/20 transition-all">
                <div className="flex items-center gap-4">
                  {/* Avatar grande */}
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0 shadow-lg ring-2 ring-white/20">
                    <span className="text-white font-bold text-2xl">
                      {user.first_name?.[0] || user.username?.[0] || 'U'}
                      {user.last_name?.[0] || ''}
                    </span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-white text-lg truncate">
                      {user.first_name} {user.last_name}
                    </p>
                    <p className="text-sm text-indigo-300 font-mono truncate">
                      {user.referral_code}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs text-gray-400 bg-white/10 px-2 py-0.5 rounded">
                        {user.country_code || 'IT'}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(user.created_at).toLocaleDateString('it-IT', {
                          day: '2-digit',
                          month: 'short',
                          year: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
      </div>
    </div>
  )
}