import { useCallback, useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { isDemo, supabase } from './lib/supabase'
import { BrandTitle } from './components/BrandTitle'
import { SideMenu, type View } from './components/SideMenu'
import { useCoachData } from './lib/useCoachData'
import { useLibrary } from './lib/useLibrary'
import { LessonsView } from './views/LessonsView'
import { LibraryView } from './views/LibraryView'
import { LoginScreen } from './views/LoginScreen'
import { PlayerDetail } from './views/PlayerDetail'
import { PlayersView } from './views/PlayersView'
import { TeamsView } from './views/TeamsView'
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

function CoachApp({ email, firstName }: { email: string; firstName: string }) {
  const { players, metrics, loading, error, reload } = useCoachData()
  const library = useLibrary()
  const [view, setView] = useState<View>('players')
  const [menuOpen, setMenuOpen] = useState(false)
  const [openPlayerId, setOpenPlayerId] = useState<string | null>(null)
  const [openLessonId, setOpenLessonId] = useState<string | null>(null)
  const openPlayer = players.find((p) => p.id === openPlayerId)
  const closeMenu = useCallback(() => setMenuOpen(false), [])

  function goTo(next: View) {
    setView(next)
    setOpenPlayerId(null)
    setOpenLessonId(null)
    setMenuOpen(false)
  }

  function signOut() {
    if (isDemo || window.confirm(`Sign out ${email}?`)) void supabase.auth.signOut()
  }

  const ready = !loading && !error && !library.loading

  return (
    <main className="app">
      {isDemo && (
        <p className="demo-banner">Demo mode: made-up players and data. Changes reset when you refresh.</p>
      )}
      <header className="app-header app-header-bar">
        <button className="btn-icon menu-button" onClick={() => setMenuOpen(true)} aria-label="Open menu">
          ☰
        </button>
        <BrandTitle />
      </header>

      {menuOpen && (
        <SideMenu
          view={view}
          firstName={firstName}
          signOutLabel={isDemo ? 'Exit demo' : 'Sign out'}
          onSelect={goTo}
          onSignOut={signOut}
          onClose={closeMenu}
        />
      )}

      {(loading || library.loading) && <p className="subtitle">Loading…</p>}
      {(error ?? library.error) && <p className="msg msg-error">Couldn’t load data: {error ?? library.error}</p>}

      {ready && view === 'players' && !openPlayer && <PlayersView players={players} onChanged={reload} onOpenPlayer={setOpenPlayerId} />}
      {ready && view === 'players' && openPlayer && (
        <PlayerDetail
          player={openPlayer}
          metrics={metrics}
          onBack={() => setOpenPlayerId(null)}
          onChanged={reload}
          onOpenLesson={(id) => {
            setView('lessons')
            setOpenLessonId(id)
          }}
        />
      )}
      {ready && view === 'teams' && <TeamsView />}
      {ready && view === 'lessons' && (
        <LessonsView players={players} library={library.items} openLessonId={openLessonId} setOpenLessonId={setOpenLessonId} />
      )}
      {ready && view === 'library' && <LibraryView items={library.items} onChanged={library.reload} />}
    </main>
  )
}

export default App
