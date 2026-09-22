'use client'

import { useState, useEffect } from 'react'
import ListingDetailModal from '@/components/ListingDetailModal'

export default function ListingDetailModalWrapper() {
  const [open, setOpen] = useState(false)
  const [listing, setListing] = useState<any>(null)
  const [authorName, setAuthorName] = useState<string | undefined>(undefined)
  const [isOwn, setIsOwn] = useState(false)

  useEffect(() => {
    const handleOpen = (event: CustomEvent) => {
      setListing(event.detail.listing)
      setAuthorName(event.detail.authorName)
      setIsOwn(event.detail.isOwn)
      setOpen(true)
    }
    // "Contatta l'autore" inside this popup opens the chat modal via its own
    // openChat event — without this, both overlays stacked and the chat was
    // unreachable until this one was closed manually.
    const handleOpenChat = () => setOpen(false)

    window.addEventListener('openListingDetail', handleOpen as EventListener)
    window.addEventListener('openChat', handleOpenChat)
    return () => {
      window.removeEventListener('openListingDetail', handleOpen as EventListener)
      window.removeEventListener('openChat', handleOpenChat)
    }
  }, [])

  if (!open || !listing) return null

  return (
    <ListingDetailModal
      isOpen={open}
      onClose={() => setOpen(false)}
      listing={listing}
      authorName={authorName}
      isOwn={isOwn}
    />
  )
}
