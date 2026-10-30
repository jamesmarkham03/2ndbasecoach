import { starterLibraryRows } from './libraryRows'
import { STARTER_PLANS } from './pitching'

/*
 * Fake data for demo mode. Every player is invented; no real player's data is in this
 * file or anywhere in the repo. A seeded random generator keeps the numbers the same on
 * every visit, so screenshots and the demo always match.
 */

export const DEMO_COACH_ID = 'demo-coach'

type Row = Record<string, unknown>
export type DemoTables = Record<string, Row[]>

// Small deterministic random generator (mulberry32): same seed, same "random" numbers.
function seededRandom(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** A local calendar date N days ago, as 'YYYY-MM-DD' (dates stay recent whenever the demo is opened). */
function daysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const id = (prefix: string, n: number | string) => `demo-${prefix}-${n}`
const stamp = (date: string) => `${date}T18:00:00.000Z`

// Same built-in metrics as the real database (supabase/migrations, phase 1).
// base = typical 14U value, older = how much better a 16U is, gain = change per testing day.
const METRICS = [
  { key: 'exit', name: 'Exit Velo', unit: 'mph', higher: true, decimals: 1, base: 68, older: 11, gain: 1.2, who: 'all' },
  { key: 'bat', name: 'Bat Speed', unit: 'mph', higher: true, decimals: 1, base: 55, older: 8, gain: 0.8, who: 'all' },
  { key: 'pitch', name: 'Pitching Velo', unit: 'mph', higher: true, decimals: 1, base: 64, older: 10, gain: 0.9, who: 'P' },
  { key: 'inf', name: 'Infield Velo', unit: 'mph', higher: true, decimals: 1, base: 66, older: 10, gain: 0.9, who: 'IF' },
  { key: 'of', name: 'Outfield Velo', unit: 'mph', higher: true, decimals: 1, base: 68, older: 11, gain: 1.0, who: 'OF' },
  { key: 'pop', name: 'Pop Time', unit: 'sec', higher: false, decimals: 2, base: 2.3, older: -0.2, gain: -0.025, who: 'C' },
  { key: 'sixty', name: '60-Yard Dash', unit: 'sec', higher: false, decimals: 2, base: 7.8, older: -0.5, gain: -0.05, who: 'all' },
  { key: 'h1', name: 'Home to 1st', unit: 'sec', higher: false, decimals: 2, base: 4.6, older: -0.25, gain: -0.03, who: 'all' },
] as const

const PLAYERS = [
  { first: 'Alex', last: 'Carter', team: '14U', pos: ['P', 'SS'], bats: 'R', throws: 'R', notes: 'Goal: 70 mph by spring. Working on lead leg block.' },
  { first: 'Ben', last: 'Ortiz', team: '14U', pos: ['C', '3B'], bats: 'R', throws: 'R', notes: null },
  { first: 'Caleb', last: 'Nguyen', team: '14U', pos: ['P', 'CF'], bats: 'L', throws: 'L', notes: 'Lefty. Great feel for the changeup.' },
  { first: 'Dylan', last: 'Brooks', team: '14U', pos: ['2B', 'SS'], bats: 'S', throws: 'R', notes: null },
  { first: 'Ethan', last: 'Shaw', team: '14U', pos: ['1B', 'P'], bats: 'L', throws: 'R', notes: null },
  { first: 'Finn', last: 'Murphy', team: '14U', pos: ['LF', 'RF'], bats: 'R', throws: 'R', notes: 'Fastest kid on the team.' },
  { first: 'Gabe', last: 'Silva', team: '16U', pos: ['P'], bats: 'R', throws: 'R', notes: 'Starter. Velo split-tests every 4 weeks.' },
  { first: 'Hudson', last: 'Lee', team: '16U', pos: ['SS', '2B'], bats: 'R', throws: 'R', notes: null },
  { first: 'Isaac', last: 'Patel', team: '16U', pos: ['C', '1B'], bats: 'R', throws: 'R', notes: 'Pop time is the focus this off-season.' },
  { first: 'Jordan', last: 'King', team: '16U', pos: ['CF', 'LF'], bats: 'L', throws: 'L', notes: null },
  { first: 'Kai', last: 'Robinson', team: '16U', pos: ['P', '3B'], bats: 'R', throws: 'R', notes: null },
  { first: 'Liam', last: 'Foster', team: '16U', pos: ['RF', 'P'], bats: 'R', throws: 'R', notes: null },
]

// Six testing days across the last year, oldest first.
const TEST_DAYS = [330, 260, 190, 120, 60, 12]

function testsMetric(who: string, positions: string[]): boolean {
  if (who === 'all') return true
  if (who === 'IF') return positions.some((p) => ['1B', '2B', '3B', 'SS'].includes(p))
  if (who === 'OF') return positions.some((p) => ['LF', 'CF', 'RF'].includes(p))
  return positions.includes(who)
}

export function buildDemoData(): DemoTables {
  const random = seededRandom(2026)
  const db: DemoTables = {}

  db.metric_types = METRICS.map((m, i) => ({
    id: id('metric', m.key),
    coach_id: null,
    name: m.name,
    unit: m.unit,
    higher_is_better: m.higher,
    decimals: m.decimals,
    sort_order: (i + 1) * 10,
    archived: false,
    created_at: stamp(daysAgo(400)),
  }))

  db.players = PLAYERS.map((p, i) => ({
    id: id('player', i),
    coach_id: DEMO_COACH_ID,
    first_name: p.first,
    last_name: p.last,
    team: p.team,
    positions: p.pos,
    bats: p.bats,
    throws: p.throws,
    birth_year: p.team === '14U' ? 2012 : 2010,
    notes: p.notes,
    active: true,
    created_at: stamp(daysAgo(340)),
  }))
  // One archived player, to show that players are hidden, never deleted.
  db.players.push({
    id: id('player', 'archived'), coach_id: DEMO_COACH_ID, first_name: 'Noah', last_name: 'Price', team: '14U',
    positions: ['2B'], bats: 'R', throws: 'R', birth_year: 2012, notes: 'Moved away in the spring.', active: false,
    created_at: stamp(daysAgo(340)),
  })

  // Measurements: each player's starting level, steady improvement, and a little day-to-day noise.
  db.measurements = []
  PLAYERS.forEach((p, pi) => {
    const talent = random() * 2 - 1 // -1 (developing) .. +1 (advanced)
    for (const m of METRICS) {
      if (!testsMetric(m.who, p.pos)) continue
      const start = m.base + (p.team === '16U' ? m.older : 0) + talent * Math.abs(m.gain) * 4
      TEST_DAYS.forEach((ago, t) => {
        if (t > 0 && random() < 0.12) return // missed a testing day
        const noise = (random() - 0.5) * Math.abs(m.gain) * 2.5
        const value = Number((start + m.gain * t + noise).toFixed(m.decimals))
        db.measurements.push({
          id: id(`m-${pi}-${m.key}`, t),
          coach_id: DEMO_COACH_ID,
          player_id: id('player', pi),
          metric_type_id: id('metric', m.key),
          value,
          recorded_on: daysAgo(ago),
          note: null,
          created_at: stamp(daysAgo(ago)),
        })
      })
    }
  })

  // Library and starter plans: the same 59 entries a real coach can load.
  db.library_items = starterLibraryRows().map((row, i) => ({
    ...row,
    id: id('lib', i),
    coach_id: DEMO_COACH_ID,
    archived: false,
    created_at: stamp(daysAgo(300)),
  }))
  const libraryIdByTitle = new Map(db.library_items.map((r) => [r.title as string, r.id as string]))

  db.lesson_plans = []
  db.lesson_plan_items = []
  for (const plan of STARTER_PLANS) {
    const planId = id('plan', plan.key)
    db.lesson_plans.push({
      id: planId, coach_id: DEMO_COACH_ID, name: plan.name, focus_area: plan.focus_area, level: plan.level,
      description: plan.description, is_starter: true, legacy_id: `starter-plan:${plan.key}`, archived: false,
      created_at: stamp(daysAgo(300)),
    })
    plan.items.forEach((title, position) => {
      const libraryId = libraryIdByTitle.get(title)
      if (!libraryId) return
      db.lesson_plan_items.push({
        id: id(`plan-item-${plan.key}`, position), coach_id: DEMO_COACH_ID, plan_id: planId, library_item_id: libraryId,
        position, minutes: null, instructions: null, created_at: stamp(daysAgo(300)),
      })
    })
  }

  // A few logged lessons, copied from plans the way "Start lesson" does it.
  const LESSONS = [
    { player: 0, plan: 'lead-leg', ago: 21, done: 6, overall: 'Good energy. Front side still leaks open early on fastballs.',
      comments: ['Understood the why right away.', 'Tight right hip, keep doing these at home.'],
      notes: ['Follow-up: film a bullpen next week and compare front knee angle.'] },
    { player: 0, plan: 'lower-half', ago: 7, done: 4, overall: 'Much better load. Ran out of time for the strap drill.',
      comments: ['Felt the hinge on rep 3.'], notes: ['Homework: 2 sets of tension rockers before every throwing day.'] },
    { player: 6, plan: 'velo-split-test', ago: 14, done: 4, overall: 'Back foot angle test: +1.2 mph average at 80% effort. Keep it.',
      comments: [], notes: ['Re-test the grip change at full effort in 4 weeks.'] },
    { player: 10, plan: 'lower-half', ago: 3, done: 2, overall: null, comments: ['Rushing the move, slow it down.'], notes: [] },
  ]
  db.lessons = []
  db.lesson_items = []
  db.lesson_notes = []
  LESSONS.forEach((l, li) => {
    const planId = id('plan', l.plan)
    const lessonId = id('lesson', li)
    db.lessons.push({
      id: lessonId, coach_id: DEMO_COACH_ID, player_id: id('player', l.player), plan_id: planId,
      title: STARTER_PLANS.find((p) => p.key === l.plan)!.name, lesson_date: daysAgo(l.ago),
      overall_notes: l.overall, archived: false, created_at: stamp(daysAgo(l.ago)),
    })
    db.lesson_plan_items
      .filter((pi) => pi.plan_id === planId)
      .forEach((pi, position) => {
        db.lesson_items.push({
          id: id(`lesson-item-${li}`, position), coach_id: DEMO_COACH_ID, lesson_id: lessonId,
          library_item_id: pi.library_item_id, custom_title: null, position, minutes: null, instructions: null,
          completed: position < l.done, comment: l.comments[position] ?? null, created_at: stamp(daysAgo(l.ago)),
        })
      })
    l.notes.forEach((body, ni) => {
      db.lesson_notes.push({
        id: id(`note-${li}`, ni), coach_id: DEMO_COACH_ID, lesson_id: lessonId, body,
        created_at: stamp(daysAgo(Math.max(0, l.ago - 1))),
      })
    })
  })

  return db
}
