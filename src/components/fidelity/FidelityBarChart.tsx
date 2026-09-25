// Mini grafico a barre in SVG (nessuna libreria di grafici nel progetto,
// stesso approccio dei grafici di Spendly). Server component: niente JS.
export default function FidelityBarChart({
  data,
  highlightMax = false,
}: {
  data: { label: string; value: number }[]
  highlightMax?: boolean
}) {
  const width = 640
  const height = 160
  const labelH = 18
  const innerH = height - labelH - 14
  const max = Math.max(1, ...data.map((d) => d.value))
  const slot = width / data.length
  const barW = Math.max(4, Math.min(28, slot * 0.6))
  const maxValue = Math.max(...data.map((d) => d.value))

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full" role="img">
      {data.map((d, i) => {
        const h = (d.value / max) * innerH
        const x = i * slot + (slot - barW) / 2
        const y = 14 + innerH - h
        const strong = highlightMax && d.value > 0 && d.value === maxValue
        return (
          <g key={`${d.label}-${i}`}>
            <title>{`${d.label}: ${d.value}`}</title>
            <rect x={x} y={y} width={barW} height={Math.max(h, d.value > 0 ? 2 : 0)} rx={3} fill={strong ? 'var(--gold)' : 'var(--gold-bright)'} opacity={strong ? 1 : 0.55} />
            {d.value > 0 && (
              <text x={x + barW / 2} y={y - 3} textAnchor="middle" fontSize="10" fill="var(--muted)">
                {d.value}
              </text>
            )}
            <text x={i * slot + slot / 2} y={height - 4} textAnchor="middle" fontSize="10" fill="var(--muted)">
              {d.label}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
