import type { Session } from '@supabase/supabase-js'
import { buildDemoData, DEMO_COACH_ID, type DemoTables } from './demoData'

/*
 * Demo mode: an in-memory stand-in for the Supabase client.
 *
 * It copies just the slice of the supabase-js query API this app uses (from / select /
 * insert / update / upsert / delete / eq / in / not / order / single), so every screen
 * runs unchanged on fake data. Nothing is sent anywhere: the real database is never
 * contacted, and a page refresh resets the demo.
 */

type Row = Record<string, unknown>
type Result = { data: unknown; error: { message: string } | null }

// Column defaults the real tables fill in when an insert leaves them out.
const DEFAULTS: Record<string, Row> = {
  players: { active: true, positions: [], notes: null, bats: null, throws: null, team: null, team_id: null, lesson_team_id: null, birth_year: null },
  teams: { is_private_lessons: false },
  measurements: { note: null },
  library_items: { archived: false, tags: [], levels: [], focus_areas: [], note: '', source: null, minutes: 5, legacy_id: null },
  lesson_plans: { archived: false, is_starter: false, legacy_id: null, description: null, focus_area: null, level: null },
  lesson_plan_items: { position: 0, minutes: null, instructions: null },
  lessons: { archived: false, title: '', overall_notes: null, plan_id: null },
  lesson_items: { position: 0, completed: false, comment: null, custom_title: null, instructions: null, minutes: null, library_item_id: null },
  lesson_notes: {},
}

function newRow(table: string, fields: Row): Row {
  return {
    ...DEFAULTS[table],
    id: crypto.randomUUID(),
    coach_id: DEMO_COACH_ID,
    created_at: new Date().toISOString(),
    ...fields,
  }
}

function compare(a: unknown, b: unknown): number {
  if (a === b) return 0
  if (a === null || a === undefined) return 1 // nulls last, like Postgres ascending
  if (b === null || b === undefined) return -1
  return a < b ? -1 : 1
}

class DemoQuery implements PromiseLike<Result> {
  private action: 'select' | 'insert' | 'update' | 'upsert' | 'delete' = 'select'
  private payload: Row[] = []
  private patch: Row = {}
  private ignoreDuplicates = false
  private returnRows = false
  private singleRow = false
  private filters: ((row: Row) => boolean)[] = []
  private orders: { column: string; ascending: boolean }[] = []

  private db: DemoTables
  private table: string

  constructor(db: DemoTables, table: string) {
    this.db = db
    this.table = table
  }

  // After a write, .select() means "give me the affected rows back".
  select() {
    if (this.action !== 'select') this.returnRows = true
    return this
  }
  insert(rows: Row | Row[]) {
    this.action = 'insert'
    this.payload = Array.isArray(rows) ? rows : [rows]
    return this
  }
  upsert(rows: Row | Row[], options?: { ignoreDuplicates?: boolean }) {
    this.action = 'upsert'
    this.payload = Array.isArray(rows) ? rows : [rows]
    this.ignoreDuplicates = options?.ignoreDuplicates ?? false
    return this
  }
  update(patch: Row) {
    this.action = 'update'
    this.patch = patch
    return this
  }
  delete() {
    this.action = 'delete'
    return this
  }
  eq(column: string, value: unknown) {
    this.filters.push((row) => row[column] === value)
    return this
  }
  in(column: string, values: unknown[]) {
    this.filters.push((row) => values.includes(row[column]))
    return this
  }
  not(column: string, operator: 'is', value: null) {
    void operator
    this.filters.push((row) => row[column] !== value && row[column] !== undefined)
    return this
  }
  order(column: string, options?: { ascending?: boolean }) {
    this.orders.push({ column, ascending: options?.ascending ?? true })
    return this
  }
  single() {
    this.singleRow = true
    return this
  }

  then<A = Result, B = never>(onFulfilled?: ((r: Result) => A | PromiseLike<A>) | null, onRejected?: ((e: unknown) => B | PromiseLike<B>) | null) {
    return Promise.resolve().then(() => this.run()).then(onFulfilled, onRejected)
  }

  private matches(row: Row) {
    return this.filters.every((f) => f(row))
  }

  private run(): Result {
    const rows = (this.db[this.table] ??= [])
    let out: Row[] = []

    if (this.action === 'select') {
      out = rows.filter((r) => this.matches(r))
      out.sort((a, b) => {
        for (const { column, ascending } of this.orders) {
          const c = compare(a[column], b[column])
          if (c !== 0) return ascending ? c : -c
        }
        return 0
      })
    } else if (this.action === 'insert') {
      out = this.payload.map((fields) => newRow(this.table, fields))
      rows.push(...out)
    } else if (this.action === 'upsert') {
      // The app only upserts with onConflict 'coach_id,legacy_id', so legacy_id is the key.
      for (const fields of this.payload) {
        const existing = rows.find((r) => fields.legacy_id != null && r.legacy_id === fields.legacy_id)
        if (!existing) {
          const row = newRow(this.table, fields)
          rows.push(row)
          out.push(row)
        } else if (!this.ignoreDuplicates) {
          Object.assign(existing, fields)
          out.push(existing)
        }
      }
    } else if (this.action === 'update') {
      out = rows.filter((r) => this.matches(r))
      out.forEach((r) => Object.assign(r, this.patch))
    } else {
      out = rows.filter((r) => this.matches(r))
      this.db[this.table] = rows.filter((r) => !out.includes(r))
      // Like the real foreign keys (on delete set null): deleting a team unlinks its players, never deletes them.
      if (this.table === 'teams') {
        const gone = new Set(out.map((t) => t.id))
        for (const p of this.db.players ?? []) {
          if (gone.has(p.team_id)) p.team_id = null
          if (gone.has(p.lesson_team_id)) p.lesson_team_id = null
        }
      }
    }

    // Hand out copies, so screens can't change the "database" by editing objects in state.
    const copies = out.map((r) => structuredClone(r))
    if (this.action !== 'select' && !this.returnRows) return { data: null, error: null }
    if (this.singleRow) {
      return copies.length === 1 ? { data: copies[0], error: null } : { data: null, error: { message: 'Expected one row' } }
    }
    return { data: copies, error: null }
  }
}

const DEMO_SESSION = {
  access_token: 'demo',
  user: { id: DEMO_COACH_ID, email: 'demo@2ndbasecoach.example', user_metadata: { first_name: 'Demo' } },
} as unknown as Session

/** Builds a fresh demo "database" and a client that reads and writes it. */
export function createDemoClient() {
  const db = buildDemoData()
  const notInDemo = { message: 'Not available in the demo.' }
  return {
    from: (table: string) => new DemoQuery(db, table),
    // The one database function the app calls: erase a player and all their history, like delete_player.
    rpc: async (name: string, args: { p_id: string }): Promise<Result> => {
      if (name !== 'delete_player') return { data: null, error: { message: `Unknown function ${name}` } }
      if (!db.players.some((p) => p.id === args.p_id)) return { data: null, error: { message: 'Player not found' } }
      const lessonIds = new Set(db.lessons.filter((l) => l.player_id === args.p_id).map((l) => l.id))
      db.lesson_notes = db.lesson_notes.filter((n) => !lessonIds.has(n.lesson_id))
      db.lesson_items = db.lesson_items.filter((i) => !lessonIds.has(i.lesson_id))
      db.lessons = db.lessons.filter((l) => !lessonIds.has(l.id))
      db.measurements = db.measurements.filter((m) => m.player_id !== args.p_id)
      db.players = db.players.filter((p) => p.id !== args.p_id)
      return { data: null, error: null }
    },
    auth: {
      getSession: async () => ({ data: { session: DEMO_SESSION }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
      // "Sign out" leaves the demo and goes back to the normal login screen.
      signOut: async () => {
        window.location.href = window.location.pathname
        return { error: null }
      },
      signInWithPassword: async () => ({ data: { session: null, user: null }, error: notInDemo }),
      signUp: async () => ({ data: { session: null, user: null }, error: notInDemo }),
    },
  }
}
