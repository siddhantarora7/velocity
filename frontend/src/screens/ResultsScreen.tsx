import { useMemo } from 'react'
import { motion } from 'framer-motion'
import type { FlowState } from '../App'
import TextureButton from '../components/TextureButton'
import CountUp from '../components/CountUp'
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
            {result.kick_found ? (
              <>
                <CountUp value={fastest} decimals={1} className="hero__number tnum" />
                <span className="hero__unit">km/h</span>
              </>
            ) : (
              <span className="hero__number">N.A.</span>
            )}
          </div>
          <Sparkline speeds={result.speeds} />

          <div className="hero__stats">
            <Stat
              label="Launch speed"
              value={
                result.kick_found && launch != null
                  ? `${launch.toFixed(1)}`
                  : 'N.A.'
              }
              unit={
                result.kick_found && launch != null ? 'km/h' : undefined
              }
              hint={
                !result.kick_found
                  ? 'kick not detected'
                  : launch != null
                    ? 'speed off the boot'
                    : 'not enough trajectory'
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
              value={result.kick_found ? (fastest / 1.609).toFixed(1) : 'N.A.'}
              unit={result.kick_found ? 'mph' : undefined}
              hint="for the imperial crowd"
            />
          </div>
        </div>
      </div>

      <div className="results__footer">
        <TextureButton variant="secondary" onClick={onReset}>
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
        </TextureButton>
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
          <clipPath id="sparkReveal">
            {/* A left-to-right wipe. Animating a clip width avoids the
                pathLength/dash math, which renders wrong under a distorted
                (preserveAspectRatio="none") viewBox. */}
            <motion.rect
              x="0"
              y="0"
              height="30"
              initial={{ width: 0 }}
              animate={{ width: 100 }}
              transition={{ duration: 1.3, ease: 'easeInOut', delay: 0.3 }}
            />
          </clipPath>
        </defs>
        <g clipPath="url(#sparkReveal)">
          {/* The line traces the exact top edge of the fill, so it always
              covers it — area and stroke share the same point path. */}
          <path d={geom.area} fill="url(#sparkFill)" />
          <path
            d={geom.line}
            fill="none"
            stroke="#2563eb"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        </g>
        <motion.circle
          cx={geom.peak[0]}
          cy={geom.peak[1]}
          r="2.4"
          fill="#2563eb"
          stroke="#fff"
          strokeWidth="1.2"
          vectorEffect="non-scaling-stroke"
          style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 1.5, type: 'spring', stiffness: 400 }}
        />
      </svg>
      <span className="spark__axis">speed over time</span>
    </div>
  )
}
