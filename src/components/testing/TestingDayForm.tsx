import { useState, type FormEvent } from 'react'
import { todayLocal } from '../../lib/format'
import type { Team } from '../../lib/supabase'
import { SPRINT_DISTANCES, STATIONS, TEMPLATES, type DayConfig, type DayKind, type StationKey } from '../../lib/testing'

export type DayFormValues = { name: string; held_on: string; kind: DayKind; indoor: boolean; config: DayConfig }

type Props = {
  teams: Team[]
  /** Editing an existing day. Its template can't change, because results are already tied to it. */
  existing?: DayFormValues
  submitLabel: string
  onSubmit: (values: DayFormValues) => void
  onCancel?: () => void
}

function toggled<T>(list: T[], item: T): T[] {
  return list.includes(item) ? list.filter((x) => x !== item) : [...list, item]
}

export function TestingDayForm({ teams, existing, submitLabel, onSubmit, onCancel }: Props) {
  const [kind, setKind] = useState<DayKind>(existing?.kind ?? 'pro_day')
  const [name, setName] = useState(existing?.name ?? TEMPLATES.pro_day.label)
  const [heldOn, setHeldOn] = useState(existing?.held_on ?? todayLocal())
  const [indoor, setIndoor] = useState(existing?.indoor ?? TEMPLATES.pro_day.indoor)
  const [config, setConfig] = useState<DayConfig>(existing?.config ?? TEMPLATES.pro_day.config)
  const update = (patch: Partial<DayConfig>) => setConfig({ ...config, ...patch })

  function pickTemplate(next: DayKind) {
    const template = TEMPLATES[next]
    // Keep the chosen teams and swap everything else to the template's defaults.
    setConfig({ ...template.config, teamIds: config.teamIds })
    setIndoor(template.indoor)
    if (name === TEMPLATES[kind].label) setName(template.label)
    setKind(next)
  }

  function submit(e: FormEvent) {
    e.preventDefault()
    onSubmit({ name: name.trim(), held_on: heldOn, kind, indoor, config })
  }

  const regularTeams = teams.filter((t) => !t.is_private_lessons)
  const allPicked = regularTeams.length > 0 && regularTeams.every((t) => config.teamIds.includes(t.id))

  return (
    <form className="form" onSubmit={submit}>
      {!existing && (
        <div>
          <h3 className="section-label">Type of day</h3>
          <div className="chips">
            {(Object.keys(TEMPLATES) as DayKind[]).map((k) => (
              <button key={k} type="button" className={kind === k ? 'chip chip-on' : 'chip'} aria-pressed={kind === k} onClick={() => pickTemplate(k)}>
                {TEMPLATES[k].label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="form-grid">
        <label>
          Name
          <input required value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label>
          Date
          <input required type="date" value={heldOn} onChange={(e) => setHeldOn(e.target.value)} />
        </label>
      </div>
      <label className="inline-label check-label">
        <input type="checkbox" checked={indoor} onChange={(e) => setIndoor(e.target.checked)} />
        Indoors
      </label>

      <div>
        <h3 className="section-label">Teams</h3>
        <div className="chips">
          <button type="button" className={allPicked ? 'chip chip-on' : 'chip'} aria-pressed={allPicked} onClick={() => update({ teamIds: allPicked ? [] : regularTeams.map((t) => t.id) })}>
            All
          </button>
          {teams.map((t) => (
            <button key={t.id} type="button" className={config.teamIds.includes(t.id) ? 'chip chip-on' : 'chip'} aria-pressed={config.teamIds.includes(t.id)} onClick={() => update({ teamIds: toggled(config.teamIds, t.id) })}>
              {t.name}
            </button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="section-label">Sprint distances</h3>
        <div className="chips">
          {SPRINT_DISTANCES.map((d) => (
            <button key={d} type="button" className={config.sprintDistances.includes(d) ? 'chip chip-on' : 'chip'} aria-pressed={config.sprintDistances.includes(d)} onClick={() => update({ sprintDistances: toggled(config.sprintDistances, d) })}>
              {d} yd
            </button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="section-label">Stations</h3>
        <div className="chips">
          {STATIONS.map((s) => (
            <button key={s.key} type="button" className={config.stations.includes(s.key) ? 'chip chip-on' : 'chip'} aria-pressed={config.stations.includes(s.key)} onClick={() => update({ stations: toggled<StationKey>(config.stations, s.key) })}>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <label className="inline-label check-label">
        <input type="checkbox" checked={config.grades} onChange={(e) => update({ grades: e.target.checked })} />
        Grades (20–80)
      </label>
      <label className="inline-label check-label">
        <input type="checkbox" checked={config.exitVelo} onChange={(e) => update({ exitVelo: e.target.checked })} />
        Exit velo station
      </label>
      <label className="inline-label check-label">
        <input type="checkbox" checked={config.outfieldStart === 800} onChange={(e) => update({ outfieldStart: e.target.checked ? 800 : 700 })} />
        Outfielders start at 800
      </label>

      <div className="row">
        <button className="btn" type="submit" disabled={name.trim() === '' || heldOn === ''}>
          {submitLabel}
        </button>
        {onCancel && (
          <button className="btn btn-secondary" type="button" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </form>
  )
}
