import Link from 'next/link'
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
  Star
} from 'lucide-react'
import NewUsersCarousel from '@/components/NewUsersCarousel'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-900 to-purple-900">
      {/* Header */}
      <header className="bg-black/20 backdrop-blur-lg border-b border-white/10 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <Rocket className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold text-white">NMP</span>
          </div>
          
          <div className="flex items-center gap-4">
            <Link 
              href="/login"
              className="text-white/80 hover:text-white font-medium transition-colors"
            >
              Accedi
            </Link>
            <Link 
              href="/register"
              className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-6 py-2 rounded-lg font-semibold transition-all shadow-lg hover:shadow-xl"
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
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur px-4 py-2 rounded-full text-sm font-medium text-white mb-6 border border-white/20">
                <Star className="w-4 h-4 text-yellow-400" />
                Piattaforma #1 per Network Marketing
              </div>
              
              <h1 className="text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
                Costruisci il Tuo
                <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent"> Impero Digitale</span>
              </h1>
              
              <p className="text-xl text-gray-300 mb-8 leading-relaxed">
                Unisciti a migliaia di imprenditori che stanno rivoluzionando il network marketing con strumenti digitali all'avanguardia e un sistema di crescita automatico.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 mb-12">
                <Link 
                  href="/register"
                  className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-8 py-4 rounded-lg font-bold text-lg transition-all shadow-xl hover:shadow-2xl hover:scale-105 flex items-center justify-center gap-2"
                >
                  Inizia Gratis
                  <ArrowRight className="w-5 h-5" />
                </Link>
                <Link 
                  href="/login"
                  className="bg-white/10 hover:bg-white/20 backdrop-blur text-white px-8 py-4 rounded-lg font-bold text-lg transition-all border border-white/20 flex items-center justify-center"
                >
                  Accedi
                </Link>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-6">
                <div>
                  <div className="text-3xl font-bold text-white">10K+</div>
                  <div className="text-sm text-gray-400">Utenti Attivi</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-white">€2M+</div>
                  <div className="text-sm text-gray-400">Guadagni Distribuiti</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-white">50+</div>
                  <div className="text-sm text-gray-400">Paesi</div>
                </div>
              </div>
            </div>

            {/* Carosello Ultimi Iscritti */}
            <div className="lg:pl-8">
              <NewUsersCarousel />
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-black/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">
              Tutto ciò di cui hai bisogno per crescere
            </h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              Strumenti professionali, automazione intelligente e una community di successo
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: Users,
                title: 'Matrice 5xN Automatica',
                description: 'Sistema di crescita automatico che posiziona ogni nuovo membro nella posizione ottimale per massimizzare i guadagni di tutti.',
                color: 'from-blue-500 to-cyan-500'
              },
              {
                icon: Gift,
                title: 'Marketplace Gratuito',
                description: 'QR Code dinamici, Link in Bio, NFC Smart Hub, template WhatsApp e MemoLife AI. Tutti gli strumenti per promuovere il tuo business.',
                color: 'from-pink-500 to-rose-500'
              },
              {
                icon: TrendingUp,
                title: 'Guadagni Multi-Livello',
                description: 'Guadagna su 5 livelli di profondità. Più la tua rete cresce, più il tuo reddito aumenta in modo esponenziale.',
                color: 'from-green-500 to-emerald-500'
              },
              {
                icon: Globe,
                title: 'Presenza Globale',
                description: 'La tua pagina Link in Bio personale, visibile in tutto il mondo. Condividi il tuo successo con un click.',
                color: 'from-purple-500 to-indigo-500'
              },
              {
                icon: Shield,
                title: 'Sicurezza Totale',
                description: 'Dati protetti, transazioni sicure e privacy garantita. La tua attività è al sicuro con noi.',
                color: 'from-orange-500 to-red-500'
              },
              {
                icon: Zap,
                title: 'Attivazione Istantanea',
                description: 'Registrati in 30 secondi e inizia subito a costruire la tua rete. Nessun costo nascosto, nessuna sorpresa.',
                color: 'from-yellow-500 to-amber-500'
              }
            ].map((feature, index) => (
              <div 
                key={index}
                className="bg-white/5 backdrop-blur-lg rounded-2xl p-8 border border-white/10 hover:border-white/20 transition-all hover:scale-105 group"
              >
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                  <feature.icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">{feature.title}</h3>
                <p className="text-gray-400 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl font-bold text-white mb-6">
                Perché scegliere la nostra piattaforma?
              </h2>
              <p className="text-xl text-gray-300 mb-8">
                Non è solo un network marketing. È un ecosistema completo per il tuo successo digitale.
              </p>

              <div className="space-y-4">
                {[
                  'Abbonamento a soli €1/mese - il più economico del mercato',
                  'Strumenti di marketing digitale inclusi gratuitamente',
                  'Sistema di matrice equo e trasparente',
                  'Community attiva e supporto dedicato',
                  'Guadagni ricorrenti e passivi',
                  'Flessibilità totale: lavora da ovunque'
                ].map((benefit, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <CheckCircle2 className="w-6 h-6 text-green-400 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-300">{benefit}</span>
                  </div>
                ))}
              </div>

              <Link 
                href="/register"
                className="inline-flex items-center gap-2 mt-8 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-8 py-4 rounded-lg font-bold text-lg transition-all shadow-xl hover:shadow-2xl"
              >
                Unisciti Ora
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>

            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-3xl blur-3xl opacity-30"></div>
              <div className="relative bg-gradient-to-br from-indigo-600/20 to-purple-600/20 backdrop-blur-lg rounded-3xl p-8 border border-white/10">
                <div className="bg-[url('/success-growth.jpg')] bg-cover bg-center rounded-2xl h-80 mb-6"></div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/10 rounded-xl p-4 text-center">
                    <div className="text-3xl font-bold text-white mb-1">95%</div>
                    <div className="text-sm text-gray-300">Tasso di Soddisfazione</div>
                  </div>
                  <div className="bg-white/10 rounded-xl p-4 text-center">
                    <div className="text-3xl font-bold text-white mb-1">24/7</div>
                    <div className="text-sm text-gray-300">Supporto Attivo</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-indigo-600 to-purple-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl lg:text-5xl font-bold text-white mb-6">
            Pronto a iniziare il tuo viaggio verso la libertà finanziaria?
          </h2>
          <p className="text-xl text-white/90 mb-8">
            Unisciti a migliaia di imprenditori di successo. Inizia oggi, domani sarà troppo tardi.
          </p>
          <Link 
            href="/register"
            className="inline-flex items-center gap-2 bg-white text-indigo-600 px-10 py-5 rounded-lg font-bold text-xl transition-all shadow-2xl hover:scale-105 hover:shadow-3xl"
          >
            Crea il Tuo Account Gratis
            <ArrowRight className="w-6 h-6" />
          </Link>
          <p className="text-white/70 mt-4 text-sm">
            ✓ Nessun costo nascosto ✓ Cancella quando vuoi ✓ Supporto dedicato
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-black/50 border-t border-white/10 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                <Rocket className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold text-white">Network Marketing Program</span>
            </div>
            
            <div className="flex gap-8 text-gray-400">
              <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
              <Link href="/terms" className="hover:text-white transition-colors">Termini</Link>
              <Link href="/contact" className="hover:text-white transition-colors">Contatti</Link>
            </div>

            <div className="text-gray-400 text-sm">
              © 2026 NMP. Tutti i diritti riservati.
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}