import React, { useState, useEffect } from 'react'

export default function OceanIQAssistant({
  onExecuteAIAction,
  onOpenCoastalRisk,
  onOpenGlider,
  onOpenDiscrepancy,
  onOpenWorldMonitor
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [apiKey, setApiKey] = useState(localStorage.getItem('gemini_api_key') || '')
  const [backendGeminiActive, setBackendGeminiActive] = useState(false)
  const [savedKeyMsg, setSavedKeyMsg] = useState('')
  const [query, setQuery] = useState('')

  // Check if backend has Gemini API key configured
  useEffect(() => {
    fetch('/api/ai/status')
      .then(r => r.json())
      .then(d => {
        if (d && d.gemini_configured) {
          setBackendGeminiActive(true)
        }
      })
      .catch(() => {})
  }, [])

  const isGeminiLive = backendGeminiActive || Boolean(apiKey.trim())

  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: '🌊 **Welcome to OceanIQ AI**!\n\nI am your scientific oceanographic co-pilot for **INCOIS & MoES (SIH-26067)**. You can ask me questions in plain English, such as:\n- *"Why does the ocean look yellow and speedily move like wind?"*\n- *"Track live AIS ships and tankers"*\n- *"Show Cyclone Midhili-II warning cone"*\n- *"Display 3D sawtooth glider telemetry"*',
      engine: 'OceanIQ Expert Engine'
    }
  ])
  const [loading, setLoading] = useState(false)

  const quickPrompts = [
    { label: '🌊 Why Ocean Yellow & Speedy?', query: 'why the ocean color looks yellow and speedily move like wind' },
    { label: '🚢 Track Live AIS Ships', query: 'Show live maritime ships and tankers in Indian Ocean' },
    { label: '🌪️ Cyclone Midhili-II Alert', query: 'Show active cyclones and storm surge warnings' },
    { label: '🤖 Glider 3D Sawtooth', query: 'Track autonomous glider sawtooth mission in Bay of Bengal' },
    { label: '📹 Live Harbor Cameras', query: 'Show live coastal harbor webcam feeds' },
    { label: '🚨 Coastal Risk Dashboard', query: 'Show coastal multi-hazard risk index for Puri and Visakhapatnam' },
  ]

  const handleSaveApiKey = () => {
    localStorage.setItem('gemini_api_key', apiKey.trim())
    setSavedKeyMsg('API Key saved successfully!')
    setTimeout(() => {
      setSavedKeyMsg('')
      setShowSettings(false)
    }, 1200)
  }

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
        body: JSON.stringify({ 
          query: q,
          api_key: apiKey.trim() || undefined
        })
      })
      const data = await res.json()

      setMessages(prev => [...prev, {
        role: 'assistant',
        text: data.response,
        action: data.action,
        engine: data.engine
      }])

      // Execute action callback in parent (camera flight, variable switch, vector speed adjust)
      if (onExecuteAIAction) {
        onExecuteAIAction(data)
      }

      // Automatically open related panels
      if (data.open_panel === 'world_monitor' && onOpenWorldMonitor) {
        onOpenWorldMonitor()
      } else if (data.open_panel === 'coastal_risk' && onOpenCoastalRisk) {
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
    <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 40 }}>
      {/* Floating Assistant Launcher Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          style={{
            background: 'linear-gradient(135deg, #6366f1, #06b6d4)',
            border: 'none',
            borderRadius: '50px',
            padding: '12px 22px',
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
            padding: '2px 7px',
            borderRadius: 10
          }}>
            {isGeminiLive ? 'Gemini 3.6' : 'AI / OSINT'}
          </span>
        </button>
      )}

      {/* Floating Chat Window */}
      {isOpen && (
        <div
          style={{
            width: 420,
            height: 560,
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(99, 102, 241, 0.4)',
            borderRadius: '18px',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.8), 0 0 35px rgba(99,102,241,0.25)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            color: '#e2e8f0'
          }}
        >
          {/* Header */}
          <div style={{
            padding: '12px 16px',
            background: 'linear-gradient(90deg, rgba(99,102,241,0.3), rgba(6,182,212,0.3))',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: '1.2rem' }}>✨</span>
              <div>
                <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: 6 }}>
                  OceanIQ Intelligence Assistant
                  <span style={{
                    fontSize: '0.65rem',
                    padding: '1px 6px',
                    borderRadius: 8,
                    background: isGeminiLive ? 'rgba(16, 185, 129, 0.3)' : 'rgba(99, 102, 241, 0.3)',
                    color: isGeminiLive ? '#34d399' : '#a5b4fc',
                    border: '1px solid rgba(255,255,255,0.1)'
                  }}>
                    {isGeminiLive ? '🟢 Gemini 3.6 Flash' : 'Expert Brain'}
                  </span>
                </div>
                <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
                  INCOIS Ocean Twin & Maritime OSINT Operator
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <button
                onClick={() => setShowSettings(!showSettings)}
                title="AI Settings / Gemini API Key"
                style={{
                  background: showSettings ? 'rgba(99, 102, 241, 0.4)' : 'transparent',
                  border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: 6,
                  color: '#94a3b8',
                  fontSize: '0.85rem',
                  padding: '4px 7px',
                  cursor: 'pointer'
                }}
              >
                ⚙️
              </button>
              <button
                onClick={() => setIsOpen(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#94a3b8',
                  fontSize: '1.1rem',
                  cursor: 'pointer',
                  padding: '2px 6px'
                }}
              >
                ✕
              </button>
            </div>
          </div>

          {/* Settings Drawer */}
          {showSettings && (
            <div style={{
              padding: '12px 16px',
              backgroundColor: 'rgba(30, 41, 59, 0.95)',
              borderBottom: '1px solid rgba(255,255,255,0.1)',
              fontSize: '0.78rem'
            }}>
              <div style={{ fontWeight: 600, color: '#e2e8f0', marginBottom: 4 }}>
                Google Gemini API Configuration
              </div>
              {backendGeminiActive ? (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 10px',
                  borderRadius: 8,
                  background: 'rgba(16, 185, 129, 0.15)',
                  border: '1px solid rgba(16, 185, 129, 0.35)',
                  color: '#34d399',
                  marginBottom: 8
                }}>
                  <span>🟢</span>
                  <div>
                    <strong>Gemini 3.6 Flash Active</strong>
                    <div style={{ color: '#a7f3d0', fontSize: '0.68rem' }}>
                      Key securely loaded on server (.env). You don't need to re-enter it below!
                    </div>
                  </div>
                </div>
              ) : (
                <p style={{ color: '#94a3b8', marginBottom: 8, fontSize: '0.72rem' }}>
                  Enter your Gemini API key to enable live Gemini 3.6 Flash reasoning. If left empty, OceanIQ operates in built-in offline expert mode.
                </p>
              )}
              <div style={{ display: 'flex', gap: 6 }}>
                <input
                  type="password"
                  placeholder={backendGeminiActive ? 'Key active via backend (.env)' : 'AIzaSy...'}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  style={{
                    flex: 1,
                    background: 'rgba(15, 23, 42, 0.8)',
                    border: '1px solid rgba(99,102,241,0.4)',
                    borderRadius: 6,
                    padding: '6px 10px',
                    color: '#fff',
                    fontSize: '0.75rem'
                  }}
                />
                <button
                  onClick={handleSaveApiKey}
                  style={{
                    background: '#6366f1',
                    border: 'none',
                    borderRadius: 6,
                    padding: '6px 12px',
                    color: '#fff',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Save
                </button>
              </div>
              {savedKeyMsg && (
                <div style={{ color: '#34d399', fontSize: '0.72rem', marginTop: 4 }}>
                  {savedKeyMsg}
                </div>
              )}
            </div>
          )}

          {/* Quick Prompts Chips Carousel */}
          <div style={{
            padding: '8px 12px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
            display: 'flex',
            gap: 6,
            overflowX: 'auto',
            whiteSpace: 'nowrap',
            background: 'rgba(15, 23, 42, 0.5)'
          }}>
            {quickPrompts.map((p, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(p.query)}
                style={{
                  background: 'rgba(30, 41, 59, 0.8)',
                  border: '1px solid rgba(99, 102, 241, 0.25)',
                  borderRadius: 14,
                  padding: '4px 10px',
                  color: '#cbd5e1',
                  fontSize: '0.72rem',
                  cursor: 'pointer',
                  flexShrink: 0
                }}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Chat Messages Log */}
          <div style={{
            flex: 1,
            padding: 14,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            fontSize: '0.8rem'
          }}>
            {messages.map((m, idx) => (
              <div
                key={idx}
                style={{
                  alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '90%',
                  background: m.role === 'user'
                    ? 'linear-gradient(135deg, #4f46e5, #06b6d4)'
                    : 'rgba(30, 41, 59, 0.85)',
                  border: m.role === 'user' ? 'none' : '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: m.role === 'user' ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
                  padding: '10px 14px',
                  color: '#f8fafc',
                  lineHeight: 1.5,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                  whiteSpace: 'pre-line'
                }}
              >
                {m.text}
                {m.engine && (
                  <div style={{
                    fontSize: '0.62rem',
                    color: '#94a3b8',
                    marginTop: 6,
                    borderTop: '1px solid rgba(255,255,255,0.08)',
                    paddingTop: 4
                  }}>
                    Engine: {m.engine}
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div style={{
                alignSelf: 'flex-start',
                background: 'rgba(30, 41, 59, 0.85)',
                padding: '8px 14px',
                borderRadius: 12,
                color: '#94a3b8',
                fontSize: '0.75rem',
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}>
                <span className="animate-spin">⟳</span> {isGeminiLive ? 'Thinking with Gemini 3.6 Flash & dispatching 3D actions...' : 'Reasoning ocean physics & dispatching 3D twin actions...'}
              </div>
            )}
          </div>

          {/* Input Footer */}
          <div style={{
            padding: 10,
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            background: 'rgba(15, 23, 42, 0.8)',
            display: 'flex',
            gap: 8
          }}>
            <input
              type="text"
              placeholder="Ask anything (e.g. why is the ocean yellow?)..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSend()
                }
              }}
              style={{
                flex: 1,
                background: 'rgba(30, 41, 59, 0.8)',
                border: '1px solid rgba(99, 102, 241, 0.3)',
                borderRadius: 10,
                padding: '10px 12px',
                color: '#fff',
                fontSize: '0.8rem',
                outline: 'none'
              }}
            />
            <button
              onClick={() => handleSend()}
              disabled={loading || !query.trim()}
              style={{
                background: 'linear-gradient(135deg, #6366f1, #06b6d4)',
                border: 'none',
                borderRadius: 10,
                padding: '0 16px',
                color: '#fff',
                fontWeight: 600,
                fontSize: '0.85rem',
                cursor: loading || !query.trim() ? 'not-allowed' : 'pointer',
                opacity: loading || !query.trim() ? 0.6 : 1
              }}
            >
              Send
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
