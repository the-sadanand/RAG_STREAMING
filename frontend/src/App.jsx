import { useCallback, useState } from 'react'
import DocumentUpload from './components/DocumentUpload'
import QueryPanel from './components/QueryPanel'
import ResponseDisplay from './components/ResponseDisplay'
import StatusBar from './components/StatusBar'
import { useWebSocket } from './hooks/useWebSocket'

export default function App() {
  const [tokens, setTokens] = useState([])
  const [citations, setCitations] = useState([])
  const [statusMessage, setStatusMessage] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState(null)
  const [hasQueried, setHasQueried] = useState(false)
  const [queryHistory, setQueryHistory] = useState([])
  const [activeQuery, setActiveQuery] = useState('')

  const handleToken   = useCallback((t) => setTokens(prev => [...prev, t]), [])
  const handleCitation = useCallback((c) => setCitations(prev => {
    const key = `${c.source}-${c.chunk_index}`
    if (prev.some(p => `${p.source}-${p.chunk_index}` === key)) return prev
    return [...prev, c]
  }), [])
  const handleStatus  = useCallback((s) => setStatusMessage(s), [])
  const handleDone    = useCallback(() => {
    setIsStreaming(false)
    setStatusMessage('')
  }, [])
  const handleError   = useCallback((e) => {
    setError(e)
    setIsStreaming(false)
    setStatusMessage('')
  }, [])

  const { connectionState, sendQuery, ttft } = useWebSocket({
    onToken:    handleToken,
    onCitation: handleCitation,
    onStatus:   handleStatus,
    onDone:     handleDone,
    onError:    handleError,
  })

  const submitQuery = useCallback((query) => {
    // Clear previous response
    setTokens([])
    setCitations([])
    setError(null)
    setStatusMessage('')
    setIsStreaming(true)
    setHasQueried(true)
    setActiveQuery(query)
    setQueryHistory(prev => [query, ...prev].slice(0, 10))

    sendQuery(query)
  }, [sendQuery])

  return (
    <div style={styles.app}>
      {/* ── Header ──────────────────────────────────────────────── */}
      <StatusBar
        connectionState={connectionState}
        ttft={ttft}
        isStreaming={isStreaming}
      />

      {/* ── Main layout ─────────────────────────────────────────── */}
      <div style={styles.main}>

        {/* ── Sidebar ───────────────────────────────────────── */}
        <aside style={styles.sidebar}>
          <DocumentUpload onDocumentIndexed={(name) => {
            // Could show a toast; for now just log
            console.info(`Document "${name}" is now searchable`)
          }} />

          {queryHistory.length > 0 && (
            <div style={styles.historySection}>
              <p style={styles.historyLabel}>Query history</p>
              {queryHistory.map((q, i) => (
                <button
                  key={i}
                  style={styles.historyItem}
                  onClick={() => submitQuery(q)}
                  title={q}
                  onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border-bright)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
                >
                  <span style={styles.historyIcon}>↺</span>
                  <span style={styles.historyText}>{q}</span>
                </button>
              ))}
            </div>
          )}
        </aside>

        {/* ── Response area ─────────────────────────────────── */}
        <main style={styles.content}>
          {/* Active query display */}
          {activeQuery && (
            <div style={styles.activeQuery}>
              <span style={styles.queryIcon}>?</span>
              <p style={styles.queryText}>{activeQuery}</p>
            </div>
          )}

          {/* Streaming response */}
          <div style={styles.responseWrapper}>
            <ResponseDisplay
              tokens={tokens}
              citations={citations}
              statusMessage={statusMessage}
              isStreaming={isStreaming}
              error={error}
              hasQueried={hasQueried}
            />
          </div>

          {/* Query input */}
          <div style={styles.inputArea}>
            <QueryPanel
              onSubmit={submitQuery}
              isStreaming={isStreaming}
              connectionState={connectionState}
            />
          </div>
        </main>
      </div>
    </div>
  )
}

const styles = {
  app: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    background: 'var(--bg-base)',
    overflow: 'hidden',
  },
  main: {
    display: 'flex',
    flex: 1,
    overflow: 'hidden',
    gap: 0,
  },
  sidebar: {
    width: '260px',
    flexShrink: 0,
    borderRight: '1px solid var(--border)',
    background: 'var(--bg-surface)',
    padding: '20px 16px',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  historySection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  historyLabel: {
    fontFamily: 'var(--font-display)',
    fontSize: '11px',
    fontWeight: 600,
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    marginBottom: '4px',
  },
  historyItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '7px',
    padding: '7px 10px',
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'border-color 0.15s',
  },
  historyIcon: {
    fontFamily: 'var(--font-mono)',
    fontSize: '11px',
    color: 'var(--cyan)',
    flexShrink: 0,
  },
  historyText: {
    fontFamily: 'var(--font-body)',
    fontSize: '11px',
    color: 'var(--text-secondary)',
    lineHeight: 1.4,
    overflow: 'hidden',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
  },
  content: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    padding: '24px',
    gap: '20px',
  },
  activeQuery: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    padding: '14px 18px',
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderLeft: '3px solid var(--cyan)',
    borderRadius: 'var(--radius-lg)',
    animation: 'fade-in 0.2s ease',
    flexShrink: 0,
  },
  queryIcon: {
    width: '22px',
    height: '22px',
    borderRadius: '50%',
    background: 'var(--cyan-glow)',
    border: '1px solid rgba(34,211,238,0.3)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'var(--font-display)',
    fontSize: '13px',
    fontWeight: 700,
    color: 'var(--cyan)',
    flexShrink: 0,
  },
  queryText: {
    fontFamily: 'var(--font-body)',
    fontSize: '14px',
    color: 'var(--text-primary)',
    lineHeight: 1.5,
    fontWeight: 500,
  },
  responseWrapper: {
    flex: 1,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  inputArea: {
    flexShrink: 0,
  },
}
