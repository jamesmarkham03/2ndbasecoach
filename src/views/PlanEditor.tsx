import { useState, type FormEvent } from 'react'
import { LibraryPicker } from '../components/LibraryPicker'
import { TypeTag } from '../components/TypeTag'
import { FOCUS_AREAS, LEVELS } from '../lib/pitching'
import { supabase, type LessonPlan, type LessonPlanItem, type LibraryItem } from '../lib/supabase'

type Props = {
  plan?: LessonPlan // leave out for a new plan
  planItems: LessonPlanItem[]
  library: LibraryItem[]
  onSaved: () => void
  onCancel: () => void
}

// One row in the editor. `key` is local only, so new rows can be told apart before they're saved.
type Row = { key: string; library_item_id: string; minutes: string; instructions: string }

let nextKey = 0
const newKey = () => `row-${nextKey++}`

export function PlanEditor({ plan, planItems, library, onSaved, onCancel }: Props) {
  const [name, setName] = useState(plan?.name ?? '')
  const [focusArea, setFocusArea] = useState(plan?.focus_area ?? '')
  const [level, setLevel] = useState(plan?.level ?? '')
  const [description, setDescription] = useState(plan?.description ?? '')
  const [rows, setRows] = useState<Row[]>(() =>
    planItems.map((i) => ({ key: newKey(), library_item_id: i.library_item_id, minutes: i.minutes?.toString() ?? '', instructions: i.instructions ?? '' })),
  )
  const [picking, setPicking] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const byId = new Map(library.map((l) => [l.id, l]))
  const rowMinutes = (r: Row) => Number(r.minutes) || byId.get(r.library_item_id)?.minutes || 0
  const totalMinutes = rows.reduce((sum, r) => sum + rowMinutes(r), 0)

  function move(index: number, delta: number) {
    setRows((prev) => {
      const next = [...prev]
      const [row] = next.splice(index, 1)
      next.splice(index + delta, 0, row)
      return next
    })
  }
  function update(index: number, patch: Partial<Row>) {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    const fields = {
      name: name.trim(),
      focus_area: focusArea || null,
      level: level || null,
      description: description.trim() || null,
    }

    let planId = plan?.id
    if (planId) {
      const { error } = await supabase.from('lesson_plans').update(fields).eq('id', planId)
      if (error) return fail(error.message)
    } else {
      const { data, error } = await supabase.from('lesson_plans').insert(fields).select('id').single()
      if (error) return fail(error.message)
      planId = data.id
    }

    // Write the new item list first, then remove the old rows. If the insert fails,
    // the plan still has its previous items instead of ending up empty.
    if (rows.length > 0) {
      const { error } = await supabase.from('lesson_plan_items').insert(
        rows.map((r, position) => ({
          plan_id: planId,
          library_item_id: r.library_item_id,
          position,
          minutes: r.minutes ? Math.min(180, Math.max(1, Math.round(Number(r.minutes)))) : null,
          instructions: r.instructions.trim() || null,
        })),
      )
      if (error) return fail(error.message)
    }
    const oldIds = planItems.map((i) => i.id)
    if (oldIds.length > 0) {
      const { error } = await supabase.from('lesson_plan_items').delete().in('id', oldIds)
      if (error) return fail(error.message)
    }
    setSaving(false)
    onSaved()
  }

  function fail(message: string) {
    setSaving(false)
    setError(`Not saved: ${message}`)
  }

  async function setArchived(archived: boolean) {
    if (!plan) return
    if (!window.confirm(archived ? `Archive “${plan.name}”? Past lessons that used it keep their drills.` : `Restore “${plan.name}”?`)) return
    const { error } = await supabase.from('lesson_plans').update({ archived }).eq('id', plan.id)
    if (error) setError(error.message)
    else onSaved()
  }

  return (
    <form className="card form" onSubmit={handleSubmit}>
      <h2>{plan ? 'Edit lesson plan' : 'New lesson plan'}</h2>

      <label>
        Plan name
        <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Arm Path: Early Lesson" />
      </label>
      <div className="form-grid">
        <label>
          Focus area
          <select value={focusArea} onChange={(e) => setFocusArea(e.target.value)}>
            <option value="">—</option>
            {FOCUS_AREAS.map((f) => (
              <option key={f.key} value={f.key}>
                {f.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Level
          <select value={level} onChange={(e) => setLevel(e.target.value)}>
            <option value="">Any level</option>
            {LEVELS.map((l) => (
              <option key={l.key} value={l.key}>
                {l.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label>
        Description
        <textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="When to use this plan" />
      </label>

      <div className="row">
        <h3 className="section-label">Drills ({rows.length})</h3>
        <span className="subtitle push-right">{totalMinutes} min total</span>
      </div>
      {rows.length === 0 && <p className="subtitle">No drills yet. Add some from your library.</p>}
      <ol className="plan-rows">
        {rows.map((r, index) => {
          const item = byId.get(r.library_item_id)
          return (
            <li key={r.key} className="plan-row">
              <div className="plan-row-head">
                <span className="plan-row-num">{index + 1}</span>
                {item && <TypeTag type={item.type} />}
                <strong className="grow">{item?.title ?? 'Unknown item'}</strong>
                <button type="button" className="btn-icon" disabled={index === 0} onClick={() => move(index, -1)} aria-label="Move up">
                  ↑
                </button>
                <button type="button" className="btn-icon" disabled={index === rows.length - 1} onClick={() => move(index, 1)} aria-label="Move down">
                  ↓
                </button>
                <button type="button" className="btn-icon" onClick={() => setRows(rows.filter((_, i) => i !== index))} aria-label="Remove">
                  ✕
                </button>
              </div>
              <div className="plan-row-fields">
                <input
                  className="minutes-input"
                  inputMode="numeric"
                  placeholder={`${item?.minutes ?? ''}`}
                  value={r.minutes}
                  onChange={(e) => update(index, { minutes: e.target.value })}
                  aria-label="Minutes"
                />
                <span className="subtitle">min</span>
                <input className="grow" placeholder="Reps / instructions (e.g. 3×8 each side)" value={r.instructions} onChange={(e) => update(index, { instructions: e.target.value })} />
              </div>
            </li>
          )
        })}
      </ol>
      <button type="button" className="btn btn-secondary" onClick={() => setPicking(true)}>
        + Add from library
      </button>

      {error && <p className="msg msg-error">{error}</p>}

      <div className="row">
        <button className="btn" type="submit" disabled={saving}>
          {saving ? 'Saving…' : 'Save plan'}
        </button>
        <button className="btn btn-secondary" type="button" onClick={onCancel}>
          Cancel
        </button>
        {plan && (
          <button className="btn-link push-right" type="button" onClick={() => setArchived(!plan.archived)}>
            {plan.archived ? 'Restore' : 'Archive'}
          </button>
        )}
      </div>

      {picking && (
        <LibraryPicker
          items={library}
          alreadyAdded={rows.map((r) => r.library_item_id)}
          defaultFocus={focusArea || null}
          onAdd={(item) => setRows((prev) => [...prev, { key: newKey(), library_item_id: item.id, minutes: '', instructions: '' }])}
          onClose={() => setPicking(false)}
        />
      )}
    </form>
  )
}
