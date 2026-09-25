'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
// ✅ Usa next/navigation per entrambi. Il middleware di next-intl gestirà la lingua automaticamente!
import { useRouter, useSearchParams } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl' // ✅ Aggiungilo qui
import Link from 'next/link'
import { europeanCountries } from '@/lib/european-countries'
import { User, Mail, Lock, MapPin, AlertCircle, Loader2, Home, ShieldCheck, CheckCircle } from 'lucide-react'
import Logo from '@/components/Logo'

const RESEND_COOLDOWN_SECONDS = 30

type Step = 'form' | 'verify' | 'done'

export default function RegisterForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const locale = useLocale() // ✅ Ottiene 'it', 'en', ecc.
  const t = useTranslations('auth')
  const supabase = createClient()

  // ✅ Legge sia 'sponsor' che 'ref' dall'URL
  const initialReferralCode = searchParams.get('sponsor') || searchParams.get('ref') || ''
  // Un utente che ha lasciato la verifica a metà e poi ha provato ad
  // accedere viene rimandato qui con ?verify=<email> (vedi login/page.tsx)
  // per riprendere direttamente dall'inserimento del codice.
  const resumeEmail = searchParams.get('verify') || ''

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: resumeEmail,
    password: '',
    country_code: '',
    city: '',
    referral_code: initialReferralCode,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [step, setStep] = useState<Step>(resumeEmail ? 'verify' : 'form')
  const [code, setCode] = useState('')
  const [resendCooldown, setResendCooldown] = useState(0)
  const [resendMessage, setResendMessage] = useState<string | null>(null)

  useEffect(() => {
    if (resendCooldown <= 0) return
    const timer = setInterval(() => setResendCooldown((s) => Math.max(0, s - 1)), 1000)
    return () => clearInterval(timer)
  }, [resendCooldown])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const cleanReferralCode = formData.referral_code.trim().toUpperCase()

    try {
      // 1. Codice invito FACOLTATIVO: se c'è lo si verifica subito (prima del
      // login la tabella profiles non è leggibile, si usa la funzione
      // pubblica già usata da /ref/[code]); se è vuoto ci si iscrive senza
      // invito. La verifica definitiva la rifà complete_registration().
      if (cleanReferralCode) {
        const { data: sponsorMatches, error: sponsorError } = await supabase.rpc('get_public_profile_by_referral', {
          p_referral_code: cleanReferralCode,
        })
        if (sponsorError || !sponsorMatches || sponsorMatches.length === 0) {
          throw new Error(t('invalidReferral'))
        }
      }

      // 2. Registra l'utente in Supabase Auth — non ancora confermato: Supabase
      // invia un'email con un codice di verifica (OTP). Il profilo e il nodo
      // matrice vengono creati SOLO dopo che il codice viene verificato più
      // sotto, cosi un account non confermato non occupa mai un posto in matrice.
      // I dati necessari per creare profilo e nodo matrice vivono nei
      // metadata dell'utente Supabase (non solo nello state React): così la
      // verifica resta riprendibile anche dopo un refresh o rientrando da
      // /login in una sessione diversa (vedi handleVerify e ?verify= sopra).
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            first_name: formData.first_name,
            last_name: formData.last_name,
            country_code: formData.country_code,
            city: formData.city.trim(),
            referral_code: cleanReferralCode,
          }
        }
      })

      if (authError) {
        if (authError.message.includes('already registered')) {
          throw new Error(t('emailAlreadyRegistered'))
        }
        throw authError
      }

      if (!authData.user) {
        throw new Error(t('errorCreatingUser'))
      }

      // Se il progetto Supabase ha la conferma email disattivata (o il
      // provider di default in free tier, che non permette template
      // personalizzati con il codice), signUp restituisce già una sessione
      // attiva: in quel caso non c'è nessun codice da attendere, si procede
      // subito come prima. Il passaggio "verifica codice" si attiva da solo
      // non appena la conferma email verrà richiesta lato Supabase.
      if (authData.session) {
        await activateAccount(authData.user)
        return
      }

      setStep('verify')
      setResendCooldown(RESEND_COOLDOWN_SECONDS)
      setLoading(false)
    } catch (err: any) {
      setError(err.message || t('errorCreatingUser'))
      setLoading(false)
    }
  }

  // Crea profilo + posto in matrice per l'utente ormai confermato (email
  // già verificata, o mai richiesta perché autoconfirm è attivo lato
  // Supabase). Tutto avviene sul server in complete_registration():
  // verifica del codice invito, account KUMANI per chi non ne ha, posto in
  // matrice senza conflitti. Idempotente: richiamarla dopo un errore a metà
  // non duplica nulla.
  const activateAccount = async (user: { id: string; email?: string; user_metadata: Record<string, unknown> }) => {
    const meta = user.user_metadata as {
      first_name?: string
      last_name?: string
      country_code?: string
      city?: string
      referral_code?: string
    }

    try {
      const { data: status, error: registrationError } = await supabase.rpc('complete_registration', {
        p_first_name: meta.first_name || formData.first_name,
        p_last_name: meta.last_name || formData.last_name,
        p_country: meta.country_code || formData.country_code,
        p_city: meta.city ?? formData.city.trim(),
        p_referral_code: meta.referral_code ?? formData.referral_code.trim().toUpperCase(),
      })

      if (registrationError || status !== 'ok') {
        throw new Error(
          status === 'invalid_referral'
            ? t('invalidReferral')
            : status === 'direct_unavailable'
              ? t('directSignupUnavailable')
              : t('errorCreatingUser')
        )
      }

      setStep('done')
      setTimeout(() => {
        router.push(`/${locale}/dashboard`)
      }, 2000)
    } catch (err: any) {
      setError(err.message || t('errorCreatingUser'))
    } finally {
      setLoading(false)
    }
  }

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { data: verifyData, error: verifyError } = await supabase.auth.verifyOtp({
      email: formData.email,
      token: code.trim(),
      type: 'signup',
    })

    const user = verifyData?.user
    if (verifyError || !user) {
      setError(t('invalidVerificationCode'))
      setLoading(false)
      return
    }

    await activateAccount(user)
  }

  const handleResend = async () => {
    if (resendCooldown > 0) return
    setError(null)
    setResendMessage(null)
    const { error: resendError } = await supabase.auth.resend({ type: 'signup', email: formData.email })
    if (resendError) {
      setError(resendError.message)
      return
    }
    setResendMessage(t('codeResent'))
    setResendCooldown(RESEND_COOLDOWN_SECONDS)
  }

  return (
    <>
      <Link
        href="/"
        className="absolute top-6 left-6 flex items-center gap-2 text-gray-600 hover:text-indigo-600 transition-colors font-semibold"
      >
        <Logo size={32} />
        <Home className="w-4 h-4 sm:hidden" />
      </Link>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-r mt-8">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <p className="text-sm text-red-700 font-medium">{error}</p>
          </div>
        </div>
      )}

      {step === 'form' && (
        <form onSubmit={handleSubmit} className={`space-y-4 ${error ? 'mt-4' : 'mt-8'}`}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="first_name" className="block text-sm font-medium text-gray-700 mb-1">{t('firstName')}</label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
                <input id="first_name" type="text" required value={formData.first_name} onChange={(e) => setFormData({ ...formData, first_name: e.target.value })} className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
              </div>
            </div>
            <div>
              <label htmlFor="last_name" className="block text-sm font-medium text-gray-700 mb-1">{t('lastName')}</label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
                <input id="last_name" type="text" required value={formData.last_name} onChange={(e) => setFormData({ ...formData, last_name: e.target.value })} className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">{t('email')}</label>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
              <input id="email" type="email" required value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">{t('passwordMinChars')}</label>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
              <input id="password" type="password" required minLength={6} value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none" placeholder="••••••••" />
            </div>
          </div>

          <div>
            <label htmlFor="country_code" className="block text-sm font-medium text-gray-700 mb-1">{t('country')}</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
              <select id="country_code" required value={formData.country_code} onChange={(e) => setFormData({ ...formData, country_code: e.target.value })} className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white">
                <option value="">{t('selectCountry')}</option>
                {europeanCountries.map((country) => (
                  <option key={country.code} value={country.code}>{country.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">{t('cityOptional')}</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
              <input id="city" type="text" maxLength={80} value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
            </div>
          </div>

          <div>
            <label htmlFor="referral_code" className="block text-sm font-medium text-gray-700 mb-1">
              {t('referralCode')}
            </label>
            <input
              id="referral_code"
              type="text"
              value={formData.referral_code}
              onChange={(e) => setFormData({ ...formData, referral_code: e.target.value.toUpperCase() })}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono tracking-wider"
              placeholder="ES. IT-10000-Q"
            />
            <p className="text-xs text-gray-500 mt-1">{t('referralRequired')}</p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white font-bold rounded-lg transition-colors shadow-lg"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                {t('creatingAccount')}
              </>
            ) : (
              t('createAccount')
            )}
          </button>
        </form>
      )}

      {step === 'verify' && (
        <div className={`space-y-4 ${error ? 'mt-4' : 'mt-8'}`}>
          <div className="text-center">
            <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <ShieldCheck className="w-6 h-6 text-indigo-600" />
            </div>
            <h2 className="text-lg font-bold text-gray-900">{t('verifyEmailTitle')}</h2>
            <p className="mt-1 text-sm text-gray-600">{t('verifyEmailDescription', { email: formData.email })}</p>
          </div>

          {resendMessage && (
            <p className="text-center text-sm text-green-700">{resendMessage}</p>
          )}

          <form onSubmit={handleVerify} className="space-y-4">
            <div>
              <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-1">{t('verificationCode')}</label>
              <input
                id="code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono tracking-[0.3em] text-center text-lg"
                placeholder="123456"
              />
            </div>

            <button
              type="submit"
              disabled={loading || code.trim().length === 0}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white font-bold rounded-lg transition-colors shadow-lg"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  {t('verifying')}
                </>
              ) : (
                t('verifyAndActivate')
              )}
            </button>
          </form>

          <div className="flex items-center justify-between text-sm">
            <button
              type="button"
              onClick={() => { setStep('form'); setError(null); setResendMessage(null) }}
              className="font-medium text-gray-500 hover:text-indigo-600"
            >
              {t('backToForm')}
            </button>
            <button
              type="button"
              onClick={handleResend}
              disabled={resendCooldown > 0}
              className="font-medium text-indigo-600 hover:text-indigo-800 disabled:text-gray-400"
            >
              {resendCooldown > 0 ? t('resendCodeIn', { seconds: resendCooldown }) : t('resendCode')}
            </button>
          </div>
        </div>
      )}

      {step === 'done' && (
        <div className="mt-8 text-center">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-6 h-6 text-green-600" />
          </div>
          <p className="text-green-700 font-medium">{t('accountActivated')}</p>
        </div>
      )}
    </>
  )
}
