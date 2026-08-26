export default function EnergyBorder({ phase = 0, className = '' }) {
  return (
    <svg
      className={`energy-border ${className}`}
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden="true"
      style={{ '--energy-delay': `${phase}s` }}
    >
      {/* Subtle base border glow */}
      <rect
        className="energy-base"
        x="0.7" y="0.7"
        width="98.6" height="98.6"
        rx="7"
        pathLength="1"
      />
      {/* Wide soft trailing glow */}
      <rect
        className="energy-trail"
        x="0.7" y="0.7"
        width="98.6" height="98.6"
        rx="7"
        pathLength="1"
      />
      {/* Tight leading trail */}
      <rect
        className="energy-trail-tight"
        x="0.7" y="0.7"
        width="98.6" height="98.6"
        rx="7"
        pathLength="1"
      />
      {/* Bright luminous point */}
      <rect
        className="energy-point"
        x="0.7" y="0.7"
        width="98.6" height="98.6"
        rx="7"
        pathLength="1"
      />
    </svg>
  )
}
