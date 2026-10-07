import { useState } from 'react'
import { playerName } from '../lib/format'
import type { Player } from '../lib/supabase'
import { PlayerForm } from './PlayerForm'

type Props = {
  players: Player[]
  onChanged: () => void
  onOpenPlayer: (id: string) => void
}

export function PlayersView({ players, onChanged, onOpenPlayer }: Props) {
  const [adding, setAdding] = useState(false)
  const [showArchived, setShowArchived] = useState(false)

  const shown = players.filter((p) => p.active !== showArchived)
  // Group by team so a 12U–19U roster stays scannable. Players without a team go last.
  const byTeam = new Map<string, Player[]>()
  for (const p of shown) {
    const key = p.team ?? 'No team'
    byTeam.set(key, [...(byTeam.get(key) ?? []), p])
  }
  const teamNames = [...byTeam.keys()].sort((a, b) => (a === 'No team' ? 1 : b === 'No team' ? -1 : a.localeCompare(b)))
  const archivedCount = players.filter((p) => !p.active).length

  if (adding) {
    return (
      <PlayerForm
        onSaved={() => {
          setAdding(false)
          onChanged()
        }}
        onCancel={() => setAdding(false)}
      />
    )
  }

  return (
    <div>
      <div className="row toolbar">
        <button className="btn" onClick={() => setAdding(true)}>
          + Add player
        </button>
        {archivedCount > 0 && (
          <button className="btn-link" onClick={() => setShowArchived(!showArchived)}>
            {showArchived ? 'Show active players' : `Show archived (${archivedCount})`}
          </button>
        )}
      </div>

      {shown.length === 0 && (
        <div className="card empty">
          <p>
            {showArchived
              ? 'No archived players.'
              : players.length > 0
                ? 'No active players. Tap “Show archived” to restore one.'
                : 'No players yet. Tap “Add player” to build your roster.'}
          </p>
        </div>
      )}

      {teamNames.map((team) => (
        <section key={team} className="card">
          <h3 className="section-label">
            {team} ({byTeam.get(team)!.length})
          </h3>
          <ul className="roster">
            {byTeam.get(team)!.map((p) => (
              <li key={p.id}>
                <button className="roster-row" onClick={() => onOpenPlayer(p.id)}>
                  <span className="roster-name">{playerName(p)}</span>
                  <span className="roster-meta">
                    {[p.positions.join('/'), p.bats && p.throws ? `${p.bats}/${p.throws}` : null, p.birth_year]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                  <span className="chevron" aria-hidden="true">
                    ›
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
