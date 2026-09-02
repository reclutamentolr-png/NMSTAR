import Link from '@/components/LocalizedLink' // ✅ Usa il nostro link intelligente!
import { Rocket } from 'lucide-react'
import RegisterForm from '@/components/RegisterForm'

// ✅ FIX: Disabilita la generazione statica per questa pagina perché usa useSearchParams()
export const dynamic = 'force-dynamic'

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center mb-4">
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <Rocket className="w-7 h-7 text-white" />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Crea il tuo account
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Unisciti a migliaia di imprenditori digitali
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-gray-100 relative">
          <RegisterForm />
          
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Hai già un account?{' '}
              <Link href="/login" className="text-indigo-600 hover:underline font-medium">
                Accedi qui
              </Link>
            </p>
          </div>
        </div>
      </div>

      <div className="mt-8 text-center text-xs text-gray-500">
        <p>
          Cliccando "Crea il tuo account" accetti i nostri{' '}
          <Link href="/terms" className="text-indigo-600 hover:underline">Termini di servizio</Link>
          {' '}e la{' '}
          <Link href="/privacy" className="text-indigo-600 hover:underline">Privacy Policy</Link>
        </p>
      </div>
    </div>
  )
}