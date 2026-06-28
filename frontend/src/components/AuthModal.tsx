import { useState } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '../auth'
import TextureButton from './TextureButton'
import './auth-modal.css'

type Mode = 'login' | 'signup'

export default function AuthModal({ onClose }: { onClose: () => void }) {
  const { login, signup } = useAuth()
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const ready = email.trim().length > 0 && password.length > 0

  async function submit() {
    if (!ready || busy) return
    setBusy(true)
    setError(null)
    try {
      await (mode === 'login' ? login : signup)(email.trim(), password)
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.')
      setBusy(false)
    }
  }

  return (
    <motion.div
      className="modal-scrim"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="modal glass"
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, y: 18, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.98 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="screen__head">
          <p className="eyebrow">{mode === 'login' ? 'Welcome back' : 'Get started'}</p>
          <h1 className="headline">
            {mode === 'login' ? 'Log in to Velocity' : 'Create your account'}
          </h1>
          <p className="subhead">Save every strike and track your history.</p>
        </div>

        <form
          className="modal__form"
          onSubmit={(e) => {
            e.preventDefault()
            submit()
          }}
        >
          <label className="field">
            <span className="field__label">Email</span>
            <div className="field__input">
              <input
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </label>

          <label className="field">
            <span className="field__label">Password</span>
            <div className="field__input">
              <input
                type="password"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </label>

          {error && <p className="errorline">{error}</p>}

          <TextureButton type="submit" disabled={!ready || busy} className="modal__submit">
            {busy ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Sign up'}
          </TextureButton>
        </form>

        <p className="modal__toggle">
          {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}{' '}
          <button
            type="button"
            className="textbtn"
            onClick={() => {
              setMode((m) => (m === 'login' ? 'signup' : 'login'))
              setError(null)
            }}
          >
            {mode === 'login' ? 'Sign up' : 'Log in'}
          </button>
        </p>
      </motion.div>
    </motion.div>
  )
}
