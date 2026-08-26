import { useEffect, useRef } from 'react'

function CitationCard({ citation, index }) {
  return (
    <div style={styles.citationCard}>
      <div style={styles.citationHeader}>
        <div style={styles.citationBadge}>{index + 1}</div>
        <div style={styles.citationMeta}>
          <span style={styles.citationSource}>{citation.source}</span>
          <span style={styles.citationDetail}>
            chunk {citation.chunk_index} · {(citation.score * 100).toFixed(1)}% match
          </span>
        </div>
      </div>
      {citation.preview && <p style={styles.citationPreview}>{citation.preview}</p>}
    </div>
  )
}

function SkeletonLoader() {
  return (
    <div style={styles.skeleton} aria-label="Preparing response">
      {[100, 85, 92, 70].map((w, i) => (
        <div key={i} style={{ ...styles.skeletonLine, width: `${w}%` }} />
      ))}
    </div>
  )
}

function InfinityBackdrop() {
  return (
    <div style={styles.infinityBackdrop} aria-hidden="true">
      <svg viewBox="0 0 1000 500" preserveAspectRatio="none" style={styles.infinitySvg}>
        <defs>
          <linearGradient id="infinityLeft" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#1b8caf" stopOpacity="0" />
            <stop offset="0.5" stopColor="#32d9ff" stopOpacity="0.75" />
            <stop offset="1" stopColor="#32d9ff" stopOpacity="0.15" />
          </linearGradient>
          <linearGradient id="infinityRight" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#a47cff" stopOpacity="0.15" />
            <stop offset="0.5" stopColor="#b78cff" stopOpacity="0.7" />
            <stop offset="1" stopColor="#7d55c8" stopOpacity="0" />
          </linearGradient>
          <filter id="softGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="7" />
          </filter>
        </defs>
        <path d="M80 250 C190 80 380 80 500 250 C620 420 810 420 920 250" fill="none" stroke="url(#infinityLeft)" strokeWidth="22" opacity="0.22" filter="url(#softGlow)" />
        <path d="M80 250 C190 420 380 420 500 250 C620 80 810 80 920 250" fill="none" stroke="url(#infinityRight)" strokeWidth="22" opacity="0.20" filter="url(#softGlow)" />
        <path d="M80 250 C190 80 380 80 500 250 C620 420 810 420 920 250" fill="none" stroke="url(#infinityLeft)" strokeWidth="1.6" opacity="0.72" />
        <path d="M80 250 C190 420 380 420 500 250 C620 80 810 80 920 250" fill="none" stroke="url(#infinityRight)" strokeWidth="1.6" opacity="0.68" />
        <path d="M95 250 C200 105 370 105 500 250 C630 395 800 395 905 250" fill="none" stroke="#45cfff" strokeWidth="0.7" opacity="0.28" />
        <path d="M95 250 C200 395 370 395 500 250 C630 105 800 105 905 250" fill="none" stroke="#b98bff" strokeWidth="0.7" opacity="0.25" />
      </svg>
    </div>
  )
}

export default function ResponseDisplay({ tokens, citations, statusMessage, isStreaming, error, hasQueried }) {
  const bottomRef = useRef(null)
  const containerRef = useRef(null)

  useEffect(() => {
    if (isStreaming && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [tokens, isStreaming])

  const fullText = tokens.join('')

  if (!hasQueried) {
    return (
      <div style={styles.emptyState}>
        <InfinityBackdrop />
        <div style={styles.emptyContent}>
          <div style={styles.emptyIcon}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
              <circle cx="11" cy="11" r="8" stroke="#22d3ee" strokeWidth="1.5" opacity="0.45" />
              <path d="m21 21-4.35-4.35" stroke="#22d3ee" strokeWidth="1.5" strokeLinecap="round" opacity="0.45" />
              <path d="M11 8v3m0 3h.01" stroke="#22d3ee" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
          <p style={styles.emptyTitle}>Ask anything</p>
          <p style={styles.emptySubtitle}>
            Ask a question about your uploaded documents.<br />Answers include source citations.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.wrapper}>
      {statusMessage && isStreaming && (
        <div style={styles.statusMsg}><span style={styles.statusDot} />{statusMessage}</div>
      )}
      {error && (
        <div style={styles.errorBox} role="alert">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="#ef4444" strokeWidth="1.5" />
            <path d="M12 8v4m0 4h.01" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <span>{error}</span>
        </div>
      )}
      {citations.length > 0 && (
        <div style={styles.citationsSection}>
          <p style={styles.citationsLabel}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" stroke="#f59e0b" strokeWidth="1.5" />
            </svg>
            Sources
          </p>
          <div style={styles.citationsGrid}>
            {citations.map((c, i) => <CitationCard key={`${c.source}-${c.chunk_index}`} citation={c} index={i} />)}
          </div>
        </div>
      )}
      {(fullText || isStreaming) && (
        <div style={styles.responseSection}>
          <p style={styles.responseLabel}>Response</p>
          <div ref={containerRef} style={styles.responseBody}>
            {fullText ? (
              <div style={styles.responseText}>
                <FormattedText text={fullText} />
                {isStreaming && <span style={styles.cursor} />}
              </div>
            ) : isStreaming ? <SkeletonLoader /> : null}
            <div ref={bottomRef} />
          </div>
        </div>
      )}
    </div>
  )
}

function FormattedText({ text }) {
  const lines = text.split('\n')
  return <>{lines.map((line, li) => <span key={li}><InlineFormatted text={line} />{li < lines.length - 1 && <br />}</span>)}</>
}

function InlineFormatted({ text }) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g)
  return <>{parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={i} style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{part.slice(2, -2)}</strong>
    if (part.startsWith('`') && part.endsWith('`')) return <code key={i} style={styles.inlineCode}>{part.slice(1, -1)}</code>
    return <span key={i}>{part}</span>
  })}</>
}

const styles = {
  wrapper: { display: 'flex', flexDirection: 'column', gap: '20px', height: '100%', overflowY: 'auto', padding: '4px 2px' },
  statusMsg: { display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: 'rgba(34,211,238,.05)', border: '1px solid rgba(34,211,238,.15)', borderRadius: 'var(--radius)', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--cyan)' },
  statusDot: { width: '6px', height: '6px', borderRadius: '50%', background: 'var(--cyan)', display: 'inline-block', flexShrink: 0 },
  errorBox: { display: 'flex', alignItems: 'flex-start', gap: '8px', padding: '10px 14px', background: 'var(--red-dim)', border: '1px solid rgba(239,68,68,.3)', borderRadius: 'var(--radius)', fontFamily: 'var(--font-mono)', fontSize: '12px', lineHeight: 1.5, color: 'var(--red)', overflowWrap: 'anywhere' },
  citationsSection: { display: 'flex', flexDirection: 'column', gap: '10px' },
  citationsLabel: { display: 'flex', alignItems: 'center', gap: '6px', fontFamily: 'var(--font-display)', fontSize: '11px', fontWeight: 600, color: 'var(--amber)', textTransform: 'uppercase', letterSpacing: '.08em' },
  citationsGrid: { display: 'flex', flexDirection: 'column', gap: '8px' },
  citationCard: { background: 'var(--bg-card)', border: '1px solid var(--border)', borderLeft: '3px solid var(--amber)', borderRadius: 'var(--radius)', padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: '6px' },
  citationHeader: { display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 },
  citationBadge: { width: '20px', height: '20px', borderRadius: '50%', background: 'var(--amber-dim)', border: '1px solid var(--amber)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-mono)', fontSize: '10px', fontWeight: 600, color: 'var(--amber)', flexShrink: 0 },
  citationMeta: { display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 },
  citationSource: { fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-primary)', fontWeight: 500, overflowWrap: 'anywhere' },
  citationDetail: { fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)' },
  citationPreview: { fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.6, fontStyle: 'italic', paddingLeft: '30px', borderLeft: '1px solid var(--border)', marginLeft: '10px', overflowWrap: 'anywhere' },
  responseSection: { display: 'flex', flexDirection: 'column', gap: '10px', flex: 1, minWidth: 0 },
  responseLabel: { fontFamily: 'var(--font-display)', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.08em' },
  responseBody: { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px', minHeight: '80px', overflowWrap: 'anywhere' },
  responseText: { fontFamily: 'var(--font-body)', fontSize: '14px', lineHeight: 1.75, color: 'var(--text-primary)' },
  inlineCode: { fontFamily: 'var(--font-mono)', fontSize: '12px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '4px', padding: '1px 5px', color: 'var(--cyan)' },
  cursor: { display: 'inline-block', width: '2px', height: '14px', background: 'var(--cyan)', marginLeft: '2px', verticalAlign: 'text-bottom' },
  skeleton: { display: 'flex', flexDirection: 'column', gap: '10px', padding: '4px 0' },
  skeletonLine: { height: '14px', borderRadius: '4px', background: 'var(--bg-elevated)', opacity: .8 },
  emptyState: { position: 'relative', flex: 1, minHeight: '420px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderRadius: 'inherit', background: 'radial-gradient(circle at 50% 50%, rgba(15,27,42,.38), transparent 62%)' },
  emptyContent: { position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', padding: '40px', textAlign: 'center', marginTop: '-4px' },
  emptyIcon: { width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(8,18,31,.82)', border: '1px solid rgba(34,211,238,.22)', boxShadow: '0 0 28px rgba(34,211,238,.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' },
  emptySubtitle: { fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--text-muted)', maxWidth: '380px', lineHeight: 1.6 },
  infinityBackdrop: { position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none', opacity: .92 },
  infinitySvg: { width: '100%', height: '100%', display: 'block' },
}
