import { useCallback, useEffect, useRef, useState } from 'react'

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

/**
 * Saves typed text shortly after the coach stops typing (and immediately on blur),
 * so notes survive the iPad sleeping or the app closing mid-lesson.
 * Each field has a key; a newer edit to the same field replaces the pending save.
 */
export function useAutosave(delayMs = 800) {
  const timers = useRef(new Map<string, { timer: number; run: () => Promise<boolean> }>())
  const [status, setStatus] = useState<SaveStatus>('idle')
  const [lastError, setLastError] = useState<string | null>(null)

  const run = useCallback(async (save: () => Promise<string | null>) => {
    setStatus('saving')
    const error = await save()
    setStatus(error ? 'error' : 'saved')
    setLastError(error)
    return !error
  }, [])

  /** Schedule a save; `save` returns an error message or null. */
  const saveSoon = useCallback(
    (key: string, save: () => Promise<string | null>) => {
      const pending = timers.current.get(key)
      if (pending) window.clearTimeout(pending.timer)
      const entry = {
        run: () => run(save),
        timer: window.setTimeout(() => {
          timers.current.delete(key)
          void entry.run()
        }, delayMs),
      }
      timers.current.set(key, entry)
      setStatus('saving')
    },
    [delayMs, run],
  )

  /** Run a field's pending save right now (e.g. on blur). */
  const flush = useCallback((key: string) => {
    const pending = timers.current.get(key)
    if (!pending) return
    window.clearTimeout(pending.timer)
    timers.current.delete(key)
    void pending.run()
  }, [])

  /** Save immediately (checkboxes, adds, removes). */
  const saveNow = useCallback((save: () => Promise<string | null>) => run(save), [run])

  // Push out anything still waiting when leaving the screen, or when the iPad
  // switches apps / locks (the page becomes "hidden" and may be frozen after that).
  useEffect(() => {
    const pendingTimers = timers.current
    const flushAll = () => {
      for (const { timer, run: pendingRun } of pendingTimers.values()) {
        window.clearTimeout(timer)
        void pendingRun()
      }
      pendingTimers.clear()
    }
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flushAll()
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      flushAll()
    }
  }, [])

  return { status, lastError, saveSoon, flush, saveNow }
}
