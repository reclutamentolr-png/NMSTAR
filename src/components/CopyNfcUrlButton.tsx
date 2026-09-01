'use client'

export default function CopyNfcUrlButton({ url }: { url: string }) {
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      alert('Link copiato negli appunti!')
    } catch (err) {
      console.error('Errore nella copia:', err)
      alert('Errore nella copia del link')
    }
  }

  return (
    <button
      onClick={handleCopy}
      className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition-colors"
    >
      Copia
    </button>
  )
}