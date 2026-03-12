import { useCallback, useRef, useState } from 'react'
import { ConnectionState } from '../hooks/useWebSocket'

const SUGGESTIONS = [
  'What are the main topics covered in the uploaded documents?',
  'Summarize the key findings from the documents.',
  'What are the most important concepts mentioned?',
  'Can you explain the main argument presented?',
]

export default function QueryPanel({ onSubmit, isStreaming, connectionState }) {
  const [query, setQuery] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const textareaRef = useRef(null)

  const isConnected = connectionState === ConnectionState.CONNECTED
  const canSubmit = isConnected && !isStreaming && query.trim().length > 0

  const handleSubmit = useCallback(() => {
    if (!canSubmit) return
    onSubmit(query.trim())
    setQuery('')
    setShowSuggestions(false)
  }, [canSubmit, query, onSubmit])

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }, [handleSubmit])

  const selectSuggestion = useCallback((s) => {
    setQuery(s)
    setShowSuggestions(false)
    textareaRef.current?.focus()
  }, [])

  return (
    <div style={styles.wrapper}>
      {/* Suggestions */}
      {showSuggestions && query.length === 0 && (
        <div style={styles.suggestions}>
          <p style={styles.suggestionsLabel}>Try asking</p>
          {SUGGESTIONS.map((s, i) => (
            <button
              key={i}
              style={styles.suggestion}
              // onMouseDown fires BEFORE the textarea's onBlur, so the suggestion
              // list is still visible when the click registers. onClick fires after
              // onBlur, which hides the list first — that's the bug.
              onMouseDown={e => {
                e.preventDefault()          // prevent textarea losing focus at all
                selectSuggestion(s)
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border-bright)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
            >
              <span style={styles.suggestionArrow}>→</span>
              <span style={styles.suggestionText}>{s}</span>
            </button>
          ))}
        </div>
      )}

      {/* Input area */}
      <div
        style={{
          ...styles.inputRow,
          borderColor: query.length > 0 ? 'var(--border-bright)' : 'var(--border)',
          boxShadow: query.length > 0 ? '0 0 0 1px rgba(34,211,238,0.1)' : 'none',
        }}
      >
        <textarea
          ref={textareaRef}
          value={query}
          onChange={e => {
            setQuery(e.target.value)
            setShowSuggestions(false)
          }}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
          onKeyDown={handleKeyDown}
          placeholder={
            isConnected
              ? 'Ask a question… (Enter to send, Shift+Enter for newline)'
              : 'Waiting for connection…'
          }
          disabled={!isConnected || isStreaming}
          rows={2}
          style={{
            ...styles.textarea,
            opacity: (!isConnected || isStreaming) ? 0.5 : 1,
          }}
        />

        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          aria-label="Send query"
          style={{
            ...styles.sendBtn,
            opacity: canSubmit ? 1 : 0.4,
            cursor: canSubmit ? 'pointer' : 'not-allowed',
            background: canSubmit
              ? 'linear-gradient(135deg, #0e7490, #22d3ee)'
              : 'var(--bg-elevated)',
          }}
        >
          {isStreaming ? (
            <span style={styles.btnSpinner} />
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z" stroke="white" strokeWidth="2" strokeLinejoin="round"/>
            </svg>
          )}
        </button>
      </div>

      <p style={styles.hint}>
        {isStreaming
          ? 'Streaming response… please wait'
          : 'Enter to send · Shift+Enter for newline'}
      </p>
    </div>
  )
}

const styles = {
  wrapper: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    position: 'relative',
  },
  suggestions: {
    position: 'absolute',
    bottom: 'calc(100% + 8px)',
    left: 0,
    right: 0,
    background: 'var(--bg-surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-lg)',
    padding: '10px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    boxShadow: '0 -8px 32px rgba(0,0,0,0.4)',
    zIndex: 10,
    animation: 'slide-in-up 0.15s ease',
  },
  suggestionsLabel: {
    fontFamily: 'var(--font-display)',
    fontSize: '10px',
    fontWeight: 600,
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    padding: '2px 6px',
  },
  suggestion: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '8px',
    padding: '7px 10px',
    background: 'transparent',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'border-color 0.15s',
  },
  suggestionArrow: {
    fontFamily: 'var(--font-mono)',
    fontSize: '12px',
    color: 'var(--cyan)',
    flexShrink: 0,
    marginTop: '1px',
  },
  suggestionText: {
    fontFamily: 'var(--font-body)',
    fontSize: '12px',
    color: 'var(--text-secondary)',
    lineHeight: 1.4,
  },
  inputRow: {
    display: 'flex',
    gap: '10px',
    background: 'var(--bg-surface)',
    border: '1.5px solid',
    borderRadius: 'var(--radius-lg)',
    padding: '12px 14px',
    transition: 'border-color 0.2s, box-shadow 0.2s',
    alignItems: 'flex-end',
  },
  textarea: {
    flex: 1,
    background: 'transparent',
    border: 'none',
    outline: 'none',
    color: 'var(--text-primary)',
    fontFamily: 'var(--font-body)',
    fontSize: '14px',
    lineHeight: 1.6,
    resize: 'none',
    minHeight: '40px',
  },
  sendBtn: {
    width: '38px',
    height: '38px',
    borderRadius: '10px',
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    transition: 'all 0.2s',
  },
  btnSpinner: {
    width: '14px',
    height: '14px',
    border: '2px solid rgba(255,255,255,0.3)',
    borderTopColor: 'white',
    borderRadius: '50%',
    display: 'inline-block',
    animation: 'spin 0.7s linear infinite',
  },
  hint: {
    fontFamily: 'var(--font-mono)',
    fontSize: '10px',
    color: 'var(--text-muted)',
    paddingLeft: '4px',
  },
}
