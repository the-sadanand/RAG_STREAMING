import { useCallback, useEffect, useRef, useState } from 'react'

const WS_URL = import.meta.env.VITE_WS_URL || (() => {
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${proto}//${window.location.host}/query`  // uses same host:port as page, routed through nginx
})()

export const ConnectionState = {
  CONNECTING: 'CONNECTING',
  CONNECTED:  'CONNECTED',
  DISCONNECTED: 'DISCONNECTED',
  ERROR: 'ERROR',
}

/**
 * useWebSocket — manages a WebSocket connection with:
 *  - automatic reconnection (exponential back-off)
 *  - structured event callbacks (onToken, onCitation, onStatus, onDone, onError)
 *  - latency tracking (time-to-first-token)
 */
export function useWebSocket({ onToken, onCitation, onStatus, onDone, onError }) {
  const ws = useRef(null)
  const reconnectTimeout = useRef(null)
  const reconnectDelay = useRef(1000)
  const queryStartTime = useRef(null)
  const [connectionState, setConnectionState] = useState(ConnectionState.DISCONNECTED)
  const [ttft, setTtft] = useState(null)  // time-to-first-token in ms

  const connect = useCallback(() => {
    if (ws.current?.readyState === WebSocket.OPEN) return

    setConnectionState(ConnectionState.CONNECTING)
    const socket = new WebSocket(WS_URL)

    socket.onopen = () => {
      setConnectionState(ConnectionState.CONNECTED)
      reconnectDelay.current = 1000
      console.log('[WS] Connected to', WS_URL)
    }

    socket.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data)
        switch (msg.type) {
          case 'token':
            if (queryStartTime.current && ttft === null) {
              const elapsed = Date.now() - queryStartTime.current
              setTtft(elapsed)
              queryStartTime.current = null
            }
            onToken?.(msg.payload)
            break
          case 'citation':
            onCitation?.(msg.payload)
            break
          case 'status':
            onStatus?.(msg.payload)
            break
          case 'done':
            onDone?.()
            break
          case 'error':
            onError?.(msg.payload)
            break
          default:
            console.warn('[WS] Unknown message type:', msg.type)
        }
      } catch (err) {
        console.error('[WS] Failed to parse message:', err)
      }
    }

    socket.onclose = (event) => {
      setConnectionState(ConnectionState.DISCONNECTED)
      console.log('[WS] Closed, code:', event.code)

      // Reconnect with exponential back-off (max 16 s)
      if (!event.wasClean) {
        reconnectTimeout.current = setTimeout(() => {
          reconnectDelay.current = Math.min(reconnectDelay.current * 2, 16000)
          connect()
        }, reconnectDelay.current)
      }
    }

    socket.onerror = (err) => {
      console.error('[WS] Error:', err)
      setConnectionState(ConnectionState.ERROR)
    }

    ws.current = socket
  }, [onToken, onCitation, onStatus, onDone, onError, ttft])

  const disconnect = useCallback(() => {
    clearTimeout(reconnectTimeout.current)
    ws.current?.close(1000, 'Component unmounted')
  }, [])

  const sendQuery = useCallback((query) => {
    if (ws.current?.readyState !== WebSocket.OPEN) {
      onError?.('WebSocket not connected. Please wait…')
      return
    }
    queryStartTime.current = Date.now()
    setTtft(null)
    ws.current.send(JSON.stringify({ query }))
  }, [onError])

  useEffect(() => {
    connect()
    return () => disconnect()
  }, [])   // eslint-disable-line react-hooks/exhaustive-deps

  return { connectionState, sendQuery, ttft, reconnect: connect }
}
