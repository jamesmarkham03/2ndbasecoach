import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './lib/supabase'
import { useCoachData } from './lib/useCoachData'
import { LoginScreen } from './views/LoginScreen'
import { PlayerDetail } from './views/PlayerDetail'
import { PlayersView } from './views/PlayersView'
import { QuickEntry } from './views/QuickEntry'
import './App.css'

function App() {
  // undefined = still checking for a saved login; null = signed out.
  const [session, setSession] = useState<Session | null | undefined>(undefined)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    // Keeps the screen in sync when signing in, signing out, or a login expires.
    const { data } = supabase.auth.onAuthStateChange((_event, newSession) => setSession(newSession))
    return () => data.subscription.unsubscribe()
  }, [])

  if (session === undefined) return null
  if (session === null) {
    return (
      <main className="app">
        <LoginScreen />
      </main>
    )
  }
  // key= remounts everything if a different coach signs in, so no data leaks between accounts.
  return <CoachApp key={session.user.id} email={session.user.email ?? ''} />
}

type Tab = 'entry' | 'players'

function CoachApp({ email }: { email: string }) {
  const { players, metrics, loading, error, reload } = useCoachData()
  const [tab, setTab] = useState<Tab>('entry')
  const [openPlayerId, setOpenPlayerId] = useState<string | null>(null)
  const openPlayer = players.find((p) => p.id === openPlayerId)

  function goTo(next: Tab) {
    setTab(next)
    setOpenPlayerId(null)
  }

  return (
    <main className="app">
      <header className="app-header app-header-bar">
        <h1>
          Coach <span>App</span>
        </h1>
        <button
          className="btn-link"
          onClick={() => {
            if (window.confirm(`Sign out ${email}?`)) void supabase.auth.signOut()
          }}
        >
          Sign out
        </button>
      </header>

      <nav className="tabs">
        <button className={tab === 'entry' ? 'tab tab-on' : 'tab'} onClick={() => goTo('entry')}>
          Quick Entry
        </button>
        <button className={tab === 'players' ? 'tab tab-on' : 'tab'} onClick={() => goTo('players')}>
          Players
        </button>
      </nav>

      {loading && <p className="subtitle">Loading…</p>}
      {error && <p className="msg msg-error">Couldn’t load data: {error}</p>}

      {!loading && !error && tab === 'entry' && (
        <QuickEntry players={players} metrics={metrics} onGoToPlayers={() => goTo('players')} />
      )}
      {!loading && !error && tab === 'players' && !openPlayer && (
        <PlayersView players={players} onChanged={reload} onOpenPlayer={setOpenPlayerId} />
      )}
      {!loading && !error && tab === 'players' && openPlayer && (
        <PlayerDetail player={openPlayer} metrics={metrics} onBack={() => setOpenPlayerId(null)} onChanged={reload} />
      )}
    </main>
  )
}

export default App
