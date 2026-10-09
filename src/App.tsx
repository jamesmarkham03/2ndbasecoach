import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './lib/supabase'
import { BrandTitle } from './components/BrandTitle'
import { useCoachData } from './lib/useCoachData'
import { useLibrary } from './lib/useLibrary'
import { LessonsView } from './views/LessonsView'
import { LibraryView } from './views/LibraryView'
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
  return (
    <CoachApp
      key={session.user.id}
      email={session.user.email ?? ''}
      firstName={(session.user.user_metadata.first_name as string | undefined) ?? ''}
    />
  )
}

type Tab = 'entry' | 'players' | 'lessons' | 'library'

const TABS: { key: Tab; label: string }[] = [
  { key: 'entry', label: 'Quick Entry' },
  { key: 'players', label: 'Players' },
  { key: 'lessons', label: 'Lessons' },
  { key: 'library', label: 'Library' },
]

function CoachApp({ email, firstName }: { email: string; firstName: string }) {
  const { players, metrics, loading, error, reload } = useCoachData()
  const library = useLibrary()
  const [tab, setTab] = useState<Tab>('entry')
  const [openPlayerId, setOpenPlayerId] = useState<string | null>(null)
  const [openLessonId, setOpenLessonId] = useState<string | null>(null)
  const openPlayer = players.find((p) => p.id === openPlayerId)

  function goTo(next: Tab) {
    setTab(next)
    setOpenPlayerId(null)
    setOpenLessonId(null)
  }

  const ready = !loading && !error && !library.loading

  return (
    <main className="app">
      <header className="app-header app-header-bar">
        <BrandTitle />
        <div className="header-account">
          {firstName && <span className="header-coach">Coach {firstName}</span>}
          <button
            className="btn-link"
            onClick={() => {
              if (window.confirm(`Sign out ${email}?`)) void supabase.auth.signOut()
            }}
          >
            Sign out
          </button>
        </div>
      </header>

      <nav className="tabs">
        {TABS.map((t) => (
          <button key={t.key} className={tab === t.key ? 'tab tab-on' : 'tab'} onClick={() => goTo(t.key)}>
            {t.label}
          </button>
        ))}
      </nav>

      {(loading || library.loading) && <p className="subtitle">Loading…</p>}
      {(error ?? library.error) && <p className="msg msg-error">Couldn’t load data: {error ?? library.error}</p>}

      {ready && tab === 'entry' && <QuickEntry players={players} metrics={metrics} onGoToPlayers={() => goTo('players')} />}
      {ready && tab === 'players' && !openPlayer && <PlayersView players={players} onChanged={reload} onOpenPlayer={setOpenPlayerId} />}
      {ready && tab === 'players' && openPlayer && (
        <PlayerDetail
          player={openPlayer}
          metrics={metrics}
          onBack={() => setOpenPlayerId(null)}
          onChanged={reload}
          onOpenLesson={(id) => {
            setTab('lessons')
            setOpenLessonId(id)
          }}
        />
      )}
      {ready && tab === 'lessons' && (
        <LessonsView players={players} library={library.items} openLessonId={openLessonId} setOpenLessonId={setOpenLessonId} />
      )}
      {ready && tab === 'library' && <LibraryView items={library.items} onChanged={library.reload} />}
    </main>
  )
}

export default App
