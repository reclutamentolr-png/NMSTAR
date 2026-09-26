// Immagine finale di Veritas (1080×1350) disegnata su Canvas: classifica
// della partita e invito a giocare.
export async function renderVeritasShareCard(texts: {
  title: string
  winnerLine: string
  ranking: { nickname: string; score: number }[]
  footer: string
  site: string
}): Promise<Blob | null> {
  const width = 1080
  const height = 1350
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  const bg = ctx.createLinearGradient(0, 0, width, height)
  bg.addColorStop(0, '#1f1a2e')
  bg.addColorStop(1, '#141311')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, width, height)
  ctx.strokeStyle = 'rgba(231,197,106,0.5)'
  ctx.lineWidth = 4
  ctx.strokeRect(36, 36, width - 72, height - 72)

  ctx.textAlign = 'center'
  ctx.fillStyle = '#e7c56a'
  ctx.font = 'bold 44px sans-serif'
  ctx.fillText('K U M A N I   ·   V E R I T A S', width / 2, 140)
  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 84px sans-serif'
  ctx.fillText(texts.title, width / 2, 270)
  ctx.fillStyle = 'rgba(255,255,255,0.8)'
  ctx.font = '40px sans-serif'
  ctx.fillText(texts.winnerLine, width / 2, 350)

  const medals = ['#e7c56a', '#cfd4da', '#c98a4b']
  texts.ranking.slice(0, 6).forEach((row, i) => {
    const y = 480 + i * 115
    ctx.fillStyle = i < 3 ? 'rgba(231,197,106,0.12)' : 'rgba(255,255,255,0.05)'
    ctx.fillRect(140, y - 70, width - 280, 95)
    ctx.textAlign = 'left'
    ctx.fillStyle = medals[i] ?? 'rgba(255,255,255,0.7)'
    ctx.font = 'bold 48px sans-serif'
    ctx.fillText(`${i + 1}.`, 175, y)
    ctx.fillStyle = '#ffffff'
    ctx.font = '46px sans-serif'
    ctx.fillText(row.nickname.slice(0, 18), 260, y)
    ctx.textAlign = 'right'
    ctx.fillStyle = '#e7c56a'
    ctx.font = 'bold 48px sans-serif'
    ctx.fillText(String(row.score), width - 175, y)
  })

  ctx.textAlign = 'center'
  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 42px sans-serif'
  ctx.fillText(texts.footer, width / 2, height - 150)
  ctx.fillStyle = '#e7c56a'
  ctx.font = '32px sans-serif'
  ctx.fillText(texts.site, width / 2, height - 92)

  return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), 'image/png'))
}
