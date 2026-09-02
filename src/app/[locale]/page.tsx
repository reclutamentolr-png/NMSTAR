import Link from '@/components/LocalizedLink'
import { useLocale } from 'next-intl'
import { Suspense } from 'react'
import { 
  Rocket, 
  Users, 
  TrendingUp, 
  Gift, 
  Globe, 
  Shield, 
  Zap,
  ArrowRight,
  CheckCircle2,
  Star,
  Trophy,
  Award,
  Target,
  Crown,
  Sparkles
} from 'lucide-react'
import LatestUsersRotating from '@/components/LatestUsersRotating'

export default function LandingPage() {
  const locale = useLocale()

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-900 to-purple-900 overflow-x-hidden">
      {/* Header */}
      <header className="bg-black/20 backdrop-blur-lg border-b border-white/10 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <Rocket className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <span className="text-lg sm:text-xl font-bold text-white">NMP</span>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-4">
            <Link 
              href="/login"
              className="text-white/80 hover:text-white font-medium transition-colors text-sm sm:text-base"
            >
              Accedi
            </Link>
            <Link 
              href="/register"
              className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-3 sm:px-6 py-1.5 sm:py-2 rounded-lg font-semibold transition-all shadow-lg hover:shadow-xl text-sm sm:text-base"
            >
              Inizia Ora
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/20 to-purple-600/20"></div>
        <div className="absolute inset-0 bg-[url('/hero-network.jpg')] bg-cover bg-center opacity-20"></div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20 lg:py-32">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium text-white mb-4 sm:mb-6 border border-white/20">
                <Trophy className="w-3 h-3 sm:w-4 sm:h-4 text-yellow-400" />
                La Piattaforma Italiana della Competizione Digitale
              </div>
              
              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold text-white mb-4 sm:mb-6 leading-tight break-words">
                Competi, Cresci e 
                <span className="bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent"> Vinci Premi Straordinari</span>
              </h1>
              
              <p className="text-base sm:text-xl text-gray-300 mb-6 sm:mb-8 leading-relaxed">
                Unisciti alla community di imprenditori digitali che ogni mese competono per vincere <strong className="text-white">un'automobile, scooter, viaggi e tanti altri premi</strong>. Più usi la piattaforma e più sali in classifica!
              </p>

              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-8 sm:mb-12">
                <Link 
                  href="/register"
                  className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-lg font-bold text-base sm:text-lg transition-all shadow-xl hover:shadow-2xl hover:scale-105 flex items-center justify-center gap-2"
                >
                  Entra in Competizione
                  <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
                </Link>
                <Link 
                  href="/login"
                  className="bg-white/10 hover:bg-white/20 backdrop-blur text-white px-6 sm:px-8 py-3 sm:py-4 rounded-lg font-bold text-base sm:text-lg transition-all border border-white/20 flex items-center justify-center"
                >
                  Accedi
                </Link>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-3 sm:gap-6">
                <div>
                  <div className="text-2xl sm:text-3xl font-bold text-white">10K+</div>
                  <div className="text-xs sm:text-sm text-gray-400">Competitor Attivi</div>
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-bold text-yellow-400">€50K+</div>
                  <div className="text-xs sm:text-sm text-gray-400">Premi Distribuiti</div>
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-bold text-white">50+</div>
                  <div className="text-xs sm:text-sm text-gray-400">Paesi</div>
                </div>
              </div>
            </div>

            {/* Carosello Ultimi Iscritti */}
            <div className="lg:pl-8 mt-8 lg:mt-0">
              <Suspense 
                fallback={
                  <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-6 border border-white/10 w-full">
                    <div className="flex items-center gap-2 mb-4">
                      <Star className="w-5 h-5 text-yellow-400 animate-pulse" />
                      <h3 className="text-lg font-bold text-white">Ultimi Entrati</h3>
                    </div>
                    <div className="h-24 bg-white/10 rounded-xl animate-pulse"></div>
                  </div>
                }
              >
                <LatestUsersRotating />
              </Suspense>
            </div>
          </div>
        </div>
      </section>

      {/* 🏆 SEZIONE: I PREMI IN PALIO */}
<section className="py-12 sm:py-20 bg-gradient-to-b from-black/40 to-transparent">
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div className="text-center mb-10 sm:mb-16">
      <div className="inline-flex items-center gap-2 bg-yellow-500/20 border border-yellow-500/30 px-4 py-1.5 rounded-full text-sm font-medium text-yellow-300 mb-4">
        <Crown className="w-4 h-4" />
        I Premi di Fine Anno
      </div>
      <h2 className="text-3xl sm:text-5xl font-bold text-white mb-4 break-words">
        Competi per <span className="bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">Premi Reali</span>
      </h2>
      <p className="text-base sm:text-xl text-gray-300 max-w-3xl mx-auto">
        Ogni anno i migliori competitor si dividono un montepremi straordinario. 
        Più usi la piattaforma, più sali in classifica, più sei vicino a vincere.
      </p>
    </div>

    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
      {/* 1° Premio - Auto */}
      <div className="relative group">
        <div className="absolute inset-0 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl blur-xl opacity-30 group-hover:opacity-60 transition-opacity"></div>
        <div className="relative bg-gradient-to-br from-yellow-400/10 to-orange-500/10 backdrop-blur-lg rounded-2xl border border-yellow-400/40 h-full overflow-hidden">
          <div className="relative h-40 sm:h-48 overflow-hidden">
            <img 
              src="/prizes/car.jpg" 
              alt="Automobile - 1° Premio"
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
            <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-yellow-400 text-black px-2.5 py-1 rounded-full text-xs font-bold">
              <Crown className="w-3 h-3" />
              1° PREMIO
            </div>
          </div>
          <div className="p-5">
            <h3 className="text-xl font-bold text-white mb-1">Automobile</h3>
            <p className="text-sm text-yellow-100/80">Al vincitore assoluto della classifica annuale</p>
          </div>
        </div>
      </div>

      {/* 2° Premio - Scooter */}
      <div className="relative group">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-300 to-slate-500 rounded-2xl blur-xl opacity-20 group-hover:opacity-50 transition-opacity"></div>
        <div className="relative bg-gradient-to-br from-slate-300/10 to-slate-500/10 backdrop-blur-lg rounded-2xl border border-slate-300/40 h-full overflow-hidden">
          <div className="relative h-40 sm:h-48 overflow-hidden">
            <img 
              src="/prizes/scooter.jpg" 
              alt="Scooter Elettrico - 2° Premio"
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
            <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-slate-200 text-slate-900 px-2.5 py-1 rounded-full text-xs font-bold">
              <Award className="w-3 h-3" />
              2° PREMIO
            </div>
          </div>
          <div className="p-5">
            <h3 className="text-xl font-bold text-white mb-1">Scooter Elettrico</h3>
            <p className="text-sm text-slate-200/80">Al secondo classificato</p>
          </div>
        </div>
      </div>

      {/* 3° Premio - E-Bike */}
      <div className="relative group">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-600 to-amber-800 rounded-2xl blur-xl opacity-20 group-hover:opacity-50 transition-opacity"></div>
        <div className="relative bg-gradient-to-br from-amber-600/10 to-amber-800/10 backdrop-blur-lg rounded-2xl border border-amber-600/40 h-full overflow-hidden">
          <div className="relative h-40 sm:h-48 overflow-hidden">
            <img 
              src="/prizes/ebike.jpg" 
              alt="E-Bike Premium - 3° Premio"
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
            <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-amber-500 text-white px-2.5 py-1 rounded-full text-xs font-bold">
              <Award className="w-3 h-3" />
              3° PREMIO
            </div>
          </div>
          <div className="p-5">
            <h3 className="text-xl font-bold text-white mb-1">E-Bike Premium</h3>
            <p className="text-sm text-amber-100/80">Al terzo classificato</p>
          </div>
        </div>
      </div>

      {/* Altri premi */}
      <div className="relative group">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl blur-xl opacity-30 group-hover:opacity-60 transition-opacity"></div>
        <div className="relative bg-gradient-to-br from-indigo-500/10 to-purple-600/10 backdrop-blur-lg rounded-2xl border border-indigo-400/40 h-full overflow-hidden">
          <div className="relative h-40 sm:h-48 overflow-hidden">
            <img 
              src="/prizes/tech-pack.jpg" 
              alt="Mac, iPhone, Viaggi - Premi Speciali"
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
            <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-indigo-500 text-white px-2.5 py-1 rounded-full text-xs font-bold">
              <Sparkles className="w-3 h-3" />
              ALTRI PREMI
            </div>
          </div>
          <div className="p-5">
            <h3 className="text-xl font-bold text-white mb-1">Mac, iPhone, Viaggi</h3>
            <p className="text-sm text-indigo-100/80">E decine di altri premi per i top performer</p>
          </div>
        </div>
      </div>
    </div>

    <div className="mt-10 text-center">
      <Link 
        href="/register"
        className="inline-flex items-center gap-2 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white px-8 py-4 rounded-lg font-bold text-lg transition-all shadow-xl hover:shadow-2xl hover:scale-105"
      >
        <Trophy className="w-5 h-5" />
        Voglio competere per i premi
        <ArrowRight className="w-5 h-5" />
      </Link>
    </div>
  </div>
</section>

      {/* Features Section - REVISIONATA */}
      <section className="py-12 sm:py-20 bg-black/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10 sm:mb-16">
            <h2 className="text-2xl sm:text-4xl font-bold text-white mb-3 sm:mb-4 break-words">
              Tutto ciò che ti serve per competere e vincere
            </h2>
            <p className="text-base sm:text-xl text-gray-400 max-w-2xl mx-auto px-4">
              Strumenti professionali, una classifica trasparente e premi che cambiano la vita
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-8">
            {[
              {
                icon: Target,
                title: 'Sistema a Classifica Competitivo',
                description: 'Ogni mese e ogni anno, una classifica trasparente basata su chi promuove di più il proprio referral link e utilizza i servizi del marketplace. I migliori vincono premi reali.',
                color: 'from-blue-500 to-cyan-500'
              },
              {
                icon: Gift,
                title: 'Marketplace Premium (1€/mese)',
                description: 'QR Code dinamici, Link in Bio, NFC Smart Hub, template WhatsApp, MemoLife AI e molto altro. Un ecosistema completo di strumenti per far crescere il tuo business a soli 12€/anno.',
                color: 'from-pink-500 to-rose-500'
              },
              {
                icon: Trophy,
                title: 'Premi e Bonus per i Top Performer',
                description: 'Non guadagni "sulla rete", ma vieni premiato per il tuo impegno reale: chi promuove il proprio link e usa i servizi del marketplace sale in classifica e compete per premi straordinari.',
                color: 'from-yellow-500 to-orange-500'
              },
              {
                icon: Globe,
                title: 'La tua Vetrina Globale',
                description: 'La tua pagina Link in Bio personale, visibile in tutto il mondo. Condividi il tuo link, fatti conoscere e scala la classifica internazionale.',
                color: 'from-purple-500 to-indigo-500'
              },
              {
                icon: Shield,
                title: 'Classifica Trasparente e Sicura',
                description: 'Dati protetti, transazioni sicure e una classifica pubblica e verificabile. Sai sempre esattamente dove sei e quanto ti manca per raggiungere il prossimo premio.',
                color: 'from-green-500 to-emerald-500'
              },
              {
                icon: Zap,
                title: 'Inizia a Competere in 30 Secondi',
                description: 'Registrati, attiva il tuo Marketplace e inizia subito a scalare la classifica. Nessun costo nascosto: solo 1€ al mese per accedere a tutti gli strumenti.',
                color: 'from-orange-500 to-red-500'
              }
            ].map((feature, index) => (
              <div 
                key={index}
                className="bg-white/5 backdrop-blur-lg rounded-2xl p-5 sm:p-8 border border-white/10 hover:border-white/20 transition-all hover:scale-105 group"
              >
                <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4 sm:mb-6 group-hover:scale-110 transition-transform`}>
                  <feature.icon className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-white mb-2 sm:mb-3">{feature.title}</h3>
                <p className="text-gray-400 leading-relaxed text-sm sm:text-base">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section - REVISIONATA */}
      <section className="py-12 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            <div>
              <h2 className="text-2xl sm:text-4xl font-bold text-white mb-4 sm:mb-6 break-words">
                Perché scegliere la nostra piattaforma?
              </h2>
              <p className="text-base sm:text-xl text-gray-300 mb-6 sm:mb-8">
                Non è il solito network marketing. È una vera competizione digitale dove chi si impegna di più viene premiato con premi reali e tangibili.
              </p>

              <div className="space-y-3 sm:space-y-4">
                {[
                  'Marketplace completo a soli 1€/mese (12€/anno)',
                  'Strumenti professionali inclusi: QR Code, Link in Bio, NFC, WhatsApp templates',
                  'Classifica pubblica e trasparente basata su meriti reali',
                  'Premi di fine anno: auto, scooter, viaggi, tecnologia',
                  'Community attiva di competitor motivati',
                  'Bonus mensili per i top performer della classifica',
                  'Flessibilità totale: competi da dove vuoi, quando vuoi'
                ].map((benefit, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 text-green-400 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-300 text-sm sm:text-base">{benefit}</span>
                  </div>
                ))}
              </div>

              <Link 
                href="/register"
                className="inline-flex items-center gap-2 mt-6 sm:mt-8 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-lg font-bold text-base sm:text-lg transition-all shadow-xl hover:shadow-2xl"
              >
                Inizia a Competere Ora
                <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
              </Link>
            </div>

            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-3xl blur-3xl opacity-30"></div>
              <div className="relative bg-gradient-to-br from-yellow-500/20 to-orange-500/20 backdrop-blur-lg rounded-3xl p-6 sm:p-8 border border-yellow-400/30">
                <div className="bg-[url('/people.jpg')] bg-cover bg-center rounded-2xl h-48 sm:h-80 mb-4 sm:mb-6"></div>
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  <div className="bg-white/10 rounded-xl p-3 sm:p-4 text-center">
                    <div className="text-2xl sm:text-3xl font-bold text-yellow-400 mb-1">🏆</div>
                    <div className="text-xs sm:text-sm text-gray-300">Premi Reali Ogni Anno</div>
                  </div>
                  <div className="bg-white/10 rounded-xl p-3 sm:p-4 text-center">
                    <div className="text-2xl sm:text-3xl font-bold text-white mb-1">100%</div>
                    <div className="text-xs sm:text-sm text-gray-300">Trasparenza Totale</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section - REVISIONATA */}
      <section className="py-12 sm:py-20 bg-gradient-to-r from-indigo-600 to-purple-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Trophy className="w-12 h-12 sm:w-16 sm:h-16 text-yellow-300 mx-auto mb-4 sm:mb-6" />
          <h2 className="text-2xl sm:text-4xl lg:text-5xl font-bold text-white mb-4 sm:mb-6 break-words">
            Pronto a entrare in competizione?
          </h2>
          <p className="text-base sm:text-xl text-white/90 mb-6 sm:mb-8">
            Unisciti a migliaia di competitor digitali. Scala la classifica, usa gli strumenti del Marketplace e competi per vincere l'automobile e gli altri premi straordinari.
          </p>
          <Link 
            href="/register"
            className="inline-flex items-center gap-2 bg-white text-indigo-600 px-6 sm:px-10 py-3 sm:py-5 rounded-lg font-bold text-base sm:text-xl transition-all shadow-2xl hover:scale-105 hover:shadow-3xl"
          >
            Crea il Tuo Account e Inizia a Competere
            <ArrowRight className="w-4 h-4 sm:w-6 sm:h-6" />
          </Link>
          <p className="text-white/70 mt-4 text-xs sm:text-sm">
            ✓ Marketplace a soli 1€/mese ✓ Classifica trasparente ✓ Premi reali garantiti
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-black/50 border-t border-white/10 py-8 sm:py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                <Rocket className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <span className="text-base sm:text-xl font-bold text-white">Network Marketing Program</span>
            </div>
            
            <div className="flex flex-wrap justify-center gap-4 sm:gap-8 text-gray-400 text-sm">
              <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
              <Link href="/terms" className="hover:text-white transition-colors">Termini</Link>
              <Link href="/contact" className="hover:text-white transition-colors">Contatti</Link>
            </div>

            <div className="text-gray-400 text-xs sm:text-sm text-center">
              © 2026 NMP. Tutti i diritti riservati.
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}