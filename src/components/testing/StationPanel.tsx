import { useState } from 'react'
import { playerName } from '../../lib/format'
import type { Player, TestingEntry } from '../../lib/supabase'
import { PITCH_TYPES, STATIONS, stationFields, stationMembers, type DayConfig, type StationKey } from '../../lib/testing'
import type { TestingDayApi } from '../../lib/useTestingDay'
import { EntryNote } from './EntryNote'
import { EntryPicker } from './EntryPicker'
import { ResultField } from './ResultField'

type Props = { api: TestingDayApi; config: DayConfig; station: StationKey; playerById: Map<string, Player> }

export function StationPanel({ api, config, station, playerById }: Props) {
  const [adding, setAdding] = useState(false)
  const members = stationMembers(station, api.entries)
  const memberIds = new Set(members.map((m) => m.id))
  const candidates = api.entries.filter((e) => !memberIds.has(e.id))
  const positions = STATIONS.find((s) => s.key === station)!.positions as string[]
  const fields = stationFields(station, config)

  const name = (e: TestingEntry) => {
    const p = playerById.get(e.player_id)
    return p ? playerName(p) : ''
  }
  const valueOf = (entryId: string, metric: string, pitchType = '') =>
    api.results.find((r) => r.entry_id === entryId && r.station === station && r.metric === metric && r.pitch_type === pitchType)?.value

  function add(entry: TestingEntry) {
    void api.updateEntry(entry.id, { extra_stations: [...entry.extra_stations, station] })
    setAdding(false)
  }

  async function removeFromStation(entry: TestingEntry) {
    const rows = api.results.filter((r) => r.entry_id === entry.id && r.station === station)
    if (rows.length > 0 && !window.confirm(`Take ${name(entry)} off this station? Their numbers here will be erased.`)) return
    for (const r of rows) await api.saveResult(entry.id, station, r.metric, r.pitch_type, null)
    await api.updateEntry(entry.id, { extra_stations: entry.extra_stations.filter((s) => s !== station) })
  }

  return (
    <section className="card">
      <div className="row toolbar">
        <button className="btn btn-secondary" onClick={() => setAdding(true)} disabled={candidates.length === 0}>
          + Add a player to this station
        </button>
      </div>

      {members.length === 0 && <p className="subtitle">Nobody here yet. Check players in, or add one above.</p>}

      {members.map((entry) => {
        const isExtra = !positions.includes(entry.position)
        return (
          <div key={entry.id} className="test-row">
            <div className="test-row-head">
              <span className="test-num">{entry.number}</span>
              <span className="roster-name">{name(entry)}</span>
              <span className="roster-meta">{[entry.position, entry.team_name].filter(Boolean).join(' · ')}</span>
              {isExtra && (
                <button className="btn-link" onClick={() => removeFromStation(entry)}>
                  Remove
                </button>
              )}
            </div>
            {station === 'PITCH' ? (
              <PitchRows entry={entry} api={api} valueOf={valueOf} />
            ) : (
              <div className="test-fields">
                {fields.map((f) => (
                  <ResultField key={f.metric} label={f.label} kind={f.kind} value={valueOf(entry.id, f.metric)} onSave={(v) => api.saveResult(entry.id, station, f.metric, '', v)} />
                ))}
              </div>
            )}
            <EntryNote entry={entry} api={api} />
          </div>
        )
      })}

      {adding && <EntryPicker title="Add to this station" entries={candidates} playerById={playerById} onPick={add} onClose={() => setAdding(false)} />}
    </section>
  )
}

type PitchProps = {
  entry: TestingEntry
  api: TestingDayApi
  valueOf: (entryId: string, metric: string, pitchType?: string) => number | undefined
}

/** One row per pitch type: top velo and an optional movement grade. Plus one mechanics grade per pitcher. */
function PitchRows({ entry, api, valueOf }: PitchProps) {
  // Pitches picked but not saved yet. A pitch only reaches the database once it has a number.
  const [added, setAdded] = useState<string[]>([])
  const saved = api.results.filter((r) => r.entry_id === entry.id && r.station === 'PITCH' && r.pitch_type !== '').map((r) => r.pitch_type)
  const pitches = [...new Set(['Fastball', ...saved, ...added])]
  const unused = PITCH_TYPES.filter((p) => !pitches.includes(p))

  function addPitch(choice: string) {
    if (choice === '__other') {
      const typed = window.prompt('Name of the pitch')?.trim()
      if (typed && !pitches.includes(typed)) setAdded([...added, typed])
    } else if (choice) {
      setAdded([...added, choice])
    }
  }

  return (
    <div className="pitch-rows">
      {pitches.map((pitch) => (
        <div key={pitch} className="pitch-row">
          <span className="pitch-name">{pitch}</span>
          <ResultField label="Top velo" kind="velo" value={valueOf(entry.id, 'pitch_velo', pitch)} onSave={(v) => api.saveResult(entry.id, 'PITCH', 'pitch_velo', pitch, v)} />
          <ResultField label="Movement" kind="grade" value={valueOf(entry.id, 'pitch_movement', pitch)} onSave={(v) => api.saveResult(entry.id, 'PITCH', 'pitch_movement', pitch, v)} />
        </div>
      ))}
      <div className="pitch-row">
        <select aria-label="Add a pitch type" value="" onChange={(e) => addPitch(e.target.value)}>
          <option value="">+ Add a pitch</option>
          {unused.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
          <option value="__other">Other…</option>
        </select>
        <ResultField label="Mechanics" kind="grade" value={valueOf(entry.id, 'mechanics')} onSave={(v) => api.saveResult(entry.id, 'PITCH', 'mechanics', '', v)} />
      </div>
    </div>
  )
}
