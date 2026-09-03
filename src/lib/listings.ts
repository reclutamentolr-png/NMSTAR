// src/lib/listings.ts
export const LISTING_COST = 10

export type ListingCategory = 'servizi' | 'prodotti' | 'collaborazioni' | 'eventi'

export interface CreateListingData {
  userId: string
  title: string
  description: string
  category: ListingCategory
  price?: number
  imageUrl?: string
  contactEmail?: string
  contactPhone?: string
}

export const CATEGORY_LABELS: Record<ListingCategory, string> = {
  servizi: 'Servizi',
  prodotti: 'Prodotti',
  collaborazioni: 'Collaborazioni',
  eventi: 'Eventi'
}

export const CATEGORY_ICONS: Record<ListingCategory, string> = {
  servizi: '💼',
  prodotti: '🛍️',
  collaborazioni: '🤝',
  eventi: '🎉'
}