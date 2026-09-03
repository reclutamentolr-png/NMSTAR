'use client'

import { useState } from 'react'
import { markMessagesAsRead, deleteConversationAction } from '@/app/actions/listings'
import { User, FileText, Trash2 } from 'lucide-react'

type ConversationItemProps = {
  convKey: string
  listingId: string | null
  listingTitle: string
  otherUserId: string
  otherUserName: string
  lastMessage: string
  unreadCount: number
  currentUserId: string
}

export default function ConversationItem({
  convKey,
  listingId,
  listingTitle,
  otherUserId,
  otherUserName,
  lastMessage,
  unreadCount,
  currentUserId
}: ConversationItemProps) {
  const [unread, setUnread] = useState(unreadCount)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleClick = async () => {
    if (isDeleting) return
    
    // 1. Segna come letto nel database
    if (unread > 0) {
      await markMessagesAsRead(currentUserId, otherUserId, listingId || undefined)
      setUnread(0) // Aggiorna visivamente subito
    }
    
    // 2. Notifica la Dashboard di aggiornare il conteggio totale
    window.dispatchEvent(new CustomEvent('refreshUnreadCount'))

    // 3. Apri la chat modale
    const listing = listingId ? { id: listingId, title: listingTitle, user_id: otherUserId } : null

    window.dispatchEvent(new CustomEvent('openChat', { 
      detail: { 
        listing: listing || { id: 'direct', title: 'Messaggio diretto', user_id: otherUserId }, 
        receiverId: otherUserId 
      } 
    }))
  }

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('Sei sicuro di voler eliminare questa conversazione?')) return
    
    setIsDeleting(true)
    await deleteConversationAction(currentUserId, otherUserId, listingId || undefined)
    
    // Notifica la pagina inbox di ricaricarsi
    window.dispatchEvent(new CustomEvent('refreshInbox'))
    setIsDeleting(false)
  }

  return (
    <div className={`relative bg-white rounded-xl border p-4 hover:shadow-md transition-all flex items-start gap-4 ${
      unread > 0 ? 'border-indigo-300 bg-indigo-50/30' : 'border-gray-200'
    }`}>
      {/* Area cliccabile principale */}
      <button onClick={handleClick} className="flex-1 flex items-start gap-4 text-left">
        <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
          unread > 0 ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-500'
        }`}>
          {listingId ? <FileText className="w-6 h-6" /> : <User className="w-6 h-6" />}
        </div>
        
        <div className="flex-1 min-w-0">
          {/* ✅ FIX SOVRAPPOSIZIONE: Usiamo flex per separare titolo/badge dal cestino */}
          <div className="flex justify-between items-start mb-1">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <h3 className={`font-semibold truncate ${unread > 0 ? 'text-gray-900' : 'text-gray-700'}`}>
                {listingTitle}
              </h3>
              {unread > 0 && (
                <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0">
                  {unread}
                </span>
              )}
            </div>
            
            {/* ✅ CESTINO: Ora è nel flusso flex, non in absolute, quindi non si sovrappone mai */}
            <button 
              onClick={handleDelete}
              disabled={isDeleting}
              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors flex-shrink-0 ml-2"
              title="Elimina conversazione"
            >
              <Trash2 className={`w-4 h-4 ${isDeleting ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <p className="text-sm text-gray-600 mb-1">{otherUserName}</p>
          <p className={`text-sm truncate ${unread > 0 ? 'text-gray-900 font-medium' : 'text-gray-500'}`}>
            {lastMessage}
          </p>
        </div>
      </button>
    </div>
  )
}