import RegisterForm from '@/components/RegisterForm'
import Link from 'next/link'

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Unisciti al Network
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Compila il modulo con il tuo codice invito per iniziare
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-xl sm:rounded-2xl sm:px-10 border border-gray-100 relative">
          <RegisterForm />
          
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Hai già un account?{' '}
              <Link href="/login" className="text-indigo-600 hover:underline font-semibold">
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