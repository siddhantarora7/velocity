import { motion } from 'framer-motion'
import type { Variants } from 'framer-motion'
import type { CSSProperties } from 'react'
import './shimmer.css'

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1]

// Per-character shimmer. Each letter carries its own blue glimmer offset by a
// small delay so a wave flows across the word, and the characters stagger in and
// out — drop this inside an <AnimatePresence mode="wait"> keyed by the text so
// one message fades away char-by-char before the next builds up. Tuned for light
// backgrounds: muted-ink base, brand-blue highlight.
const container: Variants = {
  initial: {},
  animate: { transition: { staggerChildren: 0.028 } },
  exit: { transition: { staggerChildren: 0.018 } },
}

const charVariants: Variants = {
  initial: { opacity: 0, filter: 'blur(5px)', y: 4 },
  animate: {
    opacity: 1,
    filter: 'blur(0px)',
    y: 0,
    transition: { duration: 0.34, ease: EASE },
  },
  exit: {
    opacity: 0,
    filter: 'blur(5px)',
    y: -4,
    transition: { duration: 0.26, ease: 'easeIn' },
  },
}

export default function Shimmer({
  children,
  className = '',
  duration = 2.4,
}: {
  children: string
  className?: string
  duration?: number
}) {
  const chars = Array.from(children)
  return (
    <motion.span
      className={`shimmer ${className}`}
      variants={container}
      initial="initial"
      animate="animate"
      exit="exit"
      aria-label={children}
    >
      {chars.map((ch, i) => (
        <motion.span
          key={i}
          className="shimmer__char"
          variants={charVariants}
          aria-hidden
          style={
            {
              '--shimmer-duration': `${duration}s`,
              animationDelay: `${i * 0.07}s`,
            } as CSSProperties
          }
        >
          {ch === ' ' ? ' ' : ch}
        </motion.span>
      ))}
    </motion.span>
  )
}
