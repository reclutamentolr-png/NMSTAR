// The 12-color palette introduced for "Link in Bio" (see linkInBioThemes.ts)
// as hex values, reused here as Kumani's standard color picker wherever a
// feature needs a single accent color (not a whole page theme) — e.g. the
// QR Code Pro foreground/background swatches. Keep the hex values visually
// matched to that file's Tailwind swatchClass colors so the same name looks
// the same everywhere.

export type StandardColorKey =
  | 'nero'
  | 'bianco'
  | 'oro'
  | 'rosso'
  | 'rosa'
  | 'arancione'
  | 'giallo'
  | 'verde'
  | 'azzurro'
  | 'blu'
  | 'viola'
  | 'grigio'

export interface StandardColor {
  key: StandardColorKey
  label: string
  hex: string
  // True for colors too light to read reliably as a QR code's dark modules
  // on a plain white background — callers pairing a color with a
  // light/dark counterpart (foreground vs. background) should swap the
  // pairing for these two instead of using them as the "dark" side.
  isLight: boolean
}

export const STANDARD_COLORS: Record<StandardColorKey, StandardColor> = {
  nero: { key: 'nero', label: 'Nero', hex: '#171717', isLight: false },
  bianco: { key: 'bianco', label: 'Bianco', hex: '#ffffff', isLight: true },
  oro: { key: 'oro', label: 'Oro', hex: '#c79a3b', isLight: false },
  rosso: { key: 'rosso', label: 'Rosso', hex: '#dc2626', isLight: false },
  rosa: { key: 'rosa', label: 'Rosa', hex: '#ec4899', isLight: false },
  arancione: { key: 'arancione', label: 'Arancione', hex: '#f97316', isLight: false },
  giallo: { key: 'giallo', label: 'Giallo', hex: '#facc15', isLight: true },
  verde: { key: 'verde', label: 'Verde', hex: '#16a34a', isLight: false },
  azzurro: { key: 'azzurro', label: 'Azzurro', hex: '#0ea5e9', isLight: false },
  blu: { key: 'blu', label: 'Blu', hex: '#1d4ed8', isLight: false },
  viola: { key: 'viola', label: 'Viola', hex: '#9333ea', isLight: false },
  grigio: { key: 'grigio', label: 'Grigio', hex: '#64748b', isLight: false },
}

export const ALL_STANDARD_COLOR_KEYS: StandardColorKey[] = [
  'nero', 'bianco', 'oro', 'rosso', 'rosa', 'arancione',
  'giallo', 'verde', 'azzurro', 'blu', 'viola', 'grigio',
]
