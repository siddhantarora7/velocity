import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { getResult, getStatus, videoUrl, type AnalyzeResult } from '../api'
import MotionButton from '../components/MotionButton'
import './screens.css'

const MESSAGES = [
  'Reading every frame…',
  'Locking onto the ball…',
  'Smoothing the trajectory…',
  'Finding the moment of impact…',
  'Clocking the velocity…',
]

export default function ProcessingScreen({
  jobId,
  onDone,
  onCancel,
}: {
  jobId: string
  onDone: (result: AnalyzeResult, videoSrc: string) => void
  onCancel: () => void
}) {
  const [error, setError] = useState<string | null>(null)
  const [msgIndex, setMsgIndex] = useState(0)
  const settled = useRef(false)

  useEffect(() => {
    settled.current = false
    let alive = true

    const poll = setInterval(async () => {
      if (!alive || settled.current) return
      try {
        const { status, error: err } = await getStatus(jobId)
        if (!alive) return
        if (status === 'done') {
          settled.current = true
          const result = await getResult(jobId)
          if (!alive) return
          onDone(result, videoUrl(jobId))
        } else if (status === 'error') {
          settled.current = true
          setError(err ?? 'The analysis failed. Please try again.')
        }
      } catch (e) {
        settled.current = true
        setError(
          e instanceof Error ? e.message : 'Lost connection to the backend.',
        )
      }
    }, 1000)

    const cycle = setInterval(
      () => setMsgIndex((i) => (i + 1) % MESSAGES.length),
      2200,
    )

    return () => {
      alive = false
      clearInterval(poll)
      clearInterval(cycle)
    }
  }, [jobId, onDone])

  if (error) {
    return (
      <section className="screen">
        <div className="glass errorcard">
          <div className="errorcard__icon" aria-hidden>
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 8v5m0 3.5h.01M10.3 3.9 2.4 17.6A2 2 0 0 0 4.1 20.6h15.8a2 2 0 0 0 1.7-3l-7.9-13.7a2 2 0 0 0-3.4 0Z"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <h2 className="headline">Analysis hit a snag</h2>
          <p className="subhead errorcard__detail">{error}</p>
          <div className="errorcard__actions">
            <MotionButton onClick={onCancel}>Start over</MotionButton>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="screen">
      <div className="glass processing">
        <Radar />
        <motion.p
          key={msgIndex}
          className="processing__msg"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
        >
          {MESSAGES[msgIndex]}
        </motion.p>
        <p className="processing__sub">
          This usually takes a moment — we’re tracking the ball across the
          whole clip.
        </p>
      </div>
    </section>
  )
}

// A pitch-radar: concentric pulse rings, a sweeping arc, and a ball that
// orbits leaving a comet trail. Pure SVG + Framer Motion.
function Radar() {
  return (
    <div className="radar" aria-hidden>
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="radar__ring"
          initial={{ scale: 0.35, opacity: 0.55 }}
          animate={{ scale: 1.25, opacity: 0 }}
          transition={{
            duration: 2.4,
            repeat: Infinity,
            ease: 'easeOut',
            delay: i * 0.8,
          }}
        />
      ))}

      <div className="radar__core">
        <svg width="44" height="44" viewBox="0 0 24 24" fill="none">
          <path
            d="M3 5l7 14a1 1 0 0 0 1.8.05L21 5"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      <motion.div
        className="radar__orbit"
        animate={{ rotate: 360 }}
        transition={{ duration: 1.8, repeat: Infinity, ease: 'linear' }}
      >
        <span className="radar__ball" />
        <span className="radar__trail" />
      </motion.div>
    </div>
  )
}
