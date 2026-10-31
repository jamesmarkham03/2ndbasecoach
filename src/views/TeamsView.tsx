import { useState, type FormEvent } from 'react'
import { countLabel } from '../lib/format'
import { supabase, type Player, type Team } from '../lib/supabase'
import { playersOnTeam } from '../lib/useTeams'

type Props = {
  teams: Team[]
  players: Player[]
  onChanged: () => void
  onOpenTeam: (id: string) => void
}

export function TeamsView({ teams, players, onChanged, onOpenTeam }: Props) {
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [isPrivate, setIsPrivate] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleCreate(e: FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (teams.some((t) => t.name.trim().toLowerCase() === trimmed.toLowerCase())) {
      setError(`You already have a team called “${trimmed}”.`)
      return
    }
    setSaving(true)
    setError(null)
    const { error } = await supabase.from('teams').insert({ name: trimmed, is_private_lessons: isPrivate })
    setSaving(false)
    if (error) return setError(`Not saved: ${error.message}`)
    setCreating(false)
    setName('')
    setIsPrivate(false)
    onChanged()
  }

  if (creating) {
    return (
      <form className="card form" onSubmit={handleCreate}>
        <h2>Create team</h2>
        <label>
          Team name
          <input required autoFocus placeholder="e.g. 15U" value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="inline-label check-label">
          <input type="checkbox" checked={isPrivate} onChange={(e) => setIsPrivate(e.target.checked)} />
          Private lessons team
        </label>
        {error && <p className="msg msg-error">{error}</p>}
        <div className="row">
          <button className="btn" type="submit" disabled={saving || name.trim() === ''}>
            {saving ? 'Saving…' : 'Create team'}
          </button>
          <button
            className="btn btn-secondary"
            type="button"
            onClick={() => {
              setCreating(false)
              setError(null)
            }}
          >
            Cancel
          </button>
        </div>
      </form>
    )
  }

  return (
    <div>
      <div className="row toolbar">
        <button className="btn" onClick={() => setCreating(true)}>
          + Create team
        </button>
      </div>

      {teams.length === 0 ? (
        <div className="card empty">
          <p>No teams yet. Tap “Create team” to add your first one.</p>
        </div>
      ) : (
        <section className="card">
          <ul className="roster">
            {teams.map((t) => {
              const active = playersOnTeam(t, players).filter((p) => p.active).length
              return (
                <li key={t.id}>
                  <button className="roster-row" onClick={() => onOpenTeam(t.id)}>
                    <span className="roster-name">
                      {t.name} {t.is_private_lessons && <span className="tag">Private lessons</span>}
                    </span>
                    <span className="roster-meta">{countLabel(active, 'player')}</span>
                    <span className="chevron" aria-hidden="true">
                      ›
                    </span>
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
