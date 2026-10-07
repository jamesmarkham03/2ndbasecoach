import type { Measurement, MetricType } from './supabase'

export type MetricSummary = {
  count: number
  first: Measurement
  latest: Measurement
  best: Measurement
  /** latest minus first, flipped for times so a positive number always means "got better". */
  improvement: number
}

/** "Better" depends on the metric: more mph is better, fewer seconds is better. */
export function isBetter(a: number, b: number, metric: MetricType): boolean {
  return metric.higher_is_better ? a > b : a < b
}

/** Oldest first; same-day entries keep the order they were typed in. */
export function sortChronologically(rows: Measurement[]): Measurement[] {
  return [...rows].sort(
    (a, b) => a.recorded_on.localeCompare(b.recorded_on) || a.created_at.localeCompare(b.created_at),
  )
}

/** Summary for one player's history on one metric. Returns null if there's no data. */
export function summarize(rows: Measurement[], metric: MetricType): MetricSummary | null {
  if (rows.length === 0) return null
  const sorted = sortChronologically(rows)
  const first = sorted[0]
  const latest = sorted[sorted.length - 1]
  const best = sorted.reduce((top, row) => (isBetter(row.value, top.value, metric) ? row : top))
  const rawChange = latest.value - first.value
  return {
    count: sorted.length,
    first,
    latest,
    best,
    improvement: metric.higher_is_better ? rawChange : -rawChange,
  }
}
