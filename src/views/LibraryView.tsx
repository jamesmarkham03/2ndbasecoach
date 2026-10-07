import { useRef, useState } from 'react'
import { TypeTag } from '../components/TypeTag'
import { importOldPitchingApp, loadStarterLibrary, type ImportSummary } from '../lib/libraryImport'
import { FOCUS_AREAS, focusLabel, ITEM_TYPES, LEVELS, levelLabel } from '../lib/pitching'
import type { LibraryItem } from '../lib/supabase'
import { LibraryItemForm } from './LibraryItemForm'

type Props = {
  items: LibraryItem[]
  onChanged: () => void
}

function describeImport(s: ImportSummary): string {
  const parts = [`${s.itemsAdded} library item${s.itemsAdded === 1 ? '' : 's'} added`]
  if (s.itemsAlreadyThere) parts.push(`${s.itemsAlreadyThere} already there (skipped)`)
  if (s.plansAdded) parts.push(`${s.plansAdded} lesson plan${s.plansAdded === 1 ? '' : 's'} imported`)
  if (s.starterPlansAdded) parts.push(`${s.starterPlansAdded} default plan${s.starterPlansAdded === 1 ? '' : 's'} created`)
  return parts.join(' · ')
}

export function LibraryView({ items, onChanged }: Props) {
  const [editing, setEditing] = useState<LibraryItem | 'new' | null>(null)
  const [query, setQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<string | null>(null)
  const [focusFilter, setFocusFilter] = useState('')
  const [levelFilter, setLevelFilter] = useState('')
  const [showArchived, setShowArchived] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ kind: 'error' | 'info'; text: string } | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  async function runImport(task: () => Promise<ImportSummary>) {
    setBusy(true)
    setMessage(null)
    try {
      const summary = await task()
      setMessage({ kind: 'info', text: describeImport(summary) })
      onChanged()
    } catch (err) {
      setMessage({ kind: 'error', text: err instanceof Error ? err.message : String(err) })
    }
    setBusy(false)
  }

  async function handleFile(file: File | undefined) {
    if (!file) return
    const text = await file.text()
    await runImport(() => importOldPitchingApp(text))
    if (fileInput.current) fileInput.current.value = '' // allow picking the same file again
  }

  if (editing) {
    return (
      <LibraryItemForm
        existing={editing === 'new' ? undefined : editing}
        onSaved={() => {
          setEditing(null)
          onChanged()
        }}
        onCancel={() => setEditing(null)}
      />
    )
  }

  const q = query.trim().toLowerCase()
  const shown = items.filter((item) => {
    if (item.archived !== showArchived) return false
    if (typeFilter && item.type !== typeFilter) return false
    if (focusFilter && !item.focus_areas.includes(focusFilter)) return false
    if (levelFilter && !item.levels.includes(levelFilter)) return false
    if (!q) return true
    return `${item.title} ${item.note} ${item.tags.join(' ')} ${item.source ?? ''}`.toLowerCase().includes(q)
  })
  const activeCount = items.filter((i) => !i.archived).length
  const archivedCount = items.length - activeCount

  const importTools = (
    <>
      <input ref={fileInput} type="file" accept=".json,application/json" hidden onChange={(e) => handleFile(e.target.files?.[0])} />
      <button className="btn" disabled={busy} onClick={() => fileInput.current?.click()}>
        {busy ? 'Importing…' : 'Import from old pitching app'}
      </button>
    </>
  )

  if (items.length === 0) {
    return (
      <div className="card empty">
        <h2>Your pitching library</h2>
        <p>Concepts, drills and cues you teach. Bring over your old pitching app, or start from the built-in set.</p>
        <div className="row row-center">
          {importTools}
          <button className="btn btn-secondary" disabled={busy} onClick={() => runImport(loadStarterLibrary)}>
            Load starter library (59 items)
          </button>
        </div>
        {message && <p className={message.kind === 'error' ? 'msg msg-error' : 'msg msg-info'}>{message.text}</p>}
      </div>
    )
  }

  return (
    <div>
      <section className="card">
        <div className="row">
          <input className="grow" placeholder="Search concepts, drills, cues, tags…" value={query} onChange={(e) => setQuery(e.target.value)} />
          <button className="btn" onClick={() => setEditing('new')}>
            + Add
          </button>
        </div>
        <div className="chips filter-row">
          <button className={typeFilter === null ? 'chip chip-on' : 'chip'} onClick={() => setTypeFilter(null)}>
            All types
          </button>
          {ITEM_TYPES.map((t) => (
            <button key={t.key} className={typeFilter === t.key ? `chip chip-on type-chip-${t.key}` : 'chip'} onClick={() => setTypeFilter(t.key)}>
              {t.label}
            </button>
          ))}
        </div>
        <div className="row filter-row">
          <select value={focusFilter} onChange={(e) => setFocusFilter(e.target.value)} aria-label="Focus area">
            <option value="">All focus areas</option>
            {FOCUS_AREAS.map((f) => (
              <option key={f.key} value={f.key}>
                {f.label}
              </option>
            ))}
          </select>
          <select value={levelFilter} onChange={(e) => setLevelFilter(e.target.value)} aria-label="Level">
            <option value="">All levels</option>
            {LEVELS.map((l) => (
              <option key={l.key} value={l.key}>
                {l.label}
              </option>
            ))}
          </select>
          <span className="subtitle push-right">
            {shown.length} of {showArchived ? archivedCount : activeCount}
          </span>
        </div>
      </section>

      {message && <p className={message.kind === 'error' ? 'msg msg-error' : 'msg msg-info'}>{message.text}</p>}

      <div className="library-grid">
        {shown.map((item) => (
          <button key={item.id} className={`library-card type-border-${item.type}`} onClick={() => setEditing(item)}>
            <div className="library-card-top">
              <TypeTag type={item.type} />
              <span className="subtitle">{item.minutes} min</span>
            </div>
            <strong className="library-card-title">{item.title}</strong>
            {item.note && <span className="library-card-note">{item.note}</span>}
            <span className="library-card-meta">
              {[...item.focus_areas.map(focusLabel), item.levels.length === 3 ? 'All levels' : item.levels.map(levelLabel).join(', ')].join(' · ')}
            </span>
          </button>
        ))}
      </div>
      {shown.length === 0 && (
        <div className="card empty">
          <p>Nothing matches. Try a different search or filter.</p>
        </div>
      )}

      <div className="row library-footer">
        {archivedCount > 0 && (
          <button className="btn-link" onClick={() => setShowArchived(!showArchived)}>
            {showArchived ? 'Show active items' : `Show archived (${archivedCount})`}
          </button>
        )}
        <span className="push-right">{importTools}</span>
      </div>
    </div>
  )
}
