import * as THREE from 'three'

/**
 * Converts Geographic Latitude and Longitude to 3D Cartesian coordinates
 * exactly matching Three.js SphereGeometry equirectangular UV mapping.
 *
 * SphereGeometry vertices formula:
 *   x = -radius * cos(theta) * cos(phi)
 *   y = radius * sin(phi)
 *   z = radius * sin(theta) * cos(phi)
 * where phi = lat * (PI/180), theta = (lon + 180) * (PI/180).
 */
export function latLonToVector3(lat, lon, radius = 20) {
  const phi = (lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);

  const x = -radius * Math.cos(theta) * Math.cos(phi);
  const y = radius * Math.sin(phi);
  const z = radius * Math.sin(theta) * Math.cos(phi);

  return new THREE.Vector3(x, y, z);
}

/**
 * Converts 3D Cartesian coordinates on the globe back to real latitude and longitude.
 */
export function vector3ToLatLon(vec) {
  const norm = vec.clone().normalize();
  const lat = Math.asin(Math.max(-1, Math.min(1, norm.y))) * (180 / Math.PI);
  let theta = Math.atan2(norm.z, -norm.x);
  if (theta < 0) theta += 2 * Math.PI;
  let lon = (theta * 180 / Math.PI) - 180;
  return { lat, lon };
}

/**
 * Catalog of key global geographic features, continents, oceans, and countries
 * for 3D interactive labels and navigation.
 */
export const GEOGRAPHIC_PLACES = [
  // Continents
  { id: 'asia', name: 'ASIA', type: 'continent', lat: 34.0, lon: 95.0, zoomDist: 46 },
  { id: 'africa', name: 'AFRICA', type: 'continent', lat: 4.0, lon: 22.0, zoomDist: 44 },
  { id: 'europe', name: 'EUROPE', type: 'continent', lat: 50.0, lon: 15.0, zoomDist: 38 },
  { id: 'australia_cont', name: 'AUSTRALIA', type: 'continent', lat: -25.0, lon: 134.0, zoomDist: 38 },
  { id: 'antarctica', name: 'ANTARCTICA', type: 'continent', lat: -80.0, lon: 0.0, zoomDist: 42 },

  // Oceans & Major Seas
  { id: 'bay_of_bengal', name: '🌀 Bay of Bengal', type: 'sea', lat: 14.5, lon: 88.5, zoomDist: 26 },
  { id: 'arabian_sea', name: '🌊 Arabian Sea', type: 'sea', lat: 16.5, lon: 65.5, zoomDist: 26 },
  { id: 'indian_ocean', name: '🌐 Indian Ocean', type: 'ocean', lat: -5.0, lon: 78.0, zoomDist: 34 },
  { id: 'andaman_sea', name: '🏝️ Andaman Sea', type: 'sea', lat: 11.5, lon: 94.5, zoomDist: 24 },
  { id: 'lakshadweep_sea', name: '🏝️ Lakshadweep Sea', type: 'sea', lat: 9.5, lon: 74.0, zoomDist: 24 },
  { id: 'red_sea', name: '🌊 Red Sea', type: 'sea', lat: 20.5, lon: 38.0, zoomDist: 26 },
  { id: 'persian_gulf', name: '🌊 Persian Gulf', type: 'sea', lat: 26.5, lon: 52.0, zoomDist: 24 },
  { id: 'gulf_of_aden', name: '🌊 Gulf of Aden', type: 'sea', lat: 12.5, lon: 48.0, zoomDist: 24 },
  { id: 'gulf_of_oman', name: '🌊 Gulf of Oman', type: 'sea', lat: 24.5, lon: 58.5, zoomDist: 24 },
  { id: 'south_china_sea', name: '🌊 South China Sea', type: 'sea', lat: 13.0, lon: 114.0, zoomDist: 30 },
  { id: 'mediterranean_sea', name: '🌊 Mediterranean Sea', type: 'sea', lat: 35.0, lon: 18.0, zoomDist: 30 },
  { id: 'pacific_ocean', name: '🌊 Pacific Ocean', type: 'ocean', lat: 0.0, lon: 160.0, zoomDist: 48 },
  { id: 'atlantic_ocean', name: '🌊 Atlantic Ocean', type: 'ocean', lat: 0.0, lon: -28.0, zoomDist: 48 },

  // Countries & Maritime Territories
  { id: 'india', name: '🇮🇳 India', type: 'country', lat: 21.0, lon: 78.5, zoomDist: 28 },
  { id: 'sri_lanka', name: '🇱🇰 Sri Lanka', type: 'country', lat: 7.8, lon: 80.7, zoomDist: 24 },
  { id: 'maldives', name: '🇲🇻 Maldives', type: 'country', lat: 3.2, lon: 73.2, zoomDist: 24 },
  { id: 'bangladesh', name: '🇧🇩 Bangladesh', type: 'country', lat: 23.7, lon: 90.3, zoomDist: 24 },
  { id: 'myanmar', name: '🇲🇲 Myanmar', type: 'country', lat: 19.5, lon: 96.0, zoomDist: 26 },
  { id: 'thailand', name: '🇹🇭 Thailand', type: 'country', lat: 15.5, lon: 101.0, zoomDist: 26 },
  { id: 'indonesia', name: '🇮🇩 Indonesia', type: 'country', lat: -0.5, lon: 102.0, zoomDist: 30 },
  { id: 'oman', name: '🇴🇲 Oman', type: 'country', lat: 21.5, lon: 56.0, zoomDist: 25 },
  { id: 'uae', name: '🇦🇪 UAE', type: 'country', lat: 23.8, lon: 54.0, zoomDist: 24 },
  { id: 'saudi_arabia', name: '🇸🇦 Saudi Arabia', type: 'country', lat: 24.0, lon: 45.0, zoomDist: 28 },
  { id: 'pakistan', name: '🇵🇰 Pakistan', type: 'country', lat: 29.5, lon: 69.0, zoomDist: 26 },
  { id: 'madagascar', name: '🇲🇬 Madagascar', type: 'country', lat: -18.7, lon: 46.8, zoomDist: 26 },
  { id: 'somalia', name: '🇸🇴 Somalia', type: 'country', lat: 5.0, lon: 46.0, zoomDist: 26 },
  { id: 'kenya', name: '🇰🇪 Kenya', type: 'country', lat: 0.5, lon: 37.9, zoomDist: 26 },
  { id: 'tanzania', name: '🇹🇿 Tanzania', type: 'country', lat: -6.4, lon: 35.0, zoomDist: 26 },
  { id: 'south_africa', name: '🇿🇦 South Africa', type: 'country', lat: -30.5, lon: 25.0, zoomDist: 28 },
  { id: 'australia', name: '🇦🇺 Australia', type: 'country', lat: -25.0, lon: 133.5, size: 32, zoomDist: 32 },
  { id: 'japan', name: '🇯🇵 Japan', type: 'country', lat: 36.2, lon: 138.2, zoomDist: 26 },
  { id: 'china', name: '🇨🇳 China', type: 'country', lat: 35.8, lon: 104.1, zoomDist: 34 }
]

/**
 * Generates an ultra-crisp 4096x2048 equirectangular cartography texture
 * containing boundaries, coastlines, graticule lines, continent names,
 * and ocean/sea watermarks.
 */
export function createCartographyTexture() {
  const width = 4096;
  const height = 2048;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  ctx.clearRect(0, 0, width, height);

  const toX = (lon) => ((lon + 180) / 360) * width;
  const toY = (lat) => ((90 - lat) / 180) * height;

  // 1. Graticule Lines (Equator, Prime Meridian, Tropics)
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.15)';
  ctx.lineWidth = 1.5;

  // Equator
  ctx.beginPath();
  ctx.moveTo(0, toY(0));
  ctx.lineTo(width, toY(0));
  ctx.stroke();

  // Prime Meridian (Greenwich 0°)
  ctx.beginPath();
  ctx.moveTo(toX(0), 0);
  ctx.lineTo(toX(0), height);
  ctx.stroke();

  // 90° East Meridian (Indian Ocean)
  ctx.strokeStyle = 'rgba(6, 182, 212, 0.12)';
  ctx.beginPath();
  ctx.moveTo(toX(90), 0);
  ctx.lineTo(toX(90), height);
  ctx.stroke();

  // Tropics (Cancer & Capricorn)
  ctx.setLineDash([8, 8]);
  ctx.strokeStyle = 'rgba(244, 114, 182, 0.12)';
  ctx.beginPath();
  ctx.moveTo(0, toY(23.44));
  ctx.lineTo(width, toY(23.44));
  ctx.moveTo(0, toY(-23.44));
  ctx.lineTo(width, toY(-23.44));
  ctx.stroke();
  ctx.setLineDash([]);

  // 2. Simplified Coastline & Exclusive Economic Zone (EEZ) Contours
  // Highlighting India, Sri Lanka, Arabian Sea, Bay of Bengal, Africa, Australia
  const coastalPaths = [
    // India Subcontinent Coastline
    [
      [23.5, 68.5], [22.0, 69.5], [20.5, 72.8], [19.0, 72.8], [15.4, 73.8],
      [12.9, 74.8], [9.9, 76.2], [8.1, 77.5], [9.3, 79.1], [10.8, 79.8],
      [13.1, 80.3], [15.8, 80.2], [17.7, 83.3], [19.8, 85.8], [21.5, 87.0],
      [22.2, 88.5], [21.8, 89.8], [22.3, 91.5]
    ],
    // Sri Lanka Island
    [
      [9.8, 80.2], [8.5, 79.8], [6.9, 79.8], [5.9, 80.5], [6.9, 81.8],
      [8.5, 81.3], [9.8, 80.2]
    ],
    // Arabian Peninsula / Oman / UAE Coastline
    [
      [30.0, 48.0], [27.0, 50.0], [25.0, 51.5], [24.0, 54.0], [25.5, 56.3],
      [23.6, 58.5], [20.5, 58.8], [17.0, 54.0], [14.5, 49.0], [12.8, 45.0],
      [12.6, 43.5], [16.0, 42.5], [20.0, 40.0], [24.0, 37.5], [28.0, 35.0]
    ],
    // Southeast Asia & Andaman Coast
    [
      [21.0, 92.0], [18.0, 94.0], [16.0, 94.5], [16.0, 96.5], [13.0, 98.5],
      [8.0, 98.5], [4.0, 100.5], [1.3, 103.8], [3.0, 103.5], [6.0, 102.0],
      [10.0, 99.5], [13.5, 100.5], [11.5, 103.0]
    ]
  ];

  ctx.strokeStyle = 'rgba(56, 189, 248, 0.45)';
  ctx.lineWidth = 2.5;
  ctx.shadowColor = 'rgba(6, 182, 212, 0.6)';
  ctx.shadowBlur = 6;

  coastalPaths.forEach(path => {
    ctx.beginPath();
    path.forEach(([lat, lon], idx) => {
      const x = toX(lon);
      const y = toY(lat);
      if (idx === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
  });

  ctx.shadowBlur = 0;

  // 3. Render Continent Titles (Bold, tracked, typographic)
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const continents = [
    { text: 'A S I A', lat: 40.0, lon: 95.0, size: 48 },
    { text: 'A F R I C A', lat: 4.0, lon: 22.0, size: 44 },
    { text: 'E U R O P E', lat: 52.0, lon: 16.0, size: 38 },
    { text: 'A U S T R A L I A', lat: -25.0, lon: 134.0, size: 38 },
    { text: 'A N T A R C T I C A', lat: -78.0, lon: 0.0, size: 36 },
    { text: 'N O R T H  A M E R I C A', lat: 48.0, lon: -100.0, size: 42 },
    { text: 'S O U T H  A M E R I C A', lat: -15.0, lon: -60.0, size: 40 }
  ];

  continents.forEach(({ text, lat, lon, size }) => {
    const x = toX(lon);
    const y = toY(lat);

    ctx.font = `bold ${size}px "Outfit", "Inter", "Segoe UI", sans-serif`;
    ctx.fillStyle = 'rgba(226, 232, 240, 0.75)';
    ctx.strokeStyle = 'rgba(2, 6, 23, 0.9)';
    ctx.lineWidth = 4;
    ctx.strokeText(text, x, y);
    ctx.fillText(text, x, y);
  });

  // 4. Render Oceans & Sea Watermarks (Italicized Oceanic Cyan)
  const oceanLabels = [
    { text: 'INDIAN  OCEAN', lat: -6.0, lon: 80.0, size: 42, color: '#38bdf8' },
    { text: 'BAY  OF  BENGAL', lat: 14.5, lon: 88.5, size: 34, color: '#22d3ee' },
    { text: 'ARABIAN  SEA', lat: 16.5, lon: 65.5, size: 34, color: '#22d3ee' },
    { text: 'LAKSHADWEEP SEA', lat: 9.5, lon: 74.0, size: 24, color: '#38bdf8' },
    { text: 'ANDAMAN SEA', lat: 11.5, lon: 94.5, size: 26, color: '#38bdf8' },
    { text: 'PERSIAN GULF', lat: 26.5, lon: 52.0, size: 22, color: '#38bdf8' },
    { text: 'RED SEA', lat: 20.5, lon: 38.0, size: 24, color: '#38bdf8' },
    { text: 'GULF OF ADEN', lat: 12.5, lon: 48.0, size: 20, color: '#38bdf8' },
    { text: 'SOUTH CHINA SEA', lat: 13.0, lon: 114.0, size: 32, color: '#22d3ee' },
    { text: 'MEDITERRANEAN SEA', lat: 35.0, lon: 18.0, size: 28, color: '#38bdf8' },
    { text: 'PACIFIC  OCEAN', lat: 0.0, lon: 165.0, size: 48, color: '#38bdf8' },
    { text: 'ATLANTIC  OCEAN', lat: 0.0, lon: -28.0, size: 48, color: '#38bdf8' }
  ];

  oceanLabels.forEach(({ text, lat, lon, size, color }) => {
    const x = toX(lon);
    const y = toY(lat);

    ctx.font = `600 italic ${size}px "Outfit", "Inter", sans-serif`;
    ctx.fillStyle = color;
    ctx.strokeStyle = 'rgba(2, 6, 23, 0.85)';
    ctx.lineWidth = 4;
    ctx.strokeText(text, x, y);
    ctx.fillText(text, x, y);
  });

  // 5. Render Major Countries & Coastal States
  const countries = [
    { text: 'INDIA', lat: 21.5, lon: 78.5, size: 32, color: '#f8fafc' },
    { text: 'SRI LANKA', lat: 7.8, lon: 80.7, size: 18, color: '#f8fafc' },
    { text: 'MALDIVES', lat: 3.2, lon: 73.2, size: 16, color: '#f8fafc' },
    { text: 'BANGLADESH', lat: 23.8, lon: 90.3, size: 18, color: '#f8fafc' },
    { text: 'MYANMAR', lat: 19.5, lon: 96.0, size: 22, color: '#f8fafc' },
    { text: 'THAILAND', lat: 15.5, lon: 101.0, size: 22, color: '#f8fafc' },
    { text: 'INDONESIA', lat: -0.5, lon: 102.0, size: 24, color: '#f8fafc' },
    { text: 'OMAN', lat: 21.5, lon: 56.0, size: 22, color: '#f8fafc' },
    { text: 'UAE', lat: 23.8, lon: 54.0, size: 18, color: '#f8fafc' },
    { text: 'SAUDI ARABIA', lat: 24.0, lon: 45.0, size: 28, color: '#f8fafc' },
    { text: 'PAKISTAN', lat: 29.5, lon: 69.0, size: 24, color: '#f8fafc' },
    { text: 'MADAGASCAR', lat: -18.7, lon: 46.8, size: 22, color: '#f8fafc' },
    { text: 'SOMALIA', lat: 5.0, lon: 46.0, size: 22, color: '#f8fafc' },
    { text: 'KENYA', lat: 0.5, lon: 37.9, size: 20, color: '#f8fafc' },
    { text: 'TANZANIA', lat: -6.4, lon: 35.0, size: 20, color: '#f8fafc' },
    { text: 'AUSTRALIA', lat: -25.0, lon: 133.5, size: 32, color: '#f8fafc' },
    { text: 'CHINA', lat: 35.8, lon: 104.1, size: 36, color: '#f8fafc' },
    { text: 'JAPAN', lat: 36.2, lon: 138.2, size: 22, color: '#f8fafc' }
  ];

  countries.forEach(({ text, lat, lon, size, color }) => {
    const x = toX(lon);
    const y = toY(lat);

    ctx.font = `600 ${size}px "Outfit", "Inter", sans-serif`;
    ctx.fillStyle = color;
    ctx.strokeStyle = 'rgba(2, 6, 23, 0.9)';
    ctx.lineWidth = 3.5;
    ctx.strokeText(text, x, y);
    ctx.fillText(text, x, y);
  });

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  return texture;
}

/**
 * Google Maps API Key Management & Demo Key Helper
 */
export const GOOGLE_MAPS_CONFIG = {
  getApiKey: () => {
    return localStorage.getItem('AQUAVIS_GOOGLE_MAPS_KEY') || ''
  },
  setApiKey: (key) => {
    if (key && key.trim()) {
      localStorage.setItem('AQUAVIS_GOOGLE_MAPS_KEY', key.trim())
    } else {
      localStorage.removeItem('AQUAVIS_GOOGLE_MAPS_KEY')
    }
  },
  hasApiKey: () => {
    const key = localStorage.getItem('AQUAVIS_GOOGLE_MAPS_KEY')
    return Boolean(key && key.trim().length > 5)
  }
}
