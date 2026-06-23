import { useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { analyze, frameUrl } from '../api'
import type { FlowState } from '../App'
import MotionButton from '../components/MotionButton'
import './screens.css'

// Points are stored as FRACTIONS (0..1) of the rendered image. This sidesteps
// the #1 integration bug: a fraction times the TRUE video dimension always
// yields a true-pixel coordinate, regardless of how the image is scaled on
// screen. We still read getBoundingClientRect at click time to compute it.
type Frac = { x: number; y: number }

export default function CalibrateScreen({
  flow,
  onAnalyzing,
}: {
  flow: FlowState
  onAnalyzing: (jobId: string) => void
}) {
  const { video_id, width, height } = flow.upload
  const imgRef = useRef<HTMLImageElement>(null)
  const dragging = useRef<number | null>(null)

  const [points, setPoints] = useState<Frac[]>([])
  const [distance, setDistance] = useState('7.32')
  const [imgReady, setImgReady] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function fracFromEvent(clientX: number, clientY: number): Frac {
    const rect = imgRef.current!.getBoundingClientRect()
    const x = (clientX - rect.left) / rect.width
    const y = (clientY - rect.top) / rect.height
    return { x: clamp01(x), y: clamp01(y) }
  }

  function handleImageClick(e: React.MouseEvent) {
    if (dragging.current !== null) return // a drag just ended
    const p = fracFromEvent(e.clientX, e.clientY)
    setPoints((prev) => (prev.length >= 2 ? [p] : [...prev, p]))
  }

  // Drag an existing dot to fine-tune its position.
  function startDrag(index: number, e: React.PointerEvent) {
    e.stopPropagation()
    e.preventDefault()
    dragging.current = index
    ;(e.target as Element).setPointerCapture(e.pointerId)
  }
  function onDotMove(index: number, e: React.PointerEvent) {
    if (dragging.current !== index) return
    const p = fracFromEvent(e.clientX, e.clientY)
    setPoints((prev) => prev.map((pt, i) => (i === index ? p : pt)))
  }
  function endDrag(e: React.PointerEvent) {
    ;(e.target as Element).releasePointerCapture?.(e.pointerId)
    // Defer clearing so the click handler can see the drag happened.
    requestAnimationFrame(() => (dragging.current = null))
  }

  const ready = points.length === 2 && Number(distance) > 0

  async function measure() {
    if (!ready || submitting) return
    setSubmitting(true)
    setError(null)
    try {
      const toTrue = (p: Frac): [number, number] => [
        p.x * width,
        p.y * height,
      ]
      const { job_id } = await analyze({
        videoId: video_id,
        point1: toTrue(points[0]),
        point2: toTrue(points[1]),
        distanceM: Number(distance),
      })
      onAnalyzing(job_id)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not start analysis.')
      setSubmitting(false)
    }
  }

  return (
    <section className="screen screen--wide">
      <div className="screen__head">
        <p className="eyebrow">Step 2 · Calibrate</p>
        <h1 className="headline">Set the scale</h1>
        <p className="subhead">
          Click two points a known distance apart — a penalty box, the goal
          width, anything you can measure. Drag a dot to nudge it.
        </p>
      </div>

      <div className="calibrate glass">
        <div
          className="frame-wrap"
          style={{ aspectRatio: `${width} / ${height}` }}
        >
          {!imgReady && <div className="frame-skeleton" />}
          <img
            ref={imgRef}
            src={frameUrl(video_id)}
            alt="First frame of your video"
            className="frame-img"
            draggable={false}
            onLoad={() => setImgReady(true)}
            onClick={handleImageClick}
          />

          {/* Overlay shares the image's coordinate space (fractions → %). */}
          <svg className="frame-overlay" viewBox="0 0 100 100" preserveAspectRatio="none">
            {points.length === 2 && (
              <motion.line
                x1={points[0].x * 100}
                y1={points[0].y * 100}
                x2={points[1].x * 100}
                y2={points[1].y * 100}
                stroke="url(#calLine)"
                strokeWidth="0.5"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
                style={{ strokeWidth: 2 }}
              />
            )}
            <defs>
              <linearGradient id="calLine" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0" stopColor="#60a5fa" />
                <stop offset="1" stopColor="#2563eb" />
              </linearGradient>
            </defs>
          </svg>

          {points.map((p, i) => (
            <motion.button
              key={i}
              className="cal-dot"
              style={{ left: `${p.x * 100}%`, top: `${p.y * 100}%` }}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 600, damping: 22 }}
              onPointerDown={(e) => startDrag(i, e)}
              onPointerMove={(e) => onDotMove(i, e)}
              onPointerUp={endDrag}
              onClick={(e) => e.stopPropagation()}
              aria-label={`Calibration point ${i + 1}`}
            >
              <span className="cal-dot__label">{i + 1}</span>
            </motion.button>
          ))}

          {/* Click hint shown until both points exist */}
          {imgReady && points.length < 2 && (
            <div className="frame-hint">
              <span className="pulse-dot" />
              Click point {points.length + 1} of 2
            </div>
          )}
        </div>

        <div className="calibrate__controls">
          <label className="field">
            <span className="field__label">Real-world distance</span>
            <div className="field__input">
              <input
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={distance}
                onChange={(e) => setDistance(e.target.value)}
                className="tnum"
              />
              <span className="field__unit">meters</span>
            </div>
            <span className="field__help">
              Default 7.32 m — the width of a regulation goal.
            </span>
          </label>

          <div className="calibrate__actions">
            {points.length > 0 && (
              <button
                className="textbtn"
                onClick={() => setPoints([])}
                type="button"
              >
                Clear points
              </button>
            )}
            <MotionButton onClick={measure} disabled={!ready || submitting}>
              {submitting ? 'Starting…' : 'Measure speed'}
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path
                  d="M5 12h14m-6-6l6 6-6 6"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </MotionButton>
          </div>
        </div>
      </div>

      {error && <p className="errorline">{error}</p>}
    </section>
  )
}

function clamp01(n: number) {
  return Math.min(1, Math.max(0, n))
}
