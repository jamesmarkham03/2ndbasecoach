import { useCallback, useEffect, useState } from 'react'
import { supabase, type LessonPlan, type LessonPlanItem } from './supabase'

type PlansState = { plans: LessonPlan[]; items: LessonPlanItem[]; error: string | null }

async function fetchPlans(): Promise<PlansState> {
  const [plansRes, itemsRes] = await Promise.all([
    supabase.from('lesson_plans').select('*').order('name'),
    supabase.from('lesson_plan_items').select('*').order('position'),
  ])
  const err = plansRes.error ?? itemsRes.error
  return { plans: plansRes.data ?? [], items: itemsRes.data ?? [], error: err ? err.message : null }
}

/** All lesson plan templates and their items. */
export function usePlans() {
  const [state, setState] = useState<PlansState>({ plans: [], items: [], error: null })
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    setState(await fetchPlans())
  }, [])

  useEffect(() => {
    let cancelled = false
    fetchPlans().then((result) => {
      if (cancelled) return
      setState(result)
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [])

  return { ...state, loading, reload }
}
