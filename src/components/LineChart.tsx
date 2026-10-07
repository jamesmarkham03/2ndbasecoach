import { formatDate } from '../lib/format'
import { sortChronologically } from '../lib/stats'
import type { Measurement, MetricType } from '../lib/supabase'

type Props = {
  rows: Measurement[]
  metric: MetricType
  bestId?: string
}

// Drawing area in SVG units. The SVG scales to fit its container, so these are
// proportions, not pixels.
const W = 600
const H = 200
const PAD = { left: 48, right: 20, top: 20, bottom: 30 }

function dayNumber(isoDate: string): number {
  const [y, m, d] = isoDate.split('-').map(Number)
  return Date.UTC(y, m - 1, d) / 86_400_000
}

/**
 * Progress over time. Points are spaced by real dates, so a long gap between
 * tests looks like a long gap, and the personal best is highlighted.
 */
export function LineChart({ rows, metric, bestId }: Props) {
  const points = sortChronologically(rows)
  if (points.length === 0) return null

  const days = points.map((p) => dayNumber(p.recorded_on))
  const values = points.map((p) => p.value)
  const minDay = Math.min(...days)
  const maxDay = Math.max(...days)
  let minVal = Math.min(...values)
  let maxVal = Math.max(...values)
  // Breathing room above and below so dots don't sit on the edges.
  const spread = maxVal - minVal || Math.max(1, maxVal * 0.05)
  minVal -= spread * 0.15
  maxVal += spread * 0.15

  const plotW = W - PAD.left - PAD.right
  const plotH = H - PAD.top - PAD.bottom
  const x = (day: number) =>
    maxDay === minDay ? PAD.left + plotW / 2 : PAD.left + ((day - minDay) / (maxDay - minDay)) * plotW
  const y = (value: number) => PAD.top + (1 - (value - minVal) / (maxVal - minVal)) * plotH

  const path = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(days[i]).toFixed(1)} ${y(p.value).toFixed(1)}`)
    .join(' ')
  const showValueLabels = points.length <= 10

  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${metric.name} over time`}>
      {/* y-axis guide lines and labels: top, middle, bottom */}
      {[maxVal, (maxVal + minVal) / 2, minVal].map((v) => (
        <g key={v}>
          <line className="chart-grid" x1={PAD.left} x2={W - PAD.right} y1={y(v)} y2={y(v)} />
          <text className="chart-axis" x={PAD.left - 8} y={y(v) + 4} textAnchor="end">
            {v.toFixed(metric.decimals)}
          </text>
        </g>
      ))}

      <path className="chart-line" d={path} />

      {points.map((p, i) => {
        const isBest = p.id === bestId
        return (
          <g key={p.id}>
            <circle className={isBest ? 'chart-dot chart-dot-best' : 'chart-dot'} cx={x(days[i])} cy={y(p.value)} r={isBest ? 7 : 5} />
            {showValueLabels && (
              <text className="chart-value" x={x(days[i])} y={y(p.value) - 12} textAnchor="middle">
                {p.value.toFixed(metric.decimals)}
              </text>
            )}
          </g>
        )
      })}

      {/* first and last dates along the bottom */}
      <text className="chart-axis" x={x(minDay)} y={H - 8} textAnchor={maxDay === minDay ? 'middle' : 'start'}>
        {formatDate(points[0].recorded_on, false)}
      </text>
      {maxDay !== minDay && (
        <text className="chart-axis" x={x(maxDay)} y={H - 8} textAnchor="end">
          {formatDate(points[points.length - 1].recorded_on, false)}
        </text>
      )}
    </svg>
  )
}
