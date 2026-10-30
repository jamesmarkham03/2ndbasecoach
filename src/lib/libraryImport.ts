import { ALL_LEVEL_KEYS, repairMojibake, STARTER_PLANS } from './pitching'
import { starterLibraryRows, toLibraryRow, type OldEntry } from './libraryRows'
import { supabase } from './supabase'
import type { TablesInsert } from './database.types'

type OldPlan = {
  id: string
  name: string
  level?: string
  minutesPerSession?: number
  keyword?: string
  sessions: string[][] // arrays of old entry ids
}

export type ImportSummary = {
  itemsAdded: number
  itemsAlreadyThere: number
  plansAdded: number
  starterPlansAdded: number
}

async function insertLibraryRows(rows: TablesInsert<'library_items'>[]): Promise<number> {
  // "Ignore duplicates" = ON CONFLICT DO NOTHING on (coach_id, legacy_id), and only
  // newly inserted rows come back, so running an import twice adds nothing the second time.
  const { data, error } = await supabase
    .from('library_items')
    .upsert(rows, { onConflict: 'coach_id,legacy_id', ignoreDuplicates: true })
    .select('id')
  if (error) throw new Error(`Library import failed: ${error.message}`)
  return data.length
}

/** Map of legacy_id -> new id for everything already in the coach's library. */
async function legacyIdMap(): Promise<Map<string, string>> {
  const { data, error } = await supabase.from('library_items').select('id, legacy_id').not('legacy_id', 'is', null)
  if (error) throw new Error(error.message)
  return new Map(data.map((r) => [r.legacy_id!, r.id]))
}

/** Adds the default plans (Lower Half, Lead Leg Block, Velo) for any that aren't there yet. */
export async function addStarterPlans(): Promise<number> {
  const { data: library, error } = await supabase.from('library_items').select('id, title').eq('archived', false)
  if (error) throw new Error(error.message)
  const idByTitle = new Map(library.map((r) => [r.title, r.id]))

  let added = 0
  for (const plan of STARTER_PLANS) {
    const itemIds = plan.items.map((t) => idByTitle.get(t)).filter((id): id is string => !!id)
    if (itemIds.length === 0) continue // none of its drills are in this library

    const { data: inserted, error: planError } = await supabase
      .from('lesson_plans')
      .upsert(
        [{ name: plan.name, focus_area: plan.focus_area, level: plan.level, description: plan.description, is_starter: true, legacy_id: `starter-plan:${plan.key}` }],
        { onConflict: 'coach_id,legacy_id', ignoreDuplicates: true },
      )
      .select('id')
    if (planError) throw new Error(planError.message)
    if (inserted.length === 0) continue // already added before

    const { error: itemsError } = await supabase
      .from('lesson_plan_items')
      .insert(itemIds.map((library_item_id, position) => ({ plan_id: inserted[0].id, library_item_id, position })))
    if (itemsError) throw new Error(itemsError.message)
    added++
  }
  return added
}

/** Loads the built-in starter library (59 entries from the original pitching app) plus default plans. */
export async function loadStarterLibrary(): Promise<ImportSummary> {
  const rows = starterLibraryRows()
  const itemsAdded = await insertLibraryRows(rows)
  const starterPlansAdded = await addStarterPlans()
  return { itemsAdded, itemsAlreadyThere: rows.length - itemsAdded, plansAdded: 0, starterPlansAdded }
}

/** Imports the file made by "Export my data" in the old pitching app. Safe to run more than once. */
export async function importOldPitchingApp(fileText: string): Promise<ImportSummary> {
  let data: { format?: string; entries?: OldEntry[]; lessonPlans?: OldPlan[] }
  try {
    data = JSON.parse(fileText)
  } catch {
    throw new Error('That file isn’t valid JSON. Pick the pitching-app-export file.')
  }
  if (data.format !== 'pitching-app-export' || !Array.isArray(data.entries)) {
    throw new Error('That doesn’t look like a pitching app export. Use the “Export my data” button in the old app.')
  }

  const entries = data.entries.filter((e) => e.id && e.title)
  const rows = entries.map((e) => toLibraryRow(e, `old-app:${e.id}`))
  const itemsAdded = await insertLibraryRows(rows)

  // Old plans were "N sessions"; each session becomes its own single-lesson plan.
  const idMap = await legacyIdMap()
  let plansAdded = 0
  for (const old of data.lessonPlans ?? []) {
    const sessions = old.sessions?.length ? old.sessions : [[]]
    for (let i = 0; i < sessions.length; i++) {
      const name = sessions.length > 1 ? `${repairMojibake(old.name)} (Session ${i + 1} of ${sessions.length})` : repairMojibake(old.name)
      const { data: inserted, error } = await supabase
        .from('lesson_plans')
        .upsert(
          [{
            name,
            level: ALL_LEVEL_KEYS.includes(old.level ?? '') ? old.level : null,
            description: [old.keyword && `Focus: ${old.keyword}`, old.minutesPerSession && `${old.minutesPerSession} min session`, 'Imported from the old pitching app']
              .filter(Boolean)
              .join(' · '),
            legacy_id: `old-app:${old.id}#${i}`,
          }],
          { onConflict: 'coach_id,legacy_id', ignoreDuplicates: true },
        )
        .select('id')
      if (error) throw new Error(`Plan import failed: ${error.message}`)
      if (inserted.length === 0) continue

      const itemIds = sessions[i].map((oldId) => idMap.get(`old-app:${oldId}`)).filter((id): id is string => !!id)
      if (itemIds.length > 0) {
        const { error: itemsError } = await supabase
          .from('lesson_plan_items')
          .insert(itemIds.map((library_item_id, position) => ({ plan_id: inserted[0].id, library_item_id, position })))
        if (itemsError) throw new Error(itemsError.message)
      }
      plansAdded++
    }
  }

  const starterPlansAdded = await addStarterPlans()
  return { itemsAdded, itemsAlreadyThere: rows.length - itemsAdded, plansAdded, starterPlansAdded }
}
