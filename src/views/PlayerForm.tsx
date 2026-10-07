import { useState, type FormEvent } from 'react'
import { supabase, type Player } from '../lib/supabase'

const POSITIONS = ['P', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF']

type Props = {
  existing?: Player // pass a player to edit; leave out to add a new one
  onSaved: () => void
  onCancel: () => void
}

export function PlayerForm({ existing, onSaved, onCancel }: Props) {
  const [firstName, setFirstName] = useState(existing?.first_name ?? '')
  const [lastName, setLastName] = useState(existing?.last_name ?? '')
  const [birthYear, setBirthYear] = useState(existing?.birth_year?.toString() ?? '')
  const [team, setTeam] = useState(existing?.team ?? '')
  const [bats, setBats] = useState(existing?.bats ?? '')
  const [throws, setThrows] = useState(existing?.throws ?? '')
  const [positions, setPositions] = useState<string[]>(existing?.positions ?? [])
  const [notes, setNotes] = useState(existing?.notes ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function togglePosition(pos: string) {
    setPositions((prev) => (prev.includes(pos) ? prev.filter((p) => p !== pos) : [...prev, pos]))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)

    // Empty boxes are stored as "unknown" (null) rather than empty text.
    const fields = {
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      birth_year: birthYear ? Number(birthYear) : null,
      team: team.trim() || null,
      bats: bats || null,
      throws: throws || null,
      positions: POSITIONS.filter((p) => positions.includes(p)), // keep a consistent order
      notes: notes.trim() || null,
    }
    const { error } = existing
      ? await supabase.from('players').update(fields).eq('id', existing.id)
      : await supabase.from('players').insert(fields)

    setSaving(false)
    if (error) setError(`Not saved: ${error.message}`)
    else onSaved()
  }

  return (
    <form className="card form" onSubmit={handleSubmit}>
      <h2>{existing ? 'Edit player' : 'Add player'}</h2>

      <div className="form-grid">
        <label>
          First name
          <input required value={firstName} onChange={(e) => setFirstName(e.target.value)} autoCapitalize="words" />
        </label>
        <label>
          Last name
          <input value={lastName} onChange={(e) => setLastName(e.target.value)} autoCapitalize="words" />
        </label>
        <label>
          Team
          <input placeholder="e.g. 14U" value={team} onChange={(e) => setTeam(e.target.value)} />
        </label>
        <label>
          Birth year
          <input inputMode="numeric" pattern="\d{4}" placeholder="2012" value={birthYear} onChange={(e) => setBirthYear(e.target.value)} />
        </label>
        <label>
          Bats
          <select value={bats} onChange={(e) => setBats(e.target.value)}>
            <option value="">—</option>
            <option value="R">Right</option>
            <option value="L">Left</option>
            <option value="S">Switch</option>
          </select>
        </label>
        <label>
          Throws
          <select value={throws} onChange={(e) => setThrows(e.target.value)}>
            <option value="">—</option>
            <option value="R">Right</option>
            <option value="L">Left</option>
          </select>
        </label>
      </div>

      <h3 className="section-label">Positions</h3>
      <div className="chips">
        {POSITIONS.map((pos) => (
          <button
            key={pos}
            type="button"
            className={positions.includes(pos) ? 'chip chip-on' : 'chip'}
            onClick={() => togglePosition(pos)}
          >
            {pos}
          </button>
        ))}
      </div>

      <label>
        Notes
        <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </label>

      {error && <p className="msg msg-error">{error}</p>}

      <div className="row">
        <button className="btn" type="submit" disabled={saving}>
          {saving ? 'Saving…' : existing ? 'Save changes' : 'Add player'}
        </button>
        <button className="btn btn-secondary" type="button" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  )
}
