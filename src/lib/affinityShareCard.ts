import { AFFINITY_AXES, type AffinityMap } from '@/lib/affinity'

// Immagine da condividere (1080×1350, formato storie/post) disegnata su
// Canvas nel browser: archetipo, mappa radar e invito a giocare.
export type ShareCardTexts = {
  eyebrow: string
  archetypeName: string
  archetypeLine: string
  axisLabels: Record<string, string>
  footer: string
  site: string
}

const INK = '#171717'
const GOLD = '#c79a3b'
const GOLD_BRIGHT = '#e7c56a'

function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number) {
  const words = text.split(' ')
  let line = ''
  let cursor = y
  for (const word of words) {
    const test = line ? `${line} ${word}` : word
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, cursor)
      line = word
      cursor += lineHeight
    } else {
      line = test
    }
  }
  if (line) ctx.fillText(line, x, cursor)
  return cursor
}

export async function renderAffinityShareCard(map: AffinityMap, texts: ShareCardTexts): Promise<Blob | null> {
  const width = 1080
  const height = 1350
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  const bg = ctx.createLinearGradient(0, 0, width, height)
  bg.addColorStop(0, '#1f1d19')
  bg.addColorStop(1, INK)
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, width, height)
  ctx.strokeStyle = 'rgba(199,154,59,0.45)'
  ctx.lineWidth = 4
  ctx.strokeRect(36, 36, width - 72, height - 72)

  ctx.textAlign = 'center'
  ctx.fillStyle = GOLD_BRIGHT
  ctx.font = 'bold 40px sans-serif'
  ctx.fillText('K U M A N I   ·   A F F I N I T Y', width / 2, 130)

  ctx.fillStyle = 'rgba(255,255,255,0.7)'
  ctx.font = '36px sans-serif'
  ctx.fillText(texts.eyebrow, width / 2, 220)

  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 96px sans-serif'
  ctx.fillText(texts.archetypeName, width / 2, 330)

  ctx.fillStyle = 'rgba(255,255,255,0.8)'
  ctx.font = '34px sans-serif'
  const afterLine = wrapText(ctx, texts.archetypeLine, width / 2, 400, 860, 46)

  // Radar
  const cx = width / 2
  const cy = Math.max(afterLine + 330, 790)
  const r = 250
  const angle = (i: number) => -Math.PI / 2 + (i * 2 * Math.PI) / AFFINITY_AXES.length
  const pt = (i: number, v: number): [number, number] => [cx + Math.cos(angle(i)) * r * v, cy + Math.sin(angle(i)) * r * v]

  ctx.strokeStyle = 'rgba(255,255,255,0.18)'
  ctx.lineWidth = 2
  for (const level of [0.25, 0.5, 0.75, 1]) {
    ctx.beginPath()
    AFFINITY_AXES.forEach((_, i) => {
      const [x, y] = pt(i, level)
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    })
    ctx.closePath()
    ctx.stroke()
  }
  AFFINITY_AXES.forEach((_, i) => {
    const [x, y] = pt(i, 1)
    ctx.beginPath()
    ctx.moveTo(cx, cy)
    ctx.lineTo(x, y)
    ctx.stroke()
  })

  ctx.beginPath()
  AFFINITY_AXES.forEach((axis, i) => {
    const [x, y] = pt(i, Math.max(map[axis], 0.04))
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  })
  ctx.closePath()
  ctx.fillStyle = 'rgba(231,197,106,0.35)'
  ctx.fill()
  ctx.strokeStyle = GOLD_BRIGHT
  ctx.lineWidth = 6
  ctx.lineJoin = 'round'
  ctx.stroke()

  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 34px sans-serif'
  AFFINITY_AXES.forEach((axis, i) => {
    const [x, y] = pt(i, 1.2)
    ctx.textBaseline = 'middle'
    ctx.fillText(texts.axisLabels[axis], x, y)
  })
  ctx.textBaseline = 'alphabetic'

  ctx.fillStyle = GOLD
  ctx.fillRect(width / 2 - 60, height - 210, 120, 4)
  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 40px sans-serif'
  ctx.fillText(texts.footer, width / 2, height - 140)
  ctx.fillStyle = GOLD_BRIGHT
  ctx.font = '32px sans-serif'
  ctx.fillText(texts.site, width / 2, height - 86)

  return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), 'image/png'))
}
