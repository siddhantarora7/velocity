import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { listShots, type Shot } from '../api'
import { useAuth } from '../auth'
import CountUp from '../components/CountUp'
import TextureButton from '../components/TextureButton'
import './screens.css'

export default function HistoryScreen({
  onRequireLogin,
}: {
  onRequireLogin: () => void
}) {
  const { isAuthed, expired } = useAuth()
  const [shots, setShots] = useState<Shot[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isAuthed) return
    let alive = true
    setShots(null)
    setError(null)
    listShots()
      .then((data) => alive && setShots(data))
      .catch((e) => alive && setError(e instanceof Error ? e.message : 'Could not load history.'))
    return () => {
      alive = false
    }
  }, [isAuthed])

  if (!isAuthed) {
    return (
      <section className="screen">
        <div className="screen__head">
          <p className="eyebrow">History</p>
          <h1 className="headline">Log in to see your shots</h1>
          <p className="subhead">
            {expired
              ? 'Your session expired — log in again to see your shots.'
              : 'Your analyzed strikes are saved to your account so you can track them over time.'}
          </p>
        </div>
        <div className="hist-empty glass">
          <TextureButton onClick={onRequireLogin}>Log in</TextureButton>
        </div>
      </section>
    )
  }

  return (
    <section className="screen screen--wide">
      <div className="screen__head">
        <p className="eyebrow">History</p>
        <h1 className="headline">Your shots</h1>
      </div>

      {error && <p className="errorline">{error}</p>}

      {!error && shots === null && (
        <div className="hist-empty glass">
          <p className="subhead">Loading your history…</p>
        </div>
      )}

      {shots && shots.length === 0 && (
        <div className="hist-empty glass">
          <p className="subhead">No shots yet — analyze your first strike.</p>
        </div>
      )}

      {shots && shots.length > 0 && (
        <>
          <Stats shots={shots} />
          <div className="shotlist">
            {shots.map((s, i) => (
              <ShotRow key={s.id} shot={s} index={i} />
            ))}
          </div>
        </>
      )}
    </section>
  )
}

function Stats({ shots }: { shots: Shot[] }) {
  const { best, total } = useMemo(() => computeStats(shots), [shots])
  return (
    <div className="histstats">
      <div className="glass histstat">
        <p className="histstat__label">Personal best</p>
        <p className="histstat__value">
          <CountUp value={best} decimals={1} className="tnum" />
          <span className="histstat__unit">km/h</span>
        </p>
      </div>
      <div className="glass histstat">
        <p className="histstat__label">Total shots</p>
        <p className="histstat__value">
          <CountUp value={total} className="tnum" />
        </p>
      </div>
    </div>
  )
}

function ShotRow({ shot, index }: { shot: Shot; index: number }) {
  return (
    <motion.div
      className="glass shot"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -3 }}
      transition={{ duration: 0.35, delay: Math.min(index * 0.04, 0.3), ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="shot__speed tnum">
        {shot.fastest_kmh.toFixed(1)}
        <span className="shot__unit">km/h</span>
      </div>
      <div className="shot__meta">
        <span className="shot__launch">
          {shot.launch_kmh != null ? `${shot.launch_kmh.toFixed(1)} km/h launch` : 'no launch read'}
        </span>
        <span className={`shot__badge ${shot.kick_found ? 'shot__badge--on' : ''}`}>
          {shot.kick_found ? 'Kick detected' : 'Full-clip peak'}
        </span>
      </div>
      <div className="shot__time">{timeAgo(shot.created_at)}</div>
    </motion.div>
  )
}

function computeStats(shots: Shot[]): { best: number; total: number } {
  const best = shots.reduce((m, s) => Math.max(m, s.fastest_kmh), 0)
  return { best, total: shots.length }
}

// Backend timestamps are naive UTC, so treat a tz-less string as UTC.
function timeAgo(iso: string): string {
  const utc = /([zZ]|[+-]\d\d:?\d\d)$/.test(iso) ? iso : `${iso}Z`
  const then = new Date(utc).getTime()
  const s = Math.max(0, (Date.now() - then) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`
  return new Date(utc).toLocaleDateString()
}
