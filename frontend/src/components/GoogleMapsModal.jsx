import React, { useState, useEffect } from 'react'
import { GOOGLE_MAPS_CONFIG } from '../utils/geoCartography.js'

export default function GoogleMapsModal({
  isOpen,
  onClose,
  onFlyTo,
  showGeoNames,
  setShowGeoNames,
  showSeaLabels,
  setShowSeaLabels,
  showInteractiveBadges,
  setShowInteractiveBadges
}) {
  const [apiKey, setApiKey] = useState('')
  const [savedSuccess, setSavedSuccess] = useState(false)
  const [showKey, setShowKey] = useState(false)
  const [activeBasemap, setActiveBasemap] = useState('carto_hd')

  useEffect(() => {
    if (isOpen) {
      setApiKey(GOOGLE_MAPS_CONFIG.getApiKey())
      setSavedSuccess(false)
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleSave = () => {
    GOOGLE_MAPS_CONFIG.setApiKey(apiKey)
    setSavedSuccess(true)
    setTimeout(() => setSavedSuccess(false), 2500)
  }

  const handleClear = () => {
    setApiKey('')
    GOOGLE_MAPS_CONFIG.setApiKey('')
    setSavedSuccess(true)
    setTimeout(() => setSavedSuccess(false), 2500)
  }

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 100,
      background: 'rgba(2, 6, 23, 0.75)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div style={{
        background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.9))',
        border: '1px solid rgba(56, 189, 248, 0.35)',
        borderRadius: 18,
        width: '100%',
        maxWidth: 580,
        color: '#e2e8f0',
        boxShadow: '0 25px 60px rgba(0, 0, 0, 0.7), 0 0 35px rgba(56, 189, 248, 0.15)',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          padding: '18px 22px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(15, 23, 42, 0.6)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: '1.4rem' }}>🗺️</span>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#f8fafc' }}>
                Cartography & Google Maps Configuration
              </h2>
              <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                Earth Projection, Basemaps, Continents & Ocean Placemarks
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: 8,
              color: '#94a3b8',
              width: 32,
              height: 32,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              fontSize: '1rem',
              transition: 'all 0.2s'
            }}
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 16, maxHeight: '75vh', overflowY: 'auto' }}>
          
          {/* Status Banner */}
          <div style={{
            background: 'rgba(6, 182, 212, 0.1)',
            border: '1px solid rgba(6, 182, 212, 0.3)',
            borderRadius: 12,
            padding: '12px 14px',
            display: 'flex',
            gap: 12,
            alignItems: 'flex-start'
          }}>
            <span style={{ fontSize: '1.2rem', marginTop: 2 }}>🌐</span>
            <div style={{ fontSize: '0.76rem', lineHeight: 1.45, color: '#e0f2fe' }}>
              <strong style={{ color: '#38bdf8' }}>100% Calibrated Geographic Projection:</strong><br />
              All Argo floats, Bay of Bengal, Arabian Sea, and world continent titles are precisely mapped to standard WGS84 coordinates directly on the 3D globe with 0° displacement.
            </div>
          </div>

          {/* Google Maps API Key Input Section */}
          <div style={{ background: 'rgba(15, 23, 42, 0.5)', padding: 14, borderRadius: 12, border: '1px solid rgba(255, 255, 255, 0.06)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <label style={{ fontSize: '0.76rem', fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>🔑 Google Maps Platform API Key</span>
                <span style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 400 }}>(Optional)</span>
              </label>
              {GOOGLE_MAPS_CONFIG.hasApiKey() && (
                <span style={{ fontSize: '0.68rem', color: '#10b981', fontWeight: 600 }}>
                  ● Key Configured
                </span>
              )}
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <input
                  type={showKey ? 'text' : 'password'}
                  placeholder="Paste Google Maps API key (e.g. AIzaSy...)"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 36px 8px 12px',
                    borderRadius: 8,
                    background: 'rgba(2, 6, 23, 0.8)',
                    border: '1px solid rgba(56, 189, 248, 0.3)',
                    color: '#f8fafc',
                    fontSize: '0.8rem',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  style={{
                    position: 'absolute',
                    right: 8,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'transparent',
                    border: 'none',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    fontSize: '0.85rem'
                  }}
                  title={showKey ? 'Hide key' : 'Show key'}
                >
                  {showKey ? '👁️' : '🔒'}
                </button>
              </div>
              <button
                onClick={handleSave}
                style={{
                  background: 'linear-gradient(135deg, #0284c7, #06b6d4)',
                  border: 'none',
                  borderRadius: 8,
                  color: '#ffffff',
                  padding: '8px 16px',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'opacity 0.2s'
                }}
              >
                Save
              </button>
              {apiKey && (
                <button
                  onClick={handleClear}
                  style={{
                    background: 'rgba(239, 68, 68, 0.15)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: 8,
                    color: '#f87171',
                    padding: '8px 12px',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Clear
                </button>
              )}
            </div>

            {savedSuccess && (
              <div style={{ fontSize: '0.72rem', color: '#10b981', marginTop: 6 }}>
                ✓ Settings saved to browser storage!
              </div>
            )}
            
            <p style={{ fontSize: '0.68rem', color: '#94a3b8', margin: '8px 0 0 0', lineHeight: 1.4 }}>
              Tip: The built-in INCOIS & NASA High-Definition cartography works immediately out-of-the-box with no API key required.
            </p>
          </div>

          {/* Cartography Toggles */}
          <div style={{ background: 'rgba(15, 23, 42, 0.5)', padding: 14, borderRadius: 12, border: '1px solid rgba(255, 255, 255, 0.06)' }}>
            <span style={{ fontSize: '0.76rem', fontWeight: 700, color: '#f8fafc', display: 'block', marginBottom: 10 }}>
              🌐 Globe Placemarks & Labels
            </span>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
                <span style={{ fontSize: '0.76rem', color: '#cbd5e1' }}>
                  🏛️ Continents & Major Country Titles (ASIA, INDIA, AFRICA, etc.)
                </span>
                <input
                  type="checkbox"
                  checked={showGeoNames}
                  onChange={(e) => setShowGeoNames(e.target.checked)}
                  style={{ accentColor: '#06b6d4', width: 16, height: 16, cursor: 'pointer' }}
                />
              </label>

              <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
                <span style={{ fontSize: '0.76rem', color: '#cbd5e1' }}>
                  🌊 Oceanic Watermarks (Bay of Bengal, Arabian Sea, Indian Ocean)
                </span>
                <input
                  type="checkbox"
                  checked={showSeaLabels}
                  onChange={(e) => setShowSeaLabels(e.target.checked)}
                  style={{ accentColor: '#06b6d4', width: 16, height: 16, cursor: 'pointer' }}
                />
              </label>

              <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
                <span style={{ fontSize: '0.76rem', color: '#cbd5e1' }}>
                  🏷️ 3D Clickable Floating Place Badges (Direct Orbit Navigation)
                </span>
                <input
                  type="checkbox"
                  checked={showInteractiveBadges}
                  onChange={(e) => setShowInteractiveBadges(e.target.checked)}
                  style={{ accentColor: '#06b6d4', width: 16, height: 16, cursor: 'pointer' }}
                />
              </label>
            </div>
          </div>

          {/* Direct Region Quick-Fly Shortcuts */}
          <div style={{ background: 'rgba(15, 23, 42, 0.5)', padding: 14, borderRadius: 12, border: '1px solid rgba(255, 255, 255, 0.06)' }}>
            <span style={{ fontSize: '0.76rem', fontWeight: 700, color: '#f8fafc', display: 'block', marginBottom: 8 }}>
              🎯 Verified Instant Camera Targets
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {[
                { label: '🌀 Bay of Bengal', key: 'bay_of_bengal' },
                { label: '🌊 Arabian Sea', key: 'arabian_sea' },
                { label: '🇮🇳 Indian Ocean (EEZ)', key: 'indian_ocean' },
                { label: '🌐 Global Basin Array', key: 'global' }
              ].map(item => (
                <button
                  key={item.key}
                  onClick={() => {
                    if (onFlyTo) onFlyTo(item.key)
                    onClose()
                  }}
                  style={{
                    background: 'rgba(30, 41, 59, 0.8)',
                    border: '1px solid rgba(56, 189, 248, 0.25)',
                    borderRadius: 8,
                    color: '#38bdf8',
                    padding: '8px 10px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.2s'
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div style={{
          padding: '14px 22px',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          justifyContent: 'flex-end',
          background: 'rgba(15, 23, 42, 0.6)'
        }}>
          <button
            onClick={onClose}
            style={{
              background: 'linear-gradient(135deg, #0284c7, #06b6d4)',
              border: 'none',
              borderRadius: 8,
              color: '#ffffff',
              padding: '8px 20px',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Done
          </button>
        </div>

      </div>
    </div>
  )
}
