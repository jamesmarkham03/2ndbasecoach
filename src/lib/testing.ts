import type { TestingDay, TestingEntry, TestingResult } from './supabase'

/*
 * The rules of a testing day, kept free of React so they're easy to read and reason about:
 * number series, sprint line-up, which fields each station has, and how results are ranked.
 */

export const POSITIONS = ['P', 'C', '1B', '2B', '3B', 'SS', 'OF'] as const
export type TestPosition = (typeof POSITIONS)[number]

export type StationKey = 'OF' | 'IF' | '1B' | 'C' | 'HIT' | 'PITCH'
export type DayKind = 'pro_day' | 'velo' | 'exit_velo' | 'sprint'
export type ResultKind = 'time' | 'velo' | 'grade'

/** In the order the stations run on the day. */
export const STATIONS: { key: StationKey; label: string; positions: TestPosition[] }[] = [
  { key: 'OF', label: 'Outfield', positions: ['OF'] },
  { key: 'IF', label: 'Infield', positions: ['2B', '3B', 'SS'] },
  { key: '1B', label: 'First Base', positions: ['1B'] },
  { key: 'C', label: 'Catchers', positions: ['C'] },
  { key: 'HIT', label: 'Hitting', positions: [...POSITIONS] },
  { key: 'PITCH', label: 'Pitching', positions: ['P'] },
]

export const SPRINT_DISTANCES = [10, 20, 40, 60]
export const PITCH_TYPES = ['Fastball', '2-Seam', 'Cutter', 'Changeup', 'Splitter', 'Curveball', 'Slider', 'Knuckleball']

const SERIES: Record<TestPosition, number> = { P: 100, C: 200, '1B': 300, '2B': 400, '3B': 500, SS: 600, OF: 700 }

export type DayConfig = {
  teamIds: string[]
  sprintDistances: number[]
  lanes: number
  sprintOrder: TestPosition[]
  stations: StationKey[]
  grades: boolean
  exitVelo: boolean
  outfieldStart: number
  /** Entry ids in running order. Null until the coach changes the line-up by hand. */
  sprintQueue: string[] | null
  scratched: string[]
}

const BASE_CONFIG: DayConfig = {
  teamIds: [],
  sprintDistances: [60],
  lanes: 2,
  sprintOrder: ['OF', 'C', '1B', '2B', '3B', 'SS', 'P'],
  stations: ['OF', 'IF', '1B', 'C', 'HIT', 'PITCH'],
  grades: true,
  exitVelo: false,
  outfieldStart: 700,
  sprintQueue: null,
  scratched: [],
}

export const TEMPLATES: Record<DayKind, { label: string; indoor: boolean; config: DayConfig }> = {
  pro_day: { label: 'Pro Day', indoor: false, config: BASE_CONFIG },
  velo: {
    label: 'Velo',
    indoor: true,
    config: { ...BASE_CONFIG, sprintDistances: [], stations: ['OF', 'IF', '1B', 'C', 'PITCH'], grades: false },
  },
  exit_velo: {
    label: 'Exit Velo',
    indoor: true,
    config: { ...BASE_CONFIG, sprintDistances: [], stations: ['HIT'], grades: false, exitVelo: true },
  },
  sprint: {
    label: 'Sprint',
    indoor: true,
    config: { ...BASE_CONFIG, sprintDistances: [20], stations: [], grades: false },
  },
}

export function dayConfig(day: TestingDay): DayConfig {
  return { ...BASE_CONFIG, ...(day.config as Partial<DayConfig>) }
}

export function kindLabel(kind: string): string {
  return TEMPLATES[kind as DayKind]?.label ?? kind
}

/** Lowest open number in the position's series. A day can start outfielders at 800. */
export function nextNumber(position: TestPosition, entries: TestingEntry[], outfieldStart: number): number {
  const taken = new Set(entries.map((e) => e.number))
  let n = position === 'OF' ? outfieldStart : SERIES[position]
  while (taken.has(n)) n += 1
  return n
}

/** A player's saved position as a testing position: LF, CF and RF all wear outfield numbers. */
export function toTestPosition(position: string | undefined): TestPosition | null {
  if (!position) return null
  if (['LF', 'CF', 'RF'].includes(position)) return 'OF'
  return (POSITIONS as readonly string[]).includes(position) ? (position as TestPosition) : null
}

/** Sorts team names 19U before 12U. Names with no age (Private Lessons, No team) go last. */
export function oldestTeamFirst(a: string, b: string): number {
  const age = (name: string) => parseInt(name, 10) || 0
  return age(b) - age(a) || a.localeCompare(b, undefined, { numeric: true })
}

// ------------------------------------------------------------------ sprint line-up
function defaultQueue(entries: TestingEntry[], order: TestPosition[]): string[] {
  const rank = (e: TestingEntry) => {
    const i = order.indexOf(e.position as TestPosition)
    return i === -1 ? order.length : i
  }
  return [...entries].sort((a, b) => rank(a) - rank(b) || a.number - b.number).map((e) => e.id)
}

/** The running order right now. Kids checked in after the line-up was edited join at the end. */
export function currentQueue(entries: TestingEntry[], config: DayConfig): string[] {
  const scratched = new Set(config.scratched)
  const auto = defaultQueue(entries, config.sprintOrder).filter((id) => !scratched.has(id))
  if (!config.sprintQueue) return auto
  const known = new Set(entries.map((e) => e.id))
  const kept = config.sprintQueue.filter((id) => known.has(id))
  const inLine = new Set(kept)
  return [...kept, ...auto.filter((id) => !inLine.has(id))]
}

/**
 * Puts a runner in a lane; everyone from that lane on moves back one.
 * A runner who hasn't run yet is moved up (not doubled). One who has already run gets a second slot.
 */
export function placeRunner(queue: string[], index: number, id: string, hasRun: boolean): string[] {
  const next = [...queue]
  if (!hasRun) {
    const later = next.findIndex((x, i) => x === id && i >= index)
    if (later === index) return next
    if (later !== -1) next.splice(later, 1)
  }
  next.splice(index, 0, id)
  return next
}

export function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size))
  return out
}

// ------------------------------------------------------------------ fields and metrics
export type FieldDef = { metric: string; label: string; kind: ResultKind }

const grade = (metric: string, label: string): FieldDef => ({ metric, label, kind: 'grade' })
const DEFENSE_GRADES = [
  grade('fielding_current', 'Field Cur'),
  grade('fielding_future', 'Field Fut'),
  grade('throwing_current', 'Throw Cur'),
  grade('throwing_future', 'Throw Fut'),
]
const HIT_GRADES = [
  grade('hit_current', 'Hit Cur'),
  grade('hit_future', 'Hit Fut'),
  grade('power_current', 'Power Cur'),
  grade('power_future', 'Power Fut'),
]

/** The boxes on a player's row at a station (pitching builds its own rows, one per pitch type). */
export function stationFields(station: StationKey, config: DayConfig): FieldDef[] {
  if (station === 'HIT') {
    return [
      ...(config.exitVelo ? [{ metric: 'exit_velo', label: 'Exit Velo', kind: 'velo' as const }] : []),
      ...(config.grades ? HIT_GRADES : []),
    ]
  }
  if (station === 'PITCH') return []
  return [
    { metric: 'throw_velo', label: 'Velo', kind: 'velo' },
    ...(station === 'C' ? [{ metric: 'pop_time', label: 'Pop', kind: 'time' as const }] : []),
    ...(config.grades ? DEFENSE_GRADES : []),
  ]
}

export function stationMembers(station: StationKey, entries: TestingEntry[]): TestingEntry[] {
  const positions = STATIONS.find((s) => s.key === station)!.positions as string[]
  return entries
    .filter((e) => positions.includes(e.position) || e.extra_stations.includes(station))
    .sort((a, b) => a.number - b.number)
}

export function metricKind(metric: string): ResultKind {
  if (metric.startsWith('sprint_') || metric === 'pop_time') return 'time'
  if (metric.endsWith('_velo')) return 'velo'
  return 'grade'
}

export const lowerIsBetter = (metric: string) => metricKind(metric) === 'time'

export const KIND_UNIT: Record<ResultKind, string> = { time: 'sec', velo: 'mph', grade: '' }
export const KIND_DECIMALS: Record<ResultKind, number> = { time: 2, velo: 1, grade: 0 }

export function formatResult(value: number, metric: string, withUnit = true): string {
  const kind = metricKind(metric)
  const text = value.toFixed(KIND_DECIMALS[kind])
  return withUnit && KIND_UNIT[kind] ? `${text} ${KIND_UNIT[kind]}` : text
}

/** Turns typed text into a value, or says what's wrong with it. */
export function parseResult(text: string, kind: ResultKind): { value: number } | { problem: string } {
  const value = Number(text)
  if (text === '' || !Number.isFinite(value)) return { problem: 'Enter a number' }
  if (kind === 'grade') {
    return Number.isInteger(value) && value >= 20 && value <= 80 ? { value } : { problem: 'Whole number, 20 to 80' }
  }
  if (kind === 'time') return value >= 1 && value <= 30 ? { value } : { problem: 'Seconds, 1 to 30' }
  return value >= 20 && value <= 130 ? { value } : { problem: 'MPH, 20 to 130' }
}

const METRIC_NAMES: Record<string, string> = {
  throw_velo: 'Velo',
  pop_time: 'Pop Time',
  exit_velo: 'Exit Velo',
  mechanics: 'Mechanics',
  fielding_current: 'Fielding Current',
  fielding_future: 'Fielding Future',
  throwing_current: 'Throwing Current',
  throwing_future: 'Throwing Future',
  hit_current: 'Hit Current',
  hit_future: 'Hit Future',
  power_current: 'Power Current',
  power_future: 'Power Future',
}

type ResultId = Pick<TestingResult, 'station' | 'metric' | 'pitch_type'>

/** Identifies "what was measured", so the same thing lines up across days. */
export const resultKey = (r: ResultId) => `${r.station}|${r.metric}|${r.pitch_type}`

export function resultFromKey(key: string): ResultId {
  const [station, metric, pitch_type] = key.split('|')
  return { station, metric, pitch_type }
}

export function resultLabel({ station, metric, pitch_type }: ResultId): string {
  if (metric.startsWith('sprint_')) return `${metric.slice(7)} Yard`
  if (metric === 'pitch_velo') return `${pitch_type} Velo`
  if (metric === 'pitch_movement') return `${pitch_type} Movement`
  if (station === 'HIT' || station === 'PITCH' || metric === 'pop_time') return METRIC_NAMES[metric] ?? metric
  const place = STATIONS.find((s) => s.key === station)?.label ?? station
  return `${place} ${METRIC_NAMES[metric] ?? metric}`
}

/** Sprints first, then stations in day order, so menus read the way the day runs. */
export function sortResultKeys(keys: string[]): string[] {
  const rank = (key: string) => {
    const { station, metric } = resultFromKey(key)
    if (station === 'SPRINT') return Number(metric.slice(7))
    const stationRank = STATIONS.findIndex((s) => s.key === station) + 1
    return stationRank * 1000 + (metricKind(metric) === 'grade' ? 500 : 0)
  }
  return [...new Set(keys)].sort((a, b) => rank(a) - rank(b) || a.localeCompare(b))
}

export type BoardRow = { rank: number; entry: TestingEntry; value: number }

/** Best first. Equal values share a rank (1, 2, 2, 4). */
export function leaderboard(results: TestingResult[], entries: TestingEntry[], key: string): BoardRow[] {
  const { metric } = resultFromKey(key)
  const direction = lowerIsBetter(metric) ? 1 : -1
  const byId = new Map(entries.map((e) => [e.id, e]))
  const rows = results
    .filter((r) => resultKey(r) === key && byId.has(r.entry_id))
    .map((r) => ({ entry: byId.get(r.entry_id)!, value: r.value }))
    .sort((a, b) => direction * (a.value - b.value) || a.entry.number - b.entry.number)
  let rank = 0
  return rows.map((row, i) => {
    if (i === 0 || row.value !== rows[i - 1].value) rank = i + 1
    return { rank, ...row }
  })
}
