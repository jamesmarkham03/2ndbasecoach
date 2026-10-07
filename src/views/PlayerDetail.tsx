import { useEffect, useState } from 'react'
import { LineChart } from '../components/LineChart'
import { formatDate, formatValue, playerName } from '../lib/format'
import { sortChronologically, summarize } from '../lib/stats'
import { supabase, type Lesson, type Measurement, type MetricType, type Player } from '../lib/supabase'
import { PlayerForm } from './PlayerForm'

/**
 * "+0.9 mph" reads naturally for velocity, but "+0.12 sec" on a pop time reads as
 * slower even when the player got faster. So times say "faster"/"slower" in words.
 */
function describeChange(improvement: number, metric: MetricType): string {
  const amount = formatValue(Math.abs(improvement), metric)
  if (improvement === 0) return `No change`
  if (metric.higher_is_better) return `${improvement > 0 ? '+' : '−'}${amount}`
  return `${amount} ${improvement > 0 ? 'faster' : 'slower'}`
}

type Props = {
  player: Player
  metrics: MetricType[]
  onBack: () => void
  onChanged: () => void
  onOpenLesson: (lessonId: string) => void
}

export function PlayerDetail({ player, metrics, onBack, onChanged, onOpenLesson }: Props) {
  const [rows, setRows] = useState<Measurement[] | null>(null)
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [editing, setEditing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    Promise.all([
      supabase.from('measurements').select('*').eq('player_id', player.id),
      supabase.from('lessons').select('*').eq('player_id', player.id).eq('archived', false).order('lesson_date', { ascending: false }),
    ]).then(([m, l]) => {
      if (cancelled) return
      const err = m.error ?? l.error
      if (err) return setError(err.message)
      setRows(m.data)
      setLessons(l.data ?? [])
    })
    return () => {
      cancelled = true
    }
  }, [player.id])

  async function setActive(active: boolean) {
    const verb = active ? 'Restore' : 'Archive'
    const detail = active ? '' : ' They’ll be hidden from Quick Entry, but all their data is kept.'
    if (!window.confirm(`${verb} ${playerName(player)}?${detail}`)) return
    const { error } = await supabase.from('players').update({ active }).eq('id', player.id)
    if (error) setError(error.message)
    else onChanged()
  }

  async function deleteEntry(row: Measurement, metric: MetricType) {
    if (!window.confirm(`Delete ${formatValue(row.value, metric)} from ${formatDate(row.recorded_on)}?`)) return
    const { error } = await supabase.from('measurements').delete().eq('id', row.id)
    if (error) setError(`Not deleted: ${error.message}`)
    else setRows((prev) => prev?.filter((r) => r.id !== row.id) ?? null)
  }

  if (editing) {
    return (
      <PlayerForm
        existing={player}
        onSaved={() => {
          setEditing(false)
          onChanged()
        }}
        onCancel={() => setEditing(false)}
      />
    )
  }

  const metricsWithData = metrics.filter((m) => rows?.some((r) => r.metric_type_id === m.id))

  return (
    <div>
      <button className="btn-link back" onClick={onBack}>
        ‹ All players
      </button>

      <section className="card player-header">
        <div>
          <h2>
            {playerName(player)}
            {!player.active && <span className="tag">Archived</span>}
          </h2>
          <p className="subtitle">
            {[player.team, player.positions.join('/'), player.bats && player.throws && `B/T ${player.bats}/${player.throws}`, player.birth_year && `Born ${player.birth_year}`]
              .filter(Boolean)
              .join(' · ')}
          </p>
          {player.notes && <p className="notes">{player.notes}</p>}
        </div>
        <div className="row">
          <button className="btn btn-secondary" onClick={() => setEditing(true)}>
            Edit
          </button>
          <button className="btn btn-secondary" onClick={() => setActive(!player.active)}>
            {player.active ? 'Archive' : 'Restore'}
          </button>
        </div>
      </section>

      {error && <p className="msg msg-error">{error}</p>}

      {lessons.length > 0 && (
        <section className="card">
          <h3 className="section-label">Lessons ({lessons.length})</h3>
          <ul className="roster">
            {lessons.map((l) => (
              <li key={l.id}>
                <button className="roster-row" onClick={() => onOpenLesson(l.id)}>
                  <span className="lesson-date">{formatDate(l.lesson_date, false)}</span>
                  <span className="roster-name">{l.title || 'Lesson'}</span>
                  <span className="chevron" aria-hidden="true">
                    ›
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {rows === null && !error && <p className="subtitle">Loading…</p>}
      {rows !== null && metricsWithData.length === 0 && (
        <div className="card empty">
          <p>No measurements yet. Use Quick Entry to add some.</p>
        </div>
      )}

      {rows !== null &&
        metricsWithData.map((metric) => {
          const metricRows = rows.filter((r) => r.metric_type_id === metric.id)
          const s = summarize(metricRows, metric)!
          const trend = s.improvement > 0 ? 'up' : s.improvement < 0 ? 'down' : 'flat'
          return (
            <section key={metric.id} className="card metric-card">
              <h3>{metric.name}</h3>
              <div className="stats">
                <div className="stat">
                  <span className="stat-label">Latest</span>
                  <span className="stat-value">{formatValue(s.latest.value, metric)}</span>
                  <span className="stat-sub">{formatDate(s.latest.recorded_on)}</span>
                </div>
                <div className="stat">
                  <span className="stat-label">Personal best</span>
                  <span className="stat-value stat-best">{formatValue(s.best.value, metric)}</span>
                  <span className="stat-sub">{formatDate(s.best.recorded_on)}</span>
                </div>
                <div className="stat">
                  <span className="stat-label">Since first test</span>
                  <span className={`stat-value trend-${trend}`}>
                    {s.count < 2 ? '—' : describeChange(s.improvement, metric)}
                  </span>
                  <span className="stat-sub">
                    {s.count} test{s.count === 1 ? '' : 's'}
                  </span>
                </div>
              </div>

              <LineChart rows={metricRows} metric={metric} bestId={s.best.id} />

              <details className="history">
                <summary>All entries</summary>
                <ul className="entry-list">
                  {sortChronologically(metricRows)
                    .reverse()
                    .map((r) => (
                      <li key={r.id}>
                        <span>{formatDate(r.recorded_on)}</span>
                        <strong>{formatValue(r.value, metric)}</strong>
                        <button className="btn-icon" onClick={() => deleteEntry(r, metric)} aria-label="Delete entry">
                          ✕
                        </button>
                      </li>
                    ))}
                </ul>
              </details>
            </section>
          )
        })}
    </div>
  )
}
