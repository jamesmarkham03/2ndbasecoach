import { useCallback, useEffect, useState } from 'react'
import { supabase, type MetricType, type Player } from './supabase'

type CoachData = { players: Player[]; metrics: MetricType[]; error: string | null }

async function fetchCoachData(): Promise<CoachData> {
  const [playersRes, metricsRes] = await Promise.all([
    supabase.from('players').select('*').order('last_name').order('first_name'),
    supabase.from('metric_types').select('*').eq('archived', false).order('sort_order'),
  ])
  const err = playersRes.error ?? metricsRes.error
  return {
    players: playersRes.data ?? [],
    metrics: metricsRes.data ?? [],
    error: err ? err.message : null,
  }
}

/**
 * Loads the roster and the list of metrics once, and gives back a reload()
 * to call after adding or editing a player.
 * (A "hook" is just a reusable function that holds state for a component.)
 */
export function useCoachData() {
  const [data, setData] = useState<CoachData>({ players: [], metrics: [], error: null })
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    setData(await fetchCoachData())
  }, [])

  useEffect(() => {
    let cancelled = false // don't update a screen that has already gone away
    fetchCoachData().then((result) => {
      if (cancelled) return
      setData(result)
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [])

  return { ...data, loading, reload }
}
