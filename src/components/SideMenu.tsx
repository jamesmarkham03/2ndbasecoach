import { useEffect, useRef } from 'react'

export type View = 'players' | 'teams' | 'lessons' | 'library'

const ITEMS: { key: View; label: string }[] = [
  { key: 'players', label: 'Players' },
  { key: 'teams', label: 'Teams' },
  { key: 'lessons', label: 'Lessons' },
  { key: 'library', label: 'Library' },
]

type Props = {
  view: View
  firstName: string
  signOutLabel: string
  onSelect: (view: View) => void
  onSignOut: () => void
  onClose: () => void
}

/** Slides in from the left over a dark overlay. Tapping outside it, or pressing Escape, closes it. */
export function SideMenu({ view, firstName, signOutLabel, onSelect, onSignOut, onClose }: Props) {
  const closeButton = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    // Move focus into the menu so keyboard users aren't left behind it.
    closeButton.current?.focus()
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="menu-backdrop" onClick={onClose}>
      {/* stopPropagation: taps inside the panel must not count as "outside" taps. */}
      <nav className="menu-panel" aria-label="Main menu" onClick={(e) => e.stopPropagation()}>
        <div className="menu-head">
          <span className="section-label">Menu</span>
          <button ref={closeButton} className="btn-icon" onClick={onClose} aria-label="Close menu">
            ✕
          </button>
        </div>

        <ul className="menu-list">
          {ITEMS.map((item) => (
            <li key={item.key}>
              <button
                className={view === item.key ? 'menu-item menu-item-on' : 'menu-item'}
                aria-current={view === item.key ? 'page' : undefined}
                onClick={() => onSelect(item.key)}
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>

        <div className="menu-account">
          {firstName && <span className="header-coach">Coach {firstName}</span>}
          <button className="btn-link" onClick={onSignOut}>
            {signOutLabel}
          </button>
        </div>
      </nav>
    </div>
  )
}
