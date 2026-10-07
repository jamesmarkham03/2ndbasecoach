import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { formatDate, formatValue, playerName, todayLocal } from '../lib/format'
import { isBetter, summarize } from '../lib/stats'
import { supabase, type Measurement, type MetricType, type Player } from '../lib/supabase'

type Props = {
  players: Player[]
  metrics: MetricType[]
  onGoToPlayers: () => void
}

/**
 * Built for testing day: pick the metric once, then go down the line —
 * tap a player, type the number, save, tap the next player.
 */
export function QuickEntry({ players, metrics, onGoToPlayers }: Props) {
  const [date, setDate] = useState(todayLocal())
  const [metricId, setMetricId] = useState(metrics[0]?.id ?? '')
  const [teamFilter, setTeamFilter] = useState<string | null>(null)
  const [playerId, setPlayerId] = useState<string | null>(null)
  const [valueText, setValueText] = useState('')
  const [rows, setRows] = useState<Measurement[]>([]) // every entry for the selected metric
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const valueInput = useRef<HTMLInputElement>(null)

  const metric = metrics.find((m) => m.id === metricId)
  const activePlayers = players.filter((p) => p.active)
  const teams = [...new Set(activePlayers.map((p) => p.team).filter((t): t is string => !!t))].sort()
  const visiblePlayers = teamFilter ? activePlayers.filter((p) => p.team === teamFilter) : activePlayers
  const player = players.find((p) => p.id === playerId)

  // Load the history for this metric whenever it changes.
  useEffect(() => {
    if (!metricId) return
    let cancelled = false // ignore a slow response if the coach already switched metrics
    supabase
      .from('measurements')
      .select('*')
      .eq('metric_type_id', metricId)
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) setError(error.message)
        else setRows(data)
      })
    return () => {
      cancelled = true
    }
  }, [metricId])

  // Jump straight to the number box when a player is tapped.
  useEffect(() => {
    if (playerId) valueInput.current?.focus()
  }, [playerId])

  const entriesOnDate = useMemo(
    () => rows.filter((r) => r.recorded_on === date).sort((a, b) => b.created_at.localeCompare(a.created_at)),
    [rows, date],
  )
  const doneToday = new Set(entriesOnDate.map((r) => r.player_id))
  const playerHistory = player && metric ? summarize(rows.filter((r) => r.player_id === player.id), metric) : null

  async function handleSave(e: FormEvent) {
    e.preventDefault()
    if (!player || !metric) return
    const value = Number(valueText)
    if (!Number.isFinite(value) || value <= 0 || value >= 100000) {
      setError('Enter a number greater than 0.')
      return
    }

    setSaving(true)
    setError(null)
    const { data, error } = await supabase
      .from('measurements')
      .insert({ player_id: player.id, metric_type_id: metric.id, value, recorded_on: date })
      .select()
      .single()
    setSaving(false)

    if (error) {
      setError(`Not saved: ${error.message}`)
      return
    }

    const previousBest = playerHistory?.best.value
    const isPB = previousBest !== undefined && isBetter(value, previousBest, metric)
    setRows((prev) => [...prev, data])
    setToast(
      `Saved ${playerName(player)}: ${formatValue(value, metric)}` +
        (isPB ? ' — new PB!' : previousBest === undefined ? ' — first entry' : ''),
    )
    setPlayerId(null)
    setValueText('')
  }

  async function handleDelete(row: Measurement) {
    const who = players.find((p) => p.id === row.player_id)
    if (!metric || !window.confirm(`Delete ${who ? playerName(who) : 'this'} ${formatValue(row.value, metric)}?`)) return
    const { error } = await supabase.from('measurements').delete().eq('id', row.id)
    if (error) setError(`Not deleted: ${error.message}`)
    else setRows((prev) => prev.filter((r) => r.id !== row.id))
  }

  if (activePlayers.length === 0) {
    return (
      <div className="card empty">
        <p>No players yet. Add your roster first.</p>
        <button className="btn" onClick={onGoToPlayers}>
          Add players
        </button>
      </div>
    )
  }

  return (
    <div className="quick-entry">
      <section className="card">
        <div className="row">
          <label className="inline-label">
            Date
            <input type="date" value={date} max={todayLocal()} onChange={(e) => setDate(e.target.value)} />
          </label>
        </div>

        <h3 className="section-label">Metric</h3>
        <div className="chips">
          {metrics.map((m) => (
            <button
              key={m.id}
              className={m.id === metricId ? 'chip chip-on' : 'chip'}
              onClick={() => {
                setMetricId(m.id)
                setPlayerId(null)
                setToast(null)
              }}
            >
              {m.name}
            </button>
          ))}
        </div>
      </section>

      {toast && (
        <p className="toast" role="status">
          {toast}
        </p>
      )}
      {error && <p className="msg msg-error">{error}</p>}

      {player && metric && (
        <form className="card entry-panel" onSubmit={handleSave}>
          <div className="entry-who">
            <strong>{playerName(player)}</strong>
            <span>{metric.name}</span>
          </div>
          {playerHistory ? (
            <p className="entry-hint">
              Last {formatValue(playerHistory.latest.value, metric)} ({formatDate(playerHistory.latest.recorded_on, false)}) · PB{' '}
              {formatValue(playerHistory.best.value, metric)}
            </p>
          ) : (
            <p className="entry-hint">No {metric.name} on record yet</p>
          )}
          <div className="entry-input-row">
            <input
              ref={valueInput}
              className="value-input"
              inputMode="decimal"
              placeholder="0.0"
              value={valueText}
              onChange={(e) => setValueText(e.target.value.replace(',', '.'))}
              aria-label={`${metric.name} in ${metric.unit}`}
            />
            <span className="unit">{metric.unit}</span>
            <button className="btn" type="submit" disabled={saving || valueText === ''}>
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button className="btn btn-secondary" type="button" onClick={() => setPlayerId(null)}>
              Cancel
            </button>
          </div>
        </form>
      )}

      <section className="card">
        {teams.length > 1 && (
          <div className="chips">
            <button className={teamFilter === null ? 'chip chip-on' : 'chip'} onClick={() => setTeamFilter(null)}>
              All teams
            </button>
            {teams.map((t) => (
              <button key={t} className={teamFilter === t ? 'chip chip-on' : 'chip'} onClick={() => setTeamFilter(t)}>
                {t}
              </button>
            ))}
          </div>
        )}
        <div className="player-grid">
          {visiblePlayers.map((p) => (
            <button
              key={p.id}
              className={['player-tile', p.id === playerId && 'player-tile-on', doneToday.has(p.id) && 'player-tile-done']
                .filter(Boolean)
                .join(' ')}
              onClick={() => {
                setPlayerId(p.id)
                setValueText('')
                setToast(null)
                setError(null)
              }}
            >
              <span className="player-tile-name">{playerName(p)}</span>
              {p.team && <span className="player-tile-team">{p.team}</span>}
              {doneToday.has(p.id) && <span className="player-tile-check" aria-label="entered">✓</span>}
            </button>
          ))}
        </div>
      </section>

      {metric && entriesOnDate.length > 0 && (
        <section className="card">
          <h3 className="section-label">
            {metric.name} on {formatDate(date)} ({entriesOnDate.length})
          </h3>
          <ul className="entry-list">
            {entriesOnDate.map((r) => {
              const who = players.find((p) => p.id === r.player_id)
              return (
                <li key={r.id}>
                  <span>{who ? playerName(who) : 'Unknown player'}</span>
                  <strong>{formatValue(r.value, metric)}</strong>
                  <button className="btn-icon" onClick={() => handleDelete(r)} aria-label="Delete entry">
                    ✕
                  </button>
                </li>
              )
            })}
          </ul>
        </section>
      )}
    </div>
  )
}
