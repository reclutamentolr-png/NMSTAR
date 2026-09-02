'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { europeanCountries } from '@/lib/european-countries'
import { User, Mail, Lock, MapPin, AlertCircle, Loader2, Rocket, Home } from 'lucide-react'

export default function RegisterForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  // ✅ Legge sia 'sponsor' (dalla tua pagina ref) che 'ref' (per compatibilità)
  const initialReferralCode = searchParams.get('sponsor') || searchParams.get('ref') || ''

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    country_code: '',
    referral_code: initialReferralCode,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

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
        throw new Error('Codice referral non valido. Devi essere invitato da un membro esistente.')
      }

      // 2. Registra l'utente in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            first_name: formData.first_name,
            last_name: formData.last_name,
            country_code: formData.country_code,
          }
        }
      })

      if (authError) {
        if (authError.message.includes('already registered')) {
          throw new Error('Questa email è già registrata. Prova ad accedere o usa un\'altra email.')
        }
        throw authError
      }
      
      if (!authData.user) {
        throw new Error('Errore nella creazione dell\'utente. Controlla la tua email per la conferma.')
      }

      // ✅ 3. Genera uno username univoco (risolve l'errore "null value in column username")
      const generatedUsername = formData.email.split('@')[0] + '_' + Math.floor(Math.random() * 10000)

            // 4. Crea il profilo nella tabella profiles
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: authData.user.id,
          email: formData.email,
          username: generatedUsername,
          first_name: formData.first_name,
          last_name: formData.last_name,
          country_code: formData.country_code,
          referral_code: generateReferralCode(formData.country_code),
          subscription_status: 'free',
          date_of_birth: '2000-01-01',
          sponsor_id: sponsorProfile.id, // ✅ AGGIUNTO: Salva l'ID dello sponsor nel profilo!
        })
        
      if (profileError) {
        console.error('Errore profilo:', profileError)
        throw new Error('Errore durante la creazione del profilo. Contatta il supporto.')
      }

      // 5. Crea il nodo matrice agganciato allo sponsor
      await createMatrixNode(authData.user.id, cleanReferralCode)

      setSuccess(true)
      
      setTimeout(() => {
        router.push('/login')
      }, 2500)

    } catch (err: any) {
      setError(err.message || 'Errore durante la registrazione')
    } finally {
      setLoading(false)
    }
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
      // 5. Spillover: il nodo dello sponsor è pieno (5 figli), cerca il primo nodo con spazio
      else {
        const { data: allNodes, error: allNodesError } = await supabase.from('matrix_nodes').select('id, path, level')
        if (allNodesError) throw allNodesError

        let foundNode = false
        
        for (const node of (allNodes || [])) {
          const { count, error: countError } = await supabase
            .from('matrix_nodes')
            .select('*', { count: 'exact', head: true })
            .eq('parent_id', node.id)
          
          if (countError) throw countError
          
          if ((count || 0) < 5) {
            const { data: children, error: spillChildrenError } = await supabase
              .from('matrix_nodes')
              .select('position')
              .eq('parent_id', node.id)
            
            if (spillChildrenError) throw spillChildrenError

            const usedPos = children?.map((c: any) => c.position) || []
            let pos = 1
            while (usedPos.includes(pos) && pos <= 5) pos++
            
            const newNodePath = `${node.path}.${pos}`
            const newNodeLevel = node.level + 1
            const newNodeDepth = node.path.split('.').length

            // ✅ FIX: Controllo esplicito dell'errore di inserimento nello spillover
            const { error: spillInsertError } = await supabase.from('matrix_nodes').insert({
              user_id: userId,
              parent_id: node.id,
              path: newNodePath,
              level: newNodeLevel,
              position: pos,
              depth: newNodeDepth,
            })

            if (spillInsertError) {
              console.error('Errore DB insert spillover:', spillInsertError)
              throw new Error(`Errore nel salvataggio del nodo (spillover): ${spillInsertError.message}`)
            }

            foundNode = true
            break
          }
        }
        
        if (!foundNode) {
          // Fallback estremo
          const { error: fallbackError } = await supabase.from('matrix_nodes').insert({
            user_id: userId,
            parent_id: null,
            path: 'root',
            level: 1,
            position: 1,
            depth: 0,
          })
          if (fallbackError) throw fallbackError
        }
      }
    } catch (error: any) {
      console.error('Errore creazione nodo matrice:', error)
      // Lancia l'errore in modo che il form lo mostri all'utente e blocchi il redirect
      throw new Error(error.message || 'Errore nel posizionamento in matrice.')
    }
  }

  return (
    <>
      <Link 
        href="/" 
        className="absolute top-6 left-6 flex items-center gap-2 text-gray-600 hover:text-indigo-600 transition-colors font-semibold"
      >
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
          <Rocket className="w-5 h-5 text-white" />
        </div>
        <span className="text-lg hidden sm:inline">Network Marketing Program</span>
        <Home className="w-4 h-4 sm:hidden" />
      </Link>

      <form onSubmit={handleSubmit} className="space-y-4 mt-8">
        {error && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-r">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
              <p className="text-sm text-red-700 font-medium">{error}</p>
            </div>
          </div>
        )}

        {success && (
          <div className="bg-green-50 border-l-4 border-green-400 p-4 rounded-r">
            <p className="text-sm text-green-700 font-medium">
              ✅ Registrazione completata con successo! Verrai reindirizzato al login...
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="first_name" className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
            <div className="relative">
              <User className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
              <input id="first_name" type="text" required value={formData.first_name} onChange={(e) => setFormData({ ...formData, first_name: e.target.value })} className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none" placeholder="Mario" />
            </div>
          </div>
          <div>
            <label htmlFor="last_name" className="block text-sm font-medium text-gray-700 mb-1">Cognome</label>
            <div className="relative">
              <User className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
              <input id="last_name" type="text" required value={formData.last_name} onChange={(e) => setFormData({ ...formData, last_name: e.target.value })} className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none" placeholder="Rossi" />
            </div>
          </div>
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <div className="relative">
            <Mail className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
            <input id="email" type="email" required value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none" placeholder="mario.rossi@email.com" />
          </div>
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">Password (min. 6 caratteri)</label>
          <div className="relative">
            <Lock className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
            <input id="password" type="password" required minLength={6} value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none" placeholder="••••••••" />
          </div>
        </div>

        <div>
          <label htmlFor="country_code" className="block text-sm font-medium text-gray-700 mb-1">Paese</label>
          <div className="relative">
            <MapPin className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
            <select id="country_code" required value={formData.country_code} onChange={(e) => setFormData({ ...formData, country_code: e.target.value })} className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white">
              <option value="">Seleziona il tuo paese</option>
              {europeanCountries.map((country) => (
                <option key={country.code} value={country.code}>{country.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="referral_code" className="block text-sm font-medium text-gray-700 mb-1">
            Codice Referral <span className="text-red-500">*</span>
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
            ⚠️ La registrazione è possibile solo su invito di un membro esistente.
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
              Creazione account in corso...
            </>
          ) : (
            'Crea il tuo account'
          )}
        </button>
      </form>
    </>
  )
}