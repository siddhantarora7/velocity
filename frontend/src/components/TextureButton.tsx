import { motion } from 'framer-motion'
import type { ReactNode } from 'react'
import './texture-button.css'

type Variant = 'accent' | 'secondary' | 'minimal'
type Size = 'sm' | 'md' | 'lg'

type Props = {
  children: ReactNode
  onClick?: () => void
  disabled?: boolean
  variant?: Variant
  size?: Size
  type?: 'button' | 'submit'
  className?: string
}

// Layered "texture" button: an outer gradient bezel wraps an inner glossy fill,
// giving the doubled-edge, tactile look. Spring-lifts on hover via Framer Motion.
export default function TextureButton({
  children,
  onClick,
  disabled = false,
  variant = 'accent',
  size = 'md',
  type = 'button',
  className = '',
}: Props) {
  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`tex tex--${variant} tex--${size} ${className}`}
      whileHover={disabled ? undefined : { y: -2, scale: 1.015 }}
      whileTap={disabled ? undefined : { y: 0, scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 480, damping: 26 }}
    >
      <span className="tex__inner">{children}</span>
    </motion.button>
  )
}
