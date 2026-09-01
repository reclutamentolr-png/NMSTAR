'use client'

import { useState, useEffect } from 'react'

type WhatsAppMessageGeneratorProps = {
  referralUrl: string
  userName: string
}

type Template = {
  id: string
  name: string
  emoji: string
  text: string
  description: string
}

const templates: Template[] = [
  {
    id: 'friendly',
    name: 'Invito Amichevole',
    emoji: '💬',
    description: 'Approccio informale e amichevole',
    text: `Ciao! 👋

Spero tu stia bene! Volevo condividerti un'opportunità che sto valutando da qualche tempo.

Si tratta di un progetto di network marketing che mi sta dando molta soddisfazione. Se anche tu sei alla ricerca di un'entrata extra o vuoi semplicemente saperne di più, ti invito a dare un'occhiata:

{{REFERRAL_URL}}

Fammi sapere cosa ne pensi! Senza impegno 😊

Un abbraccio,
{{USER_NAME}}`
  },
  {
    id: 'business',
    name: 'Presentazione Business',
    emoji: '',
    description: 'Approccio professionale e diretto',
    text: `Buongiorno,

Sono {{USER_NAME}} e sto sviluppando un progetto imprenditoriale nel settore del network marketing.

Sto selezionando persone motivate e ambiziose che vogliono:
✅ Aumentare le proprie entrate
✅ Lavorare in autonomia
✅ Far parte di un team in crescita

Se sei interessato/a a ricevere maggiori informazioni, visita:
{{REFERRAL_URL}}

Disponibile per una chiacchierata senza impegno.

A presto,
{{USER_NAME}}`
  },
  {
    id: 'opportunity',
    name: 'Opportunità Extra',
    emoji: '💰',
    description: 'Focus sul guadagno aggiuntivo',
    text: `Ciao! 

Hai mai pensato di creare una seconda fonte di reddito? 💰

Sto collaborando con un'azienda in forte crescita e sto cercando persone serie e determinate da inserire nel mio team.

✨ Cosa offro:
- Formazione gratuita
- Flessibilità totale
- Guadagni basati sui tuoi risultati

Scopri di più qui:
{{REFERRAL_URL}}

Scrivimi per info!

{{USER_NAME}}`
  },
  {
    id: 'direct',
    name: 'Diretto e Conciso',
    emoji: '',
    description: 'Messaggio breve e dritto al punto',
    text: `Ciao! Cerchi un'opportunità per guadagnare extra lavorando da casa? 

Guarda qui: {{REFERRAL_URL}}

Fammi sapere se vuoi info! 

{{USER_NAME}}`
  },
  {
    id: 'social',
    name: 'Social Media',
    emoji: '📱',
    description: 'Perfetto per Instagram/Facebook',
    text: `🌟 OPPORTUNITÀ DA NON PERDERE! 🌟

Stai cercando un modo per:
💸 Aumentare le tue entrate
⏰ Gestire il tuo tempo
 Crescere professionalmente

Ho la soluzione che fa per te! 

Clicca sul link e scopri come:
{{REFERRAL_URL}}

#NetworkMarketing #Opportunità #LavoroDaCasa #CrescitaPersonale

{{USER_NAME}}`
  }
]

// Funzione per sostituire i placeholder con i valori reali
function replacePlaceholders(text: string, referralUrl: string, userName: string): string {
  return text
    .replace(/\{\{REFERRAL_URL\}\}/g, referralUrl)
    .replace(/\{\{USER_NAME\}\}/g, userName)
}

export default function WhatsAppMessageGenerator({ 
  referralUrl, 
  userName 
}: WhatsAppMessageGeneratorProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<Template>(templates[0])
  const [customMessage, setCustomMessage] = useState('')
  const [copied, setCopied] = useState(false)

  // Quando cambiano i props o il template, aggiorna il messaggio con i placeholder sostituiti
  useEffect(() => {
    const messageWithRealValues = replacePlaceholders(
      selectedTemplate.text,
      referralUrl,
      userName
    )
    setCustomMessage(messageWithRealValues)
  }, [selectedTemplate, referralUrl, userName])

  const handleTemplateChange = (template: Template) => {
    setSelectedTemplate(template)
    // Il useEffect si occuperà di aggiornare il messaggio
  }

  const handleMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCustomMessage(e.target.value)
  }

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(customMessage)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const openWhatsApp = () => {
    const encodedMessage = encodeURIComponent(customMessage)
    window.open(`https://wa.me/?text=${encodedMessage}`, '_blank')
  }

  const resetMessage = () => {
    const messageWithRealValues = replacePlaceholders(
      selectedTemplate.text,
      referralUrl,
      userName
    )
    setCustomMessage(messageWithRealValues)
  }

  return (
    <div className="space-y-8">
      {/* Sezione Template */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Scegli un Template
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((template) => (
            <button
              key={template.id}
              onClick={() => handleTemplateChange(template)}
              className={`p-4 rounded-xl border-2 text-left transition-all ${
                selectedTemplate.id === template.id
                  ? 'border-green-500 bg-green-50 shadow-md'
                  : 'border-gray-200 hover:border-green-300 hover:shadow-sm'
              }`}
            >
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">{template.emoji}</span>
                <span className="font-semibold text-gray-900">
                  {template.name}
                </span>
              </div>
              <p className="text-sm text-gray-600">{template.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Editor Messaggio */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Personalizza il Messaggio
          </h3>
          <button
            onClick={resetMessage}
            className="text-sm text-gray-600 hover:text-gray-900 underline"
          >
            Ripristina template
          </button>
        </div>
        
        <div className="bg-white rounded-xl border border-gray-300 p-4">
          <textarea
            value={customMessage}
            onChange={handleMessageChange}
            rows={12}
            className="w-full resize-none focus:outline-none focus:ring-2 focus:ring-green-500 rounded-lg p-2 font-mono text-sm"
            placeholder="Il tuo messaggio apparirà qui..."
          />
        </div>
        
        <p className="text-sm text-gray-500 mt-2">
          💡 Il tuo link referral e il tuo nome sono già stati inseriti automaticamente. Puoi modificare il testo come preferisci!
        </p>
      </div>

      {/* Anteprima WhatsApp */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Anteprima
        </h3>
        <div className="bg-green-50 rounded-xl p-6 border border-green-200">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-white font-bold">
              {userName.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 bg-white rounded-lg p-3 shadow-sm">
              <p className="text-sm text-gray-800 whitespace-pre-wrap font-mono">
                {customMessage}
              </p>
              <p className="text-xs text-gray-400 mt-2">
                {new Date().toLocaleTimeString('it-IT', { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Pulsanti Azione */}
      <div className="flex flex-col sm:flex-row gap-4">
        <button
          onClick={copyToClipboard}
          className="flex-1 bg-gray-800 hover:bg-gray-900 text-white font-semibold py-3 px-6 rounded-xl transition-colors flex items-center justify-center gap-2"
        >
          {copied ? (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Copiato!
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Copia Messaggio
            </>
          )}
        </button>
        
        <button
          onClick={openWhatsApp}
          className="flex-1 bg-green-500 hover:bg-green-600 text-white font-semibold py-3 px-6 rounded-xl transition-colors flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
          </svg>
          Apri WhatsApp
        </button>
      </div>
    </div>
  )
}