import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from '@/components/LocalizedLink'
import { getUserConversations } from '@/lib/listings-server'
import { ArrowLeft, MessageCircle } from 'lucide-react'
import ChatModalWrapper from '@/components/ChatModalWrapper'
import ConversationItem from '@/components/ConversationItem' // ✅ Import del componente client separato

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function ChatInboxPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const conversations = await getUserConversations(user.id)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <Link href="/dashboard" className="flex items-center gap-2 text-gray-600 hover:text-indigo-600 transition-colors font-medium">
            <ArrowLeft className="w-5 h-5" />
            Torna alla Dashboard
          </Link>
          <div className="flex items-center gap-2">
            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-2 rounded-lg">
              <MessageCircle className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold text-gray-800">I miei Messaggi</h1>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {conversations.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <MessageCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Nessun messaggio</h3>
            <p className="text-gray-500 mb-6">Non hai ancora ricevuto o inviato messaggi.</p>
            <Link href="/marketplace/listings" className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg font-semibold transition-all">
              Vai alla Bacheca Annunci
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {conversations.map((conv: any) => (
              <ConversationItem 
                key={conv.key}
                convKey={conv.key}
                listingId={conv.listingId}
                listingTitle={conv.listingTitle}
                otherUserId={conv.otherUserId}
                otherUserName={conv.otherUserName}
                lastMessage={conv.lastMessage}
                unreadCount={conv.unreadCount}
                currentUserId={user.id} 
              />
            ))}
          </div>
        )}
      </main>

      {/* Wrapper per aprire la chat modale */}
      <ChatModalWrapper userId={user.id} />
    </div>
  )
}