import Link from '@/components/LocalizedLink'
import { useTranslations } from 'next-intl'
import { Suspense } from 'react'
import {
  Rocket,
  Gift,
  Globe,
  Shield,
  Zap,
  ArrowRight,
  CheckCircle2,
  Star,
  Target,
  Sparkles,
  Ticket,
  BadgePercent,
  Wallet,
  Gem,
  Smartphone,
  QrCode,
  Link2,
  MessageCircle,
  Brain,
  Tag,
  Wand2,
  ShieldCheck,
  CalendarClock,
  PackageSearch,
  FileCheck2,
  Waves
} from 'lucide-react'
import LatestUsersRotating from '@/components/LatestUsersRotating'
import LanguageSwitcher from '@/components/LanguageSwitcher'

export default function LandingPage() {
  const t = useTranslations('landingHome')

  const tools = [
    { icon: Smartphone, title: t('toolQrTitle'), desc: t('toolQrDescription'), color: 'from-indigo-500 to-purple-600' },
    { icon: Link2, title: t('toolLinkBioTitle'), desc: t('toolLinkBioDescription'), color: 'from-pink-500 to-rose-500' },
    { icon: MessageCircle, title: t('toolWhatsappTitle'), desc: t('toolWhatsappDescription'), color: 'from-green-400 to-emerald-600' },
    { icon: Wand2, title: t('toolOffermakerTitle'), desc: t('toolOffermakerDescription'), color: 'from-violet-500 to-fuchsia-600' },
    { icon: QrCode, title: t('toolQrProTitle'), desc: t('toolQrProDescription'), color: 'from-slate-500 to-slate-700' },
    { icon: ShieldCheck, title: t('toolSvatTitle'), desc: t('toolSvatDescription'), color: 'from-red-500 to-rose-600' },
    { icon: Brain, title: t('toolMemolifeTitle'), desc: t('toolMemolifeDescription'), color: 'from-purple-500 to-pink-500' },
    { icon: CalendarClock, title: t('toolLifeCalendarTitle'), desc: t('toolLifeCalendarDescription'), color: 'from-cyan-500 to-blue-600' },
    { icon: PackageSearch, title: t('toolFindoTitle'), desc: t('toolFindoDescription'), color: 'from-amber-500 to-orange-600' },
    { icon: FileCheck2, title: t('toolDigitalReceiptTitle'), desc: t('toolDigitalReceiptDescription'), color: 'from-teal-500 to-emerald-600' },
    { icon: Waves, title: t('toolNeurobalanceTitle'), desc: t('toolNeurobalanceDescription'), color: 'from-sky-500 to-indigo-600' },
    { icon: Tag, title: t('toolListingsTitle'), desc: t('toolListingsDescription'), color: 'from-yellow-400 to-orange-500' }
  ]

  const steps = [
    { step: '1', icon: Zap, title: t('step1Title'), desc: t('step1Description') },
    { step: '2', icon: Target, title: t('step2Title'), desc: t('step2Description') },
    { step: '3', icon: Ticket, title: t('step3Title'), desc: t('step3Description') }
  ]

  const perks = [
    { icon: BadgePercent, title: t('perk1Title'), desc: t('perk1Description'), color: 'from-yellow-400 to-orange-500' },
    { icon: Wallet, title: t('perk2Title'), desc: t('perk2Description'), color: 'from-green-400 to-emerald-600' },
    { icon: Gift, title: t('perk3Title'), desc: t('perk3Description'), color: 'from-pink-500 to-rose-500' },
    { icon: Gem, title: t('perk4Title'), desc: t('perk4Description'), color: 'from-indigo-500 to-purple-600' }
  ]

  const features = [
    { icon: Target, title: t('featureOneTitle'), description: t('featureOneDescription'), color: 'from-blue-500 to-cyan-500' },
    { icon: Gift, title: t('featureTwoTitle'), description: t('featureTwoDescription'), color: 'from-pink-500 to-rose-500' },
    { icon: Ticket, title: t('featureThreeTitle'), description: t('featureThreeDescription'), color: 'from-yellow-500 to-orange-500' },
    { icon: Globe, title: t('featureFourTitle'), description: t('featureFourDescription'), color: 'from-purple-500 to-indigo-500' },
    { icon: Shield, title: t('featureFiveTitle'), description: t('featureFiveDescription'), color: 'from-green-500 to-emerald-500' },
    { icon: Zap, title: t('featureSixTitle'), description: t('featureSixDescription'), color: 'from-orange-500 to-red-500' }
  ]

  const benefits = [1, 2, 3, 4, 5, 6, 7].map((n) => t(`benefit${n}`))

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
            <LanguageSwitcher dark />
            <Link
              href="/login"
              className="text-white/80 hover:text-white font-medium transition-colors text-sm sm:text-base"
            >
              {t('login')}
            </Link>
            <Link
              href="/register"
              className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-3 sm:px-6 py-1.5 sm:py-2 rounded-lg font-semibold transition-all shadow-lg hover:shadow-xl text-sm sm:text-base"
            >
              {t('startNow')}
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/20 to-purple-600/20"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20 lg:py-32">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium text-white mb-4 sm:mb-6 border border-white/20">
                <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 text-yellow-400" />
                {t('heroBadge')}
              </div>
              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold text-white mb-4 sm:mb-6 leading-tight break-words">
                {t('heroTitle')}
                <span className="bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent"> {t('heroAccent')}</span>
              </h1>
              <p className="text-base sm:text-xl text-gray-300 mb-6 sm:mb-8 leading-relaxed">
                {t('heroDescription')}{' '}
                <strong className="text-white">{t('heroDescriptionStrong')}</strong>: {t('heroDescriptionEnd')}
              </p>
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-8 sm:mb-12">
                <Link
                  href="/register"
                  className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-lg font-bold text-base sm:text-lg transition-all shadow-xl hover:shadow-2xl hover:scale-105 flex items-center justify-center gap-2"
                >
                  {t('heroCta')}
                  <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
                </Link>
                <Link
                  href="/login"
                  className="bg-white/10 hover:bg-white/20 backdrop-blur text-white px-6 sm:px-8 py-3 sm:py-4 rounded-lg font-bold text-base sm:text-lg transition-all border border-white/20 flex items-center justify-center"
                >
                  {t('login')}
                </Link>
              </div>
              {/* Stats */}
              <div className="grid grid-cols-3 gap-3 sm:gap-6">
                <div>
                  <div className="text-2xl sm:text-3xl font-bold text-white">10K+</div>
                  <div className="text-xs sm:text-sm text-gray-400">{t('statActiveEntrepreneurs')}</div>
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-bold text-yellow-400">49€</div>
                  <div className="text-xs sm:text-sm text-gray-400">{t('statYearlyLabel')}</div>
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-bold text-white">50+</div>
                  <div className="text-xs sm:text-sm text-gray-400">{t('statCountriesLabel')}</div>
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
                      <h3 className="text-lg font-bold text-white">{t('latestUsers')}</h3>
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

      {/* 🛠️ SEZIONE: IL MARKETPLACE AL CENTRO */}
      <section className="py-12 sm:py-20 bg-black/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10 sm:mb-16">
            <div className="inline-flex items-center gap-2 bg-indigo-500/20 border border-indigo-500/30 px-4 py-1.5 rounded-full text-sm font-medium text-indigo-300 mb-4">
              <Target className="w-4 h-4" />
              {t('marketplaceEyebrow')}
            </div>
            <h2 className="text-3xl sm:text-5xl font-bold text-white mb-4 break-words">
              {t('marketplaceTitle')} <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">{t('marketplaceAccent')}</span>{t('marketplaceTitleEnd')}
            </h2>
            <p className="text-base sm:text-xl text-gray-300 max-w-3xl mx-auto">
              {t('marketplaceDescription')}
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {tools.map((tool, index) => (
              <div key={index} className="bg-white/5 backdrop-blur-lg rounded-2xl p-5 border border-white/10 hover:border-white/25 transition-all hover:scale-105 group">
                <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${tool.color} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                  <tool.icon className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-base font-bold text-white mb-1">{tool.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{tool.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 🎟️ SEZIONE: PROGRAMMA BONUS & COUPON */}
      <section className="py-12 sm:py-20 bg-gradient-to-b from-black/40 to-transparent">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10 sm:mb-16">
            <div className="inline-flex items-center gap-2 bg-yellow-500/20 border border-yellow-500/30 px-4 py-1.5 rounded-full text-sm font-medium text-yellow-300 mb-4">
              <Ticket className="w-4 h-4" />
              {t('bonusEyebrow')}
            </div>
            <h2 className="text-3xl sm:text-5xl font-bold text-white mb-4 break-words">
              {t('bonusTitle')} <span className="bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">{t('bonusAccent')}</span>
            </h2>
            <p className="text-base sm:text-xl text-gray-300 max-w-3xl mx-auto">
              {t('bonusDescription')}
            </p>
          </div>

          {/* Come funziona: 3 step */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 mb-10">
            {steps.map((item, index) => (
              <div key={index} className="relative bg-white/5 backdrop-blur-lg rounded-2xl p-6 border border-white/10">
                <div className="absolute -top-4 left-6 w-8 h-8 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-black font-bold text-sm shadow-lg">
                  {item.step}
                </div>
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mb-4 mt-2">
                  <item.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">{item.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>

          {/* Box trasparenza (importante anche legalmente) */}
          <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-10">
            <Shield className="w-8 h-8 text-green-400 flex-shrink-0" />
            <p className="text-green-100 text-sm sm:text-base leading-relaxed">
              <strong className="text-green-300">{t('transparencyLead')}</strong> {t('transparencyRest')}
            </p>
          </div>

          {/* Tipologie di vantaggi */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {perks.map((perk, index) => (
              <div key={index} className="relative group">
                <div className={`absolute inset-0 bg-gradient-to-br ${perk.color} rounded-2xl blur-xl opacity-20 group-hover:opacity-40 transition-opacity`}></div>
                <div className="relative bg-white/5 backdrop-blur-lg rounded-2xl p-6 border border-white/15 h-full">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${perk.color} flex items-center justify-center mb-4`}>
                    <perk.icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">{perk.title}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">{perk.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Banner iniziative esclusive con rimando al regolamento */}
          <div className="mt-10 bg-gradient-to-r from-indigo-600/30 to-purple-600/30 border border-indigo-400/30 rounded-2xl p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center gap-6">
            <div className="flex-1">
              <h3 className="text-xl sm:text-2xl font-bold text-white mb-2 flex items-center gap-2">
                <Gem className="w-6 h-6 text-yellow-400" />
                {t('bannerTitle')}
              </h3>
              <p className="text-gray-300 text-sm sm:text-base leading-relaxed">
                {t('bannerText1')} <strong className="text-white">{t('bannerTextBold')}</strong>{t('bannerText2')}
              </p>
            </div>
            <Link
              href="/terms"
              className="flex-shrink-0 inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white px-5 py-3 rounded-lg font-semibold transition-all text-sm sm:text-base"
            >
              {t('bannerCta')}
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-12 sm:py-20 bg-black/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10 sm:mb-16">
            <h2 className="text-2xl sm:text-4xl font-bold text-white mb-3 sm:mb-4 break-words">
              {t('featuresTitle')}
            </h2>
            <p className="text-base sm:text-xl text-gray-400 max-w-2xl mx-auto px-4">
              {t('featuresDescription')}
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-8">
            {features.map((feature, index) => (
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

      {/* Benefits Section */}
      <section className="py-12 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            <div>
              <h2 className="text-2xl sm:text-4xl font-bold text-white mb-4 sm:mb-6 break-words">
                {t('benefitsTitle')}
              </h2>
              <p className="text-base sm:text-xl text-gray-300 mb-6 sm:mb-8">
                {t('benefitsDescription')}
              </p>
              <div className="space-y-3 sm:space-y-4">
                {benefits.map((benefit, index) => (
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
                {t('benefitsCta')}
                <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
              </Link>
            </div>
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-3xl blur-3xl opacity-20"></div>
              <div className="relative bg-gradient-to-br from-yellow-500/10 to-orange-500/10 backdrop-blur-lg rounded-3xl p-6 sm:p-8 border border-yellow-400/30">
                <div className="space-y-4">
                  <div className="bg-white/10 rounded-xl p-4 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center flex-shrink-0">
                      <Ticket className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <div className="text-white font-bold">{t('sideRow1Title')}</div>
                      <div className="text-gray-300 text-sm">{t('sideRow1Description')}</div>
                    </div>
                  </div>
                  <div className="bg-white/10 rounded-xl p-4 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center flex-shrink-0">
                      <Shield className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <div className="text-white font-bold">{t('sideRow2Title')}</div>
                      <div className="text-gray-300 text-sm">{t('sideRow2Description')}</div>
                    </div>
                  </div>
                  <div className="bg-white/10 rounded-xl p-4 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                      <Gem className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <div className="text-white font-bold">{t('sideRow3Title')}</div>
                      <div className="text-gray-300 text-sm">{t('sideRow3Description')}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 sm:py-20 bg-gradient-to-r from-indigo-600 to-purple-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Ticket className="w-12 h-12 sm:w-16 sm:h-16 text-yellow-300 mx-auto mb-4 sm:mb-6" />
          <h2 className="text-2xl sm:text-4xl lg:text-5xl font-bold text-white mb-4 sm:mb-6 break-words">
            {t('ctaTitle')}
          </h2>
          <p className="text-base sm:text-xl text-white/90 mb-6 sm:mb-8">
            {t('ctaDescription')}
          </p>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 bg-white text-indigo-600 px-6 sm:px-10 py-3 sm:py-5 rounded-lg font-bold text-base sm:text-xl transition-all shadow-2xl hover:scale-105 hover:shadow-3xl"
          >
            {t('ctaButton')}
            <ArrowRight className="w-4 h-4 sm:w-6 sm:h-6" />
          </Link>
          <p className="text-white/70 mt-4 text-xs sm:text-sm">
            {t('ctaNote')}
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
              <Link href="/terms" className="hover:text-white transition-colors">{t('terms')}</Link>
              <Link href="/contact" className="hover:text-white transition-colors">{t('contact')}</Link>
            </div>
            <div className="text-gray-400 text-xs sm:text-sm text-center">
              {t('copyright')}
            </div>
          </div>
          <p className="text-gray-500 text-xs text-center mt-6 max-w-3xl mx-auto leading-relaxed">
            {t('footerLegalNote1')}
            {' '}
            {t('footerLegalNote2')}
          </p>
        </div>
      </footer>
    </div>
  )
}
