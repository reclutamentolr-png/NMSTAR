// Affinity — logica del gioco, condivisa da pagina dello strumento e link Duo.
// Testi di domande e risposte in messages/*.json (namespace "affinity",
// chiavi q1…q20 con text/a/b/c): qui solo asse e valore di ogni risposta.

export const AFFINITY_AXES = ['valori', 'ritmo', 'curiosita', 'calore', 'avventura'] as const
export type AffinityAxis = (typeof AFFINITY_AXES)[number]
export type AffinityMap = Record<AffinityAxis, number>

export const AFFINITY_ARCHETYPES = ['faro', 'marea', 'bosco', 'brace', 'vento'] as const
export type AffinityArchetype = (typeof AFFINITY_ARCHETYPES)[number]

// Archetipo "di casa" di ogni asse.
const ARCHETYPE_OF_AXIS: Record<AffinityAxis, AffinityArchetype> = {
  valori: 'faro',
  ritmo: 'marea',
  curiosita: 'bosco',
  calore: 'brace',
  avventura: 'vento',
}

export type AffinityQuestion = { id: string; axis: AffinityAxis; values: [number, number, number] }

// 4 domande per asse; values = punteggio delle risposte a, b, c.
const QUESTIONS_BY_AXIS: Record<AffinityAxis, AffinityQuestion[]> = {
  avventura: [
    { id: 'q1', axis: 'avventura', values: [1, 0, 0.5] },
    { id: 'q2', axis: 'avventura', values: [0.5, 1, 0] },
    { id: 'q3', axis: 'avventura', values: [1, 0, 0.5] },
    { id: 'q4', axis: 'avventura', values: [1, 0.5, 0] },
  ],
  calore: [
    { id: 'q5', axis: 'calore', values: [1, 0.5, 0] },
    { id: 'q6', axis: 'calore', values: [1, 0.5, 0] },
    { id: 'q7', axis: 'calore', values: [1, 0, 0.5] },
    { id: 'q8', axis: 'calore', values: [1, 0.5, 0] },
  ],
  curiosita: [
    { id: 'q9', axis: 'curiosita', values: [1, 0, 0.5] },
    { id: 'q10', axis: 'curiosita', values: [1, 0.5, 0] },
    { id: 'q11', axis: 'curiosita', values: [1, 0.5, 0] },
    { id: 'q12', axis: 'curiosita', values: [1, 0.5, 0] },
  ],
  ritmo: [
    { id: 'q13', axis: 'ritmo', values: [1, 0, 0.5] },
    { id: 'q14', axis: 'ritmo', values: [1, 0.5, 0] },
    { id: 'q15', axis: 'ritmo', values: [1, 0, 0.5] },
    { id: 'q16', axis: 'ritmo', values: [1, 0, 0.5] },
  ],
  valori: [
    { id: 'q17', axis: 'valori', values: [1, 0.5, 0] },
    { id: 'q18', axis: 'valori', values: [1, 0.5, 0] },
    { id: 'q19', axis: 'valori', values: [1, 0.5, 0] },
    { id: 'q20', axis: 'valori', values: [1, 0.5, 0] },
  ],
}

// Ordine di gioco: gli assi si alternano (una domanda per asse a giro).
export const AFFINITY_QUESTIONS: AffinityQuestion[] = [0, 1, 2, 3].flatMap((round) =>
  (['avventura', 'calore', 'curiosita', 'ritmo', 'valori'] as const).map((axis) => QUESTIONS_BY_AXIS[axis][round])
)

// answers[i] = indice della risposta scelta (0 = a, 1 = b, 2 = c) alla domanda i.
export function computeAffinityMap(answers: number[]): AffinityMap {
  const sums = Object.fromEntries(AFFINITY_AXES.map((axis) => [axis, 0])) as AffinityMap
  const counts = Object.fromEntries(AFFINITY_AXES.map((axis) => [axis, 0])) as AffinityMap
  AFFINITY_QUESTIONS.forEach((question, index) => {
    const choice = answers[index]
    if (choice === undefined) return
    sums[question.axis] += question.values[choice] ?? 0
    counts[question.axis] += 1
  })
  const map = {} as AffinityMap
  for (const axis of AFFINITY_AXES) {
    map[axis] = counts[axis] ? Math.round((sums[axis] / counts[axis]) * 100) / 100 : 0
  }
  return map
}

// Archetipo = asse più alto. A pari merito decide un ordine che ruota in base
// alle risposte, così i pareggi non finiscono sempre sullo stesso archetipo.
export function computeArchetype(map: AffinityMap, answers: number[]): AffinityArchetype {
  const top = Math.max(...AFFINITY_AXES.map((axis) => map[axis]))
  const tied = AFFINITY_AXES.filter((axis) => map[axis] === top)
  const seed = answers.reduce((sum, choice, index) => sum + (choice + 1) * (index + 1), 0)
  return ARCHETYPE_OF_AXIS[tied[seed % tied.length]]
}

// Compatibilità 0-100: distanza tra le due mappe (5 assi) riportata in percentuale.
export function computeCompatibility(a: AffinityMap, b: AffinityMap): number {
  const distance = Math.sqrt(AFFINITY_AXES.reduce((sum, axis) => sum + (a[axis] - b[axis]) ** 2, 0))
  return Math.round((1 - distance / Math.sqrt(AFFINITY_AXES.length)) * 100)
}

export function compatibilityTier(percent: number): 'high' | 'mid' | 'low' {
  return percent >= 85 ? 'high' : percent >= 70 ? 'mid' : 'low'
}

export function isAffinityMap(value: unknown): value is AffinityMap {
  if (!value || typeof value !== 'object') return false
  return AFFINITY_AXES.every((axis) => {
    const n = (value as Record<string, unknown>)[axis]
    return typeof n === 'number' && n >= 0 && n <= 1
  })
}

export function isAffinityArchetype(value: unknown): value is AffinityArchetype {
  return typeof value === 'string' && (AFFINITY_ARCHETYPES as readonly string[]).includes(value)
}
