import { ConnectionState } from '../hooks/useWebSocket'

const STATUS_CONFIG = {
  [ConnectionState.CONNECTED]:    { label: 'Connected',    color: '#10b981', pulse: true  },
  [ConnectionState.CONNECTING]:   { label: 'Connecting…',  color: '#f59e0b', pulse: true  },
  [ConnectionState.DISCONNECTED]: { label: 'Disconnected', color: '#ef4444', pulse: false },
  [ConnectionState.ERROR]:        { label: 'Error',        color: '#ef4444', pulse: false },
}

export default function StatusBar({ connectionState, ttft, isStreaming }) {
  const { label, color, pulse } = STATUS_CONFIG[connectionState] ?? STATUS_CONFIG[ConnectionState.DISCONNECTED]

  return (
    <div className="ui-section header-shell" style={styles.bar}>
      <div style={styles.brand}>
        <span style={styles.infinity} aria-hidden="true">∞</span>
        <div style={styles.brandText}>
          <span style={styles.title}>RAG Intelligence</span>
          <span style={styles.subtitle}>Retrieval · Reasoning · Context</span>
        </div>
      </div>

      <div style={styles.metrics}>
        {ttft !== null && (
          <div style={styles.metric}>
            <span style={styles.metricLabel}>TTFT</span>
            <span style={{ ...styles.metricValue, color: ttft < 500 ? '#10b981' : '#f59e0b' }}>
              {ttft}ms
            </span>
          </div>
        )}

        {isStreaming && (
          <div style={styles.streamingBadge}>
            <span style={styles.streamingDot} />
            Streaming
          </div>
        )}

        <div style={styles.connection}>
          <span
            style={{
              ...styles.dot,
              backgroundColor: color,
              boxShadow: pulse ? `0 0 8px ${color}` : 'none',
              animation: pulse ? 'pulse-glow 2s infinite' : 'none',
            }}
          />
          <span style={{ ...styles.connLabel, color }}>{label}</span>
        </div>
      </div>
    </div>
  )
}

const styles = {
  bar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 24px',
    minHeight: '58px',
    borderBottom: '1px solid var(--border)',
    background: 'var(--bg-surface)',
    flexShrink: 0,
  },
  brand: {
    display: 'flex',
    alignItems: 'center',
    gap: '11px',
    minWidth: 0,
  },
  infinity: {
    fontFamily: 'Georgia, serif',
    fontSize: '30px',
    lineHeight: 1,
    fontWeight: 400,
    color: 'var(--cyan)',
    textShadow: '0 0 16px rgba(34,211,238,0.16)',
    flexShrink: 0,
  },
  brandText: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1px',
    minWidth: 0,
  },
  title: {
    fontFamily: 'var(--font-display)',
    fontSize: '16px',
    fontWeight: 700,
    color: 'var(--text-primary)',
    letterSpacing: '-0.01em',
  },
  subtitle: {
    fontFamily: 'var(--font-mono)',
    fontSize: '8px',
    color: 'var(--text-muted)',
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
  },
  metrics: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
    flexShrink: 0,
  },
  metric: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  metricLabel: {
    fontFamily: 'var(--font-mono)',
    fontSize: '10px',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
  },
  metricValue: {
    fontFamily: 'var(--font-mono)',
    fontSize: '12px',
    fontWeight: 500,
  },
  streamingBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '3px 10px',
    background: 'rgba(34, 211, 238, 0.08)',
    border: '1px solid rgba(34, 211, 238, 0.2)',
    borderRadius: '20px',
    fontFamily: 'var(--font-mono)',
    fontSize: '11px',
    color: 'var(--cyan)',
  },
  streamingDot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    backgroundColor: 'var(--cyan)',
    animation: 'pulse-glow 1s infinite',
    display: 'inline-block',
  },
  connection: {
    display: 'flex',
    alignItems: 'center',
    gap: '7px',
  },
  dot: {
    width: '7px',
    height: '7px',
    borderRadius: '50%',
    display: 'inline-block',
  },
  connLabel: {
    fontFamily: 'var(--font-mono)',
    fontSize: '11px',
    fontWeight: 500,
  },
}
