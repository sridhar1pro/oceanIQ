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
  vectorSpeed, setVectorSpeed,
  showDiscrepancy, setShowDiscrepancy,
  onlyDivergent, setOnlyDivergent,
  showSatellite, setShowSatellite,
  isoValue, setIsoValue,
  showIso, setShowIso,
  showGlider, setShowGlider,
  showCoastalRisk, setShowCoastalRisk,
  showVessels, setShowVessels,
  showCalamities, setShowCalamities,
  onOpenCoastalRisk,
  onOpenWorldMonitor,
  onOpenUpload,
}) {
  if (!metadata) return null

  const ToggleSwitch = ({ checked, onChange }) => (
    <div 
      onClick={() => onChange(!checked)}
      style={{
        width: 36, height: 20, borderRadius: 10,
        background: checked ? '#06b6d4' : 'rgba(255,255,255,0.2)',
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

  const getUnit = (v) => {
    if (v === 'thetao') return '°C'
    if (v === 'so') return 'PSU'
    if (v === 'VHM0') return 'm'
    if (v === 'ph') return 'pH'
    if (v === 'sla') return 'm'
    return 'm/s'
  }

  return (
    <div
      style={{
        position: 'absolute',
        top: 86,
        left: 20,
        width: 340,
        zIndex: 15,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        maxHeight: 'calc(100vh - 110px)',
        overflowY: 'auto',
        background: 'rgba(15, 23, 42, 0.85)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        borderRadius: '16px',
        padding: '16px',
        color: '#e2e8f0',
        boxShadow: '0 12px 40px rgba(0, 0, 0, 0.6)'
      }}
    >
      {/* Action Buttons Row: World Monitor & Dataset Ingest */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <button
          onClick={onOpenWorldMonitor}
          style={{
            background: 'linear-gradient(135deg, rgba(6,182,212,0.35), rgba(59,130,246,0.35))',
            border: '1px solid rgba(6,182,212,0.6)',
            color: '#38bdf8',
            borderRadius: 8,
            padding: '8px 10px',
            fontSize: '0.75rem',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            transition: '0.2s'
          }}
        >
          <span>🌐</span> World Monitor
        </button>

        <button
          onClick={onOpenUpload}
          style={{
            background: 'linear-gradient(135deg, rgba(99,102,241,0.25), rgba(168,85,247,0.25))',
            border: '1px solid rgba(168,85,247,0.4)',
            color: '#c084fc',
            borderRadius: 8,
            padding: '8px 10px',
            fontSize: '0.75rem',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            transition: '0.2s'
          }}
        >
          <span>📥</span> Ingest NetCDF
        </button>
      </div>

      {/* Layer Toggles Section */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Scientific & OSINT Layers
        </div>

        {/* Scientific Variable Picker */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'rgba(30, 41, 59, 0.6)', padding: '6px 10px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.06)'
        }}>
          <select
            value={activeVar || ''}
            onChange={(e) => setActiveVar(e.target.value)}
            style={{
              background: 'transparent', color: '#fff', border: 'none',
              fontSize: '0.8rem', fontWeight: 600, outline: 'none', cursor: 'pointer', flex: 1
            }}
          >
            {metadata.variables?.map(v => (
              <option key={v} value={v} style={{ background: '#0f172a', color: '#fff' }}>
                {VAR_LABELS[v] || v}
              </option>
            ))}
          </select>
          <span style={{ fontSize: '0.68rem', color: '#06b6d4', fontWeight: 600 }}>Grid</span>
        </div>

        {/* 289 In-Situ Real Argo Floats */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'rgba(30, 41, 59, 0.6)', padding: '6px 10px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.06)'
        }}>
          <div>
            <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#e2e8f0' }}>In-Situ Argo Floats (289)</div>
            <div style={{ fontSize: '0.65rem', color: '#94a3b8' }}>Vertical CTD Soundings</div>
          </div>
          <ToggleSwitch checked={showDiscrepancy} onChange={setShowDiscrepancy} />
        </div>

        {/* Maritime OSINT Vessels */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'rgba(30, 41, 59, 0.6)', padding: '6px 10px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.06)'
        }}>
          <div>
            <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#38bdf8' }}>🚢 AIS Maritime Vessels</div>
            <div style={{ fontSize: '0.65rem', color: '#94a3b8' }}>Tankers, Cargo, Research</div>
          </div>
          <ToggleSwitch checked={showVessels} onChange={setShowVessels} />
        </div>

        {/* Calamity & Cyclone Radar */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'rgba(30, 41, 59, 0.6)', padding: '6px 10px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.06)'
        }}>
          <div>
            <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#f87171' }}>🌪️ Calamity & Cyclone Radar</div>
            <div style={{ fontSize: '0.65rem', color: '#94a3b8' }}>Midhili-II, Tsunami, MHW</div>
          </div>
          <ToggleSwitch checked={showCalamities} onChange={setShowCalamities} />
        </div>

        {/* 3D AUV Glider */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'rgba(30, 41, 59, 0.6)', padding: '6px 10px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.06)'
        }}>
          <div>
            <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#c084fc' }}>🤖 3D AUV Glider (Sawtooth)</div>
            <div style={{ fontSize: '0.65rem', color: '#94a3b8' }}>Bay of Bengal 16 Cycles</div>
          </div>
          <ToggleSwitch checked={showGlider} onChange={setShowGlider} />
        </div>

        {/* Coastal Multi-Hazard Ports */}
        <div style={{
          background: 'rgba(30, 41, 59, 0.6)', padding: '6px 10px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.06)',
          display: 'flex', flexDirection: 'column', gap: 6
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#f59e0b' }}>Coastal Ports (8 Hubs)</span>
            <ToggleSwitch checked={showCoastalRisk} onChange={setShowCoastalRisk} />
          </div>
          {showCoastalRisk && (
            <button
              onClick={onOpenCoastalRisk}
              style={{
                background: 'rgba(245, 158, 11, 0.2)', border: '1px solid rgba(245, 158, 11, 0.4)',
                borderRadius: 6, color: '#fcd34d', padding: '4px', fontSize: '0.7rem', fontWeight: 600, cursor: 'pointer'
              }}
            >
              Open Port Risk Dashboard
            </button>
          )}
        </div>
      </div>

      {/* Volumetric Depth Slicing */}
      {metadata.depths && (
        <div style={{ background: 'rgba(30, 41, 59, 0.6)', padding: '10px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Depth Slice</span>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#38bdf8' }}>{activeDepth}m</span>
          </div>
          <input
            type="range"
            min={0}
            max={metadata.depths.length - 1}
            step={1}
            value={metadata.depths.indexOf(activeDepth)}
            onChange={(e) => setActiveDepth(metadata.depths[Number(e.target.value)])}
            style={{ width: '100%', cursor: 'pointer', accentColor: '#06b6d4', marginTop: 4 }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.62rem', color: '#94a3b8', marginTop: 2 }}>
            <span>0.5m (Surface)</span>
            <span style={{ color: '#06b6d4', fontWeight: 600 }}>{getDepthZoneLabel(activeDepth)}</span>
            <span>2000m (Abyssal)</span>
          </div>
        </div>
      )}

      {/* Vector Current Flow Speed Control */}
      <div style={{ background: 'rgba(30, 41, 59, 0.6)', padding: '10px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>
            Current Vector Flow Speed
          </span>
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#2dd4bf' }}>
            {vectorSpeed?.toFixed(1) || '1.0'}×
          </span>
        </div>
        <input
          type="range"
          min={0.1}
          max={3.0}
          step={0.1}
          value={vectorSpeed || 1.0}
          onChange={(e) => setVectorSpeed(parseFloat(e.target.value))}
          style={{ width: '100%', cursor: 'pointer', accentColor: '#2dd4bf', marginTop: 6 }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.62rem', color: '#94a3b8', marginTop: 2 }}>
          <span>0.1× (Gentle)</span>
          <span style={{ color: '#2dd4bf' }}>Monsoon Currents</span>
          <span>3.0× (Rapid)</span>
        </div>
      </div>

      {/* Colorbar & Scientific Range Display */}
      <details open style={{ background: 'rgba(30, 41, 59, 0.6)', padding: '10px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.06)' }}>
        <summary style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', cursor: 'pointer', outline: 'none', textTransform: 'uppercase' }}>
          Colormap & Calibration
        </summary>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
          <div>
            <label style={labelStyle}>Palette</label>
            <select
              value={palette}
              onChange={(e) => setPalette(e.target.value)}
              style={selectStyle}
            >
              {Object.entries(PALETTES).map(([key, p]) => (
                <option key={key} value={key} style={{ color: '#000' }}>{p.label}</option>
              ))}
            </select>
            {/* Color Gradient Bar */}
            <div style={{
              width: '100%', height: 8, marginTop: 6, borderRadius: 4,
              background: palette === 'thermal' 
                ? 'linear-gradient(to right, blue, cyan, green, yellow, red)' 
                : `linear-gradient(to right, ${PALETTES[palette]?.colors[0]}, ${PALETTES[palette]?.colors[1]})`
            }} />
            {/* Numerical Labels for Colorbar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.62rem', color: '#94a3b8', marginTop: 4 }}>
              <span>{colorMin.toFixed(1)} {getUnit(activeVar)}</span>
              {palette === 'thermal' && <span style={{ color: '#facc15' }}>~29°C (Yellow Band)</span>}
              <span>{colorMax.toFixed(1)} {getUnit(activeVar)}</span>
            </div>
          </div>

          {/* Color Min/Max Inputs */}
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Min Range</label>
              <input
                type="number"
                step="0.1"
                value={colorMin}
                onChange={(e) => setColorMin(parseFloat(e.target.value) || 0)}
                style={inputStyle}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Max Range</label>
              <input
                type="number"
                step="0.1"
                value={colorMax}
                onChange={(e) => setColorMax(parseFloat(e.target.value) || 0)}
                style={inputStyle}
              />
            </div>
          </div>

          {/* Opacity & Vert Exaggeration */}
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Opacity ({Math.round(opacity * 100)}%)</label>
              <input
                type="range" min={0.1} max={1} step={0.05}
                value={opacity}
                onChange={(e) => setOpacity(parseFloat(e.target.value))}
                style={sliderStyle}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>3D Exaggeration ({vertExag.toFixed(1)}×)</label>
              <input
                type="range" min={0.5} max={8} step={0.5}
                value={vertExag}
                onChange={(e) => setVertExag(parseFloat(e.target.value))}
                style={sliderStyle}
              />
            </div>
          </div>
        </div>
      </details>
    </div>
  )
}

const labelStyle = {
  fontSize: '0.68rem', fontWeight: 600, color: '#94a3b8',
  textTransform: 'uppercase', marginBottom: 3, display: 'block',
}
const selectStyle = {
  width: '100%', padding: '6px 8px', borderRadius: 6,
  background: 'rgba(15,23,42,0.8)', color: '#e2e8f0',
  border: '1px solid rgba(59,130,246,0.25)', fontSize: '0.78rem',
  cursor: 'pointer', outline: 'none',
}
const inputStyle = {
  width: '100%', padding: '6px 8px', borderRadius: 6,
  background: 'rgba(15,23,42,0.8)', color: '#e2e8f0',
  border: '1px solid rgba(59,130,246,0.25)', fontSize: '0.78rem',
  outline: 'none',
}
const sliderStyle = {
  width: '100%', cursor: 'pointer', accentColor: '#06b6d4',
}
