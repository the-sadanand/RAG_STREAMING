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
    <div style={styles.bar}>
      {/* Brand */}
      <div style={styles.brand}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M12 2L2 7l10 5 10-5-10-5z" stroke="#22d3ee" strokeWidth="1.5" strokeLinejoin="round"/>
          <path d="M2 17l10 5 10-5" stroke="#22d3ee" strokeWidth="1.5" strokeLinejoin="round"/>
          <path d="M2 12l10 5 10-5" stroke="#a855f7" strokeWidth="1.5" strokeLinejoin="round" opacity="0.6"/>
        </svg>
        <span style={styles.title}>RAG Intelligence</span>
        <span style={styles.version}>v1.0</span>
      </div>

      {/* Metrics */}
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

        {/* Connection */}
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
    height: '52px',
    borderBottom: '1px solid var(--border)',
    background: 'var(--bg-surface)',
    flexShrink: 0,
  },
  brand: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  title: {
    fontFamily: 'var(--font-display)',
    fontSize: '16px',
    fontWeight: 700,
    color: 'var(--text-primary)',
    letterSpacing: '-0.01em',
  },
  version: {
    fontFamily: 'var(--font-mono)',
    fontSize: '10px',
    color: 'var(--text-muted)',
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border)',
    borderRadius: '4px',
    padding: '1px 5px',
  },
  metrics: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
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
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    display: 'inline-block',
  },
  connLabel: {
    fontFamily: 'var(--font-mono)',
    fontSize: '11px',
    fontWeight: 500,
  },
}
