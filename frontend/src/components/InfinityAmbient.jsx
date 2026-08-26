export default function InfinityAmbient() {
  // Lemniscate path: M 40 260 C 165 35, 335 35, 500 260 C 665 485, 835 485, 960 260 C 835 35, 665 35, 500 260 C 335 485, 165 485, 40 260
  const path = "M 40 260 C 165 35, 335 35, 500 260 C 665 485, 835 485, 960 260 C 835 35, 665 35, 500 260 C 335 485, 165 485, 40 260"

  return (
    <div className="infinity-ambient" aria-hidden="true">
      <svg className="infinity-svg" viewBox="0 0 1000 520" preserveAspectRatio="none">
        <defs>
          {/* Primary cyan→violet gradient (left→right) */}
          <linearGradient id="infGradMain" x1="0%" y1="50%" x2="100%" y2="50%">
            <stop offset="0%"   stopColor="#22d3ee" stopOpacity="1" />
            <stop offset="44%"  stopColor="#38bdf8" stopOpacity="1" />
            <stop offset="50%"  stopColor="#a78bfa" stopOpacity="1" />
            <stop offset="100%" stopColor="#8b5cf6" stopOpacity="1" />
          </linearGradient>

          {/* Violet-only right-lobe gradient */}
          <linearGradient id="infGradRight" x1="50%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%"   stopColor="#c4b5fd" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#6d28d9"  stopOpacity="0.4" />
          </linearGradient>

          {/* Cyan-only left-lobe gradient */}
          <linearGradient id="infGradLeft" x1="0%" y1="0%" x2="50%" y2="100%">
            <stop offset="0%"   stopColor="#67e8f9" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#0e7490"  stopOpacity="0.4" />
          </linearGradient>

          {/* Atmospheric mega-blur */}
          <filter id="infBlurXL" x="-40%" y="-80%" width="180%" height="260%">
            <feGaussianBlur stdDeviation="38" />
          </filter>
          {/* Medium glow blur */}
          <filter id="infBlurMD" x="-30%" y="-50%" width="160%" height="200%">
            <feGaussianBlur stdDeviation="14" />
          </filter>
          {/* Small crisp glow */}
          <filter id="infBlurSM" x="-20%" y="-40%" width="140%" height="180%">
            <feGaussianBlur stdDeviation="5" />
          </filter>
          {/* Hairline sharpener */}
          <filter id="infBlurXS" x="-10%" y="-20%" width="120%" height="140%">
            <feGaussianBlur stdDeviation="1.8" />
          </filter>
        </defs>

        {/* ── Layer 1: Mega atmospheric diffuse glow ───────────────────── */}
        <path
          d={path}
          fill="none"
          stroke="url(#infGradMain)"
          strokeWidth="90"
          opacity="0.045"
          filter="url(#infBlurXL)"
          className="inf-breath"
        />

        {/* ── Layer 2: Large diffuse body glow ─────────────────────────── */}
        <path
          d={path}
          fill="none"
          stroke="url(#infGradMain)"
          strokeWidth="38"
          opacity="0.09"
          filter="url(#infBlurMD)"
          className="inf-breath-slow"
        />

        {/* ── Layer 3: Medium glow ──────────────────────────────────────── */}
        <path
          d={path}
          fill="none"
          stroke="url(#infGradMain)"
          strokeWidth="16"
          opacity="0.14"
          filter="url(#infBlurSM)"
        />

        {/* ── Layer 4: Fine glow halo ───────────────────────────────────── */}
        <path
          d={path}
          fill="none"
          stroke="url(#infGradMain)"
          strokeWidth="5"
          opacity="0.22"
          filter="url(#infBlurXS)"
        />

        {/* ── Layer 5: Core line (main visible strand) ──────────────────── */}
        <path
          d={path}
          fill="none"
          stroke="url(#infGradMain)"
          strokeWidth="1.4"
          opacity="var(--infinity-opacity)"
          strokeLinecap="round"
        />

        {/* ── Layer 6: Inner bright filament ───────────────────────────── */}
        <path
          d={path}
          fill="none"
          stroke="url(#infGradMain)"
          strokeWidth="0.6"
          opacity="0.28"
          strokeLinecap="round"
        />

        {/* ── Layer 7: Parallel offset strand (inner, tighter) ─────────── */}
        <path
          d="M 60 260 C 175 55, 345 55, 500 260 C 655 465, 825 465, 940 260 C 825 55, 655 55, 500 260 C 345 465, 175 465, 60 260"
          fill="none"
          stroke="url(#infGradMain)"
          strokeWidth="1.0"
          opacity="0.10"
          strokeLinecap="round"
        />

        {/* ── Layer 8: Parallel offset strand (outer, wider) ───────────── */}
        <path
          d="M 20 260 C 155 15, 325 15, 500 260 C 675 505, 845 505, 980 260 C 845 15, 675 15, 500 260 C 325 505, 155 505, 20 260"
          fill="none"
          stroke="url(#infGradMain)"
          strokeWidth="0.8"
          opacity="0.07"
          strokeLinecap="round"
        />

        {/* ── Layer 9: Flowing energy trails ───────────────────────────── */}
        <path
          d={path}
          fill="none"
          stroke="url(#infGradMain)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray="0.055 0.945"
          strokeDashoffset="0"
          pathLength="1"
          opacity="0.55"
          filter="url(#infBlurXS)"
          className="inf-flow-a"
        />
        <path
          d={path}
          fill="none"
          stroke="url(#infGradMain)"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeDasharray="0.028 0.972"
          strokeDashoffset="0"
          pathLength="1"
          opacity="0.42"
          className="inf-flow-b"
        />
        <path
          d={path}
          fill="none"
          stroke="url(#infGradLeft)"
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeDasharray="0.018 0.982"
          strokeDashoffset="0"
          pathLength="1"
          opacity="0.35"
          className="inf-flow-c"
        />
        <path
          d={path}
          fill="none"
          stroke="url(#infGradRight)"
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeDasharray="0.018 0.982"
          strokeDashoffset="0"
          pathLength="1"
          opacity="0.35"
          className="inf-flow-d"
        />

        {/* ── Layer 10: Micro particle dust ────────────────────────────── */}
        <path
          d={path}
          fill="none"
          stroke="#22d3ee"
          strokeWidth="0.8"
          strokeLinecap="round"
          strokeDasharray="0.004 0.006 0.002 0.988"
          strokeDashoffset="0"
          pathLength="1"
          opacity="0.08"
          className="inf-dust-a"
        />
        <path
          d={path}
          fill="none"
          stroke="#a78bfa"
          strokeWidth="0.8"
          strokeLinecap="round"
          strokeDasharray="0.003 0.007 0.003 0.987"
          strokeDashoffset="0"
          pathLength="1"
          opacity="0.08"
          className="inf-dust-b"
        />
      </svg>

      {/* Readability mask — darkens the center so text stays legible */}
      <div className="infinity-readability-mask" />
    </div>
  )
}
