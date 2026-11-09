import { useCallback, useEffect, useRef, useState } from 'react'
import type { Json } from './database.types'
import { supabase, type Player, type TestingDay, type TestingEntry, type TestingResult } from './supabase'
import { dayConfig, nextNumber, type DayConfig, type TestPosition } from './testing'

// Supabase returns at most 1000 rows per request, and a big Pro Day can pass that. So we page.
const PAGE = 1000

async function fetchResults(entryIds: string[]): Promise<{ rows: TestingResult[]; error: string | null }> {
  const rows: TestingResult[] = []
  if (entryIds.length === 0) return { rows, error: null }
  for (let from = 0; ; from += PAGE) {
    const res = await supabase.from('testing_results').select('*').in('entry_id', entryIds).order('id').range(from, from + PAGE - 1)
    if (res.error) return { rows, error: res.error.message }
    rows.push(...res.data)
    if (res.data.length < PAGE) return { rows, error: null }
  }
}

/** One testing day and everything recorded on it, plus the ways to change it. */
export function useTestingDay(dayId: string) {
  const [day, setDay] = useState<TestingDay | null>(null)
  const [entries, setEntries] = useState<TestingEntry[]>([])
  const [results, setResults] = useState<TestingResult[]>([])
  const [error, setError] = useState<string | null>(null)

  // Taps can come faster than saves. Check-ins wait in line, each seeing the numbers the last one took,
  // so two quick taps can never be handed the same number.
  const latestEntries = useRef<TestingEntry[]>([])
  const checkInLine = useRef<Promise<unknown>>(Promise.resolve())

  const applyEntries = useCallback((next: TestingEntry[]) => {
    latestEntries.current = next
    setEntries(next)
  }, [])

  useEffect(() => {
    let cancelled = false
    async function load() {
      const [d, e] = await Promise.all([
        supabase.from('testing_days').select('*').eq('id', dayId).single(),
        supabase.from('testing_entries').select('*').eq('day_id', dayId).order('number'),
      ])
      if (d.error || e.error) return { error: (d.error ?? e.error)!.message }
      const r = await fetchResults(e.data.map((x) => x.id))
      return { day: d.data, entries: e.data, results: r.rows, error: r.error }
    }
    load().then((out) => {
      if (cancelled) return
      if (out.error) setError(`Couldn’t load this day: ${out.error}`)
      if (out.day) setDay(out.day)
      if (out.entries) applyEntries(out.entries)
      if (out.results) setResults(out.results)
    })
    return () => {
      cancelled = true
    }
  }, [dayId, applyEntries])

  /** Saves one best-effort value. null clears it. Returns false if it didn't save, so the box can show that. */
  async function saveResult(entryId: string, station: string, metric: string, pitchType: string, value: number | null): Promise<boolean> {
    setError(null)
    const same = (r: TestingResult) => r.entry_id === entryId && r.station === station && r.metric === metric && r.pitch_type === pitchType
    if (value === null) {
      const res = await supabase.from('testing_results').delete().eq('entry_id', entryId).eq('station', station).eq('metric', metric).eq('pitch_type', pitchType)
      if (res.error) {
        setError(`Not saved: ${res.error.message}`)
        return false
      }
      setResults((prev) => prev.filter((r) => !same(r)))
      return true
    }
    const res = await supabase
      .from('testing_results')
      .upsert({ entry_id: entryId, station, metric, pitch_type: pitchType, value }, { onConflict: 'entry_id,station,metric,pitch_type' })
      .select()
      .single()
    if (res.error) {
      setError(`Not saved: ${res.error.message}`)
      return false
    }
    setResults((prev) => [...prev.filter((r) => !same(r)), res.data])
    return true
  }

  async function saveDay(patch: { name?: string; held_on?: string; indoor?: boolean; config?: DayConfig }): Promise<boolean> {
    if (!day) return false
    setError(null)
    const { config, ...rest } = patch
    const dbPatch = config ? { ...rest, config: config as unknown as Json } : rest
    const res = await supabase.from('testing_days').update(dbPatch).eq('id', day.id).select().single()
    if (res.error) {
      setError(`Not saved: ${res.error.message}`)
      return false
    }
    setDay(res.data)
    return true
  }

  function saveConfig(patch: Partial<DayConfig>) {
    if (day) void saveDay({ config: { ...dayConfig(day), ...patch } })
  }

  function checkIn(player: Player, position: TestPosition, teamName: string | null) {
    checkInLine.current = checkInLine.current.then(async () => {
      if (!day) return
      const current = latestEntries.current
      if (current.some((e) => e.player_id === player.id)) return
      const number = nextNumber(position, current, dayConfig(day).outfieldStart)
      const res = await supabase
        .from('testing_entries')
        .insert({ day_id: day.id, player_id: player.id, number, position, team_name: teamName })
        .select()
        .single()
      if (res.error) setError(`Not saved: ${res.error.message}`)
      else applyEntries([...latestEntries.current, res.data])
    })
  }

  async function updateEntry(id: string, patch: Partial<Pick<TestingEntry, 'number' | 'position' | 'note' | 'extra_stations'>>): Promise<boolean> {
    setError(null)
    const res = await supabase.from('testing_entries').update(patch).eq('id', id).select().single()
    if (res.error) {
      setError(`Not saved: ${res.error.message}`)
      return false
    }
    applyEntries(latestEntries.current.map((e) => (e.id === id ? res.data : e)))
    return true
  }

  /** Changing position changes the series, so the player takes the next open number there. */
  function changePosition(entry: TestingEntry, position: TestPosition) {
    if (!day) return
    const others = latestEntries.current.filter((e) => e.id !== entry.id)
    void updateEntry(entry.id, { position, number: nextNumber(position, others, dayConfig(day).outfieldStart) })
  }

  async function removeEntry(id: string) {
    setError(null)
    const res = await supabase.from('testing_entries').delete().eq('id', id)
    if (res.error) return setError(`Not removed: ${res.error.message}`)
    applyEntries(latestEntries.current.filter((e) => e.id !== id))
    setResults((prev) => prev.filter((r) => r.entry_id !== id))
  }

  async function deleteDay(): Promise<boolean> {
    if (!day) return false
    const res = await supabase.from('testing_days').delete().eq('id', day.id)
    if (res.error) {
      setError(`Not deleted: ${res.error.message}`)
      return false
    }
    return true
  }

  return { day, entries, results, error, setError, saveResult, saveDay, saveConfig, checkIn, updateEntry, changePosition, removeEntry, deleteDay }
}

export type TestingDayApi = ReturnType<typeof useTestingDay>
