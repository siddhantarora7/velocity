import { useCallback, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { AnalyzeResult, UploadResponse } from './api'
import UploadScreen from './screens/UploadScreen'
import CalibrateScreen from './screens/CalibrateScreen'
import ProcessingScreen from './screens/ProcessingScreen'
import ResultsScreen from './screens/ResultsScreen'

type Phase = 'upload' | 'calibrate' | 'processing' | 'results'

export interface FlowState {
  upload: UploadResponse
  jobId?: string
  result?: AnalyzeResult
  videoSrc?: string
}

export default function App() {
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

  const onDone = useCallback(
    (result: AnalyzeResult, videoSrc: string) => {
      setFlow((f) => (f ? { ...f, result, videoSrc } : f))
      setPhase('results')
    },
    [],
  )

  return (
    <div className="app-shell">
      <header className="brand">
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
      </header>

      <main className="stage">
        <AnimatePresence mode="wait">
          <motion.div
            key={phase}
            initial={{ opacity: 0, y: 18, filter: 'blur(6px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -14, filter: 'blur(6px)' }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          >
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
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  )
}
