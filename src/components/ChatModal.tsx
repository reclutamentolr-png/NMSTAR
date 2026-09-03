'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { X, Send, MessageCircle } from 'lucide-react'
import { markMessagesAsRead } from '@/app/actions/listings'

type ChatModalProps = {
  isOpen: boolean
  onClose: () => void
  listing: any
  currentUserId: string
  receiverId: string
}

export default function ChatModal({ isOpen, onClose, listing, currentUserId, receiverId }: ChatModalProps) {
  const [messages, setMessages] = useState<any[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

        useEffect(() => {
    if (isOpen && listing) {
      loadMessages()
      markMessagesAsRead(currentUserId, receiverId, listing.id !== 'direct' ? listing.id : undefined)

      // ✅ ASCOLTO IN TEMPO REALE (Supabase Realtime)
      const channelName = `chat-${currentUserId}-${receiverId}-${listing.id || 'direct'}`
      const channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `sender_id=eq.${receiverId}`
          },
          (payload) => {
            // Aggiungi il nuovo messaggio alla lista
            setMessages((prev) => [...prev, payload.new])
            
            // ✅ SUONO BASE64 (Un "ding" leggero e professionale, funziona sempre)
            const base64Sound = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQQAAAAAAA==' // Placeholder corto, usa quello sotto per un suono reale
            
            // Suono "Pop" reale e piacevole (Base64)
            const audio = new Audio("data:audio/mp3;base64,SUQzBAAAAAABAFRYWFgAAAASAAADbWFqb3JfYnJhbmQAbXA0MgBUWFhYAAAAEQAAA21pbm9yX3ZlcnNpb24AMABUWFhYAAAAHAAAA2NvbXBhdGlibGVfYnJhbmRzAGlzb21tcDQyAFRTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//uQZAAAAAAAABAAAAAAAAAAAAAA//uQZAAAAAAAABAAAAAAAAAAAAAA//uQZAAAAAAAABAAAAAAAAAAAAAA//uQZAAAAAAAABAAAAAAAAAAAAAA") 
            // Nota: Il base64 sopra è troncato per brevità. Usa questo URL affidabile di un suono breve, o meglio, crea un oggetto Audio con un URL locale in /public
            
            // METODO MIGLIORE: Usa un file locale
            const notificationSound = new Audio('/notification.mp3') 
            notificationSound.volume = 0.4
            
            // Tenta di riprodurre. Se fallisce (es. blocco browser), non crasha
            notificationSound.play().catch((e) => {
              console.log('Audio bloccato dal browser (richiesta interazione utente):', e)
            })
          }
        )
        .subscribe()

      return () => {
        supabase.removeChannel(channel)
      }
    }
  }, [isOpen, listing, currentUserId, receiverId])

  const loadMessages = async () => {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('listing_id', listing.id)
      .or(`sender_id.eq.${currentUserId},receiver_id.eq.${currentUserId}`)
      .order('created_at', { ascending: true })
    
    setMessages(data || [])
  }

  const sendMessage = async () => {
    if (!newMessage.trim()) return
    
    setLoading(true)
    const { error } = await supabase.from('messages').insert({
      sender_id: currentUserId,
      receiver_id: receiverId,
      listing_id: listing.id,
      content: newMessage.trim()
    })
    
    if (!error) {
      setNewMessage('')
      loadMessages()
    }
    setLoading(false)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <div>
            <h3 className="text-xl font-bold text-gray-900">Contatta {listing.profiles?.first_name}</h3>
            <p className="text-sm text-gray-600">Annuncio: {listing.title}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Messaggi */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Nessun messaggio ancora. Inizia la conversazione!</p>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.sender_id === currentUserId ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[70%] p-3 rounded-lg ${
                    msg.sender_id === currentUserId
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  <p className="text-sm">{msg.content}</p>
                  <p className={`text-xs mt-1 ${msg.sender_id === currentUserId ? 'text-indigo-200' : 'text-gray-500'}`}>
                    {new Date(msg.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Input */}
        <div className="p-6 border-t border-gray-200">
          <div className="flex gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Scrivi un messaggio..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
            <button
              onClick={sendMessage}
              disabled={loading || !newMessage.trim()}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
              Invia
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}