import { useCallback, useEffect, useState } from 'react'
import { supabase, type Player, type Team } from './supabase'

type TeamsState = { teams: Team[]; error: string | null }

async function fetchTeams(): Promise<TeamsState> {
  // Regular teams first, the private-lessons team(s) last.
  const res = await supabase.from('teams').select('*').order('is_private_lessons').order('name')
  return { teams: res.data ?? [], error: res.error ? res.error.message : null }
}

/** All of the coach's teams, plus reload() to call after creating, renaming or deleting one. */
export function useTeams() {
  const [state, setState] = useState<TeamsState>({ teams: [], error: null })
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    setState(await fetchTeams())
  }, [])

  useEffect(() => {
    let cancelled = false
    fetchTeams().then((result) => {
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

/** Which column links a player to this kind of team. */
export function teamColumn(team: Pick<Team, 'is_private_lessons'>) {
  return team.is_private_lessons ? 'lesson_team_id' : 'team_id'
}

/** Everyone linked to the team (archived players included). */
export function playersOnTeam(team: Team, players: Player[]): Player[] {
  return players.filter((p) => p[teamColumn(team)] === team.id)
}
