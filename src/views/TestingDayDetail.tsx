import { useEffect, useRef, useState } from 'react'
import { CheckInPanel } from '../components/testing/CheckInPanel'
import { LeaderboardPanel } from '../components/testing/LeaderboardPanel'
import { SprintPanel } from '../components/testing/SprintPanel'
import { StationPanel } from '../components/testing/StationPanel'
import { TestingDayForm } from '../components/testing/TestingDayForm'
import { formatDate } from '../lib/format'
import type { Player, Team } from '../lib/supabase'
import { STATIONS, dayConfig, kindLabel, type DayKind, type StationKey } from '../lib/testing'
import { useTestingDay } from '../lib/useTestingDay'

type Props = {
  dayId: string
  players: Player[]
  teams: Team[]
  onBack: () => void
  onPlayersChanged: () => void
}

type Tab = 'checkin' | 'sprint' | StationKey | 'board' | 'settings'

export function TestingDayDetail({ dayId, players, teams, onBack, onPlayersChanged }: Props) {
  const api = useTestingDay(dayId)
  const [tab, setTab] = useState<Tab>('checkin')
  const [typedName, setTypedName] = useState('')
  const positionsChanged = useRef(false)
  const playerById = new Map(players.map((p) => [p.id, p]))

  // Positions saved during check-in only need to reach the player list when leaving,
  // whichever way the coach leaves (back button or side menu).
  useEffect(
    () => () => {
      if (positionsChanged.current) onPlayersChanged()
    },
    [onPlayersChanged],
  )

  if (!api.day) {
    return (
      <div>
        <button className="btn-link back" onClick={onBack}>
          ‹ All days
        </button>
        {api.error ? <p className="msg msg-error">{api.error}</p> : <p className="subtitle">Loading…</p>}
      </div>
    )
  }

  const day = api.day
  const config = dayConfig(day)
  const tabs: { key: Tab; label: string }[] = [
    { key: 'checkin', label: 'Check-in' },
    ...(config.sprintDistances.length > 0 ? [{ key: 'sprint' as const, label: 'Sprints' }] : []),
    ...STATIONS.filter((s) => config.stations.includes(s.key)).map((s) => ({ key: s.key as Tab, label: s.label })),
    { key: 'board', label: 'Leaderboard' },
    { key: 'settings', label: 'Settings' },
  ]
  // A station switched off in Settings can't stay open.
  const active = tabs.some((t) => t.key === tab) ? tab : 'checkin'
  const station = STATIONS.find((s) => s.key === active)

  async function deleteForGood() {
    if (await api.deleteDay()) onBack()
  }

  return (
    <div>
      <button className="btn-link back" onClick={onBack}>
        ‹ All days
      </button>

      <section className="card player-header">
        <div>
          <h2>
            {day.name}
            {day.indoor && <span className="tag">Indoor</span>}
          </h2>
          <p className="subtitle">
            {kindLabel(day.kind)} · {formatDate(day.held_on)}
          </p>
        </div>
      </section>

      <div className="chips day-tabs" role="tablist" aria-label="Sections of this day">
        {tabs.map((t) => (
          <button key={t.key} role="tab" aria-selected={active === t.key} className={active === t.key ? 'chip chip-on' : 'chip'} onClick={() => setTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      {api.error && <p className="msg msg-error">{api.error}</p>}

      {active === 'checkin' && (
        <CheckInPanel
          api={api}
          config={config}
          players={players}
          teams={teams}
          onPositionsSaved={() => {
            positionsChanged.current = true
          }}
        />
      )}
      {active === 'sprint' && <SprintPanel api={api} config={config} playerById={playerById} />}
      {station && <StationPanel key={station.key} api={api} config={config} station={station.key} playerById={playerById} />}
      {active === 'board' && <LeaderboardPanel api={api} playerById={playerById} />}
      {active === 'settings' && (
        <>
          <section className="card">
            <h2>Settings</h2>
            <TestingDayForm
              key={day.id}
              teams={teams}
              existing={{ name: day.name, held_on: day.held_on, kind: day.kind as DayKind, indoor: day.indoor, config }}
              submitLabel="Save settings"
              onSubmit={({ name, held_on, indoor, config: next }) => void api.saveDay({ name, held_on, indoor, config: next })}
            />
          </section>
          <section className="card danger-card">
            <h3>Delete this day</h3>
            <p>This erases every number, grade and note from this day. Players are not affected. It can’t be undone.</p>
            <label>
              <span>
                Type <strong>{day.name}</strong> to confirm
              </span>
              <input value={typedName} onChange={(e) => setTypedName(e.target.value)} autoCapitalize="off" autoComplete="off" />
            </label>
            <button className="btn btn-danger" disabled={typedName.trim().toLowerCase() !== day.name.trim().toLowerCase()} onClick={deleteForGood}>
              Delete day
            </button>
          </section>
        </>
      )}
    </div>
  )
}
