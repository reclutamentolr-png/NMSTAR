// Veritas — tipi condivisi e codice segreto del giocatore nel browser.

export type VeritasStatus = 'lobby' | 'writing' | 'voting' | 'reveal' | 'finished'

export type VeritasPlayer = {
  id: string
  nickname: string
  score: number
  is_host: boolean
  answered: boolean
  voted: boolean
}

export type VeritasAnswer = {
  slot: number
  body: string
  mine: boolean
  author: string | null
  is_liar: boolean | null
  votes: number | null
}

export type VeritasState = {
  room_id: string
  code: string
  locale: string
  status: VeritasStatus
  round: number
  total_rounds: number
  phase_ends_at: string | null
  server_now: string
  me: string
  is_host: boolean
  host_referral: string | null
  question: string | null
  i_am_liar: boolean
  my_answer: string | null
  my_vote_slot: number | null
  players: VeritasPlayer[]
  answers: VeritasAnswer[]
  liar_nickname: string | null
}

export type VeritasRoomInfo = {
  room_id: string
  status: VeritasStatus
  players: number
  host_nickname: string | null
  host_referral: string | null
}

export const VERITAS_REACTIONS = ['😂', '🤔', '😱', '👏', '🙈'] as const

// Il codice segreto resta solo in questo browser (una voce per stanza).
const key = (code: string) => `veritas:${code.toUpperCase()}`

export function saveVeritasSeat(code: string, seat: { room_id: string; token: string }) {
  try {
    localStorage.setItem(key(code), JSON.stringify(seat))
  } catch {
    // Senza localStorage si gioca finché la pagina resta aperta.
  }
}

export function readVeritasSeat(code: string): { room_id: string; token: string } | null {
  try {
    const raw = localStorage.getItem(key(code))
    return raw ? (JSON.parse(raw) as { room_id: string; token: string }) : null
  } catch {
    return null
  }
}

export function isRoomCode(value: string): boolean {
  return /^[A-Z0-9]{6}$/.test(value.toUpperCase())
}
