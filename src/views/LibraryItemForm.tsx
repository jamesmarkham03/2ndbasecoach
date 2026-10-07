import { useState, type FormEvent } from 'react'
import { ALL_LEVEL_KEYS, FOCUS_AREAS, ITEM_TYPES, LEVELS } from '../lib/pitching'
import { supabase, type LibraryItem } from '../lib/supabase'

type Props = {
  existing?: LibraryItem
  onSaved: () => void
  onCancel: () => void
}

function toggle(list: string[], key: string): string[] {
  return list.includes(key) ? list.filter((k) => k !== key) : [...list, key]
}

export function LibraryItemForm({ existing, onSaved, onCancel }: Props) {
  const [type, setType] = useState(existing?.type ?? 'drill')
  const [title, setTitle] = useState(existing?.title ?? '')
  const [note, setNote] = useState(existing?.note ?? '')
  const [focusAreas, setFocusAreas] = useState<string[]>(existing?.focus_areas ?? [])
  const [levels, setLevels] = useState<string[]>(existing?.levels ?? ALL_LEVEL_KEYS)
  const [minutes, setMinutes] = useState(String(existing?.minutes ?? 5))
  const [source, setSource] = useState(existing?.source ?? '')
  const [tags, setTags] = useState((existing?.tags ?? []).join(', '))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    const fields = {
      type,
      title: title.trim(),
      note: note.trim(),
      focus_areas: FOCUS_AREAS.map((f) => f.key as string).filter((k) => focusAreas.includes(k)),
      levels: levels.length ? ALL_LEVEL_KEYS.filter((k) => levels.includes(k)) : ALL_LEVEL_KEYS,
      minutes: Math.min(180, Math.max(1, Math.round(Number(minutes) || 5))),
      source: source.trim() || null,
      tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
    }
    const { error } = existing
      ? await supabase.from('library_items').update(fields).eq('id', existing.id)
      : await supabase.from('library_items').insert(fields)
    setSaving(false)
    if (error) setError(`Not saved: ${error.message}`)
    else onSaved()
  }

  async function setArchived(archived: boolean) {
    if (!existing) return
    const msg = archived
      ? `Archive “${existing.title}”? It disappears from the library and pickers, but plans and past lessons that used it keep it.`
      : `Restore “${existing.title}” to the library?`
    if (!window.confirm(msg)) return
    const { error } = await supabase.from('library_items').update({ archived }).eq('id', existing.id)
    if (error) setError(error.message)
    else onSaved()
  }

  return (
    <form className="card form" onSubmit={handleSubmit}>
      <h2>{existing ? 'Edit library item' : 'Add to library'}</h2>

      <h3 className="section-label">Type</h3>
      <div className="chips">
        {ITEM_TYPES.map((t) => (
          <button key={t.key} type="button" className={type === t.key ? `chip chip-on type-chip-${t.key}` : 'chip'} onClick={() => setType(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      <label>
        Title
        <input required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Hip Airplanes" />
      </label>
      <label>
        Note (short, your words)
        <textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="What it is and why it helps" />
      </label>

      <h3 className="section-label">Focus areas</h3>
      <div className="chips">
        {FOCUS_AREAS.map((f) => (
          <button key={f.key} type="button" className={focusAreas.includes(f.key) ? 'chip chip-on' : 'chip'} onClick={() => setFocusAreas(toggle(focusAreas, f.key))}>
            {f.label}
          </button>
        ))}
      </div>

      <h3 className="section-label">Levels</h3>
      <div className="chips">
        {LEVELS.map((l) => (
          <button key={l.key} type="button" className={levels.includes(l.key) ? 'chip chip-on' : 'chip'} onClick={() => setLevels(toggle(levels, l.key))}>
            {l.label}
          </button>
        ))}
      </div>

      <div className="form-grid">
        <label>
          Minutes to run
          <input inputMode="numeric" value={minutes} onChange={(e) => setMinutes(e.target.value)} />
        </label>
        <label>
          Source (video, book, coach)
          <input value={source} onChange={(e) => setSource(e.target.value)} placeholder="e.g. Lead Leg Block" />
        </label>
      </div>
      <label>
        Tags (comma separated)
        <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="e.g. band, resisted" />
      </label>

      {error && <p className="msg msg-error">{error}</p>}

      <div className="row">
        <button className="btn" type="submit" disabled={saving}>
          {saving ? 'Saving…' : existing ? 'Save changes' : 'Add to library'}
        </button>
        <button className="btn btn-secondary" type="button" onClick={onCancel}>
          Cancel
        </button>
        {existing && (
          <button className="btn-link push-right" type="button" onClick={() => setArchived(!existing.archived)}>
            {existing.archived ? 'Restore' : 'Archive'}
          </button>
        )}
      </div>
    </form>
  )
}
