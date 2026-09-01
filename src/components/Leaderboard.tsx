'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Trophy, Medal, Award, Crown, TrendingUp } from 'lucide-react'

type LeaderboardProps = {
  currentUserId: string
}

type LeaderboardEntry = {
  id: string
  first_name: string
  last_name: string
  referral_code: string
  downline_count: number
}

export default function Leaderboard({ currentUserId }: LeaderboardProps) {
  const [allEntries, setAllEntries] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [userRank, setUserRank] = useState<number | null>(null)
  const [viewMode, setViewMode] = useState<'top10' | 'top100'>('top10')
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    loadLeaderboard()
  }, [currentUserId])

  const loadLeaderboard = async () => {
    setLoading(true)
    setError(null)
    try {
      console.log('🔍 Inizio caricamento leaderboard...')

      // 1. Recupera tutti i profili
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, referral_code')
      
      console.log(' Profili trovati:', profiles?.length, 'Errore:', profilesError)

      // 2. Recupera tutti i nodi della matrice
      const { data: allNodes, error: nodesError } = await supabase
        .from('matrix_nodes')
        .select('id, user_id, path')

      console.log('🌳 Nodi matrice trovati:', allNodes?.length)
      console.log('🌳 Errore nodi:', nodesError)

      if (profilesError) {
        console.error('❌ Errore profili:', profilesError)
        setError(`Errore profili: ${profilesError.message}`)
        return
      }

      if (nodesError) {
        console.error('❌ Errore nodi dettagliato:', nodesError)
        setError(`Errore matrice: ${nodesError.message} (Code: ${nodesError.code})`)
        return
      }

      if (!profiles || profiles.length === 0) {
        setError('Nessun profilo trovato nel database')
        return
      }

      if (!allNodes || allNodes.length === 0) {
        setError('Nessun nodo nella matrice. Verifica che gli utenti abbiano nodi creati.')
        return
      }

      // Crea una mappa user_id -> path
      const userPathMap = new Map<string, string>()
      allNodes.forEach(node => {
        if (node.user_id && node.path) {
          userPathMap.set(node.user_id, node.path)
        }
      })

      console.log('🗺️ Mappa user->path creata con', userPathMap.size, 'utenti')

      // Calcola la downline per ogni profilo
      const entriesWithCount: LeaderboardEntry[] = profiles.map(profile => {
        const userPath = userPathMap.get(profile.id)
        let downlineCount = 0

        if (userPath) {
          const prefix = userPath + '.'
          downlineCount = allNodes.filter(node => node.path?.startsWith(prefix)).length
        }

        return {
          id: profile.id,
          first_name: profile.first_name,
          last_name: profile.last_name,
          referral_code: profile.referral_code,
          downline_count: downlineCount
        }
      })

      // Ordina per downline count decrescente
      const sorted = entriesWithCount.sort((a, b) => {
        if (b.downline_count !== a.downline_count) {
          return b.downline_count - a.downline_count
        }
        return (a.first_name || '').localeCompare(b.first_name || '')
      })

      console.log('🏆 Classifica ordinata:', sorted.slice(0, 5))

      setAllEntries(sorted)

      const rank = sorted.findIndex(e => e.id === currentUserId) + 1
      setUserRank(rank > 0 ? rank : null)
      console.log('👤 Tuo rank:', rank)
    } catch (error) {
      console.error(' Errore generico leaderboard:', error)
      setError('Errore imprevisto nel caricamento')
    } finally {
      setLoading(false)
    }
  }

  const displayedEntries = viewMode === 'top10' ? allEntries.slice(0, 10) : allEntries.slice(0, 100)

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown className="w-5 h-5 text-yellow-500" />
    if (rank === 2) return <Medal className="w-5 h-5 text-gray-400" />
    if (rank === 3) return <Award className="w-5 h-5 text-amber-600" />
    return <span className="w-5 h-5 flex items-center justify-center text-sm font-bold text-gray-500">{rank}</span>
  }

  const getRankBg = (rank: number) => {
    if (rank === 1) return 'bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-200'
    if (rank === 2) return 'bg-gradient-to-r from-gray-50 to-slate-50 border-gray-200'
    if (rank === 3) return 'bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200'
    return 'bg-white border-gray-200'
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-3">
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Trophy className="w-6 h-6 text-yellow-500" />
          Classifica
        </h2>
        
        <div className="flex items-center gap-3">
          {userRank && (
            <div className="flex items-center gap-1 text-sm text-indigo-600 font-medium bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
              <TrendingUp className="w-4 h-4" />
              Sei #{userRank}
            </div>
          )}
          
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('top10')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                viewMode === 'top10' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Top 10
            </button>
            <button
              onClick={() => setViewMode('top100')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                viewMode === 'top100' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Top 100
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">
          <strong>Errore:</strong> {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-8 text-gray-500 flex flex-col items-center gap-2">
          <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <span>Caricamento classifica...</span>
        </div>
      ) : displayedEntries.length === 0 ? (
        <div className="text-center py-8 text-gray-500">Nessun dato disponibile</div>
      ) : (
        <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
          {displayedEntries.map((entry, index) => {
            const rank = index + 1
            const isCurrentUser = entry.id === currentUserId
            return (
              <div
                key={entry.id}
                className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                  isCurrentUser 
                    ? 'bg-indigo-50 border-indigo-300 shadow-sm ring-1 ring-indigo-200' 
                    : getRankBg(rank)
                }`}
              >
                <div className="flex-shrink-0 w-8 flex justify-center">
                  {getRankIcon(rank)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`font-semibold truncate ${isCurrentUser ? 'text-indigo-900' : 'text-gray-900'}`}>
                      {entry.first_name} {entry.last_name}
                    </span>
                    {isCurrentUser && (
                      <span className="text-[10px] bg-indigo-600 text-white px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
                        Tu
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 font-mono truncate">{entry.referral_code}</div>
                </div>
                <div className="flex-shrink-0 text-right">
                  <div className="text-lg font-bold text-gray-900">{entry.downline_count}</div>
                  <div className="text-[10px] text-gray-500 uppercase tracking-wide">Affiliati</div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}