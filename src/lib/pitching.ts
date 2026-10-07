// Shared vocabulary for the pitching library, plans and lessons.

export const ITEM_TYPES = [
  { key: 'concept', label: 'Concept' },
  { key: 'drill', label: 'Drill' },
  { key: 'cue', label: 'Cue / Feel' },
] as const

export const LEVELS = [
  { key: 'beginner', label: 'Beginner' },
  { key: 'intermediate', label: 'Intermediate' },
  { key: 'advanced', label: 'Advanced' },
] as const

// What a library item helps fix. Default lesson plans and the library filter run on these.
export const FOCUS_AREAS = [
  { key: 'lower_half', label: 'Lower Half' },
  { key: 'lead_leg', label: 'Lead Leg Block' },
  { key: 'upper_half', label: 'Upper Half' },
  { key: 'arm_path', label: 'Arm Path' },
  { key: 'command', label: 'Command' },
  { key: 'sequencing', label: 'Sequencing & Tempo' },
  { key: 'velocity', label: 'Velocity' },
  { key: 'strength_mobility', label: 'Strength & Mobility' },
] as const

export const ALL_LEVEL_KEYS = LEVELS.map((l) => l.key) as string[]

export function typeLabel(key: string): string {
  return ITEM_TYPES.find((t) => t.key === key)?.label ?? key
}
export function levelLabel(key: string): string {
  return LEVELS.find((l) => l.key === key)?.label ?? key
}
export function focusLabel(key: string): string {
  return FOCUS_AREAS.find((f) => f.key === key)?.label ?? key
}

/**
 * Best guess at focus areas for entries from the old pitching app, which only had
 * a "source video" field. Coaches can change them afterwards in the library.
 */
export function guessFocusAreas(source: string, tags: string[]): string[] {
  const s = source.toLowerCase()
  const t = tags.map((x) => x.toLowerCase())
  const areas = new Set<string>()
  if (s.includes('lower half') || s.includes('legs')) areas.add('lower_half')
  if (s.includes('lead leg')) areas.add('lead_leg')
  if (s.includes('velo')) areas.add('velocity')
  if (s.includes('drift')) {
    areas.add('lower_half')
    areas.add('sequencing')
  }
  if (t.includes('upper half')) areas.add('upper_half')
  if (t.includes('sequencing')) areas.add('sequencing')
  if (t.some((x) => x.includes('mobility') || x.includes('strength'))) areas.add('strength_mobility')
  return [...areas]
}

// Windows-1252 characters that sit where UTF-8 continuation bytes 0x80–0x9F should be.
const CP1252_TO_BYTE: Record<number, number> = {
  0x20ac: 0x80, 0x201a: 0x82, 0x0192: 0x83, 0x201e: 0x84, 0x2026: 0x85, 0x2020: 0x86, 0x2021: 0x87,
  0x02c6: 0x88, 0x2030: 0x89, 0x0160: 0x8a, 0x2039: 0x8b, 0x0152: 0x8c, 0x017d: 0x8e, 0x2018: 0x91,
  0x2019: 0x92, 0x201c: 0x93, 0x201d: 0x94, 0x2022: 0x95, 0x2013: 0x96, 0x2014: 0x97, 0x02dc: 0x98,
  0x2122: 0x99, 0x0161: 0x9a, 0x203a: 0x9b, 0x0153: 0x9c, 0x017e: 0x9e, 0x0178: 0x9f,
}

/**
 * Repairs text like "rotation â€” without" back to "rotation — without".
 * The old app had no charset declared, so the browser read its UTF-8 dashes and
 * quotes as Windows-1252 and saved the garbled version. Only changes a string if
 * it converts back cleanly, so normal text is never touched.
 */
export function repairMojibake(text: string): string {
  if (!/[ÂÃâ]/.test(text)) return text
  const bytes: number[] = []
  for (const ch of text) {
    const code = ch.codePointAt(0)!
    if (code < 0x100) bytes.push(code)
    else if (CP1252_TO_BYTE[code] !== undefined) bytes.push(CP1252_TO_BYTE[code])
    else return text // a character that can't have come from the mix-up: leave it alone
  }
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(new Uint8Array(bytes))
  } catch {
    return text
  }
}

/**
 * Default lesson plans built from the starter library (matched by title).
 * Only areas the library already covers. Upper half, arm path and command come later.
 */
export const STARTER_PLANS = [
  {
    key: 'lower-half',
    name: 'Lower Half: Load & Tension',
    focus_area: 'lower_half',
    level: null,
    description: 'Build backside load and 3D tension, then feel it in a throw.',
    items: [
      'Load-to-Unload Principle',
      'Cross-Body Reach Feel',
      'Stool / Swivel Chair Hinge Drill',
      'Tension Rocker Drill',
      '3D Strap Resisted Load',
      '"Winding the Spring"',
    ],
  },
  {
    key: 'lead-leg',
    name: 'Lead Leg Block',
    focus_area: 'lead_leg',
    level: null,
    description: 'Open the lead hip, build front-side stability, then rotate into a firm front leg.',
    items: [
      'Lead Leg Block Purpose',
      'Hip 90/90 IR Activation',
      'Medicine Ball Wall Taps',
      'Lasso Drill (no stride, no arm swing)',
      'Rocker Throw / Figure-8 Rocker',
      '"Throw the Belly Button Into the Lead Leg"',
    ],
  },
  {
    key: 'velo-split-test',
    name: 'Velo Split-Test Session',
    focus_area: 'velocity',
    level: 'advanced',
    description: 'Blind split-test small changes at sub-max effort to find real velo gains.',
    items: ['Instant Clicks vs. Long-Term Gains', 'Blind Split-Testing Protocol', 'Back Foot Angle Test', 'Fastball Grip Split-Test'],
  },
] as const
