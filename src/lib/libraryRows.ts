import starterLibrary from '../data/starterLibrary.json'
import { ALL_LEVEL_KEYS, guessFocusAreas, repairMojibake } from './pitching'
import type { TablesInsert } from './database.types'

// Pure helpers (no database calls), so both the importer and demo mode can use them.

export type OldEntry = {
  id?: string
  type?: string
  title?: string
  note?: string
  source?: string
  tags?: string[]
  level?: string[]
  levels?: string[]
  minutes?: number
}

/** Turns an old-app entry into a library row. legacyId lets a re-import skip what's already there. */
export function toLibraryRow(e: OldEntry, legacyId: string): TablesInsert<'library_items'> {
  const fix = (s: string | undefined) => repairMojibake((s ?? '').trim())
  const type = ['concept', 'drill', 'cue'].includes(e.type ?? '') ? e.type! : 'concept'
  const tags = (e.tags ?? []).map(fix).filter(Boolean)
  const source = fix(e.source)
  const levels = (e.levels ?? e.level ?? []).filter((l) => ALL_LEVEL_KEYS.includes(l))
  const minutes = Math.min(180, Math.max(1, Math.round(Number(e.minutes) || (type === 'drill' ? 8 : 5))))
  return {
    type,
    title: fix(e.title) || 'Untitled',
    note: fix(e.note),
    source: source || null,
    tags,
    levels: levels.length ? levels : ALL_LEVEL_KEYS,
    focus_areas: guessFocusAreas(source, tags),
    minutes,
    legacy_id: legacyId,
  }
}

/** The 59-entry starter library as rows ready to insert. */
export function starterLibraryRows(): TablesInsert<'library_items'>[] {
  return (starterLibrary as OldEntry[]).map((e) => toLibraryRow(e, `starter:${e.title}`))
}
