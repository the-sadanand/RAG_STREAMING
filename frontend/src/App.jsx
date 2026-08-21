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
  const [sidebarWidth, setSidebarWidth] = useState(280)

  const handleToken = useCallback((t) => setTokens(prev => [...prev, t]), [])
  const handleCitation = useCallback((c) => setCitations(prev => {
    const key = `${c.source}-${c.chunk_index}`
    if (prev.some(p => `${p.source}-${p.chunk_index}` === key)) return prev
    return [...prev, c]
  }), [])
  const handleStatus = useCallback((s) => setStatusMessage(s), [])
  const handleDone = useCallback(() => {
    setIsStreaming(false)
    setStatusMessage('')
  }, [])
  const handleError = useCallback((e) => {
    setError(e)
    setIsStreaming(false)
    setStatusMessage('')
  }, [])

  const { connectionState, sendQuery, ttft } = useWebSocket({
    onToken: handleToken,
    onCitation: handleCitation,
    onStatus: handleStatus,
    onDone: handleDone,
    onError: handleError,
  })

  const submitQuery = useCallback((query) => {
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
      <StatusBar connectionState={connectionState} ttft={ttft} isStreaming={isStreaming} />

      <div className="app-main" style={styles.main}>
        <aside
          className="app-sidebar ui-section documents-shell"
          style={{ ...styles.sidebar, width: `${sidebarWidth}px` }}
        >
          <DocumentUpload onDocumentIndexed={(name) => {
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

          <div className="layout-controls" style={styles.layoutControls}>
            <div style={styles.layoutHeader}>
              <span style={styles.layoutTitle}>Layout</span>
              <span style={styles.layoutValue}>{sidebarWidth}px</span>
            </div>
            <label style={styles.sliderLabel} htmlFor="sidebar-width">
              Sidebar width
            </label>
            <input
              id="sidebar-width"
              type="range"
              min="220"
              max="380"
              step="10"
              value={sidebarWidth}
              onChange={e => setSidebarWidth(Number(e.target.value))}
              style={styles.slider}
              aria-label="Sidebar width"
            />
            <div style={styles.sliderScale}>
              <span>Compact</span>
              <button
                type="button"
                onClick={() => setSidebarWidth(280)}
                style={styles.resetButton}
              >
                Reset
              </button>
              <span>Wide</span>
            </div>
          </div>
        </aside>

        <main className="app-content" style={styles.content}>
          {activeQuery && (
            <div className="ui-section active-query" style={styles.activeQuery}>
              <span style={styles.queryIcon}>?</span>
              <p style={styles.queryText}>{activeQuery}</p>
            </div>
          )}

          <div className="response-shell ui-section" style={styles.responseWrapper}>
            <ResponseDisplay
              tokens={tokens}
              citations={citations}
              statusMessage={statusMessage}
              isStreaming={isStreaming}
              error={error}
              hasQueried={hasQueried}
            />
          </div>

          <div className="query-shell ui-section" style={styles.inputArea}>
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
    minHeight: 0,
  },
  sidebar: {
    flexShrink: 0,
    borderRight: '1px solid var(--border)',
    background: 'var(--bg-surface)',
    padding: '20px 16px',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  historySection: { display: 'flex', flexDirection: 'column', gap: '6px' },
  historyLabel: {
    fontFamily: 'var(--font-display'), fontSize: '11px', fontWeight: 600,
    color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px',
  },
  historyItem: {
    display: 'flex', alignItems: 'flex-start', gap: '7px', padding: '7px 10px',
    background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)',
    cursor: 'pointer', textAlign: 'left', transition: 'border-color 0.15s',
  },
  historyIcon: { fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--cyan)', flexShrink: 0 },
  historyText: {
    fontFamily: 'var(--font-body)', fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.4,
    overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
  },
  layoutControls: {
    marginTop: 'auto',
    padding: '12px',
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
  },
  layoutHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '10px',
  },
  layoutTitle: {
    fontFamily: 'var(--font-display)',
    fontSize: '11px',
    fontWeight: 600,
    color: 'var(--text-secondary)',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
  },
  layoutValue: {
    fontFamily: 'var(--font-mono)',
    fontSize: '10px',
    color: 'var(--cyan)',
  },
  sliderLabel: {
    display: 'block',
    fontFamily: 'var(--font-body)',
    fontSize: '11px',
    color: 'var(--text-muted)',
    marginBottom: '7px',
  },
  slider: {
    width: '100%',
    height: '4px',
    accentColor: 'var(--cyan)',
    cursor: 'pointer',
  },
  sliderScale: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '6px',
    fontFamily: 'var(--font-mono)',
    fontSize: '9px',
    color: 'var(--text-muted)',
  },
  resetButton: {
    border: 'none',
    background: 'transparent',
    color: 'var(--cyan)',
    fontFamily: 'var(--font-mono)',
    fontSize: '9px',
    cursor: 'pointer',
    padding: '2px 4px',
  },
  content: {
    flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: '24px', gap: '20px',
    minWidth: 0, minHeight: 0,
  },
  activeQuery: {
    display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '14px 18px',
    background: 'var(--bg-card)', border: '1px solid var(--border)', borderLeft: '3px solid var(--cyan)',
    borderRadius: 'var(--radius-lg)', flexShrink: 0,
  },
  queryIcon: {
    width: '22px', height: '22px', borderRadius: '50%', background: 'var(--cyan-glow)',
    border: '1px solid rgba(34,211,238,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: 'var(--font-display)', fontSize: '13px', fontWeight: 700, color: 'var(--cyan)', flexShrink: 0,
  },
  queryText: {
    fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--text-primary)', lineHeight: 1.5,
    fontWeight: 500, overflowWrap: 'anywhere',
  },
  responseWrapper: {
    flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: 0,
  },
  inputArea: { flexShrink: 0, minWidth: 0 },
}
