import { useState } from 'react'
import { playerName } from '../../lib/format'
import type { Player } from '../../lib/supabase'
import { POSITIONS, formatResult, leaderboard, resultFromKey, resultKey, resultLabel, sortResultKeys } from '../../lib/testing'
import type { TestingDayApi } from '../../lib/useTestingDay'

export function LeaderboardPanel({ api, playerById }: { api: TestingDayApi; playerById: Map<string, Player> }) {
  const keys = sortResultKeys(api.results.map(resultKey))
  const [picked, setPicked] = useState<string | null>(null)
  const [position, setPosition] = useState('')
  const [team, setTeam] = useState('')
  const key = picked && keys.includes(picked) ? picked : keys[0]

  if (!key) {
    return (
      <div className="card empty">
        <p>Nothing recorded yet. The leaderboard fills in as numbers go in.</p>
      </div>
    )
  }

  const teams = [...new Set(api.entries.map((e) => e.team_name ?? ''))].filter(Boolean).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
  const filtered = api.entries.filter((e) => (position === '' || e.position === position) && (team === '' || e.team_name === team))
  const rows = leaderboard(api.results, filtered, key)
  const { metric } = resultFromKey(key)

  return (
    <section className="card">
      <div className="form-grid toolbar">
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
        <label>
          Position
          <select value={position} onChange={(e) => setPosition(e.target.value)}>
            <option value="">All positions</option>
            {POSITIONS.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </label>
        <label>
          Team
          <select value={team} onChange={(e) => setTeam(e.target.value)}>
            <option value="">All teams</option>
            {teams.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </label>
      </div>

      {rows.length === 0 && <p className="subtitle">No results for that filter.</p>}
      <ol className="board">
        {rows.map((row) => {
          const player = playerById.get(row.entry.player_id)
          return (
            <li key={row.entry.id} className={row.rank === 1 ? 'board-row board-first' : 'board-row'}>
              <span className="board-rank">{row.rank}</span>
              <span className="test-num">{row.entry.number}</span>
              <span className="roster-name">{player ? playerName(player) : ''}</span>
              <span className="roster-meta">{[row.entry.position, row.entry.team_name].filter(Boolean).join(' · ')}</span>
              <strong className="board-value">{formatResult(row.value, metric)}</strong>
            </li>
          )
        })}
      </ol>
    </section>
  )
}
