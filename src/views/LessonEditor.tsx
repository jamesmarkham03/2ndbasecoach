import { useEffect, useState } from 'react'
import { LibraryPicker } from '../components/LibraryPicker'
import { TypeTag } from '../components/TypeTag'
import { WatchLink } from '../components/WatchLink'
import { formatDate, playerName } from '../lib/format'
import { useAutosave } from '../lib/useAutosave'
import { supabase, type Lesson, type LessonItem, type LessonNote, type LibraryItem, type Player } from '../lib/supabase'

type Props = {
  lessonId: string
  players: Player[]
  library: LibraryItem[]
  onBack: () => void
  onChanged: () => void
}

const STATUS_TEXT = { idle: '', saving: 'Saving…', saved: 'All changes saved', error: 'Not saved' } as const

export function LessonEditor({ lessonId, players, library, onBack, onChanged }: Props) {
  const [lesson, setLesson] = useState<Lesson | null>(null)
  const [items, setItems] = useState<LessonItem[]>([])
  const [notes, setNotes] = useState<LessonNote[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const [picking, setPicking] = useState(false)
  const [customTitle, setCustomTitle] = useState('')
  const [newNote, setNewNote] = useState('')
  const { status, lastError, saveSoon, flush, saveNow } = useAutosave()

  useEffect(() => {
    let cancelled = false
    Promise.all([
      supabase.from('lessons').select('*').eq('id', lessonId).single(),
      supabase.from('lesson_items').select('*').eq('lesson_id', lessonId).order('position'),
      supabase.from('lesson_notes').select('*').eq('lesson_id', lessonId).order('created_at'),
    ]).then(([l, i, n]) => {
      if (cancelled) return
      const err = l.error ?? i.error ?? n.error
      if (err) return setLoadError(err.message)
      setLesson(l.data)
      setItems(i.data ?? [])
      setNotes(n.data ?? [])
    })
    return () => {
      cancelled = true
    }
  }, [lessonId])

  if (loadError) return <p className="msg msg-error">Couldn’t load lesson: {loadError}</p>
  if (!lesson) return <p className="subtitle">Loading…</p>

  const player = players.find((p) => p.id === lesson.player_id)
  const libById = new Map(library.map((l) => [l.id, l]))
  const doneCount = items.filter((i) => i.completed).length

  // ---- lesson fields (typed: save shortly after typing stops)
  function editLesson(patch: Partial<Lesson>, key: string) {
    setLesson((prev) => (prev ? { ...prev, ...patch } : prev))
    saveSoon(key, async () => {
      const { error } = await supabase.from('lessons').update(patch).eq('id', lessonId)
      if (!error) onChanged()
      return error?.message ?? null
    })
  }

  // ---- drills
  function editItem(id: string, patch: Partial<LessonItem>, typed: boolean) {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)))
    const save = async () => (await supabase.from('lesson_items').update(patch).eq('id', id)).error?.message ?? null
    if (typed) saveSoon(`item-${id}-${Object.keys(patch).join()}`, save)
    else void saveNow(save)
  }

  async function addItem(fields: { library_item_id?: string; custom_title?: string; minutes?: number | null }) {
    const position = items.length ? Math.max(...items.map((i) => i.position)) + 1 : 0
    let added: LessonItem | null = null
    await saveNow(async () => {
      const { data, error } = await supabase.from('lesson_items').insert({ lesson_id: lessonId, position, ...fields }).select().single()
      added = data
      return error?.message ?? null
    })
    if (added) setItems((prev) => [...prev, added!])
  }

  async function removeItem(item: LessonItem) {
    const name = item.custom_title ?? libById.get(item.library_item_id ?? '')?.title ?? 'this drill'
    const warn = item.comment ? ' Its comment will be lost.' : ''
    if (!window.confirm(`Remove “${name}” from this lesson?${warn}`)) return
    const ok = await saveNow(async () => (await supabase.from('lesson_items').delete().eq('id', item.id)).error?.message ?? null)
    if (ok) setItems((prev) => prev.filter((i) => i.id !== item.id))
  }

  // ---- follow-up notes
  async function addNote() {
    const body = newNote.trim()
    if (!body) return
    let added: LessonNote | null = null
    await saveNow(async () => {
      const { data, error } = await supabase.from('lesson_notes').insert({ lesson_id: lessonId, body }).select().single()
      added = data
      return error?.message ?? null
    })
    if (added) {
      setNotes((prev) => [...prev, added!])
      setNewNote('')
    }
  }

  async function deleteNote(note: LessonNote) {
    if (!window.confirm('Delete this follow-up note?')) return
    const ok = await saveNow(async () => (await supabase.from('lesson_notes').delete().eq('id', note.id)).error?.message ?? null)
    if (ok) setNotes((prev) => prev.filter((n) => n.id !== note.id))
  }

  async function setArchived(archived: boolean) {
    if (!window.confirm(archived ? 'Archive this lesson? It’s hidden from lists but kept.' : 'Restore this lesson?')) return
    const ok = await saveNow(async () => (await supabase.from('lessons').update({ archived }).eq('id', lessonId)).error?.message ?? null)
    if (ok) {
      setLesson({ ...lesson!, archived })
      onChanged()
    }
  }

  return (
    <div>
      <div className="row">
        <button className="btn-link back" onClick={onBack}>
          ‹ All lessons
        </button>
        <span className={`save-status save-${status} push-right`} role="status">
          {status === 'error' ? `Not saved: ${lastError}` : STATUS_TEXT[status]}
        </span>
      </div>

      <section className="card">
        <div className="lesson-head">
          <h2>
            {player ? playerName(player) : 'Unknown player'}
            {lesson.archived && <span className="tag">Archived</span>}
          </h2>
          <span className="subtitle">{formatDate(lesson.lesson_date)}</span>
        </div>
        <div className="form-grid">
          <label>
            Lesson focus / title
            <input
              value={lesson.title}
              placeholder="e.g. Arm path + lower half"
              onChange={(e) => editLesson({ title: e.target.value }, 'title')}
              onBlur={() => flush('title')}
            />
          </label>
          <label>
            Date
            <input type="date" value={lesson.lesson_date} onChange={(e) => e.target.value && editLesson({ lesson_date: e.target.value }, 'date')} onBlur={() => flush('date')} />
          </label>
        </div>
      </section>

      <section className="card">
        <div className="row">
          <h3 className="section-label">Today’s drills</h3>
          <span className="subtitle push-right">
            {doneCount} of {items.length} done
          </span>
        </div>
        {items.length === 0 && <p className="subtitle">No drills yet. Add from the library or type one in below.</p>}
        <ul className="lesson-items">
          {items.map((item) => {
            const lib = item.library_item_id ? libById.get(item.library_item_id) : undefined
            const key = `item-${item.id}-comment`
            return (
              <li key={item.id} className={item.completed ? 'lesson-item lesson-item-done' : 'lesson-item'}>
                <div className="lesson-item-head">
                  <button
                    className={item.completed ? 'check check-on' : 'check'}
                    onClick={() => editItem(item.id, { completed: !item.completed }, false)}
                    aria-pressed={item.completed}
                    aria-label={item.completed ? 'Mark not done' : 'Mark done'}
                  >
                    {item.completed ? '✓' : ''}
                  </button>
                  <div className="grow">
                    <div className="lesson-item-title">
                      {lib && <TypeTag type={lib.type} />}
                      <strong>{item.custom_title ?? lib?.title ?? 'Unknown drill'}</strong>
                    </div>
                    {(item.instructions || item.minutes || lib) && (
                      <span className="subtitle">
                        {[item.instructions, `${item.minutes ?? lib?.minutes ?? '?'} min`].filter(Boolean).join(' · ')}
                      </span>
                    )}
                  </div>
                  <WatchLink source={lib?.source} />
                  <button className="btn-icon" onClick={() => removeItem(item)} aria-label="Remove drill">
                    ✕
                  </button>
                </div>
                <textarea
                  rows={2}
                  placeholder="How did it go? (reps, feel, what clicked)"
                  value={item.comment ?? ''}
                  onChange={(e) => editItem(item.id, { comment: e.target.value || null }, true)}
                  onBlur={() => flush(key)}
                />
              </li>
            )
          })}
        </ul>
        <div className="row">
          <button className="btn btn-secondary" onClick={() => setPicking(true)}>
            + Add from library
          </button>
          <input className="grow" placeholder="…or type a drill not in the library" value={customTitle} onChange={(e) => setCustomTitle(e.target.value)} />
          <button
            className="btn btn-secondary"
            disabled={!customTitle.trim()}
            onClick={async () => {
              await addItem({ custom_title: customTitle.trim() })
              setCustomTitle('')
            }}
          >
            Add
          </button>
        </div>
      </section>

      <section className="card">
        <label>
          Overall notes
          <textarea
            rows={4}
            placeholder="Big takeaways, homework, what to work on next time"
            value={lesson.overall_notes ?? ''}
            onChange={(e) => editLesson({ overall_notes: e.target.value || null }, 'notes')}
            onBlur={() => flush('notes')}
          />
        </label>
      </section>

      <section className="card">
        <h3 className="section-label">Follow-up notes</h3>
        <p className="subtitle">Add thoughts after the lesson. Each one is dated and never overwrites the notes above.</p>
        <ul className="follow-ups">
          {notes.map((n) => (
            <li key={n.id}>
              <span className="follow-up-date">{new Date(n.created_at).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
              <span className="grow follow-up-body">{n.body}</span>
              <button className="btn-icon" onClick={() => deleteNote(n)} aria-label="Delete note">
                ✕
              </button>
            </li>
          ))}
        </ul>
        <div className="row">
          <textarea className="grow" rows={2} placeholder="e.g. Bullpen 2 days later: arm path much cleaner" value={newNote} onChange={(e) => setNewNote(e.target.value)} />
          <button className="btn" disabled={!newNote.trim()} onClick={addNote}>
            Add note
          </button>
        </div>
      </section>

      <div className="row">
        <button className="btn-link" onClick={() => setArchived(!lesson.archived)}>
          {lesson.archived ? 'Restore lesson' : 'Archive lesson'}
        </button>
      </div>

      {picking && (
        <LibraryPicker
          items={library}
          alreadyAdded={items.map((i) => i.library_item_id ?? '')}
          onAdd={(item) => void addItem({ library_item_id: item.id })}
          onClose={() => setPicking(false)}
        />
      )}
    </div>
  )
}
