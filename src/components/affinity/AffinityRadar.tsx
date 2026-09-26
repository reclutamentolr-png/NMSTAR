import { AFFINITY_AXES, type AffinityMap } from '@/lib/affinity'

export type RadarSeries = { map: AffinityMap; color: string }

// Grafico radar a 5 assi (SVG, nessuna libreria). Con due serie mostra le
// due mappe sovrapposte (modalità Duo).
export default function AffinityRadar({
  series,
  labels,
  size = 280,
  dark = false,
}: {
  series: RadarSeries[]
  labels: Record<string, string>
  size?: number
  dark?: boolean
}) {
  const center = size / 2
  const radius = size / 2 - 44
  const angle = (index: number) => -Math.PI / 2 + (index * 2 * Math.PI) / AFFINITY_AXES.length
  const point = (index: number, value: number) => {
    const a = angle(index)
    return [center + Math.cos(a) * radius * value, center + Math.sin(a) * radius * value]
  }
  const grid = dark ? 'rgba(255,255,255,0.15)' : 'rgba(23,23,23,0.12)'
  const text = dark ? 'rgba(255,255,255,0.85)' : '#374151'

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="mx-auto h-auto w-full max-w-[320px]" role="img">
      {[0.25, 0.5, 0.75, 1].map((level) => (
        <polygon
          key={level}
          points={AFFINITY_AXES.map((_, i) => point(i, level).join(',')).join(' ')}
          fill="none"
          stroke={grid}
          strokeWidth={1}
        />
      ))}
      {AFFINITY_AXES.map((axis, i) => {
        const [x, y] = point(i, 1)
        return <line key={axis} x1={center} y1={center} x2={x} y2={y} stroke={grid} strokeWidth={1} />
      })}
      {series.map(({ map, color }, s) => (
        <polygon
          key={s}
          points={AFFINITY_AXES.map((axis, i) => point(i, Math.max(map[axis], 0.04)).join(',')).join(' ')}
          fill={color}
          fillOpacity={0.28}
          stroke={color}
          strokeWidth={2.5}
          strokeLinejoin="round"
        />
      ))}
      {AFFINITY_AXES.map((axis, i) => {
        const [x, y] = point(i, 1.22)
        return (
          <text key={axis} x={x} y={y} textAnchor="middle" dominantBaseline="middle" fontSize={12} fontWeight={600} fill={text}>
            {labels[axis]}
          </text>
        )
      })}
    </svg>
  )
}
