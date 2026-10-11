import type { MetricType, Player } from './supabase'

/** Today's date as YYYY-MM-DD in the coach's own time zone (not UTC). */
export function todayLocal(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/**
 * Turns '2026-10-07' into 'Oct 7, 2026'.
 * Built from parts on purpose: new Date('2026-10-07') is read as UTC midnight,
 * which shows as Oct 6 in North America.
 */
export function formatDate(isoDate: string, withYear = true): string {
  const [y, m, d] = isoDate.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-CA', {
    month: 'short',
    day: 'numeric',
    ...(withYear ? { year: 'numeric' } : {}),
  })
}

export function formatValue(value: number, metric: MetricType, withUnit = true): string {
  const num = value.toFixed(metric.decimals)
  return withUnit ? `${num} ${metric.unit}` : num
}

export function playerName(p: Player): string {
  return `${p.first_name} ${p.last_name}`.trim()
}

/** "1 drill", "4 drills". */
export function countLabel(n: number, singular: string, plural = `${singular}s`): string {
  return `${n} ${n === 1 ? singular : plural}`
}
