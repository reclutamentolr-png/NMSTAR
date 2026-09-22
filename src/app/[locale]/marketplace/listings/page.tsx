import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from '@/components/LocalizedLink'
import { getTranslations } from 'next-intl/server'
import { getActiveListings, getFeaturedListings, getUserListings } from '@/lib/listings-server'
import { CATEGORY_ICONS, CATEGORY_I18N_KEYS, ALL_LISTING_CATEGORIES, type ListingCategory } from '@/lib/listings'
import { deleteListingAction, republishListingAction } from '@/app/actions/listings'
import { ArrowLeft, Plus, Tag, User, Trash2, Eye, Calendar, RefreshCw, Sparkles } from 'lucide-react'
import ListingForm from '@/components/ListingForm'
import ContactListingButton from '@/components/ContactListingButton'
import ChatModalWrapper from '@/components/ChatModalWrapper'
import ListingImageThumbnail from '@/components/ListingImageThumbnail'
import FeatureListingButton from '@/components/FeatureListingButton'
import ListingDetailButton from '@/components/ListingDetailButton'
import ListingDetailModalWrapper from '@/components/ListingDetailModalWrapper'
import EditListingButton from '@/components/EditListingButton'
import EditListingModalWrapper from '@/components/EditListingModalWrapper'
import ReportListingButton from '@/components/ReportListingButton'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function ListingsPage({
  params,
  searchParams 
}: { 
  params: Promise<{ locale: string }>
  searchParams: Promise<{ category?: string; showForm?: string }>
}) {
  const { locale } = await params
  const { category, showForm } = await searchParams
  const t = await getTranslations('marketplace')
  const commonT = await getTranslations('common')
  
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('daily_points, network_points, first_name, last_name')
    .eq('id', user.id)
    .single()

  const { data: showcaseSettings } = await supabase
    .from('system_settings')
    .select('key, value')
    .in('key', ['listing_feature_cost_7d', 'listing_feature_cost_15d'])
  const parseSetting = (key: string, fallback: number) => {
    const raw = showcaseSettings?.find((s) => s.key === key)?.value
    if (!raw) return fallback
    const parsed = parseInt(JSON.parse(raw), 10)
    return Number.isFinite(parsed) ? parsed : fallback
  }
  const featureCost7d = parseSetting('listing_feature_cost_7d', 20)
  const featureCost15d = parseSetting('listing_feature_cost_15d', 35)

  const allListings = await getActiveListings({
    category: (category as ListingCategory) || undefined,
    excludeFeatured: true
  })

  const featuredListings = await getFeaturedListings({
    category: (category as ListingCategory) || undefined
  })

  const myListings = await getUserListings(user.id)
  const now = new Date().getTime()

  const getCategoryLabel = (cat: ListingCategory) => t(CATEGORY_I18N_KEYS[cat] || 'catServizi')
  const totalActiveListings = allListings.length + featuredListings.length

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-[var(--gold-pale)]">
      {/* Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-gray-600 hover:text-[var(--gold)] transition-colors font-medium"
          >
            <ArrowLeft className="w-5 h-5" />
            {commonT('backToDashboard')}
          </Link>
          <div className="flex items-center gap-2">
            <div className="bg-gradient-to-br from-yellow-500 to-orange-500 p-2 rounded-lg">
              <Tag className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold text-gray-800">{t('listings')}</h1>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Info Punti + CTA */}
        <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-2xl p-6 mb-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-1 flex flex-wrap items-baseline gap-x-4 gap-y-1">
                <span>{t('myPoints')} <span className="text-yellow-600">{profile?.daily_points || 0}</span></span>
                <span>{t('myNetworkPoints')} <span className="text-amber-600">{profile?.network_points || 0}</span></span>
              </h2>
              <p className="text-gray-600 text-sm">
                {t('listingCostDesc')}
              </p>
              <p className="text-gray-600 text-sm mt-1">
                {t('listingValidityNotice')}
              </p>
              <p className="text-gray-600 text-sm mt-1">
                {t('networkPointsForShowcaseHint')}
              </p>
            </div>
            <Link
              href="/marketplace/listings?showForm=true"
              className="inline-flex items-center gap-2 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white px-6 py-3 rounded-lg font-bold shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="w-5 h-5" />
              {t('newListing')}
            </Link>
          </div>
        </div>

        {/* Form Creazione (se richiesto) */}
        {showForm === 'true' && (
          <ListingForm
            userId={user.id}
            currentPoints={profile?.daily_points || 0}
            onCloseUrl="/marketplace/listings"
            networkPoints={profile?.network_points || 0}
            featureCost7d={featureCost7d}
            featureCost15d={featureCost15d}
          />
        )}

        {/* Filtri Categoria */}
        <div className="flex flex-wrap gap-2 mb-6">
          <Link
            href="/marketplace/listings"
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              !category
                ? 'bg-[var(--ink)] text-white shadow-md'
                : 'bg-white text-gray-700 border border-gray-200 hover:border-[var(--gold)]/50'
            }`}
          >
            {t('allListings', { count: totalActiveListings })}
          </Link>
          {ALL_LISTING_CATEGORIES.map((cat) => {
            const count = allListings.filter(l => l.category === cat).length + featuredListings.filter(l => l.category === cat).length
            return (
              <Link
                key={cat}
                href={`/marketplace/listings?category=${cat}`}
                className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
                  category === cat
                    ? 'bg-[var(--ink)] text-white shadow-md'
                    : 'bg-white text-gray-700 border border-gray-200 hover:border-[var(--gold)]/50'
                }`}
              >
                <span>{CATEGORY_ICONS[cat]}</span>
                {getCategoryLabel(cat)} ({count})
              </Link>
            )
          })}
        </div>

        {/* I Miei Annunci */}
        {myListings.length > 0 && (
          <section className="mb-10">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Eye className="w-5 h-5 text-[var(--gold)]" />
              {t('myListings', { count: myListings.length })}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {myListings.map((listing: any) => {
                const isExpired = new Date(listing.expires_at).getTime() < now
                const isFeatured = listing.featured_until && new Date(listing.featured_until).getTime() > now
                return (
                  <div
                    key={listing.id}
                    className={`bg-white rounded-xl border-2 p-5 shadow-sm ${isExpired ? 'border-gray-200 opacity-75' : 'border-[var(--gold)]/30'}`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <span className="text-xs font-bold bg-[var(--gold-pale)] text-[var(--ink)] px-2 py-1 rounded">
                        {CATEGORY_ICONS[listing.category as ListingCategory]} {getCategoryLabel(listing.category as ListingCategory)}
                      </span>
                      <span className="text-xs text-gray-500">
                        <Calendar className="w-3 h-3 inline mr-1" />
                        {new Date(listing.created_at).toLocaleDateString(locale)}
                      </span>
                    </div>
                    {isExpired && (
                      <span className="inline-block text-[10px] font-bold uppercase tracking-wide bg-red-100 text-red-600 px-2 py-0.5 rounded-full mb-2">
                        {t('listingUnpublished')}
                      </span>
                    )}
                    {isFeatured && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full mb-2">
                        <Sparkles className="w-2.5 h-2.5" />
                        {t('showcaseUntil', { date: new Date(listing.featured_until).toLocaleDateString(locale) })}
                      </span>
                    )}
                    <ListingDetailButton listing={listing} isOwn={true} className="text-left w-full">
                      <h3 className="font-bold text-gray-900 mb-2 hover:text-[var(--gold)] transition-colors">{listing.title}</h3>
                    </ListingDetailButton>
                    <p className="text-sm text-gray-600 line-clamp-2 mb-3">{listing.description}</p>
                    {listing.price && (
                      <p className="text-lg font-bold text-green-600 mb-2">{'\u20ac'}{listing.price}</p>
                    )}
                    <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                      <span className="text-xs text-gray-500">
                        {isExpired ? t('expiredOn') : t('expires')}: {new Date(listing.expires_at).toLocaleDateString(locale)}
                      </span>
                      <div className="flex items-center gap-3">
                        {isExpired && (
                          <form action={async () => {
                            'use server'
                            await republishListingAction(listing.id)
                          }}>
                            <button type="submit" className="text-green-600 hover:text-green-800 text-xs font-bold flex items-center gap-1">
                              <RefreshCw className="w-3 h-3" /> {t('publish')}
                            </button>
                          </form>
                        )}
                        <EditListingButton listing={listing} />
                        <form action={async () => {
                          'use server'
                          await deleteListingAction(listing.id, user.id)
                        }}>
                          <button type="submit" className="text-red-500 hover:text-red-700 text-xs flex items-center gap-1">
                            <Trash2 className="w-3 h-3" /> {commonT('delete')}
                          </button>
                        </form>
                      </div>
                    </div>
                    {!isExpired && !isFeatured && (
                      <FeatureListingButton listingId={listing.id} cost7d={featureCost7d} cost15d={featureCost15d} />
                    )}
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* In Vetrina */}
        {featuredListings.length > 0 && (
          <section className="mb-10">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500" />
              {t('showcaseSection', { count: featuredListings.length })}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {featuredListings.map((listing: any) => (
                <article
                  key={listing.id}
                  className="bg-gradient-to-br from-amber-50 to-white rounded-xl border-2 border-amber-300 p-5 shadow-md hover:shadow-lg transition-shadow flex flex-col relative"
                >
                  <span className="absolute -top-2.5 left-4 inline-flex items-center gap-1 rounded-full bg-amber-500 text-white text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 shadow">
                    <Sparkles className="w-3 h-3" /> {t('showcaseBadge')}
                  </span>
                  {listing.image_url && (
                    <ListingImageThumbnail src={listing.image_url} alt={listing.title} />
                  )}
                  <div className="flex items-start justify-between mb-2 mt-1">
                    <span className="text-xs font-bold bg-white text-gray-700 px-2 py-1 rounded border border-amber-200">
                      {CATEGORY_ICONS[listing.category as ListingCategory]} {getCategoryLabel(listing.category as ListingCategory)}
                    </span>
                    {listing.price && (
                      <span className="text-sm font-bold text-green-600">{'€'}{listing.price}</span>
                    )}
                  </div>
                  <ListingDetailButton
                    listing={listing}
                    isOwn={listing.user_id === user.id}
                    authorName={listing.profiles?.first_name}
                    className="text-left"
                  >
                    <h3 className="font-bold text-gray-900 mb-2 line-clamp-1 hover:text-amber-600 transition-colors">{listing.title}</h3>
                  </ListingDetailButton>
                  <p className="text-sm text-gray-600 line-clamp-3 mb-3 flex-1">{listing.description}</p>

                  <div className="pt-3 border-t border-amber-100 mt-auto">
                    <div className="flex items-center gap-2 text-xs text-gray-600 mb-3">
                      <User className="w-3 h-3" />
                      <span>{listing.profiles?.first_name}</span>
                    </div>

                    {listing.user_id === user.id ? (
                      <div className="w-full py-2 bg-green-50 border border-green-200 text-green-700 text-sm font-semibold rounded-lg flex items-center justify-center gap-1.5">
                        <Tag className="w-4 h-4" />
                        {t('myListing')}
                      </div>
                    ) : (
                      <>
                        <ContactListingButton
                          listingId={listing.id}
                          listingTitle={listing.title}
                          listingCategory={listing.category}
                          listingPrice={listing.price}
                          listingDescription={listing.description}
                          receiverId={listing.user_id}
                          authorName={listing.profiles?.first_name}
                        />
                        <ReportListingButton listingId={listing.id} />
                      </>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {/* Annunci della Community */}
        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-4">
            {t('allListings', { count: totalActiveListings })}
          </h2>

          {allListings.length === 0 && featuredListings.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <Tag className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-gray-700 mb-2">{t('noListingsYet')}</h3>
              <p className="text-gray-500">{t('beFirstListing')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {allListings.map((listing: any) => (
                <article key={listing.id} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col">
                  {listing.image_url && (
                    <ListingImageThumbnail src={listing.image_url} alt={listing.title} />
                  )}
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-xs font-bold bg-gray-100 text-gray-700 px-2 py-1 rounded">
                      {CATEGORY_ICONS[listing.category as ListingCategory]} {getCategoryLabel(listing.category as ListingCategory)}
                    </span>
                    {listing.price && (
                      <span className="text-sm font-bold text-green-600">{'\u20ac'}{listing.price}</span>
                    )}
                  </div>
                  <ListingDetailButton
                    listing={listing}
                    isOwn={listing.user_id === user.id}
                    authorName={listing.profiles?.first_name}
                    className="text-left"
                  >
                    <h3 className="font-bold text-gray-900 mb-2 line-clamp-1 hover:text-[var(--gold)] transition-colors">{listing.title}</h3>
                  </ListingDetailButton>
                  <p className="text-sm text-gray-600 line-clamp-3 mb-3 flex-1">{listing.description}</p>

                  <div className="pt-3 border-t border-gray-100 mt-auto">
                    <div className="flex items-center gap-2 text-xs text-gray-600 mb-3">
                      <User className="w-3 h-3" />
                      <span>{listing.profiles?.first_name}</span>
                    </div>

                    {listing.user_id === user.id ? (
                      <div className="w-full py-2 bg-green-50 border border-green-200 text-green-700 text-sm font-semibold rounded-lg flex items-center justify-center gap-1.5">
                        <Tag className="w-4 h-4" />
                        {t('myListing')}
                      </div>
                    ) : (
                      <>
                        <ContactListingButton
                          listingId={listing.id}
                          listingTitle={listing.title}
                          listingCategory={listing.category}
                          listingPrice={listing.price}
                          listingDescription={listing.description}
                          receiverId={listing.user_id}
                          authorName={listing.profiles?.first_name}
                        />
                        <ReportListingButton listingId={listing.id} />
                      </>
                    )}

                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>

      <ChatModalWrapper userId={user.id} />
      <ListingDetailModalWrapper />
      <EditListingModalWrapper />
    </div>
  )
}