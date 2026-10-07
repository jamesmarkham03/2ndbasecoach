import { useState } from 'react'
import { FOCUS_AREAS } from '../lib/pitching'
import type { LibraryItem } from '../lib/supabase'
import { TypeTag } from './TypeTag'

type Props = {
  items: LibraryItem[]
  alreadyAdded: string[] // library item ids already in the plan/lesson, shown with a check
  onAdd: (item: LibraryItem) => void
  onClose: () => void
  defaultFocus?: string | null
}

/** Full-screen sheet to pick drills from the library. Stays open so several can be added in a row. */
export function LibraryPicker({ items, alreadyAdded, onAdd, onClose, defaultFocus }: Props) {
  const [query, setQuery] = useState('')
  const [focus, setFocus] = useState<string | null>(defaultFocus ?? null)

  const q = query.trim().toLowerCase()
  const shown = items.filter((item) => {
    if (item.archived) return false
    if (focus && !item.focus_areas.includes(focus)) return false
    if (!q) return true
    return `${item.title} ${item.note} ${item.tags.join(' ')} ${item.source ?? ''}`.toLowerCase().includes(q)
  })

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Add from library">
        <div className="sheet-head">
          <h2>Add from library</h2>
          <button className="btn" onClick={onClose}>
            Done
          </button>
        </div>
        <input placeholder="Search drills, cues, tags…" value={query} onChange={(e) => setQuery(e.target.value)} autoFocus />
        <div className="chips chips-scroll">
          <button className={focus === null ? 'chip chip-on' : 'chip'} onClick={() => setFocus(null)}>
            All areas
          </button>
          {FOCUS_AREAS.map((f) => (
            <button key={f.key} className={focus === f.key ? 'chip chip-on' : 'chip'} onClick={() => setFocus(f.key)}>
              {f.label}
            </button>
          ))}
        </div>
        <ul className="picker-list">
          {shown.length === 0 && <li className="subtitle">Nothing matches.</li>}
          {shown.map((item) => {
            const added = alreadyAdded.includes(item.id)
            return (
              <li key={item.id}>
                <button className={added ? 'picker-row picker-row-added' : 'picker-row'} onClick={() => onAdd(item)}>
                  <TypeTag type={item.type} />
                  <span className="picker-title">{item.title}</span>
                  <span className="picker-min">{item.minutes} min</span>
                  <span className="picker-add" aria-hidden="true">
                    {added ? '✓' : '+'}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
