import { useCallback, useEffect, useState } from 'react'
import { supabase, type LibraryItem } from './supabase'

type LibraryState = { items: LibraryItem[]; error: string | null }

async function fetchLibrary(): Promise<LibraryState> {
  // Archived items are included so old plans and lessons can still show their names.
  const { data, error } = await supabase.from('library_items').select('*').order('title')
  return { items: data ?? [], error: error ? error.message : null }
}

/** The coach's whole pitching library, shared by the Library, Plans and Lesson screens. */
export function useLibrary() {
  const [state, setState] = useState<LibraryState>({ items: [], error: null })
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    setState(await fetchLibrary())
  }, [])

  useEffect(() => {
    let cancelled = false
    fetchLibrary().then((result) => {
      if (cancelled) return
      setState(result)
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [])

  return { ...state, loading, reload }
}
