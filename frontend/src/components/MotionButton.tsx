import { motion } from 'framer-motion'
import type { ReactNode } from 'react'

type Props = {
  children: ReactNode
  onClick?: () => void
  disabled?: boolean
  variant?: 'primary' | 'ghost'
  type?: 'button' | 'submit'
  className?: string
}

// macOS-style CTA with a spring hover lift. Disabled buttons don't react.
export default function MotionButton({
  children,
  onClick,
  disabled = false,
  variant = 'primary',
  type = 'button',
  className = '',
}: Props) {
  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`btn ${variant === 'ghost' ? 'btn--ghost' : ''} ${className}`}
      whileHover={disabled ? undefined : { y: -2, scale: 1.015 }}
      whileTap={disabled ? undefined : { y: 0, scale: 0.985 }}
      transition={{ type: 'spring', stiffness: 480, damping: 26 }}
    >
      {children}
    </motion.button>
  )
}
