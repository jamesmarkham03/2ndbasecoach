import { useRef, useState, type FormEvent } from 'react'
import { formatDate, formatValue, todayLocal } from '../lib/format'
import { isBetter, summarize } from '../lib/stats'
import { supabase, type Measurement, type MetricType, type Player } from '../lib/supabase'

type Props = {
  player: Player
  metrics: MetricType[]
  rows: Measurement[] // everything already recorded for this player
  onSaved: (row: Measurement) => void
}

/**
 * Quick entry for one player: pick the metric, type the number, save.
 * It stays on the same metric after saving, so a run of reps (e.g. five throws) is just type, save, type, save.
 */
export function AddMeasurement({ player, metrics, rows, onSaved }: Props) {
  const [metricId, setMetricId] = useState(metrics[0]?.id ?? '')
  const [date, setDate] = useState(todayLocal())
  const [valueText, setValueText] = useState('')
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const valueInput = useRef<HTMLInputElement>(null)

  const metric = metrics.find((m) => m.id === metricId)
  if (!metric) return null
  const history = summarize(rows.filter((r) => r.metric_type_id === metric.id), metric)

  async function handleSave(e: FormEvent) {
    e.preventDefault()
    if (!metric) return
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

    const previousBest = history?.best.value
    const isPB = previousBest !== undefined && isBetter(value, previousBest, metric)
    setToast(
      `Saved ${formatValue(value, metric)}` + (isPB ? ' — new PB!' : previousBest === undefined ? ' — first entry' : ''),
    )
    setValueText('')
    onSaved(data)
    valueInput.current?.focus()
  }

  return (
    <form className="card entry-panel" onSubmit={handleSave}>
      <h3 className="section-label">Add measurement</h3>
      <div className="chips">
        {metrics.map((m) => (
          <button
            key={m.id}
            type="button"
            className={m.id === metricId ? 'chip chip-on' : 'chip'}
            onClick={() => {
              setMetricId(m.id)
              setToast(null)
              setError(null)
            }}
          >
            {m.name}
          </button>
        ))}
      </div>

      {history ? (
        <p className="entry-hint">
          Last {formatValue(history.latest.value, metric)} ({formatDate(history.latest.recorded_on, false)}) · PB{' '}
          {formatValue(history.best.value, metric)}
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
        <label className="inline-label push-right">
          Date
          <input type="date" value={date} max={todayLocal()} onChange={(e) => setDate(e.target.value)} />
        </label>
      </div>

      {toast && (
        <p className="toast entry-toast" role="status">
          {toast}
        </p>
      )}
      {error && <p className="msg msg-error entry-toast">{error}</p>}
    </form>
  )
}
