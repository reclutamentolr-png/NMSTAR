import type { CSSProperties } from 'react'

// Stili del menù pubblico. Ogni stile è un set di variabili CSS usate dalla
// pagina /m/<token> (sfondo, testo, accento, linee) più il font dei titoli.
export const MENU_TEMPLATES = ['elegante', 'trattoria', 'bistro', 'marina'] as const
export type MenuTemplate = (typeof MENU_TEMPLATES)[number]

type Theme = {
  vars: Record<'--m-bg' | '--m-text' | '--m-accent' | '--m-accent-ink' | '--m-line', string>
  headingFont: string
  bodyFont: string
  // Colori per l'anteprima nel builder
  swatch: [string, string]
}

export const MENU_THEMES: Record<MenuTemplate, Theme> = {
  // Nero + oro, il brand KUMANI: fine dining, rooftop
  elegante: {
    vars: { '--m-bg': '#141311', '--m-text': '#f4efe3', '--m-accent': '#e7c56a', '--m-accent-ink': '#141311', '--m-line': '#c79a3b' },
    headingFont: 'font-serif',
    bodyFont: 'font-sans',
    swatch: ['#141311', '#e7c56a'],
  },
  // Carta avorio e terracotta, titoli con grazie: osterie, pizzerie storiche
  trattoria: {
    vars: { '--m-bg': '#f7efdf', '--m-text': '#3b2a1a', '--m-accent': '#a13d1f', '--m-accent-ink': '#fff8ec', '--m-line': '#a13d1f' },
    headingFont: 'font-serif',
    bodyFont: 'font-serif',
    swatch: ['#f7efdf', '#a13d1f'],
  },
  // Bianco pulito e sans serif: locali giovani, café
  bistro: {
    vars: { '--m-bg': '#ffffff', '--m-text': '#18181b', '--m-accent': '#0f766e', '--m-accent-ink': '#ffffff', '--m-line': '#18181b' },
    headingFont: 'font-sans',
    bodyFont: 'font-sans',
    swatch: ['#ffffff', '#0f766e'],
  },
  // Sabbia e blu mare: ristoranti di pesce, stabilimenti
  marina: {
    vars: { '--m-bg': '#f4eee2', '--m-text': '#0c2d48', '--m-accent': '#0369a1', '--m-accent-ink': '#ffffff', '--m-line': '#0c2d48' },
    headingFont: 'font-serif',
    bodyFont: 'font-sans',
    swatch: ['#f4eee2', '#0369a1'],
  },
}

export function isMenuTemplate(value: unknown): value is MenuTemplate {
  return typeof value === 'string' && (MENU_TEMPLATES as readonly string[]).includes(value)
}

export function menuThemeStyle(template: MenuTemplate): CSSProperties {
  return MENU_THEMES[template].vars as CSSProperties
}
