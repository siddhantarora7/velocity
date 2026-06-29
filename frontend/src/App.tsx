import { useCallback, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { AnalyzeResult, UploadResponse } from './api'
import { useAuth } from './auth'
import UploadScreen from './screens/UploadScreen'
import CalibrateScreen from './screens/CalibrateScreen'
import ProcessingScreen from './screens/ProcessingScreen'
import ResultsScreen from './screens/ResultsScreen'
import HistoryScreen from './screens/HistoryScreen'
import AuthModal from './components/AuthModal'

type Phase = 'upload' | 'calibrate' | 'processing' | 'results'
type Tab = 'analyze' | 'history'

export interface FlowState {
  upload: UploadResponse
  jobId?: string
  result?: AnalyzeResult
}

export default function App() {
  const { isAuthed, email, logout } = useAuth()
  const [tab, setTab] = useState<Tab>('analyze')
  const [authOpen, setAuthOpen] = useState(false)
  const [phase, setPhase] = useState<Phase>('upload')
  const [flow, setFlow] = useState<FlowState | null>(null)

  const reset = useCallback(() => {
    setFlow(null)
    setPhase('upload')
  }, [])

  const onUploaded = useCallback((upload: UploadResponse) => {
    setFlow({ upload })
    setPhase('calibrate')
  }, [])

  const onAnalyzing = useCallback((jobId: string) => {
    setFlow((f) => (f ? { ...f, jobId } : f))
    setPhase('processing')
  }, [])

  const onDone = useCallback((result: AnalyzeResult) => {
    setFlow((f) => (f ? { ...f, result } : f))
    setPhase('results')
  }, [])

  const viewKey = tab === 'history' ? 'history' : phase

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand__mark" aria-hidden>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path
                d="M3 5l7 14a1 1 0 0 0 1.8.05L21 5"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <span className="brand__name">
            velocity<span>.</span>
          </span>
        </div>

        <nav className="nav">
          {(['analyze', 'history'] as Tab[]).map((t) => (
            <button
              key={t}
              className={`nav__tab ${tab === t ? 'nav__tab--active' : ''}`}
              onClick={() => setTab(t)}
            >
              {tab === t && (
                <motion.span
                  layoutId="navpill"
                  className="nav__pill"
                  transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                />
              )}
              <span className="nav__tab-label">
                {t === 'analyze' ? 'Analyze' : 'History'}
              </span>
            </button>
          ))}
          {isAuthed ? (
            <div className="authctl">
              <span className="authctl__email">{email}</span>
              <button className="textbtn" onClick={logout}>
                Log out
              </button>
            </div>
          ) : (
            <button className="nav__login" onClick={() => setAuthOpen(true)}>
              Log in
            </button>
          )}
        </nav>
      </header>

      <main className="stage">
        <AnimatePresence mode="wait">
          <motion.div
            key={viewKey}
            initial={{ opacity: 0, y: 18, filter: 'blur(6px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -14, filter: 'blur(6px)' }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          >
            {tab === 'history' ? (
              <HistoryScreen onRequireLogin={() => setAuthOpen(true)} />
            ) : (
              <>
                {phase === 'upload' && <UploadScreen onUploaded={onUploaded} />}
                {phase === 'calibrate' && flow && (
                  <CalibrateScreen flow={flow} onAnalyzing={onAnalyzing} />
                )}
                {phase === 'processing' && flow?.jobId && (
                  <ProcessingScreen
                    jobId={flow.jobId}
                    onDone={onDone}
                    onCancel={reset}
                  />
                )}
                {phase === 'results' && flow?.result && (
                  <ResultsScreen flow={flow} onReset={reset} />
                )}
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      <AnimatePresence>
        {authOpen && <AuthModal onClose={() => setAuthOpen(false)} />}
      </AnimatePresence>
    </div>
  )
}
