import { useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { uploadVideo, type UploadResponse } from '../api'
import './screens.css'

export default function UploadScreen({
  onUploaded,
}: {
  onUploaded: (u: UploadResponse) => void
}) {
  const [dragging, setDragging] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File | undefined) {
    if (!file) return
    if (!file.type.startsWith('video/')) {
      setError('That doesn’t look like a video file. Try an .mp4 or .mov.')
      return
    }
    setError(null)
    setFileName(file.name)
    setBusy(true)
    try {
      const res = await uploadVideo(file)
      onUploaded(res)
    } catch (e) {
      setError(
        e instanceof Error
          ? `Upload failed: ${e.message}`
          : 'Upload failed. Is the backend running on :8000?',
      )
      setBusy(false)
      setFileName(null)
    }
  }

  return (
    <section className="screen">
      <div className="screen__head">
        <p className="eyebrow">Step 1 · Upload</p>
        <h1 className="headline">How fast was that strike?</h1>
        <p className="subhead">
          Drop a video of the kick and we’ll track the ball frame-by-frame to
          clock its real-world speed.
        </p>
      </div>

      <motion.div
        className={`dropzone glass ${dragging ? 'dropzone--over' : ''} ${
          busy ? 'dropzone--busy' : ''
        }`}
        onClick={() => !busy && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault()
          if (!busy) setDragging(true)
        }}
        onDragLeave={(e) => {
          e.preventDefault()
          setDragging(false)
        }}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          if (!busy) handleFile(e.dataTransfer.files?.[0])
        }}
        animate={{ scale: dragging ? 1.012 : 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 24 }}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if ((e.key === 'Enter' || e.key === ' ') && !busy)
            inputRef.current?.click()
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept="video/*"
          hidden
          onChange={(e) => handleFile(e.target.files?.[0] ?? undefined)}
        />

        {busy ? (
          <div className="dropzone__busy">
            <span className="spinner" aria-hidden />
            <p className="dropzone__title">Uploading…</p>
            <p className="dropzone__hint tnum">{fileName}</p>
          </div>
        ) : (
          <>
            <motion.div
              className="dropzone__icon"
              aria-hidden
              animate={{ y: dragging ? -6 : 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 18 }}
            >
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 16V4m0 0L7 9m5-5l5 5"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M4 17v1.5A2.5 2.5 0 0 0 6.5 21h11a2.5 2.5 0 0 0 2.5-2.5V17"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </motion.div>
            <p className="dropzone__title">
              {dragging ? 'Drop to upload' : 'Drag & drop your video'}
            </p>
            <p className="dropzone__hint">
              or <span className="link">browse files</span> · MP4, MOV
            </p>
          </>
        )}
      </motion.div>

      {error && (
        <motion.p
          className="errorline"
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {error}
        </motion.p>
      )}
    </section>
  )
}
