import { getTranslations } from 'next-intl/server'
import Link from '@/components/LocalizedLink'
import ContactListingButton from '@/components/ContactListingButton'
import ListingDetailButton from '@/components/ListingDetailButton'
import { Tag, ArrowRight, Plus } from 'lucide-react'
import { CATEGORY_ICONS, CATEGORY_I18N_KEYS, type ListingCategory } from '@/lib/listings'

// Shared by both dashboard layouts (Tipo 1 inline, Tipo 2 in the secondary
// row) so the community listings preview stays in one place.
export default async function CommunityPreview({ recentListings, userId }: { recentListings: any[]; userId: string }) {
  const t = await getTranslations('dashboard')
  const commonT = await getTranslations('common')
  const marketplaceT = await getTranslations('marketplace')

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Tag className="w-6 h-6 text-yellow-600" />
          {t('communityListings')}
        </h2>
        <div className="flex gap-3">
          <Link
            href="/marketplace/listings?showForm=true"
            className="text-sm font-semibold text-[var(--gold)] hover:text-[var(--ink)] flex items-center gap-1"
          >
            <Plus className="w-4 h-4" />
            {t('publishListing')}
          </Link>
          <Link href="/marketplace/listings" className="text-sm font-semibold text-[var(--gold)] hover:text-[var(--ink)] flex items-center gap-1">
            {t('viewAll')}
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {recentListings.length === 0 ? (
        <div className="bg-gradient-to-br from-yellow-50 to-orange-50 border-2 border-dashed border-yellow-300 rounded-xl p-8 text-center">
          <Tag className="w-12 h-12 text-yellow-400 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('noListings')}</h3>
          <p className="text-gray-600 text-sm mb-4">
            {t.rich('beFirst', { strong: (chunks) => <strong>{chunks}</strong> })}
          </p>
          <Link
            href="/marketplace/listings?showForm=true"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white px-5 py-2.5 rounded-lg font-semibold shadow-md hover:shadow-lg transition-all"
          >
            <Plus className="w-4 h-4" />
            {t('publishFirstListing')}
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {recentListings.map((listing: any) => (
            <div key={listing.id} className="bg-gradient-to-br from-gray-50 to-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold bg-yellow-100 text-yellow-700 px-2 py-1 rounded">
                  {CATEGORY_ICONS[listing.category as ListingCategory]}{' '}
                  {marketplaceT(CATEGORY_I18N_KEYS[listing.category as ListingCategory] || 'catServizi')}
                </span>
                {listing.price && <span className="text-sm font-bold text-green-600">€{listing.price}</span>}
              </div>
              <ListingDetailButton
                listing={listing}
                isOwn={listing.user_id === userId}
                authorName={listing.profiles?.first_name}
                className="text-left"
              >
                <h3 className="font-bold text-gray-900 mb-1 line-clamp-1 hover:text-[var(--gold)] transition-colors">{listing.title}</h3>
              </ListingDetailButton>
              <p className="text-xs text-gray-600 line-clamp-2 mb-2 flex-1">{listing.description}</p>
              <p className="text-xs text-gray-500 mb-3">
                {commonT('by')} {listing.profiles?.first_name}
              </p>

              {listing.user_id === userId ? (
                <div className="w-full py-2 bg-green-50 border border-green-200 text-green-700 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 whitespace-nowrap">
                  <Tag className="w-4 h-4 shrink-0" />
                  {t('yourListing')}
                </div>
              ) : (
                <ContactListingButton
                  listingId={listing.id}
                  listingTitle={listing.title}
                  listingCategory={listing.category}
                  listingPrice={listing.price}
                  listingDescription={listing.description}
                  receiverId={listing.user_id}
                  authorName={listing.profiles?.first_name}
                  compact
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
