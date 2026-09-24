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
      // 1. VALIDA IL CODICE REFERRAL
      const { data: sponsorProfile, error: sponsorError } = await supabase
        .from('profiles')
        .select('id')
        .eq('referral_code', cleanReferralCode)
        .single()

      if (sponsorError || !sponsorProfile) {
        throw new Error(t('invalidReferral'))
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
            referral_code: cleanReferralCode,
            sponsor_id: sponsorProfile.id,
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

  // Crea profilo + nodo matrice per l'utente ormai confermato (email già
  // verificata, o mai richiesta perché autoconfirm è attivo lato Supabase).
  // Idempotente: se richiamata più volte (es. dopo un fallimento parziale)
  // non duplica righe già create.
  const activateAccount = async (user: { id: string; email?: string; user_metadata: Record<string, unknown> }) => {
    const meta = user.user_metadata as {
      first_name?: string
      last_name?: string
      country_code?: string
      referral_code?: string
      sponsor_id?: string
    }
    const firstName = meta.first_name || formData.first_name
    const lastName = meta.last_name || formData.last_name
    const countryCode = meta.country_code || formData.country_code
    const referralCode = meta.referral_code || formData.referral_code.trim().toUpperCase()
    const sponsorId = meta.sponsor_id || ''
    const email = user.email || formData.email

    try {
      // Verifica se il profilo esiste già (es. verifica ripetuta dopo un
      // fallimento nel solo passaggio matrice): in tal caso non ricrearlo.
      const { data: existingProfile } = await supabase.from('profiles').select('id').eq('id', user.id).maybeSingle()

      if (!existingProfile) {
        const generatedUsername = email.split('@')[0] + '_' + Math.floor(Math.random() * 10000)

        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            email,
            username: generatedUsername,
            first_name: firstName,
            last_name: lastName,
            country_code: countryCode,
            referral_code: generateReferralCode(countryCode),
            subscription_status: 'free',
            date_of_birth: '2000-01-01',
            sponsor_id: sponsorId,
          })

        if (profileError) {
          console.error('Errore profilo:', profileError)
          throw new Error(t('errorCreatingProfile'))
        }
      }

      // Crea il nodo matrice agganciato allo sponsor (se non già presente)
      const { data: existingNode } = await supabase.from('matrix_nodes').select('id').eq('user_id', user.id).maybeSingle()
      if (!existingNode) {
        await createMatrixNode(user.id, referralCode)
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

  // ✅ NUOVA FUNZIONE: Genera codice nel formato PAESE-0000000-X
  const generateReferralCode = (countryCode: string) => {
    const country = (countryCode || 'IT').toUpperCase().substring(0, 2)

    let digits = ''
    for (let i = 0; i < 7; i++) {
      digits += Math.floor(Math.random() * 10).toString()
    }

    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    const letter = letters.charAt(Math.floor(Math.random() * letters.length))

    return `${country}-${digits}-${letter}`
  }

  // ✅ FUNZIONE CORRETTA: Logica del percorso (path) blindata con controllo errori
  const createMatrixNode = async (userId: string, sponsorCode: string) => {
    try {
      // 1. Trova l'ID dello sponsor
      const { data: sponsorProfile, error: sponsorError } = await supabase
        .from('profiles')
        .select('id')
        .eq('referral_code', sponsorCode)
        .single()

      if (sponsorError || !sponsorProfile) throw new Error('Sponsor non trovato.')

      // 2. Trova il nodo matrice dello sponsor
      const { data: sponsorNode, error: nodeError } = await supabase
        .from('matrix_nodes')
        .select('id, path, level')
        .eq('user_id', sponsorProfile.id)
        .single()

      if (nodeError || !sponsorNode) {
        throw new Error('Impossibile trovare il nodo dello sponsor. Contatta il supporto.')
      }

      const parentNodeId = sponsorNode.id
      const parentPath = sponsorNode.path
      const level = sponsorNode.level + 1

      // 3. Trova la prima posizione libera (1-5) sotto lo sponsor
      const { data: existingChildren, error: childrenError } = await supabase
        .from('matrix_nodes')
        .select('position')
        .eq('parent_id', parentNodeId)
        .order('position', { ascending: true })

      if (childrenError) throw childrenError

      const usedPositions = existingChildren?.map((c: any) => c.position) || []
      let newPosition = 1
      while (usedPositions.includes(newPosition) && newPosition <= 5) {
        newPosition++
      }

      // 4. Inserimento diretto sotto lo sponsor (se c'è spazio)
      if (newPosition <= 5) {
        const newPath = `${parentPath}.${newPosition}`
        const newDepth = parentPath.split('.').length

        // ✅ FIX: Controllo esplicito dell'errore di inserimento
        const { error: insertError } = await supabase.from('matrix_nodes').insert({
          user_id: userId,
          parent_id: parentNodeId,
          path: newPath,
          level: level,
          position: newPosition,
          depth: newDepth,
        })

        if (insertError) {
          console.error('Errore DB insert diretto:', insertError)
          throw new Error(`Errore nel salvataggio del nodo: ${insertError.message}`)
        }
      }
      // 5. Spillover: lo sponsor ha già i 5 slot diretti pieni. Si scende nel
      // suo sottoalbero scansionando i rami da sinistra (posizione 1) verso
      // destra (posizione 5) e scegliendo, a ogni livello, quello con MENO
      // persone in totale (non solo figli diretti, ma l'intero sottoalbero —
      // così i rami restano bilanciati anche in profondità). A parità di
      // persone vince il ramo più a sinistra, cioè il primo incontrato
      // scansionando in ordine di posizione. Si ripete finché non si trova un
      // nodo con uno slot diretto (1-5) ancora libero.
      else {
        const { data: allNodes, error: allNodesError } = await supabase
          .from('matrix_nodes')
          .select('id, parent_id, path, level, position')

        if (allNodesError) throw allNodesError

        const nodesInSponsorTree = (allNodes || []).filter((node) =>
          node.path.startsWith(`${parentPath}.`)
        )

        const childrenOf = (nodeId: string) =>
          nodesInSponsorTree
            .filter((node) => node.parent_id === nodeId)
            .sort((a, b) => a.position - b.position)

        // Persone totali nel sottoalbero di un nodo (figli, nipoti, ecc.),
        // usato per bilanciare i rami in base alla popolazione reale e non
        // solo al numero di figli diretti.
        const subtreeSize = (nodeId: string): number =>
          childrenOf(nodeId).reduce((total, child) => total + 1 + subtreeSize(child.id), 0)

        const findTarget = (node: { id: string; path: string; level: number }): { id: string; path: string; level: number } => {
          const children = childrenOf(node.id)
          if (children.length < 5) return node

          let best = children[0]
          let bestSize = subtreeSize(best.id)
          for (const child of children.slice(1)) {
            const size = subtreeSize(child.id)
            if (size < bestSize) {
              best = child
              bestSize = size
            }
          }
          return findTarget(best)
        }

        const target = findTarget({ id: parentNodeId, path: parentPath, level: sponsorNode.level })
        const targetChildren = childrenOf(target.id)

        const targetUsedPositions = targetChildren.map((child) => child.position)
        let position = 1
        while (targetUsedPositions.includes(position) && position <= 5) position++

        const newNodePath = `${target.path}.${position}`
        const newNodeLevel = target.level + 1
        const newNodeDepth = target.path.split('.').length

        const { error: spillInsertError } = await supabase.from('matrix_nodes').insert({
          user_id: userId,
          parent_id: target.id,
          path: newNodePath,
          level: newNodeLevel,
          position,
          depth: newNodeDepth,
        })

        if (spillInsertError) {
          console.error('Errore DB insert spillover:', spillInsertError)
          throw new Error(`Errore nel salvataggio del nodo (spillover): ${spillInsertError.message}`)
        }
      }
    } catch (error: any) {
      console.error('Errore creazione nodo matrice:', error)
      // Lancia l'errore in modo che il form lo mostri all'utente e blocchi il redirect
      throw new Error(error.message || t('errorInMatrix'))
    }
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
            <label htmlFor="referral_code" className="block text-sm font-medium text-gray-700 mb-1">
              {t('referralCode')} <span className="text-red-500">*</span>
            </label>
            <input
              id="referral_code"
              type="text"
              required
              value={formData.referral_code}
              onChange={(e) => setFormData({ ...formData, referral_code: e.target.value.toUpperCase() })}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono tracking-wider"
              placeholder="ES. IT-10000-Q"
            />
            <p className="text-xs text-gray-500 mt-1">
              ⚠️ {t('referralRequired')}
            </p>
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
