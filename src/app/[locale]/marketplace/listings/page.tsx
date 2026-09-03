import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from '@/components/LocalizedLink'
import { getActiveListings, getUserListings } from '@/lib/listings-server'
import { CATEGORY_LABELS, CATEGORY_ICONS, type ListingCategory } from '@/lib/listings'
import { deleteListingAction } from '@/app/actions/listings'
import { ArrowLeft, Plus, Calendar, Tag, User, Trash2, Eye } from 'lucide-react'
import ListingForm from '@/components/ListingForm'
import ContactListingButton from '@/components/ContactListingButton'
import ChatModalWrapper from '@/components/ChatModalWrapper'

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
  
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('daily_points, first_name, last_name')
    .eq('id', user.id)
    .single()

  const allListings = await getActiveListings({
    category: (category as ListingCategory) || undefined
  })
  
  const myListings = await getUserListings(user.id)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <Link 
            href="/dashboard" 
            className="flex items-center gap-2 text-gray-600 hover:text-indigo-600 transition-colors font-medium"
          >
            <ArrowLeft className="w-5 h-5" />
            Torna alla Dashboard
          </Link>
          <div className="flex items-center gap-2">
            <div className="bg-gradient-to-br from-yellow-500 to-orange-500 p-2 rounded-lg">
              <Tag className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold text-gray-800">Bacheca Annunci</h1>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Info Punti + CTA */}
        <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-2xl p-6 mb-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-1">
                I tuoi punti: <span className="text-yellow-600">{profile?.daily_points || 0}</span>
              </h2>
              <p className="text-gray-600 text-sm">
                Ogni annuncio costa <strong>10 punti</strong> (10 accessi giornalieri). 
                Più accedi, più annunci puoi pubblicare!
              </p>
            </div>
            <Link
              href="/marketplace/listings?showForm=true"
              className="inline-flex items-center gap-2 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white px-6 py-3 rounded-lg font-bold shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="w-5 h-5" />
              Nuovo Annuncio (10 punti)
            </Link>
          </div>
        </div>

        {/* Form Creazione (se richiesto) */}
        {showForm === 'true' && (
          <ListingForm 
            userId={user.id} 
            currentPoints={profile?.daily_points || 0}
            onCloseUrl="/marketplace/listings"
          />
        )}

        {/* Filtri Categoria */}
        <div className="flex flex-wrap gap-2 mb-6">
          <Link
            href="/marketplace/listings"
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              !category 
                ? 'bg-indigo-600 text-white shadow-md' 
                : 'bg-white text-gray-700 border border-gray-200 hover:border-indigo-300'
            }`}
          >
            Tutti ({allListings.length})
          </Link>
          {(['servizi', 'prodotti', 'collaborazioni', 'eventi'] as ListingCategory[]).map((cat) => {
            const count = allListings.filter(l => l.category === cat).length
            return (
              <Link
                key={cat}
                href={`/marketplace/listings?category=${cat}`}
                className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
                  category === cat
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'bg-white text-gray-700 border border-gray-200 hover:border-indigo-300'
                }`}
              >
                <span>{CATEGORY_ICONS[cat]}</span>
                {CATEGORY_LABELS[cat]} ({count})
              </Link>
            )
          })}
        </div>

        {/* I Miei Annunci */}
        {myListings.length > 0 && (
          <section className="mb-10">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Eye className="w-5 h-5 text-indigo-600" />
              I tuoi annunci ({myListings.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {myListings.map((listing: any) => (
                <div key={listing.id} className="bg-white rounded-xl border-2 border-indigo-200 p-5 shadow-sm">
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-xs font-bold bg-indigo-100 text-indigo-700 px-2 py-1 rounded">
                      {CATEGORY_ICONS[listing.category as ListingCategory]} {CATEGORY_LABELS[listing.category as ListingCategory]}
                    </span>
                    <span className="text-xs text-gray-500">
                      <Calendar className="w-3 h-3 inline mr-1" />
                      {new Date(listing.created_at).toLocaleDateString('it-IT')}
                    </span>
                  </div>
                  <h3 className="font-bold text-gray-900 mb-2">{listing.title}</h3>
                  <p className="text-sm text-gray-600 line-clamp-2 mb-3">{listing.description}</p>
                  {listing.price && (
                    <p className="text-lg font-bold text-green-600 mb-2">€{listing.price}</p>
                  )}
                  <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                    <span className="text-xs text-gray-500">
                      Scade: {new Date(listing.expires_at).toLocaleDateString('it-IT')}
                    </span>
                    <form action={async () => {
                      'use server'
                      await deleteListingAction(listing.id, user.id)
                    }}>
                      <button type="submit" className="text-red-500 hover:text-red-700 text-xs flex items-center gap-1">
                        <Trash2 className="w-3 h-3" /> Elimina
                      </button>
                    </form>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Annunci della Community */}
        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-4">
            Annunci della Community ({allListings.length})
          </h2>
          
          {allListings.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <Tag className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-gray-700 mb-2">Nessun annuncio ancora</h3>
              <p className="text-gray-500">Sii il primo a pubblicare un annuncio nella community!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {allListings.map((listing: any) => (
                <article key={listing.id} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col">
                  {listing.image_url && (
                    <div className="mb-3 rounded-lg overflow-hidden h-40 bg-gray-100">
                      <img 
                        src={listing.image_url} 
                        alt={listing.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-xs font-bold bg-gray-100 text-gray-700 px-2 py-1 rounded">
                      {CATEGORY_ICONS[listing.category as ListingCategory]} {CATEGORY_LABELS[listing.category as ListingCategory]}
                    </span>
                    {listing.price && (
                      <span className="text-sm font-bold text-green-600">€{listing.price}</span>
                    )}
                  </div>
                  <h3 className="font-bold text-gray-900 mb-2 line-clamp-1">{listing.title}</h3>
                  <p className="text-sm text-gray-600 line-clamp-3 mb-3 flex-1">{listing.description}</p>
                  
                                    {/* ✅ SEZIONE CONTATTI: badge "Il tuo annuncio" se sei l'autore, altrimenti pulsante Contatta */}
                  <div className="pt-3 border-t border-gray-100 mt-auto">
                    <div className="flex items-center gap-2 text-xs text-gray-600 mb-3">
                      <User className="w-3 h-3" />
                      <span>{listing.profiles?.first_name} {listing.profiles?.last_name}</span>
                    </div>
                    
                    {listing.user_id === user.id ? (
                      /* ✅ Se è un nostro annuncio, mostriamo il badge verde */
                      <div className="w-full py-2 bg-green-50 border border-green-200 text-green-700 text-sm font-semibold rounded-lg flex items-center justify-center gap-1.5">
                        <Tag className="w-4 h-4" />
                        Il tuo annuncio
                      </div>
                    ) : (
                      /* ✅ Se è di un altro utente, mostriamo il pulsante Contatta */
                      <ContactListingButton 
                        listingId={listing.id}
                        listingTitle={listing.title}
                        listingCategory={listing.category}
                        listingPrice={listing.price}
                        listingDescription={listing.description}
                        receiverId={listing.user_id}
                        authorName={`${listing.profiles?.first_name} ${listing.profiles?.last_name}`}
                      />
                    )}

                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
      
      {/* ✅ CHAT MODAL WRAPPER per la pagina Listings */}
      <ChatModalWrapper userId={user.id} />
    </div>
  )
}