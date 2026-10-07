import { typeLabel } from '../lib/pitching'

/** Small colored label: blue concept, orange drill, green cue (same colors as the old pitching app). */
export function TypeTag({ type }: { type: string }) {
  return <span className={`type-tag type-${type}`}>{typeLabel(type)}</span>
}
