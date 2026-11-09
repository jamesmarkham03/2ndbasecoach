import { useState } from 'react'
import { KIND_DECIMALS, parseResult, type ResultKind } from '../../lib/testing'

type Props = {
  label: string
  kind: ResultKind
  value: number | undefined
  onSave: (value: number | null) => Promise<boolean>
  /** For a re-run: the box starts empty and a new value only counts if it beats the current best. */
  keepBest?: boolean
  lowerBetter?: boolean
}

const show = (value: number | undefined, kind: ResultKind) => (value === undefined ? '' : value.toFixed(KIND_DECIMALS[kind]))

// The key rebuilds the box whenever the saved value changes, so it always starts from what's saved.
export function ResultField(props: Props) {
  return <Field key={String(props.value)} {...props} />
}

function Field({ label, kind, value, onSave, keepBest = false, lowerBetter = false }: Props) {
  const saved = keepBest ? '' : show(value, kind)
  const [text, setText] = useState(saved)
  const [problem, setProblem] = useState<string | null>(null)

  // Saves when the coach leaves the box, so a half-typed "6." is never stored.
  async function commit() {
    const typed = text.trim()
    setProblem(null)
    if (typed === saved) return
    if (typed === '') {
      if (!(await onSave(null))) setProblem('Not saved')
      return
    }
    const parsed = parseResult(typed, kind)
    if ('problem' in parsed) return setProblem(parsed.problem)
    if (keepBest && value !== undefined && (lowerBetter ? parsed.value >= value : parsed.value <= value)) {
      setText('')
      return setProblem('Kept the better one')
    }
    if (!(await onSave(parsed.value))) setProblem('Not saved')
  }

  return (
    <label className="result-field">
      <span>{label}</span>
      <input
        className={problem ? 'result-input result-input-bad' : 'result-input'}
        inputMode={kind === 'grade' ? 'numeric' : 'decimal'}
        autoComplete="off"
        value={text}
        placeholder={keepBest && value !== undefined ? show(value, kind) : ''}
        aria-invalid={problem ? true : undefined}
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur()
        }}
      />
      {problem && <small className="result-problem">{problem}</small>}
    </label>
  )
}
