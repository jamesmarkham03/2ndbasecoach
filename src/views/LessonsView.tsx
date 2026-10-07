import { useCallback, useEffect, useState } from 'react'
import { formatDate, playerName } from '../lib/format'
import { usePlans } from '../lib/usePlans'
import { supabase, type Lesson, type LibraryItem, type Player } from '../lib/supabase'
import { LessonEditor } from './LessonEditor'
import { PlansView } from './PlansView'
import { StartLesson } from './StartLesson'

type Props = {
  players: Player[]
  library: LibraryItem[]
  openLessonId: string | null
  setOpenLessonId: (id: string | null) => void
}

type Section = 'log' | 'plans'

// Newest first; same-day lessons by the order they were started.
const fetchLessons = () =>
  supabase.from('lessons').select('*').order('lesson_date', { ascending: false }).order('created_at', { ascending: false })

export function LessonsView({ players, library, openLessonId, setOpenLessonId }: Props) {
  const [section, setSection] = useState<Section>('log')
  const [starting, setStarting] = useState(false)
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [error, setError] = useState<string | null>(null)
  const [showArchived, setShowArchived] = useState(false)
  const [playerFilter, setPlayerFilter] = useState('')
  const plans = usePlans()

  const loadLessons = useCallback(async () => {
    const { data, error } = await fetchLessons()
    if (error) setError(error.message)
    else setLessons(data)
  }, [])

  useEffect(() => {
    let cancelled = false
    fetchLessons().then(({ data, error }) => {
      if (cancelled) return
      if (error) setError(error.message)
      else setLessons(data)
    })
    return () => {
      cancelled = true
    }
  }, [])

  if (openLessonId) {
    return (
      <LessonEditor
        lessonId={openLessonId}
        players={players}
        library={library}
        onBack={() => setOpenLessonId(null)}
        onChanged={loadLessons}
      />
    )
  }

  if (starting) {
    return (
      <StartLesson
        players={players}
        plans={plans.plans}
        planItems={plans.items}
        onStarted={(id) => {
          setStarting(false)
          void loadLessons()
          setOpenLessonId(id)
        }}
        onCancel={() => setStarting(false)}
      />
    )
  }

  const nameOf = (id: string) => {
    const p = players.find((x) => x.id === id)
    return p ? playerName(p) : 'Unknown player'
  }
  const shown = lessons.filter((l) => l.archived === showArchived && (!playerFilter || l.player_id === playerFilter))
  const archivedCount = lessons.filter((l) => l.archived).length
  const playersWithLessons = players.filter((p) => lessons.some((l) => l.player_id === p.id))

  return (
    <div>
      <div className="segmented">
        <button className={section === 'log' ? 'segment segment-on' : 'segment'} onClick={() => setSection('log')}>
          Lesson log
        </button>
        <button className={section === 'plans' ? 'segment segment-on' : 'segment'} onClick={() => setSection('plans')}>
          Lesson plans
        </button>
      </div>

      {section === 'plans' && <PlansView plans={plans.plans} planItems={plans.items} library={library} onChanged={plans.reload} />}

      {section === 'log' && (
        <>
          <div className="row toolbar">
            <button className="btn" onClick={() => setStarting(true)}>
              + Start lesson
            </button>
            {playersWithLessons.length > 1 && (
              <select value={playerFilter} onChange={(e) => setPlayerFilter(e.target.value)} aria-label="Filter by player">
                <option value="">All players</option>
                {playersWithLessons.map((p) => (
                  <option key={p.id} value={p.id}>
                    {playerName(p)}
                  </option>
                ))}
              </select>
            )}
            {archivedCount > 0 && (
              <button className="btn-link push-right" onClick={() => setShowArchived(!showArchived)}>
                {showArchived ? 'Show active lessons' : `Show archived (${archivedCount})`}
              </button>
            )}
          </div>
          {(error ?? plans.error) && <p className="msg msg-error">{error ?? plans.error}</p>}
          {shown.length === 0 && (
            <div className="card empty">
              <p>{showArchived ? 'No archived lessons.' : 'No lessons logged yet. Tap “Start lesson” at the start of your next private lesson.'}</p>
            </div>
          )}
          {shown.length > 0 && (
            <section className="card">
              <ul className="roster">
                {shown.map((l) => (
                  <li key={l.id}>
                    <button className="roster-row" onClick={() => setOpenLessonId(l.id)}>
                      <span className="lesson-date">{formatDate(l.lesson_date, false)}</span>
                      <span className="roster-name">{nameOf(l.player_id)}</span>
                      <span className="roster-meta">{l.title}</span>
                      <span className="chevron" aria-hidden="true">
                        ›
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  )
}
