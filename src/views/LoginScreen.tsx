import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'

type Mode = 'signIn' | 'signUp'

export function LoginScreen() {
  const [mode, setMode] = useState<Mode>('signIn')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ kind: 'error' | 'info'; text: string } | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setMessage(null)

    if (mode === 'signIn') {
      // On success, App notices the new session and swaps this screen out.
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setMessage({ kind: 'error', text: error.message })
    } else {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: window.location.origin },
      })
      if (error) {
        setMessage({ kind: 'error', text: error.message })
      } else if (!data.session) {
        // Supabase requires email confirmation by default.
        setMessage({ kind: 'info', text: 'Account created. Check your email for a confirmation link, then sign in here.' })
        setMode('signIn')
      }
    }
    setBusy(false)
  }

  return (
    <div className="login">
      <header className="app-header">
        <h1>
          Coach <span>App</span>
        </h1>
        <p className="subtitle">Player development tracker</p>
      </header>

      <form className="card form" onSubmit={handleSubmit}>
        <h2>{mode === 'signIn' ? 'Sign in' : 'Create your coach account'}</h2>

        <label>
          Email
          <input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label>
          Password
          <input
            type="password"
            autoComplete={mode === 'signIn' ? 'current-password' : 'new-password'}
            minLength={8}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>

        {message && <p className={message.kind === 'error' ? 'msg msg-error' : 'msg msg-info'}>{message.text}</p>}

        <button className="btn" type="submit" disabled={busy}>
          {busy ? 'Please wait…' : mode === 'signIn' ? 'Sign in' : 'Create account'}
        </button>
        <button
          className="btn-link"
          type="button"
          onClick={() => {
            setMode(mode === 'signIn' ? 'signUp' : 'signIn')
            setMessage(null)
          }}
        >
          {mode === 'signIn' ? 'First time? Create an account' : 'Already have an account? Sign in'}
        </button>
      </form>
    </div>
  )
}
