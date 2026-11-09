import { useState } from 'react'
import type { TestingEntry } from '../../lib/supabase'
import type { TestingDayApi } from '../../lib/useTestingDay'

/** A note about this player on this day. The same note appears on every screen of the day. */
export function EntryNote({ entry, api }: { entry: TestingEntry; api: TestingDayApi }) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState(entry.note ?? '')

  async function save() {
    const note = text.trim() || null
    if (note === entry.note) return setOpen(false)
    if (await api.updateEntry(entry.id, { note })) setOpen(false)
  }

  if (open) {
    return (
      <div className="entry-note-edit">
        <textarea
          autoFocus
          rows={2}
          value={text}
          aria-label={`Note for number ${entry.number}`}
          onChange={(e) => setText(e.target.value)}
          onBlur={save}
        />
      </div>
    )
  }
  return (
    <div className="entry-note">
      {entry.note && <p className="entry-note-text">{entry.note}</p>}
      <button
        className="btn-link"
        onClick={() => {
          setText(entry.note ?? '')
          setOpen(true)
        }}
      >
        {entry.note ? 'Edit note' : '+ Note'}
      </button>
    </div>
  )
}
