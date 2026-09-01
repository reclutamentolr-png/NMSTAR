'use client'

import { useState } from 'react'
import { Copy, Send, MessageSquare } from 'lucide-react'

type Template = {
  id: number
  title: string
  tone: string
  message: string
}

type WhatsAppTemplatesProps = {
  referralUrl: string
}

export default function WhatsAppTemplates({ referralUrl }: WhatsAppTemplatesProps) {
  const [copiedId, setCopiedId] = useState<number | null>(null)

  const templates: Template[] = [
    {
      id: 1,
      title: 'Invito amichevole',
      tone: 'Informale',
      message: `Ciao! 👋 Ho scoperto un'opportunità interessante e ho pensato a te. Dai un'occhiata al mio progetto: ${referralUrl} Fammi sapere cosa ne pensi! 😊`
    },
    {
      id: 2,
      title: 'Approccio professionale',
      tone: 'Formale',
      message: `Buongiorno, le scrivo per presentarle un'opportunità di business nel settore del network marketing. Può trovare maggiori informazioni qui: ${referralUrl} Resto a disposizione per eventuali chiarimenti.`
    },
    {
      id: 3,
      title: 'Storytelling personale',
      tone: 'Emozionale',
      message: `Ehi! Volevo condividere con te un'esperienza che ha cambiato il mio modo di vedere il lavoro. Ho iniziato questo percorso e i risultati mi stanno sorprendendo. Se ti va di saperne di più: ${referralUrl} 🚀`
    },
    {
      id: 4,
      title: 'Follow-up dopo incontro',
      tone: 'Caldo',
      message: `Ciao! È stato un piacere conoscerti oggi. Come promesso, ecco il link al mio progetto: ${referralUrl} Quando hai un momento, diamoci un feedback! ☕`
    }
  ]

  const handleCopy = async (template: Template) => {
    try {
      await navigator.clipboard.writeText(template.message)
      setCopiedId(template.id)
      setTimeout(() => setCopiedId(null), 2000)
      alert('Messaggio copiato! Incollalo in WhatsApp.')
    } catch (err) {
      console.error('Errore copia:', err)
    }
  }

  return (
    <div className="space-y-4">
      {templates.map((template) => (
        <div key={template.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
          <div className="p-6">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="text-lg font-bold text-gray-900">{template.title}</h3>
                <span className="inline-block mt-1 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                  {template.tone}
                </span>
              </div>
              <MessageSquare className="w-6 h-6 text-green-500" />
            </div>
            
            <div className="bg-gray-50 rounded-lg p-4 mb-4 border-l-4 border-green-500">
              <p className="text-gray-700 text-sm whitespace-pre-wrap">{template.message}</p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => handleCopy(template)}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
              >
                <Copy className="w-4 h-4" />
                {copiedId === template.id ? 'Copiato!' : 'Copia messaggio'}
              </button>
              <a
                href={`https://wa.me/?text=${encodeURIComponent(template.message)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors"
              >
                <Send className="w-4 h-4" />
                Invia su WhatsApp
              </a>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}