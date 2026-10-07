import { useEffect, useState } from 'react'
import { supabaseUrl, supabasePublishableKey } from './lib/supabase'
import './App.css'

type Status = 'checking' | 'connected' | 'error'

function App() {
  const [status, setStatus] = useState<Status>('checking')

  useEffect(() => {
    // Phase 0 has no tables yet, so ping Supabase's auth health endpoint
    // to prove the app can reach the database project with our key.
    fetch(`${supabaseUrl}/auth/v1/health`, {
      headers: { apikey: supabasePublishableKey },
    })
      .then((res) => setStatus(res.ok ? 'connected' : 'error'))
      .catch(() => setStatus('error'))
  }, [])

  return (
    <main className="app">
      <header className="app-header">
        <h1>
          Coach <span>App</span>
        </h1>
        <p className="subtitle">Player development tracker</p>
      </header>

      <div className={`status status-${status}`}>
        {status === 'checking' && 'Checking database connection…'}
        {status === 'connected' && 'Database connected'}
        {status === 'error' && 'Cannot reach the database. Check your internet and .env.local.'}
      </div>
    </main>
  )
}

export default App
