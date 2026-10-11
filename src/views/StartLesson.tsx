import { useState } from 'react'
import { countLabel, playerName, todayLocal } from '../lib/format'
import { focusLabel } from '../lib/pitching'
import { supabase, type LessonPlan, type LessonPlanItem, type Player } from '../lib/supabase'

type Props = {
  players: Player[]
  plans: LessonPlan[]
  planItems: LessonPlanItem[]
  presetPlayerId?: string | null
  onStarted: (lessonId: string) => void
  onCancel: () => void
}

export function StartLesson({ players, plans, planItems, presetPlayerId, onStarted, onCancel }: Props) {
  const [playerId, setPlayerId] = useState<string | null>(presetPlayerId ?? null)
  const [date, setDate] = useState(todayLocal())
  const [planId, setPlanId] = useState<string | null>(null) // null = blank lesson
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const activePlayers = players.filter((p) => p.active)
  const activePlans = plans.filter((p) => !p.archived)

  async function start() {
    if (!playerId) return
    setSaving(true)
    setError(null)
    const plan = activePlans.find((p) => p.id === planId)
    const { data: lesson, error } = await supabase
      .from('lessons')
      .insert({ player_id: playerId, lesson_date: date, plan_id: plan?.id ?? null, title: plan?.name ?? '' })
      .select('id')
      .single()
    if (error) {
      setSaving(false)
      setError(error.message)
      return
    }

    // Copy the plan's drills into the lesson, so editing today's lesson never changes the template.
    const items = plan ? planItems.filter((i) => i.plan_id === plan.id).sort((a, b) => a.position - b.position) : []
    if (items.length > 0) {
      const { error: itemsError } = await supabase.from('lesson_items').insert(
        items.map((i, position) => ({
          lesson_id: lesson.id,
          library_item_id: i.library_item_id,
          position,
          minutes: i.minutes,
          instructions: i.instructions,
        })),
      )
      if (itemsError) {
        // The lesson exists, so open it anyway; drills can be added by hand.
        window.alert(`Lesson created, but the plan’s drills didn’t copy (${itemsError.message}). Add them from the library.`)
      }
    }
    setSaving(false)
    onStarted(lesson.id)
  }

  return (
    <div className="form">
      <section className="card">
        <h2>Start a lesson</h2>
        <h3 className="section-label">Player</h3>
        {activePlayers.length === 0 && <p className="subtitle">Add players on the Players tab first.</p>}
        <div className="player-grid">
          {activePlayers.map((p) => (
            <button key={p.id} className={p.id === playerId ? 'player-tile player-tile-on' : 'player-tile'} onClick={() => setPlayerId(p.id)}>
              <span className="player-tile-name">{playerName(p)}</span>
              {p.team && <span className="player-tile-team">{p.team}</span>}
            </button>
          ))}
        </div>
        <label className="inline-label date-row">
          Date
          <input type="date" value={date} max={todayLocal()} onChange={(e) => setDate(e.target.value)} />
        </label>
      </section>

      <section className="card">
        <h3 className="section-label">Lesson plan</h3>
        <div className="plan-choices">
          <button className={planId === null ? 'plan-choice plan-choice-on' : 'plan-choice'} onClick={() => setPlanId(null)}>
            <strong>Blank lesson</strong>
            <span className="subtitle">Add drills as you go</span>
          </button>
          {activePlans.map((p) => (
            <button key={p.id} className={planId === p.id ? 'plan-choice plan-choice-on' : 'plan-choice'} onClick={() => setPlanId(p.id)}>
              <strong>{p.name}</strong>
              <span className="subtitle">
                {p.focus_area ? focusLabel(p.focus_area) : 'General'} · {countLabel(planItems.filter((i) => i.plan_id === p.id).length, 'drill')}
              </span>
            </button>
          ))}
        </div>
      </section>

      {error && <p className="msg msg-error">{error}</p>}
      <div className="row">
        <button className="btn" disabled={!playerId || saving} onClick={start}>
          {saving ? 'Starting…' : 'Start lesson'}
        </button>
        <button className="btn btn-secondary" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  )
}
