export default function EnergyBorder({ phase = 0, className = '' }) {
  return (
    <svg
      className={`energy-border ${className}`}
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden="true"
      style={{ '--energy-delay': `${phase}s` }}
    >
      <rect className="energy-trail" x="0.7" y="0.7" width="98.6" height="98.6" rx="7" pathLength="1" />
      <rect className="energy-point" x="0.7" y="0.7" width="98.6" height="98.6" rx="7" pathLength="1" />
    </svg>
  )
}
