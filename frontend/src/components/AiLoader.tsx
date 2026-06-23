import './ai-loader.css'

const WORD = 'Measuring'

// Glowing orbital loader with letters that ripple in sequence.
// Adapted from the "Generating" loader, retinted to Velocity's blue palette.
export default function AiLoader() {
  return (
    <div className="loader-wrapper" aria-label="Measuring" role="status">
      {WORD.split('').map((ch, i) => (
        <span
          className="loader-letter"
          style={{ animationDelay: `${i * 0.1}s` }}
          key={i}
        >
          {ch}
        </span>
      ))}
      <div className="loader" />
    </div>
  )
}
