import { createClient } from '@/lib/supabase/server'

export default async function TestPage() {
  const supabase = await createClient()
  
  // Test: prova a leggere la versione di PostgreSQL
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .limit(1)
  
  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">🧪 Test Connessione Supabase</h1>
      
      {error ? (
        <div className="bg-yellow-100 border border-yellow-400 p-4 rounded">
          <p className="font-semibold">⚠️ Tabella 'profiles' non esiste ancora</p>
          <p className="text-sm mt-2">Questo è normale! Dobbiamo eseguire lo script SQL.</p>
          <p className="text-xs mt-2 text-gray-600">Errore: {error.message}</p>
        </div>
      ) : (
        <div className="bg-green-100 border border-green-400 p-4 rounded">
          <p className="font-semibold">✅ Connessione OK!</p>
          <p className="text-sm mt-2">La tabella 'profiles' esiste.</p>
        </div>
      )}
      
      <div className="mt-6 p-4 bg-gray-100 rounded">
        <p className="text-sm"><strong>URL Supabase:</strong> {process.env.NEXT_PUBLIC_SUPABASE_URL}</p>
        <p className="text-sm"><strong>Chiave anon:</strong> {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.substring(0, 20)}...</p>
      </div>
    </div>
  )
}