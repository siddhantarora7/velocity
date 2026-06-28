import { useEffect, useRef, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { getResult, getStatus, videoUrl, type AnalyzeResult } from '../api'
import TextureButton from '../components/TextureButton'
import AiLoader from '../components/AiLoader'
import Shimmer from '../components/Shimmer'
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
            <TextureButton onClick={onCancel}>Start over</TextureButton>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="screen">
      <div className="glass processing">
        <AiLoader />
        <div className="processing__msg">
          <AnimatePresence mode="wait">
            <Shimmer key={msgIndex} duration={2.4}>
              {MESSAGES[msgIndex]}
            </Shimmer>
          </AnimatePresence>
        </div>
        <p className="processing__sub">
          This usually takes a moment while we track the ball across the whole
          clip.
        </p>
      </div>
    </section>
  )
}
