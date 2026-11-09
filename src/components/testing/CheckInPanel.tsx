import { useState } from 'react'
import { countLabel, playerName } from '../../lib/format'
import { supabase, type Player, type Team, type TestingEntry } from '../../lib/supabase'
import { POSITIONS, toTestPosition, type DayConfig, type TestPosition } from '../../lib/testing'
import type { TestingDayApi } from '../../lib/useTestingDay'
import { EntryNote } from './EntryNote'

type Props = {
  api: TestingDayApi
  config: DayConfig
  players: Player[]
  teams: Team[]
  onPositionsSaved: () => void
}

export function CheckInPanel({ api, config, players, teams, onPositionsSaved }: Props) {
  const [search, setSearch] = useState('')
  const entryByPlayer = new Map(api.entries.map((e) => [e.player_id, e]))
  const teamName = (p: Player) => teams.find((t) => t.id === p.team_id)?.name ?? teams.find((t) => t.id === p.lesson_team_id)?.name ?? null

  // Typing searches every active player, so a kid from a team not on today's list can still be added.
  const term = search.trim().toLowerCase()
  const shown = players.filter((p) => {
    if (term) return p.active && playerName(p).toLowerCase().includes(term)
    return entryByPlayer.has(p.id) || (p.active && (config.teamIds.includes(p.team_id ?? '') || config.teamIds.includes(p.lesson_team_id ?? '')))
  })
  const groups = [...new Set(shown.map((p) => teamName(p) ?? 'No team'))].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))

  async function tapPosition(player: Player, position: TestPosition, entry: TestingEntry | undefined) {
    if (entry) {
      if (entry.position !== position) api.changePosition(entry, position)
      return
    }
    api.checkIn(player, position, teamName(player))
    // Remembered on the player, so next time the app can suggest it.
    if (player.positions.length === 0) {
      const { error } = await supabase.from('players').update({ positions: [position] }).eq('id', player.id)
      if (error) api.setError(`Position not remembered: ${error.message}`)
      else onPositionsSaved()
    }
  }

  async function saveNumber(entry: TestingEntry, typed: string): Promise<boolean> {
    const number = Number(typed)
    if (!Number.isInteger(number) || number < 1 || number > 999) {
      api.setError('Numbers are whole numbers from 1 to 999.')
      return false
    }
    if (number === entry.number) return true
    if (api.entries.some((e) => e.number === number)) {
      api.setError(`Number ${number} is already taken today.`)
      return false
    }
    return api.updateEntry(entry.id, { number })
  }

  function remove(entry: TestingEntry, player: Player) {
    const count = api.results.filter((r) => r.entry_id === entry.id).length
    const detail = count > 0 ? ` This erases ${countLabel(count, 'result')} from today.` : ''
    if (window.confirm(`Take ${playerName(player)} off today’s list?${detail}`)) void api.removeEntry(entry.id)
  }

  return (
    <section className="card">
      <div className="row toolbar">
        <input className="grow" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search any player" aria-label="Search any player" autoComplete="off" />
        <span className="tag">{api.entries.length} checked in</span>
      </div>
      {config.teamIds.length === 0 && !term && <p className="subtitle">No teams picked for this day. Add some in Settings, or search for a player.</p>}

      {groups.map((group) => (
        <div key={group}>
          <h3 className="section-label">{group}</h3>
          <ul className="roster">
            {shown
              .filter((p) => (teamName(p) ?? 'No team') === group)
              .map((player) => {
                const entry = entryByPlayer.get(player.id)
                const suggested = toTestPosition(player.positions[0])
                return (
                  <li key={player.id} className="checkin-row">
                    <div className="checkin-main">
                      <span className="roster-name">{playerName(player)}</span>
                      {entry && <NumberBox key={entry.number} entry={entry} onSave={saveNumber} />}
                      {entry && (
                        <button className="btn-icon" onClick={() => remove(entry, player)} aria-label={`Take ${playerName(player)} off today’s list`}>
                          ✕
                        </button>
                      )}
                    </div>
                    <div className="pos-chips">
                      {POSITIONS.map((pos) => {
                        const on = entry?.position === pos
                        const hint = !entry && suggested === pos
                        return (
                          <button key={pos} className={`pos-chip${on ? ' pos-chip-on' : ''}${hint ? ' pos-chip-hint' : ''}`} aria-pressed={on} onClick={() => tapPosition(player, pos, entry)}>
                            {pos}
                          </button>
                        )
                      })}
                    </div>
                    {entry && <EntryNote entry={entry} api={api} />}
                  </li>
                )
              })}
          </ul>
        </div>
      ))}
      {term && shown.length === 0 && <p className="subtitle">No active player by that name.</p>}
    </section>
  )
}

function NumberBox({ entry, onSave }: { entry: TestingEntry; onSave: (entry: TestingEntry, typed: string) => Promise<boolean> }) {
  const [text, setText] = useState(String(entry.number))
  return (
    <input
      className="number-input"
      inputMode="numeric"
      autoComplete="off"
      aria-label="Number today"
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={async () => {
        if (!(await onSave(entry, text.trim()))) setText(String(entry.number))
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur()
      }}
    />
  )
}
