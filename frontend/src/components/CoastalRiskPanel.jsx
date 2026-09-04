import React, { useEffect, useState } from 'react'

export default function CoastalRiskPanel({ isOpen, onClose, onFocusPort }) {
  const [riskData, setRiskData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [filterLevel, setFilterLevel] = useState('ALL')

  useEffect(() => {
    if (!isOpen) return
    setLoading(true)
    fetch('/api/coastal_risk')
      .then(res => res.json())
      .then(data => {
        setRiskData(data)
        setLoading(false)
      })
      .catch(err => {
        console.error('Failed to load coastal risk data:', err)
        setLoading(false)
      })
  }, [isOpen])

  if (!isOpen) return null

  const getBadgeStyle = (level) => {
    if (level === 'HIGH') return { bg: 'rgba(239, 68, 68, 0.2)', border: '#ef4444', text: '#fca5a5' }
    if (level === 'MODERATE') return { bg: 'rgba(245, 158, 11, 0.2)', border: '#f59e0b', text: '#fde68a' }
    return { bg: 'rgba(16, 185, 129, 0.2)', border: '#10b981', text: '#6ee7b7' }
  }

  const filteredPorts = riskData?.ports?.filter(p => {
    if (filterLevel === 'ALL') return true
    return p.risk_level === filterLevel
  }) || []

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '860px',
          maxHeight: '85vh',
          backgroundColor: '#0f172a',
          border: '1px solid rgba(245, 158, 11, 0.3)',
          borderRadius: '16px',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.8), 0 0 40px rgba(245, 158, 11, 0.1)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          color: '#e2e8f0'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: '18px 24px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'linear-gradient(90deg, rgba(245,158,11,0.1), rgba(15,23,42,0.6))'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: '1.4rem' }}>🚨</span>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: '#f8fafc' }}>
                Unified Multi-Hazard Coastal Risk Index
              </h2>
              <span style={{
                fontSize: '0.7rem',
                fontWeight: 700,
                background: 'rgba(245,158,11,0.2)',
                color: '#fbbf24',
                border: '1px solid rgba(245,158,11,0.4)',
                padding: '2px 8px',
                borderRadius: 4
              }}>
                INCOIS SIH-26067
              </span>
            </div>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.78rem', color: '#94a3b8' }}>
              Real-time composite hazard scoring integrating significant wave height, marine heatwaves, tidal currents, and storm surge.
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              fontSize: '1.4rem',
              cursor: 'pointer',
              padding: '4px 8px',
              borderRadius: '6px'
            }}
          >
            ✕
          </button>
        </div>

        {/* Summary Metric Strip & Filter */}
        {riskData && (
          <div style={{
            padding: '14px 24px',
            backgroundColor: 'rgba(15, 23, 42, 0.7)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12
          }}>
            <div style={{ display: 'flex', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Monitored Ports:</span>
                <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#f8fafc' }}>
                  {riskData.summary.total_ports_monitored}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#ef4444' }} />
                <span style={{ fontSize: '0.75rem', color: '#fca5a5' }}>
                  High Risk: <strong>{riskData.summary.high_risk_count}</strong>
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#f59e0b' }} />
                <span style={{ fontSize: '0.75rem', color: '#fde68a' }}>
                  Moderate: <strong>{riskData.summary.moderate_risk_count}</strong>
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#10b981' }} />
                <span style={{ fontSize: '0.75rem', color: '#6ee7b7' }}>
                  Low: <strong>{riskData.summary.low_risk_count}</strong>
                </span>
              </div>
            </div>

            {/* Filter Chips */}
            <div style={{ display: 'flex', gap: 6 }}>
              {['ALL', 'HIGH', 'MODERATE', 'LOW'].map(lvl => (
                <button
                  key={lvl}
                  onClick={() => setFilterLevel(lvl)}
                  style={{
                    background: filterLevel === lvl ? 'rgba(59, 130, 246, 0.3)' : 'rgba(255,255,255,0.05)',
                    border: `1px solid ${filterLevel === lvl ? '#3b82f6' : 'rgba(255,255,255,0.1)'}`,
                    color: filterLevel === lvl ? '#fff' : '#94a3b8',
                    padding: '4px 10px',
                    borderRadius: 6,
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  {lvl}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Port Cards Grid */}
        <div style={{
          padding: '20px 24px',
          overflowY: 'auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
          gap: 16
        }}>
          {loading ? (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px 0', color: '#94a3b8' }}>
              Calculating Multi-Hazard Coastal Risk Indices...
            </div>
          ) : filteredPorts.map(port => {
            const bStyle = getBadgeStyle(port.risk_level)
            return (
              <div
                key={port.id}
                style={{
                  backgroundColor: 'rgba(30, 41, 59, 0.6)',
                  border: `1px solid ${bStyle.border}40`,
                  borderRadius: '12px',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  position: 'relative'
                }}
              >
                {/* Card Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#f8fafc' }}>
                      {port.name}
                    </h3>
                    <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: 2 }}>
                      {port.state} • {port.region}
                    </div>
                  </div>
                  <div style={{
                    backgroundColor: bStyle.bg,
                    border: `1px solid ${bStyle.border}`,
                    color: bStyle.text,
                    padding: '3px 8px',
                    borderRadius: 6,
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4
                  }}>
                    <span>{port.risk_level}</span>
                    <span style={{ fontSize: '0.78rem' }}>({port.risk_score}/100)</span>
                  </div>
                </div>

                {/* Metrics 4-Box */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr 1fr 1fr',
                  gap: 6,
                  backgroundColor: 'rgba(15, 23, 42, 0.6)',
                  padding: '8px 10px',
                  borderRadius: 8
                }}>
                  <div>
                    <div style={{ fontSize: '0.65rem', color: '#64748b' }}>WAVE (Hm0)</div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#38bdf8' }}>
                      {port.wave_height_m}m
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.65rem', color: '#64748b' }}>SST ANOM</div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#f87171' }}>
                      +{port.sst_anomaly_c}°C
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.65rem', color: '#64748b' }}>CURRENTS</div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#a78bfa' }}>
                      {port.current_knots} kts
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.65rem', color: '#64748b' }}>SURGE</div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#fbbf24' }}>
                      +{port.sea_level_anomaly_cm}cm
                    </div>
                  </div>
                </div>

                {/* Advisory Text */}
                <div style={{
                  fontSize: '0.74rem',
                  color: '#cbd5e1',
                  background: 'rgba(0,0,0,0.2)',
                  padding: '6px 10px',
                  borderRadius: 6,
                  lineHeight: '1.3'
                }}>
                  ⚠️ {port.advisory}
                </div>

                {/* Actions */}
                <button
                  onClick={() => {
                    onFocusPort(port)
                    onClose()
                  }}
                  style={{
                    background: 'linear-gradient(135deg, rgba(59,130,246,0.2), rgba(6,182,212,0.2))',
                    border: '1px solid rgba(59,130,246,0.4)',
                    color: '#67e8f9',
                    padding: '6px 12px',
                    borderRadius: 6,
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6
                  }}
                >
                  🌐 Focus Port in 3D View
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
