'use client'

import { MessageCircle } from 'lucide-react'


export default function ContactListingButton({ 
  listingId,
  listingTitle,
  listingCategory,
  listingPrice,
  listingDescription,
  receiverId,
  authorName 
}: { 
  listingId: string
  listingTitle: string
  listingCategory: string
  listingPrice?: number
  listingDescription: string
  receiverId: string
  authorName: string
}) {
  // ✅ L'onClick è gestito INTERNAMENTE, non passato come prop
  const handleClick = () => {
    const listing = {
      id: listingId,
      title: listingTitle,
      category: listingCategory,
      price: listingPrice,
      description: listingDescription,
      user_id: receiverId,
      profiles: {
        first_name: authorName.split(' ')[0],
        last_name: authorName.split(' ')[1] || ''
      }
    }
    
    window.dispatchEvent(new CustomEvent('openChat', { 
      detail: { listing, receiverId } 
    }))
  }

  return (
    <button
      onClick={handleClick}
      className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-1"
    >
      <MessageCircle className="w-4 h-4" />
      Contatta l'autore
    </button>
  )
}