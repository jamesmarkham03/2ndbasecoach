import { useState } from 'react'
import { playerName } from '../../lib/format'
import type { Player, TestingEntry } from '../../lib/supabase'

type Props = {
  title: string
  entries: TestingEntry[]
  playerById: Map<string, Player>
  /** Optional words beside a name, e.g. "already ran". */
  statusOf?: (entry: TestingEntry) => string
  onPick: (entry: TestingEntry) => void
  onClose: () => void
}

/** Bottom sheet for choosing someone already checked in, by number or name. */
export function EntryPicker({ title, entries, playerById, statusOf, onPick, onClose }: Props) {
  const [search, setSearch] = useState('')
  const term = search.trim().toLowerCase()
  const name = (e: TestingEntry) => {
    const p = playerById.get(e.player_id)
    return p ? playerName(p) : ''
  }
  const shown = [...entries]
    .sort((a, b) => a.number - b.number)
    .filter((e) => term === '' || String(e.number).startsWith(term) || name(e).toLowerCase().includes(term))

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          <h3>{title}</h3>
          <button className="btn-icon" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Number or name" aria-label="Search by number or name" autoComplete="off" />
        <ul className="picker-list">
          {shown.map((e) => (
            <li key={e.id}>
              <button className="picker-row" onClick={() => onPick(e)}>
                <span className="test-num">{e.number}</span>
                <span className="picker-title">{name(e)}</span>
                <span className="picker-min">{statusOf?.(e) ?? e.position}</span>
              </button>
            </li>
          ))}
          {shown.length === 0 && <li className="subtitle">Nobody matches.</li>}
        </ul>
      </div>
    </div>
  )
}
