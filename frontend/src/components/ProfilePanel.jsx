import React from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'

export default function ProfilePanel({ profileData, instrumentId, outreachMode, onClose }) {
  // Support both raw profile array and wrapped profile object
  const profile = Array.isArray(profileData) ? profileData : (profileData?.profile || [])
  const bias = profileData?.bias ?? (profile[0]?.discrepancy || 0.0)
  const discrepancyStatus = profileData?.discrepancy_status || (Math.abs(bias) >= 1.5 ? 'High Alert (>1.5°C)' : Math.abs(bias) >= 0.5 ? 'Moderate (0.5-1.5°C)' : 'Model Agreement (<0.5°C)')
  const region = profileData?.region || 'Indian Ocean / EEZ'

  if (!profile || profile.length === 0) return null

  const timestamp = profile[0]?.timestamp
  const dateStr = timestamp
    ? new Date(timestamp).toLocaleDateString('en-GB', {
        day: 'numeric', month: 'short', year: 'numeric'
      })
    : 'Unknown'

  // Sort by depth ascending for chart
  const sorted = [...profile].sort((a, b) => a.depth - b.depth)

  const isHighAlert = Math.abs(bias) >= 1.5
  const isModerate = Math.abs(bias) >= 0.5 && Math.abs(bias) < 1.5

  const statusColor = isHighAlert ? '#ef4444' : isModerate ? '#f59e0b' : '#10b981'
  const statusBg = isHighAlert ? 'rgba(239,68,68,0.15)' : isModerate ? 'rgba(245,158,11,0.15)' : 'rgba(16,185,129,0.15)'
  const statusBorder = isHighAlert ? 'rgba(239,68,68,0.4)' : isModerate ? 'rgba(245,158,11,0.4)' : 'rgba(16,185,129,0.4)'

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        right: 0,
        width: 420,
        height: '100%',
        zIndex: 30,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        animation: 'slideIn 0.3s ease-out',
        background: 'rgba(15, 23, 42, 0.88)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderLeft: '1px solid rgba(99,102,241,0.25)',
        boxShadow: '-10px 0 30px rgba(0, 0, 0, 0.5)'
      }}
    >
      {/* Header */}
      <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(99,102,241,0.2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: '1.2rem' }}>🌊</span>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#f8fafc', margin: 0 }}>
                In-Situ vs Model Validation
              </h2>
            </div>
            {!outreachMode && (
              <p style={{ fontSize: '0.8rem', color: '#6366f1', marginTop: 4, fontFamily: 'monospace', fontWeight: 600 }}>
                {instrumentId} • <span style={{ color: '#94a3b8' }}>{region}</span>
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(239,68,68,0.15)',
              border: '1px solid rgba(239,68,68,0.3)',
              color: '#ef4444',
              borderRadius: 6,
              width: 30, height: 30,
              cursor: 'pointer',
              fontSize: '1rem',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            ✕
          </button>
        </div>

        {/* Model Discrepancy Calibration Card */}
        <div style={{
          marginTop: 12,
          padding: '10px 14px',
          background: statusBg,
          borderRadius: 8,
          border: `1px solid ${statusBorder}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <span style={{ fontSize: '0.7rem', color: '#cbd5e1', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Discrepancy Status
            </span>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: statusColor, marginTop: 2 }}>
              {discrepancyStatus}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '0.7rem', color: '#cbd5e1', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Surface Bias (ΔT)
            </span>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: '#f8fafc', marginTop: 2 }}>
              {bias >= 0 ? `+${bias.toFixed(2)}` : bias.toFixed(2)}°C
            </div>
          </div>
        </div>
      </div>

      {/* Charts Container */}
      <div style={{ flex: 1, padding: '14px 12px', overflowY: 'auto' }}>
        {/* Temperature Comparison Chart */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 8px 6px' }}>
            <h3 style={{ fontSize: '0.8rem', fontWeight: 700, color: '#f1f5f9', textTransform: 'uppercase', margin: 0 }}>
              Temperature Profile (°C)
            </h3>
            <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>0m to 2000m depth</span>
          </div>

          <ResponsiveContainer width="100%" height={230}>
            <LineChart data={sorted} margin={{ top: 5, right: 15, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis
                dataKey="temperature"
                type="number"
                tick={{ fill: '#94a3b8', fontSize: 10 }}
                stroke="rgba(99,102,241,0.2)"
                domain={['auto', 'auto']}
              />
              <YAxis
                dataKey="depth"
                reversed
                type="number"
                tick={{ fill: '#94a3b8', fontSize: 10 }}
                stroke="rgba(99,102,241,0.2)"
                width={36}
              />
              <Tooltip
                contentStyle={{
                  background: 'rgba(15,23,42,0.95)',
                  border: '1px solid rgba(99,102,241,0.3)',
                  borderRadius: 8,
                  color: '#e2e8f0',
                  fontSize: 11,
                }}
                formatter={(val, name) => [`${Number(val).toFixed(2)} °C`, name]}
                labelFormatter={(val) => `Depth: ${val} m`}
              />
              <Legend
                verticalAlign="top"
                height={28}
                iconSize={8}
                wrapperStyle={{ fontSize: 11, color: '#cbd5e1' }}
              />
              <Line
                name="Observed Float"
                type="monotone"
                dataKey="temperature"
                stroke="#f97316"
                strokeWidth={2.5}
                dot={{ r: 2, fill: '#f97316' }}
                activeDot={{ r: 5, fill: '#fb923c' }}
              />
              <Line
                name="Model Forecast"
                type="monotone"
                dataKey="model_temperature"
                stroke="#06b6d4"
                strokeWidth={2}
                strokeDasharray="4 3"
                dot={{ r: 2, fill: '#06b6d4' }}
                activeDot={{ r: 4, fill: '#22d3ee' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Salinity Comparison Chart */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 8px 6px' }}>
            <h3 style={{ fontSize: '0.8rem', fontWeight: 700, color: '#f1f5f9', textTransform: 'uppercase', margin: 0 }}>
              Salinity Profile (PSU)
            </h3>
            <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Halocline curve</span>
          </div>

          <ResponsiveContainer width="100%" height={230}>
            <LineChart data={sorted} margin={{ top: 5, right: 15, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis
                dataKey="salinity"
                type="number"
                tick={{ fill: '#94a3b8', fontSize: 10 }}
                stroke="rgba(99,102,241,0.2)"
                domain={['auto', 'auto']}
              />
              <YAxis
                dataKey="depth"
                reversed
                type="number"
                tick={{ fill: '#94a3b8', fontSize: 10 }}
                stroke="rgba(99,102,241,0.2)"
                width={36}
              />
              <Tooltip
                contentStyle={{
                  background: 'rgba(15,23,42,0.95)',
                  border: '1px solid rgba(99,102,241,0.3)',
                  borderRadius: 8,
                  color: '#e2e8f0',
                  fontSize: 11,
                }}
                formatter={(val, name) => [`${Number(val).toFixed(2)} PSU`, name]}
                labelFormatter={(val) => `Depth: ${val} m`}
              />
              <Legend
                verticalAlign="top"
                height={28}
                iconSize={8}
                wrapperStyle={{ fontSize: 11, color: '#cbd5e1' }}
              />
              <Line
                name="Observed Salinity"
                type="monotone"
                dataKey="salinity"
                stroke="#38bdf8"
                strokeWidth={2.5}
                dot={{ r: 2, fill: '#38bdf8' }}
              />
              <Line
                name="Model Salinity"
                type="monotone"
                dataKey="model_salinity"
                stroke="#a855f7"
                strokeWidth={2}
                strokeDasharray="4 3"
                dot={{ r: 2, fill: '#a855f7' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
