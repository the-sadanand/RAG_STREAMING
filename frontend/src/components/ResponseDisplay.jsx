import { useEffect, useRef } from 'react'

function CitationCard({ citation, index }) {
  return (
    <div style={{ ...styles.citationCard, animation: 'slide-in-up 0.25s ease forwards' }}>
      <div style={styles.citationHeader}>
        <div style={styles.citationBadge}>{index + 1}</div>
        <div style={styles.citationMeta}>
          <span style={styles.citationSource}>{citation.source}</span>
          <span style={styles.citationDetail}>
            chunk {citation.chunk_index} · {(citation.score * 100).toFixed(1)}% match
          </span>
        </div>
      </div>
      {citation.preview && (
        <p style={styles.citationPreview}>{citation.preview}</p>
      )}
    </div>
  )
}

function SkeletonLoader() {
  return (
    <div style={styles.skeleton}>
      {[100, 85, 92, 70].map((w, i) => (
        <div
          key={i}
          style={{
            ...styles.skeletonLine,
            width: `${w}%`,
            animationDelay: `${i * 0.1}s`,
          }}
        />
      ))}
    </div>
  )
}

export default function ResponseDisplay({ tokens, citations, statusMessage, isStreaming, error, hasQueried }) {
  const bottomRef = useRef(null)
  const containerRef = useRef(null)

  // Auto-scroll to bottom during streaming
  useEffect(() => {
    if (isStreaming && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [tokens, isStreaming])

  const fullText = tokens.join('')

  if (!hasQueried) {
    return (
      <div style={styles.emptyState}>
        <div style={styles.emptyIcon}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
            <circle cx="11" cy="11" r="8" stroke="#22d3ee" strokeWidth="1.5" opacity="0.4"/>
            <path d="m21 21-4.35-4.35" stroke="#22d3ee" strokeWidth="1.5" strokeLinecap="round" opacity="0.4"/>
            <path d="M11 8v3m0 3h.01" stroke="#22d3ee" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </div>
        <p style={styles.emptyTitle}>Ask anything</p>
        <p style={styles.emptySubtitle}>
          Type a question below. Responses will stream token-by-token with source citations.
        </p>
      </div>
    )
  }

  return (
    <div style={styles.wrapper}>
      {/* Status message */}
      {statusMessage && isStreaming && (
        <div style={styles.statusMsg}>
          <span style={styles.statusDot} />
          {statusMessage}
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={styles.errorBox}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="#ef4444" strokeWidth="1.5"/>
            <path d="M12 8v4m0 4h.01" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          {error}
        </div>
      )}

      {/* Citations */}
      {citations.length > 0 && (
        <div style={styles.citationsSection}>
          <p style={styles.citationsLabel}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" stroke="#f59e0b" strokeWidth="1.5"/>
            </svg>
            Sources
          </p>
          <div style={styles.citationsGrid}>
            {citations.map((c, i) => (
              <CitationCard key={`${c.source}-${c.chunk_index}`} citation={c} index={i} />
            ))}
          </div>
        </div>
      )}

      {/* Response text */}
      {(fullText || isStreaming) && (
        <div style={styles.responseSection}>
          <p style={styles.responseLabel}>Response</p>
          <div ref={containerRef} style={styles.responseBody}>
            {fullText ? (
              <div style={styles.responseText}>
                <FormattedText text={fullText} />
                {isStreaming && <span style={styles.cursor} />}
              </div>
            ) : isStreaming ? (
              <SkeletonLoader />
            ) : null}
            <div ref={bottomRef} />
          </div>
        </div>
      )}
    </div>
  )
}

/** Minimal Markdown-like renderer for bold, code, and line breaks */
function FormattedText({ text }) {
  const lines = text.split('\n')
  return (
    <>
      {lines.map((line, li) => (
        <span key={li}>
          <InlineFormatted text={line} />
          {li < lines.length - 1 && <br />}
        </span>
      ))}
    </>
  )
}

function InlineFormatted({ text }) {
  // Split on **bold** and `code`
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g)
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={i} style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{part.slice(2, -2)}</strong>
        }
        if (part.startsWith('`') && part.endsWith('`')) {
          return <code key={i} style={styles.inlineCode}>{part.slice(1, -1)}</code>
        }
        return <span key={i}>{part}</span>
      })}
    </>
  )
}

const styles = {
  wrapper: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    height: '100%',
    overflowY: 'auto',
    padding: '4px 2px',
  },
  statusMsg: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 12px',
    background: 'rgba(34, 211, 238, 0.05)',
    border: '1px solid rgba(34, 211, 238, 0.15)',
    borderRadius: 'var(--radius)',
    fontFamily: 'var(--font-mono)',
    fontSize: '11px',
    color: 'var(--cyan)',
    animation: 'fade-in 0.2s ease',
  },
  statusDot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    background: 'var(--cyan)',
    display: 'inline-block',
    animation: 'pulse-glow 1.5s infinite',
    flexShrink: 0,
  },
  errorBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 14px',
    background: 'var(--red-dim)',
    border: '1px solid rgba(239,68,68,0.3)',
    borderRadius: 'var(--radius)',
    fontFamily: 'var(--font-mono)',
    fontSize: '12px',
    color: 'var(--red)',
  },
  citationsSection: { display: 'flex', flexDirection: 'column', gap: '10px' },
  citationsLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontFamily: 'var(--font-display)',
    fontSize: '11px',
    fontWeight: 600,
    color: 'var(--amber)',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
  },
  citationsGrid: { display: 'flex', flexDirection: 'column', gap: '8px' },
  citationCard: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderLeft: '3px solid var(--amber)',
    borderRadius: 'var(--radius)',
    padding: '10px 14px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  citationHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  citationBadge: {
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    background: 'var(--amber-dim)',
    border: '1px solid var(--amber)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'var(--font-mono)',
    fontSize: '10px',
    fontWeight: 600,
    color: 'var(--amber)',
    flexShrink: 0,
  },
  citationMeta: { display: 'flex', flexDirection: 'column', gap: '2px' },
  citationSource: {
    fontFamily: 'var(--font-mono)',
    fontSize: '12px',
    color: 'var(--text-primary)',
    fontWeight: 500,
  },
  citationDetail: {
    fontFamily: 'var(--font-mono)',
    fontSize: '10px',
    color: 'var(--text-muted)',
  },
  citationPreview: {
    fontFamily: 'var(--font-body)',
    fontSize: '12px',
    color: 'var(--text-secondary)',
    lineHeight: 1.6,
    fontStyle: 'italic',
    paddingLeft: '30px',
    borderLeft: '1px solid var(--border)',
    marginLeft: '10px',
  },
  responseSection: { display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 },
  responseLabel: {
    fontFamily: 'var(--font-display)',
    fontSize: '11px',
    fontWeight: 600,
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
  },
  responseBody: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-lg)',
    padding: '20px',
    minHeight: '80px',
  },
  responseText: {
    fontFamily: 'var(--font-body)',
    fontSize: '14px',
    lineHeight: 1.75,
    color: 'var(--text-primary)',
  },
  inlineCode: {
    fontFamily: 'var(--font-mono)',
    fontSize: '12px',
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border)',
    borderRadius: '4px',
    padding: '1px 5px',
    color: 'var(--cyan)',
  },
  cursor: {
    display: 'inline-block',
    width: '2px',
    height: '14px',
    background: 'var(--cyan)',
    marginLeft: '2px',
    verticalAlign: 'text-bottom',
    animation: 'blink-cursor 1s step-end infinite',
  },
  skeleton: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    padding: '4px 0',
  },
  skeletonLine: {
    height: '14px',
    borderRadius: '4px',
    background: 'linear-gradient(90deg, var(--bg-elevated) 25%, var(--border) 50%, var(--bg-elevated) 75%)',
    backgroundSize: '200% 100%',
    animation: 'shimmer 1.5s infinite',
  },
  emptyState: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    padding: '40px',
    textAlign: 'center',
  },
  emptyIcon: {
    width: '64px',
    height: '64px',
    borderRadius: '50%',
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontFamily: 'var(--font-display)',
    fontSize: '18px',
    fontWeight: 700,
    color: 'var(--text-primary)',
  },
  emptySubtitle: {
    fontFamily: 'var(--font-body)',
    fontSize: '13px',
    color: 'var(--text-muted)',
    maxWidth: '300px',
    lineHeight: 1.6,
  },
}
