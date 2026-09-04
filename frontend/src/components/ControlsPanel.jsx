import React from 'react'

const PALETTES = {
  thermal: { label: 'Thermal (SST)', colors: ['#0000ff', '#ff0000'] },
  haline: { label: 'Haline (Salinity)', colors: ['#0044aa', '#00cc66'] },
  oceanic: { label: 'Ocean Waves (Hm0)', colors: ['#042f2e', '#f59e0b'] },
  acidic: { label: 'pH Acidity', colors: ['#ef4444', '#3b82f6'] },
  altimetry: { label: 'Altimetry (SLA)', colors: ['#7c3aed', '#f97316'] },
  viridis: { label: 'Viridis', colors: ['#440154', '#fde725'] },
}

const VAR_LABELS = {
  thetao: 'Temperature (°C)',
  so: 'Salinity (PSU)',
  VHM0: 'Wave Height (m)',
  ph: 'Ocean Acidity (pH)',
  sla: 'Sea Level Anom (m)',
  uo: 'Current (East)',
  vo: 'Current (North)',
}

export default function ControlsPanel({
  metadata,
  activeVar, setActiveVar,
  activeDepth, setActiveDepth,
  palette, setPalette,
  colorMin, setColorMin,
  colorMax, setColorMax,
  logScale, setLogScale,
  opacity, setOpacity,
  vertExag, setVertExag,
  showDiscrepancy, setShowDiscrepancy,
  onlyDivergent, setOnlyDivergent,
  showSatellite, setShowSatellite,
  isoValue, setIsoValue,
  showIso, setShowIso,
  showGlider, setShowGlider,
  showCoastalRisk, setShowCoastalRisk,
  onOpenCoastalRisk,
  onOpenUpload,
}) {
  if (!metadata) return null

  const ToggleSwitch = ({ checked, onChange }) => (
    <div 
      onClick={() => onChange(!checked)}
      style={{
        width: 36, height: 20, borderRadius: 10,
        background: checked ? '#3b82f6' : 'rgba(255,255,255,0.2)',
        position: 'relative', cursor: 'pointer', transition: '0.3s'
      }}
    >
      <div style={{
        width: 16, height: 16, borderRadius: '50%', background: '#fff',
        position: 'absolute', top: 2, left: checked ? 18 : 2, transition: '0.3s'
      }} />
    </div>
  )

  const getDepthZoneLabel = (d) => {
    if (d <= 1.0) return 'Sea Surface (SST)'
    if (d <= 30.0) return 'Mixed Layer'
    if (d <= 250.0) return 'Thermocline Zone'
    if (d <= 1000.0) return 'Intermediate Layer'
    return 'Abyssal Deep Water'
  }

  return (
    <div
      style={{
        position: 'absolute',
        top: 90,
        left: 24,
        width: 330,
        zIndex: 15,
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        maxHeight: 'calc(100vh - 120px)',
        overflowY: 'auto',
        background: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        borderRadius: '14px',
        padding: '16px',
        color: '#e2e8f0',
        boxShadow: '0 12px 40px rgba(0, 0, 0, 0.5)'
      }}
    >
      {/* Ingest Dataset Button */}
      <button
        onClick={onOpenUpload}
        style={{
          background: 'linear-gradient(135deg, rgba(99,102,241,0.3), rgba(6,182,212,0.3))',
          border: '1px solid rgba(99,102,241,0.5)',
          color: '#ffffff',
          borderRadius: 8,
          padding: '8px 12px',
          fontSize: '0.8rem',
          fontWeight: 600,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          transition: 'all 0.2s ease',
          boxShadow: '0 4px 12px rgba(99,102,241,0.2)'
        }}
      >
        <span>📥</span> Ingest NetCDF / CSV Dataset
      </button>

      {/* Layer Header */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <h2 style={{ fontSize: '0.85rem', fontWeight: 700, margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94a3b8' }}>
          Data Layers
        </h2>
        
        {/* Ocean Model Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255, 255, 255, 0.05)', padding: '10px 12px', borderRadius: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <ToggleSwitch checked={true} onChange={() => {}} />
            <select
              value={activeVar || ''}
              onChange={(e) => {
                const nv = e.target.value
                setActiveVar(nv)
                if (nv === 'VHM0') {
                  setPalette('oceanic')
                  setColorMin(0.0)
                  setColorMax(6.0)
                } else if (nv === 'ph') {
                  setPalette('acidic')
                  setColorMin(7.6)
                  setColorMax(8.3)
                } else if (nv === 'sla') {
                  setPalette('altimetry')
                  setColorMin(-0.25)
                  setColorMax(0.25)
                } else if (nv === 'thetao') {
                  setPalette('thermal')
                  setColorMin(0.0)
                  setColorMax(32.0)
                } else if (nv === 'so') {
                  setPalette('haline')
                  setColorMin(31.0)
                  setColorMax(38.0)
                }
              }}
              style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '0.85rem', fontWeight: 600, outline: 'none', cursor: 'pointer', padding: 0 }}
            >
              {metadata.variables?.map(v => (
                <option key={v} value={v} style={{ color: '#000' }}>{VAR_LABELS[v] || v}</option>
              ))}
            </select>
          </div>
          <span style={{ fontSize: '0.7rem', color: '#06b6d4', fontWeight: 600 }}>Model Grid</span>
        </div>

        {/* In-Situ Toggle & Discrepancy Filter */}
        <div style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '10px 12px', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <ToggleSwitch checked={showDiscrepancy} onChange={setShowDiscrepancy} />
              <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>In-Situ: Real Argo (289)</span>
            </div>
            <span style={{ fontSize: '0.7rem', color: '#10b981', fontWeight: 600 }}>Probes</span>
          </div>

          {showDiscrepancy && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, paddingLeft: 4 }}>
              <input
                type="checkbox"
                id="onlyDivergent"
                checked={onlyDivergent || false}
                onChange={(e) => setOnlyDivergent && setOnlyDivergent(e.target.checked)}
                style={{ accentColor: '#ef4444', cursor: 'pointer' }}
              />
              <label htmlFor="onlyDivergent" style={{ fontSize: '0.72rem', color: '#cbd5e1', cursor: 'pointer' }}>
                Filter: High Discrepancy Alert Probes (&gt;1.5°C)
              </label>
            </div>
          )}
        </div>

        {/* Autonomous Glider Sawtooth Toggle */}
        <div style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '10px 12px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <ToggleSwitch checked={showGlider} onChange={setShowGlider} />
            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>3D AUV Glider (Sawtooth)</span>
          </div>
          <span style={{ fontSize: '0.68rem', color: '#a855f7', fontWeight: 700, background: 'rgba(168,85,247,0.15)', padding: '2px 6px', borderRadius: 4 }}>SIH-26067</span>
        </div>

        {/* Coastal Multi-Hazard Ports Toggle */}
        <div style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '10px 12px', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <ToggleSwitch checked={showCoastalRisk} onChange={setShowCoastalRisk} />
              <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Coastal Multi-Hazard Ports</span>
            </div>
            <span style={{ fontSize: '0.68rem', color: '#f59e0b', fontWeight: 700 }}>8 Ports</span>
          </div>
          {showCoastalRisk && (
            <button
              onClick={onOpenCoastalRisk}
              style={{
                background: 'linear-gradient(135deg, rgba(245,158,11,0.2), rgba(239,68,68,0.2))',
                border: '1px solid rgba(245,158,11,0.4)',
                color: '#fbbf24',
                borderRadius: 6,
                padding: '4px 8px',
                fontSize: '0.72rem',
                fontWeight: 600,
                cursor: 'pointer',
                marginTop: 2
              }}
            >
              📊 Open Coastal Risk Dashboard
            </button>
          )}
        </div>
      </div>

      {/* Depth Slider */}
      {metadata.depths && activeDepth !== null && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, background: 'rgba(255, 255, 255, 0.03)', padding: '10px 12px', borderRadius: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Depth Slice</span>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#38bdf8' }}>{activeDepth}m</span>
          </div>

          <input
            type="range"
            min={0}
            max={metadata.depths.length - 1}
            step={1}
            value={metadata.depths.indexOf(activeDepth)}
            onChange={(e) => setActiveDepth(metadata.depths[Number(e.target.value)])}
            style={{ width: '100%', cursor: 'pointer', accentColor: '#3b82f6', marginTop: 4 }}
          />

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: '#94a3b8' }}>
            <span>0.5m (Surface)</span>
            <span style={{ color: '#06b6d4', fontWeight: 600 }}>{getDepthZoneLabel(activeDepth)}</span>
            <span>2000m (Abyssal)</span>
          </div>
        </div>
      )}

      {/* Colorbar & Variable Controls (Collapsible) */}
      <details open style={{ marginTop: 2 }}>
        <summary style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', cursor: 'pointer', outline: 'none', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Colorbar & Controls
        </summary>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 10, paddingLeft: 8, borderLeft: '2px solid rgba(59,130,246,0.2)' }}>
          {/* Palette */}
          <div>
            <label style={labelStyle}>Color Palette</label>
            <select
              value={palette}
              onChange={(e) => setPalette(e.target.value)}
              style={selectStyle}
            >
              {Object.entries(PALETTES).map(([key, p]) => (
                <option key={key} value={key} style={{ color: '#000' }}>{p.label}</option>
              ))}
            </select>
            <div style={{
              width: '100%', height: 6, marginTop: 6, borderRadius: 3,
              background: palette === 'thermal' 
                ? 'linear-gradient(to right, blue, cyan, green, yellow, red)' 
                : `linear-gradient(to right, ${PALETTES[palette]?.colors[0]}, ${PALETTES[palette]?.colors[1]})`
            }} />
          </div>

          {/* Color Min/Max */}
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Min</label>
              <input
                type="number"
                step="0.1"
                value={colorMin}
                onChange={(e) => setColorMin(parseFloat(e.target.value) || 0)}
                style={inputStyle}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Max</label>
              <input
                type="number"
                step="0.1"
                value={colorMax}
                onChange={(e) => setColorMax(parseFloat(e.target.value) || 0)}
                style={inputStyle}
              />
            </div>
          </div>

          {/* Toggles Row */}
          <div style={{ display: 'flex', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <input
                type="checkbox"
                checked={logScale}
                onChange={(e) => setLogScale(e.target.checked)}
                style={{ accentColor: '#6366f1', cursor: 'pointer' }}
              />
              <label style={{ ...labelStyle, marginBottom: 0, textTransform: 'none' }}>Log Scale</label>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <input
                type="checkbox"
                checked={showSatellite}
                onChange={(e) => setShowSatellite(e.target.checked)}
                style={{ accentColor: '#6366f1', cursor: 'pointer' }}
              />
              <label style={{ ...labelStyle, marginBottom: 0, textTransform: 'none' }}>Satellite</label>
            </div>
          </div>

          {/* Opacity */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <label style={labelStyle}>Opacity</label>
              <span style={valueStyle}>{Math.round(opacity * 100)}%</span>
            </div>
            <input
              type="range" min={0} max={1} step={0.05}
              value={opacity}
              onChange={(e) => setOpacity(parseFloat(e.target.value))}
              style={sliderStyle}
            />
          </div>

          {/* Vertical Exaggeration */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <label style={labelStyle}>Vert. Exaggeration</label>
              <span style={valueStyle}>{vertExag.toFixed(1)}×</span>
            </div>
            <input
              type="range" min={0.5} max={10} step={0.5}
              value={vertExag}
              onChange={(e) => setVertExag(parseFloat(e.target.value))}
              style={sliderStyle}
            />
          </div>
        </div>
      </details>

      {/* Isosurface Control */}
      <details style={{ marginTop: 2 }}>
        <summary style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', cursor: 'pointer', outline: 'none', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Isosurface / Contour
        </summary>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 10, paddingLeft: 8, borderLeft: '2px solid rgba(234,179,8,0.3)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="checkbox"
              checked={showIso}
              onChange={(e) => setShowIso(e.target.checked)}
              style={{ accentColor: '#eab308', cursor: 'pointer' }}
            />
            <label style={{ ...labelStyle, marginBottom: 0, textTransform: 'none' }}>Show Contour Lines</label>
          </div>
          <div>
            <label style={labelStyle}>Iso Value</label>
            <input
              type="number"
              step="0.5"
              value={isoValue}
              onChange={(e) => setIsoValue(parseFloat(e.target.value) || 0)}
              style={inputStyle}
            />
          </div>
        </div>
      </details>
    </div>
  )
}

const labelStyle = {
  fontSize: '0.7rem', fontWeight: 600, color: '#94a3b8',
  textTransform: 'uppercase', marginBottom: 4, display: 'block',
}
const valueStyle = {
  fontSize: '0.75rem', color: '#3b82f6', fontWeight: 'bold',
}
const selectStyle = {
  width: '100%', padding: '6px 8px', borderRadius: 6,
  background: 'rgba(15,23,42,0.8)', color: '#e2e8f0',
  border: '1px solid rgba(59,130,246,0.25)', fontSize: '0.8rem',
  cursor: 'pointer', outline: 'none',
}
const inputStyle = {
  width: '100%', padding: '6px 8px', borderRadius: 6,
  background: 'rgba(15,23,42,0.8)', color: '#e2e8f0',
  border: '1px solid rgba(59,130,246,0.25)', fontSize: '0.8rem',
  outline: 'none',
}
const sliderStyle = {
  width: '100%', cursor: 'pointer', accentColor: '#3b82f6',
}
