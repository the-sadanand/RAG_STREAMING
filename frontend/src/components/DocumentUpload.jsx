import { useCallback, useEffect, useRef, useState } from 'react'

const API_BASE = import.meta.env.VITE_API_URL || ""  // empty = relative URL, routed through nginx

const STATUS_COLOR = {
  queued:     '#f59e0b',
  processing: '#22d3ee',
  completed:  '#10b981',
  failed:     '#ef4444',
}

const STATUS_LABEL = {
  queued:     'Queued',
  processing: 'Processing…',
  completed:  'Indexed ✓',
  failed:     'Failed',
}

export default function DocumentUpload({ onDocumentIndexed }) {
  const [dragging, setDragging] = useState(false)
  const [uploads, setUploads] = useState([])
  const [ingested, setIngested] = useState([])
  const fileInput = useRef(null)
  const pollers = useRef({})

  // Fetch ingested docs on mount
  useEffect(() => {
    fetchDocuments()
  }, [])

  const fetchDocuments = async () => {
    try {
      const res = await fetch(`${API_BASE}/documents`)
      if (res.ok) {
        const data = await res.json()
        setIngested(data.documents || [])
      }
    } catch { /* silent */ }
  }

  const pollStatus = useCallback((docId, filename) => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${API_BASE}/ingest/status/${docId}`)
        const data = await res.json()
        const status = data.status

        setUploads(prev =>
          prev.map(u => u.docId === docId ? { ...u, status, chunks: data.chunks } : u)
        )

        if (status === 'completed' || status === 'failed') {
          clearInterval(interval)
          delete pollers.current[docId]
          if (status === 'completed') {
            fetchDocuments()
            onDocumentIndexed?.(filename)
          }
        }
      } catch { /* keep polling */ }
    }, 1000)

    pollers.current[docId] = interval
  }, [onDocumentIndexed])

  const uploadFile = useCallback(async (file) => {
    const uploadEntry = {
      id: Math.random().toString(36).slice(2),
      filename: file.name,
      size: file.size,
      status: 'uploading',
      docId: null,
    }

    setUploads(prev => [uploadEntry, ...prev].slice(0, 10))

    const form = new FormData()
    form.append('file', file)

    try {
      const res = await fetch(`${API_BASE}/ingest`, { method: 'POST', body: form })
      if (!res.ok) {
        const err = await res.json()
        setUploads(prev =>
          prev.map(u => u.id === uploadEntry.id ? { ...u, status: 'failed', error: err.detail } : u)
        )
        return
      }
      const data = await res.json()
      setUploads(prev =>
        prev.map(u => u.id === uploadEntry.id ? { ...u, status: 'queued', docId: data.doc_id } : u)
      )
      pollStatus(data.doc_id, file.name)
    } catch (err) {
      setUploads(prev =>
        prev.map(u => u.id === uploadEntry.id ? { ...u, status: 'failed', error: err.message } : u)
      )
    }
  }, [pollStatus])

  const handleFiles = useCallback((files) => {
    Array.from(files).forEach(file => {
      const ext = file.name.split('.').pop().toLowerCase()
      if (['txt', 'pdf', 'md'].includes(ext)) {
        uploadFile(file)
      }
    })
  }, [uploadFile])

  const onDrop = useCallback((e) => {
    e.preventDefault()
    setDragging(false)
    handleFiles(e.dataTransfer.files)
  }, [handleFiles])

  useEffect(() => () => Object.values(pollers.current).forEach(clearInterval), [])

  return (
    <div style={styles.panel}>
      <div style={styles.sectionHeader}>
        <span style={styles.sectionTitle}>Documents</span>
        <span style={styles.badge}>{ingested.length}</span>
      </div>

      {/* Drop Zone */}
      <div
        style={{
          ...styles.dropZone,
          ...(dragging ? styles.dropZoneActive : {}),
        }}
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => fileInput.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={e => e.key === 'Enter' && fileInput.current?.click()}
        aria-label="Upload document"
      >
        <input
          ref={fileInput}
          type="file"
          multiple
          accept=".txt,.pdf,.md"
          style={{ display: 'none' }}
          onChange={e => handleFiles(e.target.files)}
        />
        <div style={styles.dropIcon}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M12 15V3m0 0L8 7m4-4l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <path d="M2 17l.621 2.485A2 2 0 004.561 21h14.878a2 2 0 001.94-1.515L22 17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </div>
        <p style={styles.dropText}>
          {dragging ? 'Drop to ingest' : 'Drop files or click'}
        </p>
        <p style={styles.dropSubtext}>.txt · .pdf · .md</p>
      </div>

      {/* Upload queue */}
      {uploads.length > 0 && (
        <div style={styles.uploadList}>
          <p style={styles.listLabel}>Recent uploads</p>
          {uploads.map(u => (
            <div key={u.id} style={styles.uploadItem}>
              <div style={styles.uploadMeta}>
                <span style={styles.uploadName}>{u.filename}</span>
                <span style={{ ...styles.uploadStatus, color: STATUS_COLOR[u.status] || '#94a3b8' }}>
                  {u.status === 'uploading' ? (
                    <span style={styles.spinner} />
                  ) : null}
                  {STATUS_LABEL[u.status] || u.status}
                  {u.chunks ? ` · ${u.chunks} chunks` : ''}
                {u.status === 'failed' && u.error && (
                  <span style={{ display: 'block', fontSize: '10px', color: '#ef4444', marginTop: '2px', wordBreak: 'break-word' }}>
                    {u.error}
                  </span>
                )}
                </span>
              </div>
              {(u.status === 'queued' || u.status === 'processing') && (
                <div style={styles.progressTrack}>
                  <div
                    style={{
                      ...styles.progressBar,
                      animation: 'progress-bar 8s ease-out forwards',
                      background: `linear-gradient(90deg, var(--cyan-dim), var(--cyan))`,
                    }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Ingested documents */}
      {ingested.length > 0 && (
        <div style={styles.ingestedList}>
          <p style={styles.listLabel}>Knowledge base</p>
          {ingested.map(doc => (
            <div key={doc.source} style={styles.ingestedItem}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, color: '#10b981' }}>
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M14 2v6h6" stroke="currentColor" strokeWidth="1.5"/>
              </svg>
              <span style={styles.ingestedName}>{doc.source}</span>
              <span style={styles.chunkCount}>{doc.chunks}c</span>
            </div>
          ))}
        </div>
      )}

      {ingested.length === 0 && uploads.length === 0 && (
        <p style={styles.emptyState}>
          No documents yet. Upload some files to populate the knowledge base.
        </p>
      )}
    </div>
  )
}

const styles = {
  panel: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    height: '100%',
    overflowY: 'auto',
    paddingRight: '4px',
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  sectionTitle: {
    fontFamily: 'var(--font-display)',
    fontSize: '13px',
    fontWeight: 600,
    color: 'var(--text-secondary)',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
  },
  badge: {
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border)',
    borderRadius: '10px',
    padding: '0 6px',
    fontFamily: 'var(--font-mono)',
    fontSize: '10px',
    color: 'var(--text-muted)',
  },
  dropZone: {
    border: '1.5px dashed var(--border)',
    borderRadius: 'var(--radius-lg)',
    padding: '24px 16px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    background: 'var(--bg-surface)',
    color: 'var(--text-muted)',
  },
  dropZoneActive: {
    borderColor: 'var(--cyan)',
    background: 'var(--cyan-glow)',
    color: 'var(--cyan)',
  },
  dropIcon: {
    width: '40px',
    height: '40px',
    borderRadius: '10px',
    background: 'var(--bg-elevated)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'inherit',
  },
  dropText: {
    fontFamily: 'var(--font-body)',
    fontSize: '13px',
    fontWeight: 500,
    color: 'inherit',
  },
  dropSubtext: {
    fontFamily: 'var(--font-mono)',
    fontSize: '11px',
    color: 'var(--text-muted)',
  },
  uploadList: { display: 'flex', flexDirection: 'column', gap: '8px' },
  ingestedList: { display: 'flex', flexDirection: 'column', gap: '6px' },
  listLabel: {
    fontFamily: 'var(--font-display)',
    fontSize: '11px',
    fontWeight: 600,
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    marginBottom: '4px',
  },
  uploadItem: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    padding: '10px 12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  uploadMeta: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '8px',
  },
  uploadName: {
    fontFamily: 'var(--font-mono)',
    fontSize: '11px',
    color: 'var(--text-primary)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    maxWidth: '130px',
  },
  uploadStatus: {
    fontFamily: 'var(--font-mono)',
    fontSize: '10px',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    whiteSpace: 'nowrap',
  },
  spinner: {
    display: 'inline-block',
    width: '8px',
    height: '8px',
    border: '1.5px solid currentColor',
    borderTopColor: 'transparent',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  progressTrack: {
    height: '2px',
    background: 'var(--border)',
    borderRadius: '1px',
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: '1px',
    width: '0%',
  },
  ingestedItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '7px 10px',
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
  },
  ingestedName: {
    fontFamily: 'var(--font-mono)',
    fontSize: '11px',
    color: 'var(--text-secondary)',
    flex: 1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  chunkCount: {
    fontFamily: 'var(--font-mono)',
    fontSize: '10px',
    color: 'var(--text-muted)',
    flexShrink: 0,
  },
  emptyState: {
    fontFamily: 'var(--font-body)',
    fontSize: '12px',
    color: 'var(--text-muted)',
    lineHeight: 1.6,
  },
}
