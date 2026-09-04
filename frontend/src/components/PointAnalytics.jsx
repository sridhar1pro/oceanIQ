import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function PointAnalytics({ lat, lon, activeVar, activeDepth, activeTime, onClose }) {
  const [activeTab, setActiveTab] = useState('timeseries'); // 'timeseries' or 'profile'
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const VAR_SHORT = {
    thetao: 'Temperature (°C)',
    so: 'Salinity (PSU)',
    uo: 'Current East (m/s)',
    vo: 'Current North (m/s)',
    VHM0: 'Wave Height (m)',
    ph: 'Ocean pH',
    sla: 'Sea Level Anomaly (m)'
  };

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setData(null);

    let url = '';
    if (activeTab === 'timeseries') {
      url = `/api/point_data?lat=${lat}&lon=${lon}&variable=${activeVar}&depth=${activeDepth}`;
    } else {
      url = `/api/point_data?lat=${lat}&lon=${lon}&variable=${activeVar}&time=${activeTime}`;
    }

    fetch(url)
      .then(r => r.json())
      .then(res => {
        if (isMounted) {
          if (!Array.isArray(res)) res = [];
          // Format data for Recharts
          let formatted = [];
          if (activeTab === 'timeseries') {
            formatted = res.map(d => ({
              x: new Date(d.time).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
              value: Number(d.value.toFixed(2)),
              nearestLat: d.nearest_lat,
              nearestLon: d.nearest_lon
            }));
          } else {
            formatted = res.map(d => ({
              x: `${d.depth}m`,
              depthNum: Number(d.depth),
              value: Number(d.value.toFixed(2)),
              nearestLat: d.nearest_lat,
              nearestLon: d.nearest_lon
            })).sort((a,b) => a.depthNum - b.depthNum);
          }
          setData(formatted);
          setLoading(false);
        }
      })
      .catch(err => {
        console.error(err);
        if (isMounted) setLoading(false);
      });

    return () => { isMounted = false; };
  }, [lat, lon, activeVar, activeDepth, activeTime, activeTab]);

  return (
    <div style={{
      position: 'absolute',
      right: '24px',
      top: '90px',
      width: '400px',
      background: 'rgba(15, 23, 42, 0.85)',
      backdropFilter: 'blur(16px)',
      border: '1px solid rgba(59, 130, 246, 0.4)',
      borderRadius: '12px',
      padding: '16px',
      color: '#e2e8f0',
      zIndex: 20,
      boxShadow: '0 8px 32px rgba(0,0,0,0.5)'
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', borderBottom: '1px solid rgba(59, 130, 246, 0.2)', paddingBottom: '8px' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1rem', color: '#3b82f6', fontWeight: 600 }}>Point Analytics</h3>
          <p style={{ margin: 0, fontSize: '0.75rem', color: '#94a3b8' }}>
            {lat.toFixed(3)}°N, {lon.toFixed(3)}°E
          </p>
        </div>
        <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '1.2rem' }}>&times;</button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        <button
          onClick={() => setActiveTab('timeseries')}
          style={{
            flex: 1, padding: '6px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
            background: activeTab === 'timeseries' ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
            color: activeTab === 'timeseries' ? '#60a5fa' : '#94a3b8',
            border: `1px solid ${activeTab === 'timeseries' ? '#3b82f6' : 'rgba(255,255,255,0.1)'}`
          }}
        >
          Time-Series
        </button>
        <button
          onClick={() => setActiveTab('profile')}
          style={{
            flex: 1, padding: '6px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
            background: activeTab === 'profile' ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
            color: activeTab === 'profile' ? '#60a5fa' : '#94a3b8',
            border: `1px solid ${activeTab === 'profile' ? '#3b82f6' : 'rgba(255,255,255,0.1)'}`
          }}
        >
          Depth Profile
        </button>
      </div>

      {/* Chart */}
      <div style={{ width: '100%', height: '220px', position: 'relative' }}>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#64748b' }}>
            Loading data...
          </div>
        ) : data && data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="x" stroke="#64748b" fontSize={10} tickMargin={8} />
              <YAxis stroke="#64748b" fontSize={10} domain={['auto', 'auto']} />
              <Tooltip 
                contentStyle={{ background: 'rgba(15,23,42,0.9)', border: '1px solid #3b82f6', borderRadius: '6px' }}
                itemStyle={{ color: '#60a5fa' }}
                labelStyle={{ color: '#cbd5e1' }}
              />
              <Line 
                type="monotone" 
                dataKey="value" 
                stroke="#3b82f6" 
                strokeWidth={2} 
                dot={{ r: 3, fill: '#3b82f6' }} 
                activeDot={{ r: 5 }} 
                name={VAR_SHORT[activeVar] || activeVar}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#64748b' }}>
            No data available.
          </div>
        )}
      </div>
      
      {/* Footer Info */}
      <div style={{ marginTop: '12px', fontSize: '0.72rem', color: '#94a3b8', textAlign: 'center', lineHeight: 1.4 }}>
        {activeTab === 'timeseries' ? `Showing forecast trend at ${activeDepth}m depth.` : `Showing vertical slice on ${new Date(activeTime).toLocaleDateString('en-GB')}.`}
        {data && data[0]?.nearestLat != null && (
          <div style={{ color: '#38bdf8', fontSize: '0.66rem', marginTop: 3 }}>
            📍 Nearest Marine Observation: {data[0].nearestLat.toFixed(2)}°N, {data[0].nearestLon.toFixed(2)}°E
          </div>
        )}
      </div>
    </div>
  );
}
