import { useEffect, useState } from 'react'
import { formatDate } from '../../lib/format'
import { supabase, type TestingDay, type TestingEntry, type TestingResult } from '../../lib/supabase'
import { KIND_DECIMALS, formatResult, lowerIsBetter, metricKind, resultFromKey, resultKey, resultLabel, sortResultKeys } from '../../lib/testing'
import { LineChart } from '../LineChart'

type Loaded = { days: TestingDay[]; entries: TestingEntry[]; results: TestingResult[] }

/** A player's Pro Day and indoor testing history: one chart per measure, plus the day-by-day notes. */
export function TestingProgress({ playerId }: { playerId: string }) {
  const [data, setData] = useState<Loaded | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [picked, setPicked] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load(): Promise<Loaded> {
      const e = await supabase.from('testing_entries').select('*').eq('player_id', playerId)
      if (e.error) throw e.error
      if (e.data.length === 0) return { days: [], entries: [], results: [] }
      const [d, r] = await Promise.all([
        supabase.from('testing_days').select('*').in('id', e.data.map((x) => x.day_id)),
        supabase.from('testing_results').select('*').in('entry_id', e.data.map((x) => x.id)),
      ])
      if (d.error || r.error) throw d.error ?? r.error
      return { days: d.data, entries: e.data, results: r.data }
    }
    load()
      .then((out) => {
        if (!cancelled) setData(out)
      })
      .catch((err: { message: string }) => {
        if (!cancelled) setError(err.message)
      })
    return () => {
      cancelled = true
    }
  }, [playerId])

  if (error) return <p className="msg msg-error">Couldn’t load Pro Days: {error}</p>
  if (!data || data.entries.length === 0) return null

  const dayById = new Map(data.days.map((d) => [d.id, d]))
  const entryById = new Map(data.entries.map((e) => [e.id, e]))
  const dayOf = (r: TestingResult) => dayById.get(entryById.get(r.entry_id)?.day_id ?? '')

  const keys = sortResultKeys(data.results.map(resultKey))
  const key = picked && keys.includes(picked) ? picked : keys[0]
  const notes = data.entries
    .filter((e) => e.note)
    .map((e) => ({ entry: e, day: dayById.get(e.day_id) }))
    .sort((a, b) => (b.day?.held_on ?? '').localeCompare(a.day?.held_on ?? ''))

  const history = data.results.filter((r) => resultKey(r) === key && dayOf(r))
  const points = history.map((r) => ({ id: r.id, value: r.value, recorded_on: dayOf(r)!.held_on, created_at: r.created_at }))
  const indoorIds = new Set(history.filter((r) => dayOf(r)!.indoor).map((r) => r.id))
  const info = key ? resultFromKey(key) : null
  const lower = info ? lowerIsBetter(info.metric) : false
  const sorted = [...points].sort((a, b) => a.recorded_on.localeCompare(b.recorded_on))
  const best = sorted.reduce<(typeof sorted)[number] | null>((top, p) => (!top || (lower ? p.value < top.value : p.value > top.value) ? p : top), null)

  return (
    <section className="card metric-card">
      <h3>Pro Days</h3>
      {info && best && (
        <>
          <label>
            Measure
            <select value={key} onChange={(e) => setPicked(e.target.value)}>
              {keys.map((k) => (
                <option key={k} value={k}>
                  {resultLabel(resultFromKey(k))}
                </option>
              ))}
            </select>
          </label>
          <div className="stats testing-stats">
            <div className="stat">
              <span className="stat-label">Latest</span>
              <span className="stat-value">{formatResult(sorted[sorted.length - 1].value, info.metric)}</span>
              <span className="stat-sub">{formatDate(sorted[sorted.length - 1].recorded_on)}</span>
            </div>
            <div className="stat">
              <span className="stat-label">Best</span>
              <span className="stat-value stat-best">{formatResult(best.value, info.metric)}</span>
              <span className="stat-sub">{formatDate(best.recorded_on)}</span>
            </div>
            <div className="stat">
              <span className="stat-label">Tested</span>
              <span className="stat-value">{sorted.length}</span>
              <span className="stat-sub">{sorted.length === 1 ? 'day' : 'days'}</span>
            </div>
          </div>
          <LineChart rows={points} metric={{ name: resultLabel(info), decimals: KIND_DECIMALS[metricKind(info.metric)] }} bestId={best.id} markedIds={indoorIds} />
          {indoorIds.size > 0 && (
            <p className="chart-legend">
              <span className="chart-legend-dot" aria-hidden="true" /> Indoor
            </p>
          )}
        </>
      )}
      {notes.length > 0 && (
        <>
          <h3 className="section-label">Notes</h3>
          <ul className="follow-ups">
            {notes.map(({ entry, day }) => (
              <li key={entry.id}>
                <span className="follow-up-date">{day ? formatDate(day.held_on, false) : ''}</span>
                <span className="follow-up-body">{entry.note}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}
