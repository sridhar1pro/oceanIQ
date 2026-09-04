import React, { useState } from 'react'

export default function OceanIQAssistant({
  onExecuteAIAction,
  onOpenCoastalRisk,
  onOpenGlider,
  onOpenDiscrepancy,
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: 'Hello! I am OceanIQ AI, your intelligent oceanographic assistant for INCOIS SIH-26067. Ask me about 3D volumetric depth layers, autonomous gliders, marine heatwaves, or coastal hazard indices.'
    }
  ])
  const [loading, setLoading] = useState(false)

  const quickPrompts = [
    { label: '🌊 Bay of Bengal Waves', query: 'Show wave height in Bay of Bengal' },
    { label: '🤖 Track Glider 3D Sawtooth', query: 'Track autonomous glider sawtooth mission' },
    { label: '🚨 Coastal Hazard Warning', query: 'Show coastal multi-hazard risk index for Puri and Visakhapatnam' },
    { label: '⚠️ High Discrepancy Argo Floats', query: 'Inspect high discrepancy argo floats' },
    { label: '🧪 Ocean Acidification (pH)', query: 'Show ocean acidity pH at sea surface' },
  ]

  const handleSend = async (textToSend) => {
    const q = textToSend || query
    if (!q.trim()) return

    const userMsg = { role: 'user', text: q }
    setMessages(prev => [...prev, userMsg])
    setQuery('')
    setLoading(true)

    try {
      const res = await fetch('/api/ai/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q })
      })
      const data = await res.json()

      setMessages(prev => [...prev, {
        role: 'assistant',
        text: data.response,
        action: data.action
      }])

      // Execute action callback in parent
      if (onExecuteAIAction) {
        onExecuteAIAction(data)
      }

      // Automatically open related panels
      if (data.open_panel === 'coastal_risk' && onOpenCoastalRisk) {
        onOpenCoastalRisk()
      } else if (data.open_panel === 'glider' && onOpenGlider) {
        onOpenGlider()
      } else if (data.open_panel === 'discrepancy' && onOpenDiscrepancy) {
        onOpenDiscrepancy()
      }

    } catch (err) {
      console.error('AI Query failed:', err)
      setMessages(prev => [...prev, {
        role: 'assistant',
        text: 'Sorry, I encountered an error communicating with the OceanIQ AI backend. Please verify that port 8000 is running.'
      }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 30 }}>
      {/* Floating Assistant Launcher Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          style={{
            background: 'linear-gradient(135deg, #6366f1, #06b6d4)',
            border: 'none',
            borderRadius: '50px',
            padding: '12px 20px',
            color: '#fff',
            fontWeight: 700,
            fontSize: '0.85rem',
            cursor: 'pointer',
            boxShadow: '0 10px 25px rgba(99, 102, 241, 0.4), 0 0 20px rgba(6, 182, 212, 0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            transition: 'transform 0.2s, box-shadow 0.2s'
          }}
        >
          <span style={{ fontSize: '1.2rem' }}>✨</span>
          <span>OceanIQ AI Assistant</span>
          <span style={{
            fontSize: '0.65rem',
            background: 'rgba(255,255,255,0.25)',
            padding: '2px 6px',
            borderRadius: 10
          }}>
            SIH-26067
          </span>
        </button>
      )}

      {/* Floating Chat Window */}
      {isOpen && (
        <div
          style={{
            width: 380,
            height: 520,
            backgroundColor: 'rgba(15, 23, 42, 0.92)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(99, 102, 241, 0.35)',
            borderRadius: '16px',
            boxShadow: '0 20px 50px rgba(0,0,0,0.7), 0 0 30px rgba(99,102,241,0.15)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            color: '#e2e8f0'
          }}
        >
          {/* Header */}
          <div style={{
            padding: '12px 16px',
            background: 'linear-gradient(90deg, rgba(99,102,241,0.25), rgba(6,182,212,0.25))',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: '1.2rem' }}>✨</span>
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fff' }}>
                  OceanIQ Intelligence Assistant
                </div>
                <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
                  Natural Language Oceanographic Controls
                </div>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#94a3b8',
                fontSize: '1.2rem',
                cursor: 'pointer'
              }}
            >
              ✕
            </button>
          </div>

          {/* Quick Prompts Chips */}
          <div style={{
            padding: '8px 12px',
            backgroundColor: 'rgba(30, 41, 59, 0.5)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
            display: 'flex',
            gap: 6,
            overflowX: 'auto',
            whiteSpace: 'nowrap'
          }}>
            {quickPrompts.map((qp, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(qp.query)}
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  color: '#cbd5e1',
                  borderRadius: 12,
                  padding: '4px 8px',
                  fontSize: '0.68rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  flexShrink: 0
                }}
              >
                {qp.label}
              </button>
            ))}
          </div>

          {/* Chat Messages */}
          <div style={{
            flex: 1,
            padding: '14px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 10
          }}>
            {messages.map((m, idx) => (
              <div
                key={idx}
                style={{
                  alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '85%',
                  backgroundColor: m.role === 'user' ? '#4f46e5' : 'rgba(30, 41, 59, 0.8)',
                  border: m.role === 'user' ? 'none' : '1px solid rgba(255, 255, 255, 0.1)',
                  color: '#fff',
                  borderRadius: '12px',
                  padding: '10px 12px',
                  fontSize: '0.78rem',
                  lineHeight: '1.4'
                }}
              >
                {m.text}
                {m.action && m.action !== 'INFO' && (
                  <div style={{
                    marginTop: 6,
                    fontSize: '0.68rem',
                    color: '#67e8f9',
                    fontWeight: 600,
                    borderTop: '1px solid rgba(255,255,255,0.1)',
                    paddingTop: 4
                  }}>
                    ⚡ Executed 3D Action: {m.action}
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div style={{
                alignSelf: 'flex-start',
                backgroundColor: 'rgba(30, 41, 59, 0.8)',
                padding: '8px 12px',
                borderRadius: '12px',
                fontSize: '0.75rem',
                color: '#94a3b8'
              }}>
                Analyzing ocean model telemetry...
              </div>
            )}
          </div>

          {/* Query Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleSend()
            }}
            style={{
              padding: '10px 12px',
              borderTop: '1px solid rgba(255, 255, 255, 0.1)',
              display: 'flex',
              gap: 8,
              backgroundColor: 'rgba(15, 23, 42, 0.8)'
            }}
          >
            <input
              type="text"
              placeholder="e.g. Focus on Bay of Bengal wave height..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{
                flex: 1,
                backgroundColor: 'rgba(30, 41, 59, 0.8)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: 8,
                padding: '8px 12px',
                color: '#fff',
                fontSize: '0.8rem',
                outline: 'none'
              }}
            />
            <button
              type="submit"
              disabled={loading || !query.trim()}
              style={{
                background: 'linear-gradient(135deg, #6366f1, #06b6d4)',
                border: 'none',
                borderRadius: 8,
                padding: '0 14px',
                color: '#fff',
                fontWeight: 700,
                cursor: 'pointer',
                opacity: loading || !query.trim() ? 0.5 : 1
              }}
            >
              Send
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
