import { useState, type FormEvent } from 'react'
import { PasswordInput } from '../components/PasswordInput'
import { supabase } from '../lib/supabase'

type Mode = 'signIn' | 'signUp'

export function LoginScreen() {
  const [mode, setMode] = useState<Mode>('signIn')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ kind: 'error' | 'info'; text: string } | null>(null)

  const isSignUp = mode === 'signUp'
  // Only complain once they've started typing the second password.
  const mismatch = isSignUp && confirmPassword !== '' && password !== confirmPassword

  function switchMode(next: Mode) {
    setMode(next)
    setMessage(null)
    setPassword('')
    setConfirmPassword('')
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (isSignUp && password !== confirmPassword) {
      setMessage({ kind: 'error', text: 'Passwords don’t match.' })
      return
    }
    setBusy(true)
    setMessage(null)

    if (!isSignUp) {
      // On success, App notices the new session and swaps this screen out.
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setMessage({ kind: 'error', text: error.message })
    } else {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
          // Stored on the account itself (user metadata), so no extra table is needed yet.
          data: { first_name: firstName.trim(), last_name: lastName.trim() },
        },
      })
      if (error) {
        setMessage({ kind: 'error', text: error.message })
      } else if (!data.session) {
        // Supabase requires email confirmation by default.
        switchMode('signIn')
        setMessage({ kind: 'info', text: 'Account created. Check your email for a confirmation link, then sign in here.' })
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
        <h2>{isSignUp ? 'Create your coach account' : 'Sign in'}</h2>

        {isSignUp && (
          <div className="form-grid">
            <label>
              First name
              <input required autoComplete="given-name" autoCapitalize="words" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            </label>
            <label>
              Last name
              <input required autoComplete="family-name" autoCapitalize="words" value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </label>
          </div>
        )}

        <label>
          Email
          <input type="email" autoComplete="email" autoCapitalize="off" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>

        <PasswordInput
          label={isSignUp ? 'Password (8+ characters)' : 'Password'}
          value={password}
          onChange={setPassword}
          autoComplete={isSignUp ? 'new-password' : 'current-password'}
        />
        {isSignUp && (
          <>
            <PasswordInput
              label="Confirm password"
              value={confirmPassword}
              onChange={setConfirmPassword}
              autoComplete="new-password"
              invalid={mismatch}
            />
            {mismatch && <p className="field-error">Passwords don’t match.</p>}
          </>
        )}

        {message && <p className={message.kind === 'error' ? 'msg msg-error' : 'msg msg-info'}>{message.text}</p>}

        <button className="btn" type="submit" disabled={busy || mismatch}>
          {busy ? 'Please wait…' : isSignUp ? 'Create account' : 'Sign in'}
        </button>
        <button className="btn-link" type="button" onClick={() => switchMode(isSignUp ? 'signIn' : 'signUp')}>
          {isSignUp ? 'Already have an account? Sign in' : 'First time? Create an account'}
        </button>
      </form>
    </div>
  )
}
