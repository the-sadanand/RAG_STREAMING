export default function InfinityAmbient() {
  return (
    <div className="infinity-ambient" aria-hidden="true">
      <svg className="infinity-svg" viewBox="0 0 1000 520" preserveAspectRatio="none">
        <defs>
          <linearGradient id="infinityGradient" x1="0%" y1="50%" x2="100%" y2="50%">
            <stop offset="0%" stopColor="#22d3ee" />
            <stop offset="46%" stopColor="#38bdf8" />
            <stop offset="50%" stopColor="#8b5cf6" />
            <stop offset="100%" stopColor="#a78bfa" />
          </linearGradient>
          <filter id="infinityBlurSmall" x="-30%" y="-50%" width="160%" height="200%">
            <feGaussianBlur stdDeviation="5" />
          </filter>
          <filter id="infinityBlurLarge" x="-30%" y="-100%" width="160%" height="300%">
            <feGaussianBlur stdDeviation="22" />
          </filter>
        </defs>

        <path className="infinity-glow-large" d="M 40 260 C 165 35, 335 35, 500 260 C 665 485, 835 485, 960 260 C 835 35, 665 35, 500 260 C 335 485, 165 485, 40 260" />
        <path className="infinity-glow-medium" d="M 40 260 C 165 35, 335 35, 500 260 C 665 485, 835 485, 960 260 C 835 35, 665 35, 500 260 C 335 485, 165 485, 40 260" />
        <path className="infinity-trail infinity-trail-a" d="M 40 260 C 165 35, 335 35, 500 260 C 665 485, 835 485, 960 260 C 835 35, 665 35, 500 260 C 335 485, 165 485, 40 260" />
        <path className="infinity-trail infinity-trail-b" d="M 40 260 C 165 35, 335 35, 500 260 C 665 485, 835 485, 960 260 C 835 35, 665 35, 500 260 C 335 485, 165 485, 40 260" />
        <path className="infinity-core" d="M 40 260 C 165 35, 335 35, 500 260 C 665 485, 835 485, 960 260 C 835 35, 665 35, 500 260 C 335 485, 165 485, 40 260" />
      </svg>
      <div className="infinity-readability-mask" />
    </div>
  )
}
