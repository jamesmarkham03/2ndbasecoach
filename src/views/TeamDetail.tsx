import { useState, type FormEvent } from 'react'
import { countLabel, playerName } from '../lib/format'
import { supabase, type Player, type Team } from '../lib/supabase'
import { playersOnTeam, teamColumn } from '../lib/useTeams'

type Props = {
  team: Team
  teams: Team[]
  players: Player[]
  onBack: () => void
  onChanged: () => void
  onOpenPlayer: (id: string) => void
}

export function TeamDetail({ team, teams, players, onBack, onChanged, onOpenPlayer }: Props) {
  const [adding, setAdding] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const [newName, setNewName] = useState(team.name)
  const [error, setError] = useState<string | null>(null)

  const column = teamColumn(team)
  const linked = playersOnTeam(team, players)
  const roster = linked.filter((p) => p.active)
  // Players who could be added: active, and not already here.
  const candidates = players.filter((p) => p.active && p[column] !== team.id)

  function teamName(id: string | null) {
    return teams.find((t) => t.id === id)?.name
  }

  async function setPlayerTeam(player: Player, teamId: string | null) {
    setError(null)
    // Spelled out (not a computed key) so TypeScript can check the column name against the table.
    const patch = column === 'team_id' ? { team_id: teamId } : { lesson_team_id: teamId }
    const { error } = await supabase.from('players').update(patch).eq('id', player.id)
    if (error) setError(`Not saved: ${error.message}`)
    else onChanged()
  }

  async function handleRename(e: FormEvent) {
    e.preventDefault()
    const trimmed = newName.trim()
    if (teams.some((t) => t.id !== team.id && t.name.trim().toLowerCase() === trimmed.toLowerCase())) {
      return setError(`You already have a team called “${trimmed}”.`)
    }
    const { error } = await supabase.from('teams').update({ name: trimmed }).eq('id', team.id)
    if (error) return setError(`Not saved: ${error.message}`)
    setError(null)
    setRenaming(false)
    onChanged()
  }

  async function handleDelete() {
    const detail =
      linked.length === 0
        ? ''
        : ` ${countLabel(linked.length, 'player')} will be taken off this team. The players themselves, their stats and lessons are kept.`
    if (!window.confirm(`Delete the team “${team.name}”?${detail}`)) return
    const { error } = await supabase.from('teams').delete().eq('id', team.id)
    if (error) return setError(`Not deleted: ${error.message}`)
    onChanged()
    onBack()
  }

  return (
    <div>
      <button className="btn-link back" onClick={onBack}>
        ‹ All teams
      </button>

      <section className="card player-header">
        <div>
          {renaming ? (
            <form className="row" onSubmit={handleRename}>
              <input required autoFocus value={newName} onChange={(e) => setNewName(e.target.value)} aria-label="Team name" />
              <button className="btn" type="submit" disabled={newName.trim() === ''}>
                Save
              </button>
              <button
                className="btn btn-secondary"
                type="button"
                onClick={() => {
                  setRenaming(false)
                  setNewName(team.name)
                  setError(null)
                }}
              >
                Cancel
              </button>
            </form>
          ) : (
            <>
              <h2>
                {team.name}
                {team.is_private_lessons && <span className="tag">Private lessons</span>}
              </h2>
              <p className="subtitle">{countLabel(roster.length, 'active player')}</p>
            </>
          )}
        </div>
        {!renaming && (
          <div className="row">
            <button className="btn btn-secondary" onClick={() => setRenaming(true)}>
              Rename
            </button>
            <button className="btn btn-danger" onClick={handleDelete}>
              Delete team
            </button>
          </div>
        )}
      </section>

      {error && <p className="msg msg-error">{error}</p>}

      <section className="card">
        <div className="row toolbar">
          <button className="btn" onClick={() => setAdding(!adding)}>
            {adding ? 'Done adding' : '+ Add player to team'}
          </button>
        </div>

        {adding && (
          <div className="add-picker">
            <h3 className="section-label">Tap a player to add</h3>
            {candidates.length === 0 ? (
              <p className="subtitle">Every active player is already on this team.</p>
            ) : (
              <ul className="roster">
                {candidates.map((p) => {
                  const current = teamName(p[column])
                  return (
                    <li key={p.id}>
                      <button className="roster-row" onClick={() => setPlayerTeam(p, team.id)}>
                        <span className="roster-name">{playerName(p)}</span>
                        {current && <span className="roster-meta">moves from {current}</span>}
                        <span className="picker-add" aria-hidden="true">
                          +
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        )}

        {roster.length === 0 && !adding && <p className="subtitle">No players on this team yet.</p>}
        {roster.length > 0 && (
          <ul className="roster">
            {roster.map((p) => (
              <li key={p.id} className="team-roster-row">
                <button className="roster-row" onClick={() => onOpenPlayer(p.id)}>
                  <span className="roster-name">{playerName(p)}</span>
                  <span className="roster-meta">{[p.positions.join('/'), p.birth_year].filter(Boolean).join(' · ')}</span>
                </button>
                <button className="btn-link" onClick={() => setPlayerTeam(p, null)} aria-label={`Remove ${playerName(p)} from team`}>
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
