import { useEffect, useState } from 'react'
import { TestingDayForm, type DayFormValues } from '../components/testing/TestingDayForm'
import type { Json } from '../lib/database.types'
import { formatDate } from '../lib/format'
import { supabase, type Team, type TestingDay } from '../lib/supabase'
import { kindLabel } from '../lib/testing'

type Props = { teams: Team[]; onOpenDay: (id: string) => void }

export function TestingDaysView({ teams, onOpenDay }: Props) {
  const [days, setDays] = useState<TestingDay[] | null>(null)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    supabase
      .from('testing_days')
      .select('*')
      .order('held_on', { ascending: false })
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) setError(`Couldn’t load days: ${error.message}`)
        setDays(data ?? [])
      })
    return () => {
      cancelled = true
    }
  }, [])

  async function create(values: DayFormValues) {
    setError(null)
    const { data, error } = await supabase
      .from('testing_days')
      .insert({ ...values, config: values.config as unknown as Json })
      .select()
      .single()
    if (error) return setError(`Not saved: ${error.message}`)
    onOpenDay(data.id)
  }

  if (creating) {
    return (
      <section className="card">
        <h2>New day</h2>
        {error && <p className="msg msg-error">{error}</p>}
        <TestingDayForm teams={teams} submitLabel="Create day" onSubmit={create} onCancel={() => setCreating(false)} />
      </section>
    )
  }

  return (
    <div>
      <div className="row toolbar">
        <button className="btn" onClick={() => setCreating(true)}>
          + New day
        </button>
      </div>
      {error && <p className="msg msg-error">{error}</p>}
      {days === null && !error && <p className="subtitle">Loading…</p>}
      {days?.length === 0 && (
        <div className="card empty">
          <p>No Pro Days or testing days yet.</p>
        </div>
      )}
      {days && days.length > 0 && (
        <section className="card">
          <ul className="roster">
            {days.map((d) => (
              <li key={d.id}>
                <button className="roster-row" onClick={() => onOpenDay(d.id)}>
                  <span className="roster-name">{d.name}</span>
                  <span className="roster-meta">
                    {kindLabel(d.kind)} · {formatDate(d.held_on)}
                  </span>
                  {d.indoor && <span className="tag">Indoor</span>}
                  <span className="chevron" aria-hidden="true">
                    ›
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
