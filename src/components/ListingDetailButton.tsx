'use client'

export default function ListingDetailButton({
  listing,
  authorName,
  isOwn,
  className,
  children,
}: {
  listing: any
  authorName?: string
  isOwn: boolean
  className?: string
  children: React.ReactNode
}) {
  const handleClick = () => {
    window.dispatchEvent(
      new CustomEvent('openListingDetail', { detail: { listing, authorName, isOwn } })
    )
  }

  return (
    <button type="button" onClick={handleClick} className={className}>
      {children}
    </button>
  )
}
