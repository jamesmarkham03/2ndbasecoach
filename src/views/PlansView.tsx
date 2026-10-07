import { useState } from 'react'
import { addStarterPlans } from '../lib/libraryImport'
import { focusLabel, levelLabel } from '../lib/pitching'
import type { LessonPlan, LessonPlanItem, LibraryItem } from '../lib/supabase'
import { PlanEditor } from './PlanEditor'

type Props = {
  plans: LessonPlan[]
  planItems: LessonPlanItem[]
  library: LibraryItem[]
  onChanged: () => void
}

export function PlansView({ plans, planItems, library, onChanged }: Props) {
  const [editing, setEditing] = useState<LessonPlan | 'new' | null>(null)
  const [showArchived, setShowArchived] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const libById = new Map(library.map((l) => [l.id, l]))
  const itemsFor = (planId: string) => planItems.filter((i) => i.plan_id === planId).sort((a, b) => a.position - b.position)
  const minutesFor = (planId: string) =>
    itemsFor(planId).reduce((sum, i) => sum + (i.minutes ?? libById.get(i.library_item_id)?.minutes ?? 0), 0)

  if (editing) {
    const plan = editing === 'new' ? undefined : editing
    return (
      <PlanEditor
        plan={plan}
        planItems={plan ? itemsFor(plan.id) : []}
        library={library}
        onSaved={() => {
          setEditing(null)
          onChanged()
        }}
        onCancel={() => setEditing(null)}
      />
    )
  }

  async function handleAddStarters() {
    try {
      const added = await addStarterPlans()
      setMessage(added ? `${added} default plan${added === 1 ? '' : 's'} added.` : 'Default plans are already there.')
      onChanged()
    } catch (err) {
      setMessage(err instanceof Error ? err.message : String(err))
    }
  }

  const shown = plans.filter((p) => p.archived === showArchived)
  const archivedCount = plans.filter((p) => p.archived).length
  const hasStarters = plans.some((p) => p.is_starter)

  return (
    <div>
      <div className="row toolbar">
        <button className="btn" onClick={() => setEditing('new')} disabled={library.length === 0}>
          + New plan
        </button>
        {!hasStarters && library.length > 0 && (
          <button className="btn btn-secondary" onClick={handleAddStarters}>
            Add default plans
          </button>
        )}
        {archivedCount > 0 && (
          <button className="btn-link push-right" onClick={() => setShowArchived(!showArchived)}>
            {showArchived ? 'Show active plans' : `Show archived (${archivedCount})`}
          </button>
        )}
      </div>
      {message && <p className="msg msg-info">{message}</p>}
      {library.length === 0 && (
        <div className="card empty">
          <p>Plans are built from your library. Set up the Library tab first.</p>
        </div>
      )}
      {library.length > 0 && shown.length === 0 && (
        <div className="card empty">
          <p>{showArchived ? 'No archived plans.' : 'No lesson plans yet.'}</p>
        </div>
      )}

      <div className="library-grid">
        {shown.map((p) => (
          <button key={p.id} className="library-card" onClick={() => setEditing(p)}>
            <div className="library-card-top">
              <span className="tag">{p.focus_area ? focusLabel(p.focus_area) : 'General'}</span>
              {p.is_starter && <span className="subtitle">Default</span>}
            </div>
            <strong className="library-card-title">{p.name}</strong>
            {p.description && <span className="library-card-note">{p.description}</span>}
            <span className="library-card-meta">
              {itemsFor(p.id).length} drills · {minutesFor(p.id)} min · {p.level ? levelLabel(p.level) : 'Any level'}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
