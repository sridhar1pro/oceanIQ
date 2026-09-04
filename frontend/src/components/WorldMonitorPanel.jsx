import React, { useState, useEffect } from 'react'

export default function WorldMonitorPanel({ isOpen, onClose, onFocusCoordinates, onSelectVessel, onSelectSatellite }) {
  const [activeTab, setActiveTab] = useState('vessels') // 'vessels' | 'calamities' | 'webcams' | 'satellites'
  const [vessels, setVessels] = useState([])
  const [calamities, setCalamities] = useState(null)
  const [satellites, setSatellites] = useState([])
  const [webcams, setWebcams] = useState([])
  const [loading, setLoading] = useState(false)
  const [vesselFilter, setVesselFilter] = useState('ALL')

  useEffect(() => {
    if (!isOpen) return
    setLoading(true)
    Promise.all([
      fetch('/api/vessels').then(r => r.json()).catch(() => ({ vessels: [] })),
      fetch('/api/calamities').then(r => r.json()).catch(() => ({ data: {} })),
      fetch('/api/satellites').then(r => r.json()).catch(() => ({ satellites: [] })),
      fetch('/api/webcams').then(r => r.json()).catch(() => ({ webcams: [] }))
    ]).then(([vData, cData, sData, wData]) => {
      setVessels(vData.vessels || [])
      setCalamities(cData.data || {})
      setSatellites(sData.satellites || [])
      setWebcams(wData.webcams || [])
      setLoading(false)
    })
  }, [isOpen])

  if (!isOpen) return null

  const filteredVessels = vessels.filter(v => {
    if (vesselFilter === 'ALL') return true
    if (vesselFilter === 'RESEARCH') return v.type.toLowerCase().includes('research') || v.type.toLowerCase().includes('patrol')
    if (vesselFilter === 'TANKER') return v.type.toLowerCase().includes('tanker') || v.type.toLowerCase().includes('lng')
    if (vesselFilter === 'CARGO') return v.type.toLowerCase().includes('container') || v.type.toLowerCase().includes('bulk')
    if (vesselFilter === 'FISHING') return v.type.toLowerCase().includes('trawler')
    return true
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-5xl h-[88vh] bg-slate-900/95 border border-cyan-500/30 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100 font-sans">
        
        {/* Top Header */}
        <div className="px-6 py-4 bg-slate-800/80 border-b border-cyan-500/20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500"></span>
            </span>
            <div>
              <h2 className="text-xl font-bold tracking-wide bg-gradient-to-r from-cyan-400 to-teal-300 bg-clip-text text-transparent">
                WORLD MONITOR • MARITIME OSINT INTELLIGENCE
              </h2>
              <p className="text-xs text-slate-400">
                INCOIS Maritime Situational Awareness • Live AIS Fleet • Calamity Feeds • Harbor Surveillance
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700/60 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-700/60 bg-slate-800/40 px-6 gap-2 text-sm font-medium">
          <button 
            onClick={() => setActiveTab('vessels')}
            className={`py-3 px-4 flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'vessels'
                ? 'border-cyan-400 text-cyan-300 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            🚢 Live AIS Maritime Traffic
            <span className="px-1.5 py-0.5 text-xs rounded-full bg-cyan-900/60 text-cyan-300 border border-cyan-500/30">
              {vessels.length}
            </span>
          </button>

          <button 
            onClick={() => setActiveTab('calamities')}
            className={`py-3 px-4 flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'calamities'
                ? 'border-red-400 text-red-300 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            🌪️ Calamity & Cyclone Radar
            <span className="px-1.5 py-0.5 text-xs rounded-full bg-red-900/60 text-red-300 border border-red-500/30">
              {(calamities?.active_cyclones?.length || 0) + (calamities?.seismic_tsunami_events?.length || 0)}
            </span>
          </button>

          <button 
            onClick={() => setActiveTab('webcams')}
            className={`py-3 px-4 flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'webcams'
                ? 'border-amber-400 text-amber-300 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            📹 Coastal Harbor Webcams
            <span className="px-1.5 py-0.5 text-xs rounded-full bg-amber-900/60 text-amber-300 border border-amber-500/30">
              {webcams.length}
            </span>
          </button>

          <button 
            onClick={() => setActiveTab('satellites')}
            className={`py-3 px-4 flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'satellites'
                ? 'border-purple-400 text-purple-300 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            🛰️ Ocean Satellites
            <span className="px-1.5 py-0.5 text-xs rounded-full bg-purple-900/60 text-purple-300 border border-purple-500/30">
              {satellites.length}
            </span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          {loading && (
            <div className="flex items-center justify-center py-20 text-slate-400">
              <span className="animate-spin text-2xl mr-3">⟳</span> Fetching real-time global telemetry...
            </div>
          )}

          {/* ── TAB 1: AIS VESSELS ── */}
          {!loading && activeTab === 'vessels' && (
            <div className="space-y-4">
              {/* Vessel Filters */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 font-medium">Filter Fleet:</span>
                  {['ALL', 'RESEARCH', 'TANKER', 'CARGO', 'FISHING'].map(filterKey => (
                    <button
                      key={filterKey}
                      onClick={() => setVesselFilter(filterKey)}
                      className={`text-xs px-2.5 py-1 rounded-md transition-colors ${
                        vesselFilter === filterKey
                          ? 'bg-cyan-500 text-slate-950 font-bold'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      {filterKey}
                    </button>
                  ))}
                </div>
                <div className="text-xs text-slate-400">
                  Tracking <strong className="text-cyan-300">{filteredVessels.length}</strong> active vessels across Indian Ocean sealanes
                </div>
              </div>

              {/* Vessel Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredVessels.map(v => (
                  <div 
                    key={v.mmsi} 
                    className="p-4 rounded-xl bg-slate-800/60 border border-slate-700 hover:border-cyan-500/50 transition-all flex flex-col justify-between group"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-bold text-white flex items-center gap-1.5">
                          {v.name}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded bg-slate-900 text-cyan-400 border border-cyan-500/20 font-mono">
                          {v.flag}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 mb-1">
                        <strong>Type:</strong> {v.type}
                      </div>
                      <div className="text-xs text-slate-400 mb-1">
                        <strong>Operator:</strong> {v.operator}
                      </div>
                      <div className="text-xs text-slate-400 mb-2">
                        <strong>Destination:</strong> <span className="text-slate-200">{v.destination}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs bg-slate-900/80 p-2.5 rounded-lg border border-slate-700/50 mb-3 font-mono">
                        <div>
                          <span className="text-slate-500">Speed:</span>{' '}
                          <strong className="text-teal-300">{v.speed_knots} kts</strong>
                        </div>
                        <div>
                          <span className="text-slate-500">Course:</span>{' '}
                          <strong className="text-slate-300">{v.course_deg}°</strong>
                        </div>
                        <div>
                          <span className="text-slate-500">Draft:</span>{' '}
                          <strong className="text-slate-300">{v.draft_m} m</strong>
                        </div>
                        <div>
                          <span className="text-slate-500">MMSI:</span>{' '}
                          <strong className="text-slate-300">{v.mmsi}</strong>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        onFocusCoordinates?.(v.lat, v.lon, 24)
                        onSelectVessel?.(v)
                        onClose()
                      }}
                      className="w-full py-1.5 rounded-lg bg-cyan-600/30 hover:bg-cyan-500 hover:text-slate-950 text-cyan-300 text-xs font-semibold border border-cyan-500/30 transition-all flex items-center justify-center gap-1.5"
                    >
                      🎯 Track on 3D Globe ({v.lat.toFixed(1)}°N, {v.lon.toFixed(1)}°E)
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── TAB 2: CALAMITY & CYCLONES ── */}
          {!loading && activeTab === 'calamities' && (
            <div className="space-y-6">
              {/* Cyclonic Storm Alert */}
              {calamities?.active_cyclones?.map(cyc => (
                <div 
                  key={cyc.id} 
                  className="p-5 rounded-xl bg-red-950/30 border border-red-500/40 relative overflow-hidden"
                >
                  <div className="absolute -right-8 -top-8 w-32 h-32 bg-red-500/10 rounded-full blur-2xl pointer-events-none"></div>
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">🌪️</span>
                      <div>
                        <h3 className="text-lg font-bold text-red-300">{cyc.name}</h3>
                        <p className="text-xs text-red-400/80">{cyc.agency} • {cyc.category}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        onFocusCoordinates?.(cyc.center_lat, cyc.center_lon, 22)
                        onClose()
                      }}
                      className="px-3 py-1.5 rounded-lg bg-red-600/30 hover:bg-red-500 hover:text-slate-950 text-red-300 text-xs font-semibold border border-red-500/40 transition-all"
                    >
                      🎯 Focus Cyclone Vortex ({cyc.center_lat}°N, {cyc.center_lon}°E)
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 rounded-lg bg-slate-900/80 border border-red-500/20 mb-4 font-mono text-xs">
                    <div>
                      <span className="text-slate-500">Max Wind:</span>
                      <div className="text-base font-bold text-red-300">{cyc.max_sustained_winds_knots} knots</div>
                    </div>
                    <div>
                      <span className="text-slate-500">Gusts:</span>
                      <div className="text-base font-bold text-amber-300">{cyc.gusts_knots} knots</div>
                    </div>
                    <div>
                      <span className="text-slate-500">Pressure:</span>
                      <div className="text-base font-bold text-slate-200">{cyc.central_pressure_hpa} hPa</div>
                    </div>
                    <div>
                      <span className="text-slate-500">Storm Surge:</span>
                      <div className="text-base font-bold text-cyan-300">+{cyc.storm_surge_forecast_m} m</div>
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 mb-3 leading-relaxed">
                    ⚠️ <strong>Maritime Advisory:</strong> {cyc.advisory}
                  </p>

                  <div className="text-xs text-slate-400">
                    <strong>Threat Coastal Ports:</strong>{' '}
                    {cyc.threat_ports.map(p => (
                      <span key={p} className="inline-block mr-1.5 px-2 py-0.5 rounded bg-red-900/60 text-red-200 border border-red-500/30">
                        {p}
                      </span>
                    ))}
                  </div>
                </div>
              ))}

              {/* Seismic Tsunami Warning */}
              {calamities?.seismic_tsunami_events?.map(eq => (
                <div key={eq.id} className="p-5 rounded-xl bg-teal-950/20 border border-teal-500/30">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">🌊</span>
                      <h4 className="font-bold text-teal-300">Submarine Seismic & Tsunami Evaluation: {eq.location}</h4>
                    </div>
                    <span className="text-xs px-2.5 py-1 rounded-full bg-teal-900/60 text-teal-300 border border-teal-500/30 font-semibold">
                      {eq.itewc_status}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-xs bg-slate-900/80 p-3 rounded-lg border border-slate-700 font-mono mb-2">
                    <div>Magnitude: <strong className="text-teal-300">M{eq.magnitude_mw}</strong></div>
                    <div>Focal Depth: <strong className="text-slate-300">{eq.focal_depth_km} km</strong></div>
                    <div>Water Anomaly: <strong className="text-slate-300">{eq.water_height_anomaly_m} m</strong></div>
                  </div>
                  <p className="text-xs text-slate-400">Origin Agency: {eq.agency}</p>
                </div>
              ))}

              {/* Marine Heatwave Alerts */}
              <div>
                <h4 className="text-sm font-bold text-amber-300 mb-3 flex items-center gap-1.5">
                  🔥 Marine Heatwave (MHW) Alerts & Coral Bleaching Stress
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {calamities?.marine_heatwaves?.map(mhw => (
                    <div key={mhw.id} className="p-4 rounded-xl bg-amber-950/20 border border-amber-500/30">
                      <div className="flex items-center justify-between mb-1">
                        <strong className="text-sm text-amber-300">{mhw.region}</strong>
                        <span className="text-xs px-2 py-0.5 rounded bg-amber-900/50 text-amber-200 border border-amber-500/30 font-semibold">
                          {mhw.category}
                        </span>
                      </div>
                      <div className="text-xs text-slate-300 mb-1">
                        <strong>SST Anomaly:</strong> {mhw.sst_anomaly_c} (DHW: {mhw.degree_heating_weeks})
                      </div>
                      <p className="text-xs text-slate-400">{mhw.impact}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── TAB 3: COASTAL WEBCAMS ── */}
          {!loading && activeTab === 'webcams' && (
            <div className="space-y-4">
              <p className="text-xs text-slate-400">
                Live streaming harbor and coastal sea-state observation feeds across key maritime hubs.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {webcams.map(cam => (
                  <div key={cam.id} className="rounded-xl overflow-hidden bg-slate-800/80 border border-slate-700 flex flex-col">
                    <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden group">
                      <img 
                        src={cam.stream_url} 
                        alt={cam.port} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-80"
                      />
                      <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-red-600/90 text-[10px] font-bold text-white tracking-widest flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
                        {cam.status}
                      </div>
                      <div className="absolute bottom-2 left-2 right-2 p-2 rounded bg-black/70 backdrop-blur-sm text-xs flex items-center justify-between">
                        <span className="font-semibold text-white">{cam.port}</span>
                        <span className="text-cyan-400 font-mono">{cam.sea_state}</span>
                      </div>
                    </div>
                    <div className="p-3 bg-slate-800 flex items-center justify-between text-xs text-slate-400">
                      <span>Visibility: <strong className="text-slate-200">{cam.visibility}</strong></span>
                      <button
                        onClick={() => {
                          onFocusCoordinates?.(cam.lat, cam.lon, 22)
                          onClose()
                        }}
                        className="text-cyan-400 hover:text-cyan-300 font-semibold"
                      >
                        Fly to Port ↗
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── TAB 4: SATELLITES ── */}
          {!loading && activeTab === 'satellites' && (
            <div className="space-y-4">
              <p className="text-xs text-slate-400">
                Active orbital telemetry of oceanographic satellites contributing to CMEMS and INCOIS numerical modeling.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {satellites.map(sat => (
                  <div key={sat.id} className="p-4 rounded-xl bg-purple-950/20 border border-purple-500/30 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-bold text-purple-300 text-sm">{sat.name}</h4>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-900/60 text-purple-300 font-mono">
                          {sat.id}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mb-2">{sat.agency || 'Earth Observation'} • {sat.type}</p>
                      <div className="text-xs bg-slate-900/80 p-2.5 rounded-lg border border-slate-700/50 mb-3 space-y-1 font-mono">
                        <div>Altitude: <strong className="text-purple-300">{sat.altitude_km} km</strong></div>
                        <div>Position: <strong className="text-slate-300">{sat.current_lat}°N, {sat.current_lon}°E</strong></div>
                        <div>Velocity: <strong className="text-cyan-300">{sat.velocity_kms} km/s</strong></div>
                        <div className="text-[11px] text-slate-400 leading-tight pt-1">
                          <strong>Sensors:</strong> {sat.sensor}
                        </div>
                        {sat.incois_role && (
                          <div className="text-[11px] text-purple-300/90 leading-tight pt-1 border-t border-slate-800">
                            <strong>INCOIS Mandate:</strong> {sat.incois_role}
                          </div>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        onFocusCoordinates?.(sat.current_lat, sat.current_lon, 32)
                        onSelectSatellite?.(sat)
                        onClose()
                      }}
                      className="w-full py-1.5 rounded-lg bg-purple-600/30 hover:bg-purple-500 hover:text-slate-950 text-purple-300 text-xs font-semibold border border-purple-500/30 transition-all flex items-center justify-center gap-1.5"
                    >
                      🛰️ Track on 3D Globe ({sat.current_lat}°, {sat.current_lon}°)
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-800/80 border-t border-slate-700/50 flex items-center justify-between text-xs text-slate-400">
          <span>AQUA-VIS OSINT Engine • Ground Truth for INCOIS SIH-26067</span>
          <button 
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-medium transition-colors"
          >
            Close Dashboard
          </button>
        </div>

      </div>
    </div>
  )
}
