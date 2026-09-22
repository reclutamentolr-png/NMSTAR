export type Ear = 'left' | 'right'
export type DeviceConfirmation = 'headphones' | 'speaker'

// Standard audiometry frequencies (250Hz-8000Hz) plus a high-frequency
// extension (10-17.5kHz) near the upper edge of human hearing — quiet or
// inaudible for many adults (age-related high-frequency loss, or simply
// device/speaker rolloff), which is the intended source of difficulty.
// Not a clinical audiogram — see the in-app disclaimer.
export const ACOUSTIC_FREQUENCIES = [
  250, 500, 1000, 2000, 4000, 8000, 10000, 12000, 14000, 16000, 17500,
] as const
export type AcousticFrequency = (typeof ACOUSTIC_FREQUENCIES)[number]

export interface AcousticThreshold {
  ear: Ear
  frequency: AcousticFrequency
  // Gain (0-1) at which the tone was first detected. null = not detected
  // even at the maximum safe playback level.
  level: number | null
}

export interface AcousticTestResult {
  device: DeviceConfirmation
  thresholds: AcousticThreshold[]
}

// Friendly 0-100 sensitivity score, higher = better (same direction as the
// visual score below, so the shared history list reads consistently).
// Derived from the average gain level at which tones were detected across
// all frequencies/ears — a quieter average detection level means a higher
// score. Undetected points count at the max scanned level (1), the worst
// case, before the average is taken.
export function computeAcousticScore(thresholds: AcousticThreshold[]): number {
  if (thresholds.length === 0) return 0
  const avgLevel = thresholds.reduce((acc, t) => acc + (t.level ?? 1), 0) / thresholds.length
  return Math.round((1 - avgLevel) * 1000) / 10
}

export type Eye = 'left' | 'right'

export interface VisualFieldPoint {
  // Position relative to the central fixation point, -1..1 on each axis.
  x: number
  y: number
  detected: boolean
  reactionMs: number | null
  // Opacity (0-1) at which the point was detected — a perimetry-style
  // threshold, mirroring the acoustic test's gain level. null = not
  // detected even at the maximum opacity reached.
  threshold: number | null
}

export interface VisualEyeResult {
  eye: Eye
  points: VisualFieldPoint[]
  // Responses recorded during blank "catch" trials (no stimulus shown) —
  // a reliability indicator, same idea as false-positive catch trials in
  // real perimetry exams. Not folded into the score.
  falsePositives: number
  catchTrials: number
  // Friendly 0-100 sensitivity score, higher = better — same formula
  // shape as the acoustic score, based on average detection threshold.
  score: number
}

export interface VisualTestResult {
  eyes: VisualEyeResult[]
}

export function computeEyeVisualScore(points: VisualFieldPoint[]): number {
  if (points.length === 0) return 0
  const avgThreshold = points.reduce((acc, p) => acc + (p.threshold ?? 1), 0) / points.length
  return Math.round((1 - avgThreshold) * 1000) / 10
}

export function computeVisualScore(eyes: VisualEyeResult[]): number {
  if (eyes.length === 0) return 0
  return Math.round((eyes.reduce((acc, e) => acc + e.score, 0) / eyes.length) * 10) / 10
}
