import { useState } from 'react'
import { playerName } from '../../lib/format'
import type { Player, TestingEntry } from '../../lib/supabase'
import { chunk, currentQueue, placeRunner, type DayConfig, type TestPosition } from '../../lib/testing'
import type { TestingDayApi } from '../../lib/useTestingDay'
import { EntryNote } from './EntryNote'
import { EntryPicker } from './EntryPicker'
import { ResultField } from './ResultField'

type Props = { api: TestingDayApi; config: DayConfig; playerById: Map<string, Player> }

const metricFor = (distance: number) => `sprint_${distance}`

export function SprintPanel({ api, config, playerById }: Props) {
  // The lane being changed: its place in the line-up, or null when the picker is closed.
  const [pickingAt, setPickingAt] = useState<number | null>(null)
  const byId = new Map(api.entries.map((e) => [e.id, e]))
  const queue = currentQueue(api.entries, config)
  const distances = [...config.sprintDistances].sort((a, b) => b - a)
  const lanes = config.lanes
  const name = (e: TestingEntry) => {
    const p = playerById.get(e.player_id)
    return p ? playerName(p) : ''
  }

  const valueOf = (entryId: string, metric: string) =>
    api.results.find((r) => r.entry_id === entryId && r.station === 'SPRINT' && r.metric === metric)?.value
  const hasRun = (entryId: string) => distances.some((d) => valueOf(entryId, metricFor(d)) !== undefined)
  const isRerun = (index: number) => queue.indexOf(queue[index]) < index

  // First heat with a first-time runner who has no time yet.
  const firstOpen = queue.findIndex((id, i) => !isRerun(i) && !hasRun(id))
  const currentHeat = firstOpen === -1 ? -1 : Math.floor(firstOpen / lanes)

  const heats = chunk(queue.map((id, index) => ({ id, index })), lanes)
  const lastHeatHasRoom = heats.length > 0 && heats[heats.length - 1].length < lanes

  function pick(entry: TestingEntry) {
    if (pickingAt === null) return
    const next = placeRunner(queue, pickingAt, entry.id, hasRun(entry.id))
    api.saveConfig({ sprintQueue: next, scratched: config.scratched.filter((id) => id !== entry.id) })
    setPickingAt(null)
  }

  // Everyone behind moves up one. A re-run slot just goes away; the runner keeps their first run.
  function scratch(index: number) {
    const id = queue[index]
    const next = queue.filter((_, i) => i !== index)
    const stillInLine = next.includes(id)
    api.saveConfig({ sprintQueue: next, scratched: stillInLine ? config.scratched : [...config.scratched, id] })
  }

  function backInLine(id: string) {
    const start = firstOpen === -1 ? queue.length : Math.min(queue.length, (Math.floor(firstOpen / lanes) + 1) * lanes)
    const next = [...queue]
    next.splice(start, 0, id)
    api.saveConfig({ sprintQueue: next, scratched: config.scratched.filter((x) => x !== id) })
  }

  function moveInOrder(i: number, step: number) {
    const order: TestPosition[] = [...config.sprintOrder]
    const j = i + step
    if (j < 0 || j >= order.length) return
    ;[order[i], order[j]] = [order[j], order[i]]
    // Times are kept: only who runs next changes.
    api.saveConfig({ sprintOrder: order, sprintQueue: null })
  }

  if (api.entries.length === 0) {
    return (
      <div className="card empty">
        <p>Nobody is checked in yet. Hand out numbers on the Check-in tab first.</p>
      </div>
    )
  }

  return (
    <section className="card">
      <div className="row toolbar">
        <div className="chips" role="group" aria-label="Runners at a time">
          {[1, 2].map((n) => (
            <button key={n} className={lanes === n ? 'chip chip-on' : 'chip'} aria-pressed={lanes === n} onClick={() => api.saveConfig({ lanes: n })}>
              {n} at a time
            </button>
          ))}
        </div>
        {currentHeat !== -1 && (
          <button className="btn btn-secondary push-right" onClick={() => document.getElementById(`heat-${currentHeat}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })}>
            Go to next heat
          </button>
        )}
      </div>

      <details className="history order-editor">
        <summary>Change running order</summary>
        <p className="subtitle">Rebuilds the line-up in this order. Times already entered stay.</p>
        <ol className="order-list">
          {config.sprintOrder.map((pos, i) => (
            <li key={pos}>
              <strong>{pos}</strong>
              <button className="btn-icon" disabled={i === 0} onClick={() => moveInOrder(i, -1)} aria-label={`Move ${pos} earlier`}>
                ↑
              </button>
              <button className="btn-icon" disabled={i === config.sprintOrder.length - 1} onClick={() => moveInOrder(i, 1)} aria-label={`Move ${pos} later`}>
                ↓
              </button>
            </li>
          ))}
        </ol>
      </details>

      {heats.map((heat, h) => (
        <div key={h} id={`heat-${h}`} className={h === currentHeat ? 'heat heat-now' : 'heat'}>
          <h3 className="section-label">
            Heat {h + 1}
            {h === currentHeat && <span className="heat-up">Up now</span>}
          </h3>
          {heat.map(({ id, index }) => {
            const entry = byId.get(id)
            if (!entry) return null
            const rerun = isRerun(index)
            return (
              <div key={`${id}-${index}`} className="test-row">
                <div className="test-row-head">
                  <span className="test-num">{entry.number}</span>
                  <span className="roster-name">{name(entry)}</span>
                  {rerun && <span className="tag">Re-run</span>}
                  <button className="btn-link" onClick={() => setPickingAt(index)}>
                    Change
                  </button>
                  <button className="btn-link" onClick={() => scratch(index)}>
                    Scratch
                  </button>
                </div>
                <div className="test-fields">
                  {distances.map((d) => (
                    <ResultField
                      key={d}
                      label={`${d} yd${rerun ? ' (best stays)' : ''}`}
                      kind="time"
                      lowerBetter
                      keepBest={rerun}
                      value={valueOf(id, metricFor(d))}
                      onSave={(v) => api.saveResult(id, 'SPRINT', metricFor(d), '', v)}
                    />
                  ))}
                </div>
                <EntryNote entry={entry} api={api} />
              </div>
            )
          })}
          {h === heats.length - 1 && lastHeatHasRoom && (
            <button className="btn btn-secondary" onClick={() => setPickingAt(queue.length)}>
              + Add a runner to this heat
            </button>
          )}
        </div>
      ))}

      {config.scratched.some((id) => byId.has(id)) && (
        <>
          <h3 className="section-label">Scratched</h3>
          <ul className="roster">
            {config.scratched.map((id) => {
              const entry = byId.get(id)
              if (!entry) return null
              return (
                <li key={id} className="team-roster-row">
                  <div className="roster-row">
                    <span className="test-num">{entry.number}</span>
                    <span className="roster-name">{name(entry)}</span>
                  </div>
                  <button className="btn-link" onClick={() => backInLine(id)}>
                    Back in line
                  </button>
                </li>
              )
            })}
          </ul>
        </>
      )}

      {pickingAt !== null && (
        <EntryPicker
          title="Who runs in this lane?"
          entries={api.entries}
          playerById={playerById}
          statusOf={(e) => (config.scratched.includes(e.id) ? 'scratched' : hasRun(e.id) ? 'runs again' : 'moves up')}
          onPick={pick}
          onClose={() => setPickingAt(null)}
        />
      )}
    </section>
  )
}
