export type ParsedData = {
  category: 'appointment' | 'task' | 'bill' | 'contact' | 'note'
  title: string
  description?: string
  dateTime?: string
  dueDate?: string
  amount?: number
  priority?: 'low' | 'medium' | 'high'
  contactName?: string
  phone?: string
  email?: string
}

export function categorizeInput(text: string): ParsedData['category'] {
  const lowerText = text.toLowerCase()
  
  // Bollette (prima degli appuntamenti perché più specifico)
  if (lowerText.match(/bolletta|fattura|scadenza|pagare|luce|gas|acqua|telefono|internet|affitto|canone/)) {
    return 'bill'
  }
  
  // Contatti
  if (lowerText.match(/numero|telefono|cellulare|email|@|\d{3}[-.]?\d{3}[-.]?\d{4}/)) {
    return 'contact'
  }
  
  // Appuntamenti
  if (lowerText.match(/lunedì|martedì|mercoledì|giovedì|venerdì|sabato|domenica|alle|ore|appuntamento|riunione|dentista|medico|visita|incontro|domani|oggi/)) {
    return 'appointment'
  }
  
  // Task
  if (lowerText.match(/fare|comprare|chiamare|inviare|ricordati|task|da fare|preparare|portare|urgente|importante/)) {
    return 'task'
  }
  
  // Default: nota
  return 'note'
}

export function parseBill(text: string): Partial<ParsedData> {
  // Estrai importo (cerca numeri seguiti da € o euro)
  const amountMatch = text.match(/(\d+[.,]?\d*)\s*(?:€|euro)/i)
  let amount = amountMatch ? parseFloat(amountMatch[1].replace(',', '.')) : undefined
  
  // Estrai titolo (rimuovi parole chiave e importo)
  let title = text
    .replace(/bolletta|fattura|scadenza|pagare/gi, '')
    .replace(/(\d+[.,]?\d*)\s*(?:€|euro)/gi, '')
    .replace(/scadenza\s+\d{1,2}[\/\-]\d{1,2}(?:[\/\-]\d{2,4})?/gi, '')
    .trim()
  
  if (!title || title.length < 2) {
    title = 'Bolletta'
  }
  
  // Estrai data scadenza (formati: 15/04, 15/04/2026, 15-04-2026)
  const dateMatch = text.match(/(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?/i)
  let dueDate: string | undefined
  
  if (dateMatch) {
    const day = parseInt(dateMatch[1])
    const month = parseInt(dateMatch[2]) - 1
    const year = dateMatch[3] 
      ? (dateMatch[3].length === 2 ? 2000 + parseInt(dateMatch[3]) : parseInt(dateMatch[3]))
      : new Date().getFullYear()
    const date = new Date(year, month, day)
    dueDate = date.toISOString().split('T')[0]
  } else {
    // Default: oggi + 30 giorni
    const defaultDate = new Date()
    defaultDate.setDate(defaultDate.getDate() + 30)
    dueDate = defaultDate.toISOString().split('T')[0]
  }
  
  console.log('🔍 Parser bolletta:', { title, amount, dueDate })
  
  return { title, amount, dueDate }
}

export function parseAppointment(text: string): Partial<ParsedData> {
  const days: Record<string, number> = {
    'lunedì': 1, 'martedì': 2, 'mercoledì': 3, 'giovedì': 4,
    'venerdì': 5, 'sabato': 6, 'domenica': 0
  }
  
  let dateTime: Date | null = null
  let title = text
  
  // Cerca "oggi" o "domani"
  if (text.toLowerCase().includes('oggi')) {
    dateTime = new Date()
    title = text.replace(/oggi/gi, '').trim()
  } else if (text.toLowerCase().includes('domani')) {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    dateTime = tomorrow
    title = text.replace(/domani/gi, '').trim()
  } else {
    // Cerca giorno della settimana
    for (const [dayName, dayNum] of Object.entries(days)) {
      if (text.toLowerCase().includes(dayName)) {
        const today = new Date()
        const currentDay = today.getDay()
        let daysUntil = dayNum - currentDay
        if (daysUntil <= 0) daysUntil += 7
        
        const targetDate = new Date(today)
        targetDate.setDate(today.getDate() + daysUntil)
        
        // Cerca orario
        const timeMatch = text.match(/alle\s+(\d{1,2})(?::(\d{2}))?/i)
        if (timeMatch) {
          const hours = parseInt(timeMatch[1])
          const minutes = timeMatch[2] ? parseInt(timeMatch[2]) : 0
          targetDate.setHours(hours, minutes, 0, 0)
        } else {
          targetDate.setHours(9, 0, 0, 0)
        }
        
        dateTime = targetDate
        title = text.split(new RegExp(dayName, 'i'))[0].trim()
        break
      }
    }
  }
  
  if (!title || title.length < 2) {
    title = 'Appuntamento'
  }
  
  return {
    title,
    dateTime: dateTime?.toISOString() || new Date().toISOString()
  }
}

export function parseTask(text: string): Partial<ParsedData> {
  let priority: 'low' | 'medium' | 'high' = 'medium'
  
  if (text.toLowerCase().match(/urgente|importante|subito|asap|priorità alta/)) {
    priority = 'high'
  } else if (text.toLowerCase().match(/quando puoi|non urgente|bassa priorità/)) {
    priority = 'low'
  }
  
  return { title: text, priority }
}

export function parseContact(text: string): Partial<ParsedData> {
  const phoneMatch = text.match(/(\d{3}[-.]?\d{3}[-.]?\d{4}|\d{10})/)
  const emailMatch = text.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/)
  const nameMatch = text.match(/(?:di|del|della)\s+([A-Z][a-z]+)/i)
  
  return {
    title: nameMatch ? nameMatch[1] : 'Nuovo contatto',
    phone: phoneMatch?.[0],
    email: emailMatch?.[0],
    contactName: nameMatch?.[1]
  }
}

export function parseInput(text: string): ParsedData {
  const category = categorizeInput(text)
  
  let parsed: Partial<ParsedData> = { title: text }
  
  switch (category) {
    case 'appointment':
      parsed = parseAppointment(text)
      break
    case 'bill':
      parsed = parseBill(text)
      break
    case 'task':
      parsed = parseTask(text)
      break
    case 'contact':
      parsed = parseContact(text)
      break
    default:
      parsed = { title: text }
  }
  
  return {
    category,
    title: parsed.title || text,
    ...parsed
  }
}