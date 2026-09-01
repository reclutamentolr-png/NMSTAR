'use client'

import { useState } from 'react'
import { parseInput, categorizeInput } from '@/lib/memolife-parser'
import { 
  Mic, 
  Send, 
  Calendar, 
  Receipt, 
  User, 
  CheckSquare, 
  FileText,
  Loader2
} from 'lucide-react'

type SmartInputProps = {
  onSubmit: (text: string, parsedData: any) => void
}

export default function SmartInput({ onSubmit }: SmartInputProps) {
  const [inputText, setInputText] = useState('')
  const [isListening, setIsListening] = useState(false)
  const [recognizedCategory, setRecognizedCategory] = useState<string | null>(null)
  const [parsedPreview, setParsedPreview] = useState<any>(null)

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value
    setInputText(text)
    
    if (text.length > 5) {
      const category = categorizeInput(text)
      const parsed = parseInput(text)
      setRecognizedCategory(category)
      setParsedPreview(parsed)
    } else {
      setRecognizedCategory(null)
      setParsedPreview(null)
    }
  }

  const handleSubmit = () => {
    if (inputText.trim()) {
      const parsed = parseInput(inputText)
      onSubmit(inputText, parsed)
      setInputText('')
      setRecognizedCategory(null)
      setParsedPreview(null)
    }
  }

  const startVoiceRecognition = () => {
    if (!('webkitSpeechRecognition' in window)) {
      alert('Il tuo browser non supporta il riconoscimento vocale. Prova Chrome.')
      return
    }

    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition
    const recognition = new SpeechRecognition()
    recognition.lang = 'it-IT'
    recognition.continuous = false
    recognition.interimResults = false

    recognition.onstart = () => setIsListening(true)
    
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript
      setInputText(transcript)
      const category = categorizeInput(transcript)
      const parsed = parseInput(transcript)
      setRecognizedCategory(category)
      setParsedPreview(parsed)
    }

    recognition.onend = () => setIsListening(false)
    
    recognition.onerror = (event: any) => {
      console.error('Errore riconoscimento vocale:', event.error)
      setIsListening(false)
    }

    recognition.start()
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'appointment': return <Calendar className="w-4 h-4" />
      case 'bill': return <Receipt className="w-4 h-4" />
      case 'contact': return <User className="w-4 h-4" />
      case 'task': return <CheckSquare className="w-4 h-4" />
      default: return <FileText className="w-4 h-4" />
    }
  }

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'appointment': return 'Appuntamento'
      case 'bill': return 'Bolletta'
      case 'contact': return 'Contatto'
      case 'task': return 'Task'
      default: return 'Nota'
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'appointment': return 'bg-indigo-100 text-indigo-700'
      case 'bill': return 'bg-red-100 text-red-700'
      case 'contact': return 'bg-blue-100 text-blue-700'
      case 'task': return 'bg-orange-100 text-orange-700'
      default: return 'bg-green-100 text-green-700'
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
      <div className="flex gap-3">
        <input
          type="text"
          value={inputText}
          onChange={handleTextChange}
          onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
          placeholder="Scrivi o detta qualcosa... es: 'Dentista lunedì alle 15'"
          className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        
        <button
          onClick={startVoiceRecognition}
          disabled={isListening}
          className={`px-4 py-3 rounded-lg transition-colors flex items-center gap-2 ${
            isListening 
              ? 'bg-red-500 text-white animate-pulse' 
              : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
          }`}
          title="Detta a voce"
        >
          {isListening ? <Loader2 className="w-5 h-5 animate-spin" /> : <Mic className="w-5 h-5" />}
        </button>

        <button
          onClick={handleSubmit}
          disabled={!inputText.trim()}
          className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 text-white font-semibold rounded-lg transition-colors flex items-center gap-2"
        >
          <Send className="w-4 h-4" />
          Invia
        </button>
      </div>

      {recognizedCategory && parsedPreview && (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm text-gray-600">Rilevato:</span>
            <span className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${getCategoryColor(recognizedCategory)}`}>
              {getCategoryIcon(recognizedCategory)} {getCategoryLabel(recognizedCategory)}
            </span>
          </div>
          
          <div className="text-sm text-gray-700 space-y-1">
            {parsedPreview.title && <div><strong>Titolo:</strong> {parsedPreview.title}</div>}
            {parsedPreview.dateTime && <div><strong>Data/Ora:</strong> {new Date(parsedPreview.dateTime).toLocaleString('it-IT')}</div>}
            {parsedPreview.dueDate && <div><strong>Scadenza:</strong> {new Date(parsedPreview.dueDate).toLocaleDateString('it-IT')}</div>}
            {parsedPreview.amount && <div><strong>Importo:</strong> €{parsedPreview.amount}</div>}
            {parsedPreview.priority && <div><strong>Priorità:</strong> {parsedPreview.priority}</div>}
            {parsedPreview.phone && <div><strong>Telefono:</strong> {parsedPreview.phone}</div>}
            {parsedPreview.email && <div><strong>Email:</strong> {parsedPreview.email}</div>}
          </div>
        </div>
      )}
    </div>
  )
}