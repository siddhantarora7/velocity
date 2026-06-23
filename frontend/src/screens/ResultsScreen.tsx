import { useEffect, useMemo, useState } from 'react'
import { animate, motion } from 'framer-motion'
import type { FlowState } from '../App'
import MotionButton from '../components/MotionButton'
import './screens.css'

export default function ResultsScreen({
  flow,
  onReset,
}: {
  flow: FlowState
  onReset: () => void
}) {
  const result = flow.result!
  const fastest = Math.round(result.fastest_kmh * 10) / 10
  const launch = result.launch_kmh

  return (
    <section className="screen screen--wide">
      <div className="screen__head">
        <p className="eyebrow">Step 3 · Result</p>
        <h1 className="headline">
          {result.kick_found ? 'Strike clocked' : 'Tracked the ball'}
        </h1>
      </div>

      <div className="results">
        <div className="glass hero">
          <p className="hero__caption">Top speed</p>
          <div className="hero__readout">
            <CountUp value={fastest} decimals={1} className="hero__number tnum" />
            <span className="hero__unit">km/h</span>
          </div>
          <Sparkline speeds={result.speeds} />

          <div className="hero__stats">
            <Stat
              label="Launch speed"
              value={launch != null ? `${launch.toFixed(1)}` : '—'}
              unit={launch != null ? 'km/h' : undefined}
              hint={
                launch != null ? 'speed off the boot' : 'not enough trajectory'
              }
            />
            <Stat
              label="Kick detected"
              value={result.kick_found ? 'Yes' : 'No'}
              hint={
                result.kick_found
                  ? 'impact window isolated'
                  : 'using full-clip peak'
              }
            />
            <Stat
              label="Top speed in mph"
              value={(fastest / 1.609).toFixed(1)}
              unit="mph"
              hint="for the imperial crowd"
            />
          </div>
        </div>

        <div className="glass videocard">
          <div className="videocard__bar">
            <span className="videocard__tag">
              <span className="rec-dot" /> Annotated tracking
            </span>
          </div>
          <video
            className="videocard__video"
            src={flow.videoSrc}
            controls
            autoPlay
            loop
            muted
            playsInline
          />
        </div>
      </div>

      <div className="results__footer">
        <MotionButton variant="ghost" onClick={onReset}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path
              d="M4 12a8 8 0 1 1 2.3 5.6M4 12V7m0 5h5"
              stroke="currentColor"
              strokeWidth="2.1"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Analyze another
        </MotionButton>
      </div>
    </section>
  )
}

function Stat({
  label,
  value,
  unit,
  hint,
}: {
  label: string
  value: string
  unit?: string
  hint?: string
}) {
  return (
    <div className="stat">
      <p className="stat__label">{label}</p>
      <p className="stat__value tnum">
        {value}
        {unit && <span className="stat__unit">{unit}</span>}
      </p>
      {hint && <p className="stat__hint">{hint}</p>}
    </div>
  )
}

function CountUp({
  value,
  decimals = 0,
  className,
}: {
  value: number
  decimals?: number
  className?: string
}) {
  const [display, setDisplay] = useState(0)
  useEffect(() => {
    const controls = animate(0, value, {
      duration: 1.7,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setDisplay(v),
    })
    return () => controls.stop()
  }, [value])
  return <span className={className}>{display.toFixed(decimals)}</span>
}

// Speed-over-time sparkline with a soft area fill and a marker on the peak.
function Sparkline({ speeds }: { speeds: [number, number][] }) {
  const geom = useMemo(() => {
    if (!speeds || speeds.length < 2) return null
    const W = 100
    const H = 30
    const ts = speeds.map((s) => s[0])
    const vs = speeds.map((s) => s[1])
    const tMin = Math.min(...ts)
    const tMax = Math.max(...ts)
    const vMax = Math.max(...vs)
    const vMin = Math.min(...vs)
    const span = tMax - tMin || 1
    const range = vMax - vMin || 1
    const pts = speeds.map(([t, v]) => {
      const x = ((t - tMin) / span) * W
      const y = H - ((v - vMin) / range) * (H - 4) - 2
      return [x, y] as const
    })
    const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0]},${p[1]}`).join(' ')
    const area = `${line} L${W},${H} L0,${H} Z`
    const peakIdx = vs.indexOf(vMax)
    return { line, area, peak: pts[peakIdx] }
  }, [speeds])

  if (!geom) return <div className="spark spark--empty" />

  return (
    <div className="spark">
      <svg viewBox="0 0 100 30" preserveAspectRatio="none" className="spark__svg">
        <defs>
          <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#3b82f6" stopOpacity="0.28" />
            <stop offset="1" stopColor="#3b82f6" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={geom.area} fill="url(#sparkFill)" />
        <motion.path
          d={geom.line}
          fill="none"
          stroke="#2563eb"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.4, ease: 'easeInOut', delay: 0.3 }}
        />
        <motion.circle
          cx={geom.peak[0]}
          cy={geom.peak[1]}
          r="2.2"
          fill="#2563eb"
          stroke="#fff"
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 1.6, type: 'spring', stiffness: 400 }}
        />
      </svg>
      <span className="spark__axis">speed over time</span>
    </div>
  )
}
