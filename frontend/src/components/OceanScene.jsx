import React, { useRef, useEffect, useState, useCallback } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import ProfilePanel from './ProfilePanel.jsx'
import ControlsPanel from './ControlsPanel.jsx'
import PointAnalytics from './PointAnalytics.jsx'
import UploadModal from './UploadModal.jsx'
import CoastalRiskPanel from './CoastalRiskPanel.jsx'
import OceanIQAssistant from './OceanIQAssistant.jsx'
import WorldMonitorPanel from './WorldMonitorPanel.jsx'

const PALETTES = {
  thermal: ['#0000ff', '#ff0000'],
  haline:  ['#0044aa', '#00cc66'],
  oceanic: ['#042f2e', '#f59e0b'],
  acidic:  ['#ef4444', '#3b82f6'],
  altimetry: ['#7c3aed', '#f97316'],
  viridis: ['#440154', '#fde725'],
}

// Helpers for Sub-step A
function createHeatmapCanvas(data, uniqueLats, uniqueLons, minVal, maxVal, palette, logScale) {
  const width = uniqueLons.length;
  const height = uniqueLats.length;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  const imgData = ctx.createImageData(width, height);
  
  const palColors = PALETTES[palette] || PALETTES.thermal;
  const color1 = new THREE.Color(palColors[0]);
  const color2 = new THREE.Color(palColors[1]);
  const tempColor = new THREE.Color();
  
  // Create quick lookup maps for performance
  const lonMap = new Map(uniqueLons.map((v, i) => [v, i]));
  const latMap = new Map(uniqueLats.map((v, i) => [v, i]));

  data.forEach(d => {
    const x = lonMap.get(d.lon);
    const y = height - 1 - latMap.get(d.lat);
    if (x === undefined || y === undefined) return;
    
    let normalized = (d.value - minVal) / (maxVal - minVal || 1);
    if (logScale) {
      const shift = minVal <= 0 ? Math.abs(minVal) + 1 : 0;
      const shiftedVal = d.value + shift;
      const shiftedMin = minVal + shift;
      const shiftedMax = maxVal + shift;
      normalized = (Math.log(shiftedVal) - Math.log(shiftedMin)) / (Math.log(shiftedMax) - Math.log(shiftedMin) || 1);
    }
    normalized = Math.max(0, Math.min(1, normalized));
    
    if (palette === 'thermal') {
       tempColor.setHSL(0.66 * (1.0 - normalized), 1.0, 0.5);
    } else {
       tempColor.lerpColors(color1, color2, normalized);
    }
    
    const idx = (y * width + x) * 4;
    imgData.data[idx] = tempColor.r * 255;
    imgData.data[idx+1] = tempColor.g * 255;
    imgData.data[idx+2] = tempColor.b * 255;
    imgData.data[idx+3] = 255; 
  });
  
  ctx.putImageData(imgData, 0, 0);
  return canvas;
}

function createWallCanvas(dataSlices, perpPoints, isConstLat, constValue, minVal, maxVal, palette, logScale) {
  const width = perpPoints.length;
  const height = dataSlices.length;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  const imgData = ctx.createImageData(width, height);
  
  const palColors = PALETTES[palette] || PALETTES.thermal;
  const color1 = new THREE.Color(palColors[0]);
  const color2 = new THREE.Color(palColors[1]);
  const tempColor = new THREE.Color();
  const perpMap = new Map(perpPoints.map((v, i) => [v, i]));

  dataSlices.forEach((sliceData, y) => {
    // Filter to just this edge
    const edgeData = sliceData.filter(d => isConstLat ? d.lat === constValue : d.lon === constValue);
    edgeData.forEach(d => {
      const pVal = isConstLat ? d.lon : d.lat;
      const x = perpMap.get(pVal);
      if (x === undefined) return;

      let normalized = (d.value - minVal) / (maxVal - minVal || 1);
      if (logScale) {
        const shift = minVal <= 0 ? Math.abs(minVal) + 1 : 0;
        const shiftedVal = d.value + shift;
        const shiftedMin = minVal + shift;
        const shiftedMax = maxVal + shift;
        normalized = (Math.log(shiftedVal) - Math.log(shiftedMin)) / (Math.log(shiftedMax) - Math.log(shiftedMin) || 1);
      }
      normalized = Math.max(0, Math.min(1, normalized));
      
      if (palette === 'thermal') {
         tempColor.setHSL(0.66 * (1.0 - normalized), 1.0, 0.5);
      } else {
         tempColor.lerpColors(color1, color2, normalized);
      }
      
      // y=0 is top depth
      const idx = (y * width + x) * 4;
      imgData.data[idx] = tempColor.r * 255;
      imgData.data[idx+1] = tempColor.g * 255;
      imgData.data[idx+2] = tempColor.b * 255;
      imgData.data[idx+3] = 255; 
    });
  });
  
  ctx.putImageData(imgData, 0, 0);
  return canvas;
}

export default function OceanScene() {
  const mountRef = useRef(null)
  const sceneRef = useRef(null)
  const volumeGroupRef = useRef(null)
  const markersRef = useRef(null)
  const coordCenterRef = useRef({ latCenter: 0, lonCenter: 0 })
  const cameraRef = useRef(null)
  const rendererRef = useRef(null)
  const labelsContainerRef = useRef(null)
  const controlsRef = useRef(null)
  const targetCamPosRef = useRef(null)

  const [metadata, setMetadata] = useState(null)
  const [activeVar, setActiveVar] = useState(null)
  const [activeDepth, setActiveDepth] = useState(null)
  const [activeTime, setActiveTime] = useState(null)
  const [valueRange, setValueRange] = useState({ min: 0, max: 100 })

  // BUG FIX 1: Sync colorMin/colorMax from the grid's computed value range
  useEffect(() => {
    if (valueRange.min !== 0 || valueRange.max !== 100) {
      setColorMin(valueRange.min)
      setColorMax(valueRange.max)
    }
  }, [valueRange])
  const [isPlaying, setIsPlaying] = useState(false)
  
  const [showDiscrepancy, setShowDiscrepancy] = useState(true)
  const [onlyDivergent, setOnlyDivergent] = useState(false)
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
  const [discrepancySummary, setDiscrepancySummary] = useState(null)
  const [activeRegion, setActiveRegion] = useState('indian_ocean')

  const [showSatellite, setShowSatellite] = useState(false)
  const [showGlider, setShowGlider] = useState(true)
  const [showCoastalRisk, setShowCoastalRisk] = useState(true)
  const [showVessels, setShowVessels] = useState(true)
  const [showCalamities, setShowCalamities] = useState(true)
  const [vectorSpeed, setVectorSpeed] = useState(1.0)
  const vectorSpeedRef = useRef(1.0)
  useEffect(() => { vectorSpeedRef.current = vectorSpeed }, [vectorSpeed])

  const [isCoastalRiskModalOpen, setIsCoastalRiskModalOpen] = useState(false)
  const [isWorldMonitorOpen, setIsWorldMonitorOpen] = useState(false)
  const [selectedGliderWaypoint, setSelectedGliderWaypoint] = useState(null)
  const [selectedPort, setSelectedPort] = useState(null)
  const [selectedVessel, setSelectedVessel] = useState(null)
  const [selectedCalamity, setSelectedCalamity] = useState(null)
  const [showSatellites, setShowSatellites] = useState(true)
  const [selectedSatellite, setSelectedSatellite] = useState(null)

  const gliderGroupRef = useRef(null)
  const coastalGroupRef = useRef(null)
  const vesselsGroupRef = useRef(null)
  const calamitiesGroupRef = useRef(null)
  const satellitesGroupRef = useRef(null)
  const gliderVesselRef = useRef(null)
  const gliderCurveRef = useRef(null)
  const [selectedInstrumentId, setSelectedInstrumentId] = useState(null)
  const [surfacePointInfo, setSurfacePointInfo] = useState(null)
  
  // New state to trigger re-rendering of volume when grid data is ready
  const [gridDataReady, setGridDataReady] = useState(0)
  const [selectedProfile, setSelectedProfile] = useState(null)
  const [palette, setPalette] = useState('thermal')
  const [colorMin, setColorMin] = useState(0)
  const [colorMax, setColorMax] = useState(0)
  const [logScale, setLogScale] = useState(false)
  const [opacity, setOpacity] = useState(0.9)
  const [vertExag, setVertExag] = useState(1.0)
  const [outreachMode, setOutreachMode] = useState(false)
  const [measureMode, setMeasureMode] = useState(false)
  const measurePointsRef = useRef([])
  const measureModeRef = useRef(measureMode)
  useEffect(() => { measureModeRef.current = measureMode }, [measureMode])
  const [isoValue, setIsoValue] = useState(28.0)
  const [showIso, setShowIso] = useState(false)
  const gridDataRef = useRef(null)
  const raycasterRef = useRef(new THREE.Raycaster())
  const mouseRef = useRef(new THREE.Vector2())
  const pointerDownPosRef = useRef({ x: 0, y: 0 })
  const hoveredInstrumentIdRef = useRef(null)
  const earthMeshRef = useRef(null)

  // Camera Fly-To Preset Logic
  const flyToPoint = useCallback((lat, lon, dist = 24) => {
    const phi = (90 - lat) * Math.PI / 180
    const theta = (lon + 180) * Math.PI / 180
    const camTarget = new THREE.Vector3().setFromSphericalCoords(dist, phi, theta)
    targetCamPosRef.current = camTarget
  }, [])

  const flyTo = useCallback((regionKey) => {
    setActiveRegion(regionKey)
    let targetLat = 12, targetLon = 78, camDist = 34
    if (regionKey === 'indian_ocean') {
      targetLat = 12
      targetLon = 78
      camDist = 34
    } else if (regionKey === 'arabian_sea') {
      targetLat = 17
      targetLon = 66
      camDist = 28
    } else if (regionKey === 'bay_of_bengal') {
      targetLat = 15
      targetLon = 87
      camDist = 28
    } else {
      // Global overview
      targetLat = 0
      targetLon = 30
      camDist = 44
    }

    const phi = (90 - targetLat) * Math.PI / 180
    const theta = (targetLon + 180) * Math.PI / 180
    const destPos = new THREE.Vector3().setFromSphericalCoords(camDist, phi, theta)
    targetCamPosRef.current = destPos
  }, [])

  // Initial smooth orbit to Indian Ocean / EEZ
  useEffect(() => {
    const timer = setTimeout(() => {
      flyTo('indian_ocean')
    }, 700)
    return () => clearTimeout(timer)
  }, [flyTo])

  // Fetch Discrepancy Summary
  const refreshDiscrepancySummary = useCallback(() => {
    fetch('/api/discrepancy/summary')
      .then(r => r.json())
      .then(setDiscrepancySummary)
      .catch(console.error)
  }, [])

  useEffect(() => {
    refreshDiscrepancySummary()
  }, [refreshDiscrepancySummary])

  // Filter Divergent Floats Only
  useEffect(() => {
    if (!markersRef.current) return
    markersRef.current.children.forEach(mesh => {
      const biasVal = Math.abs(mesh.userData?.bias || 0)
      if (onlyDivergent) {
        mesh.visible = biasVal >= 0.5
      } else {
        mesh.visible = true
      }
    })
  }, [onlyDivergent])

  // X-Ray Earth Mode for seeing inside the globe
  useEffect(() => {
    if (!earthMeshRef.current) return
    const isDiving = activeDepth > 0.0 || selectedInstrumentId
    if (isDiving) {
        earthMeshRef.current.material.transparent = true
        earthMeshRef.current.material.opacity = 0.35
    } else {
        earthMeshRef.current.material.transparent = false
        earthMeshRef.current.material.opacity = 1.0
    }
  }, [activeDepth, selectedInstrumentId, gridDataReady])

  // Toggle Satellite Visibility
  useEffect(() => {
    if (!earthMeshRef.current) return
    earthMeshRef.current.visible = showSatellite
  }, [showSatellite])

  const onMarkerClick = (id) => {
    if (outreachMode) return
    setSelectedInstrumentId(id)
    // Fetch profile to show in panel
    fetch(`/api/instruments/${id}/profile`)
      .then(r => r.json())
      .then(profile => setSelectedProfile(profile))
      .catch(console.error)
  }

  const handleAIAction = useCallback((aiData) => {
    if (aiData.target_camera) {
      flyTo(aiData.target_camera)
    }
    if (aiData.variable) {
      setActiveVar(aiData.variable)
      if (aiData.variable === 'VHM0') {
        setPalette('oceanic')
        setColorMin(0.0)
        setColorMax(6.0)
      } else if (aiData.variable === 'ph') {
        setPalette('acidic')
        setColorMin(7.6)
        setColorMax(8.3)
      } else if (aiData.variable === 'sla') {
        setPalette('altimetry')
        setColorMin(-0.25)
        setColorMax(0.25)
      }
    }
    if (aiData.depth !== null && aiData.depth !== undefined) {
      setActiveDepth(aiData.depth)
    }
    if (aiData.vector_speed) {
      setVectorSpeed(aiData.vector_speed)
    }
    if (aiData.action === 'TRACK_GLIDER') {
      setShowGlider(true)
      flyToPoint(12.5, 87.2, 22)
    }
    if (aiData.action === 'SHOW_COASTAL_RISK') {
      setShowCoastalRisk(true)
      setIsCoastalRiskModalOpen(true)
    }
    if (aiData.action === 'SHOW_VESSELS') {
      setShowVessels(true)
      setIsWorldMonitorOpen(true)
    }
    if (aiData.action === 'SHOW_CALAMITIES') {
      setShowCalamities(true)
      setIsWorldMonitorOpen(true)
    }
    if (aiData.action === 'SHOW_SATELLITES') {
      setShowSatellites(true)
      setIsWorldMonitorOpen(true)
    }
    if (aiData.open_panel === 'world_monitor') {
      setIsWorldMonitorOpen(true)
    }
  }, [flyTo, flyToPoint])

  const VAR_FRIENDLY = {
    thetao: 'Ocean Temperature',
    so: 'Ocean Salinity',
    VHM0: 'Significant Wave Height (Hm0)',
    ph: 'Ocean Acidity / pH',
    sla: 'Sea Level Anomaly',
    uo: 'Current (Eastward)',
    vo: 'Current (Northward)'
  }
  const VAR_SHORT = {
    thetao: 'Temperature',
    so: 'Salinity',
    VHM0: 'Wave Height',
    ph: 'Ocean pH',
    sla: 'Sea Level Anom',
    uo: 'Current U',
    vo: 'Current V'
  }

  // Animation Loop for Time
  useEffect(() => {
    if (!isPlaying || !metadata || !metadata.times || metadata.times.length === 0) return
    const interval = setInterval(() => {
      setActiveTime(prev => {
        const idx = metadata.times.indexOf(prev)
        const nextIdx = (idx + 1) % metadata.times.length
        return metadata.times[nextIdx]
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [isPlaying, metadata])

  // Initialize Three.js
  useEffect(() => {
    const container = mountRef.current
    if (!container) return

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.setSize(container.clientWidth, container.clientHeight)
    renderer.setClearColor(0x0a0e1a)
    renderer.shadowMap.enabled = false  // No shadows — data vis must show true colors
    container.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    sceneRef.current = scene
    scene.fog = new THREE.FogExp2(0x0a0e1a, 0.012)

    const R = 20; // Earth radius
    const camera = new THREE.PerspectiveCamera(55, container.clientWidth / container.clientHeight, 0.1, 1000)
    camera.position.set(0, 0, 40)
    camera.lookAt(0, 0, 0)
    cameraRef.current = camera
    rendererRef.current = renderer

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.08
    controls.minDistance = R + 1
    controls.maxDistance = 120
    controls.target.set(0, 0, 0)
    controlsRef.current = controls

    // Base Earth Globe
    const earthGeo = new THREE.SphereGeometry(R, 64, 64)
    // High-res static Earth texture (NASA Blue Marble / Equirectangular) to prevent missing poles
    const earthUrl = `https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg`
    const earthTex = new THREE.TextureLoader().load(earthUrl)
    earthTex.colorSpace = THREE.SRGBColorSpace
    const earthMat = new THREE.MeshBasicMaterial({ map: earthTex })
    const earthMesh = new THREE.Mesh(earthGeo, earthMat)
    earthMeshRef.current = earthMesh
    scene.add(earthMesh)

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8)
    ambientLight.castShadow = false
    scene.add(ambientLight)
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.4)
    dirLight.position.set(10, 15, 10)
    dirLight.castShadow = false
    scene.add(dirLight)
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x333333, 0.2)
    hemiLight.castShadow = false
    scene.add(hemiLight)

    // Realistic Starfield Background
    const starsGeo = new THREE.BufferGeometry()
    const starsPts = []
    for(let i=0; i<3000; i++) {
       const x = THREE.MathUtils.randFloatSpread(400)
       const y = THREE.MathUtils.randFloatSpread(400)
       const z = THREE.MathUtils.randFloatSpread(400)
       // Keep stars far away
       if (x*x + y*y + z*z > 10000) {
          starsPts.push(x, y, z)
       }
    }
    starsGeo.setAttribute('position', new THREE.Float32BufferAttribute(starsPts, 3))
    const starsMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.8, transparent: true, opacity: 0.8 })
    const starField = new THREE.Points(starsGeo, starsMat)
    scene.add(starField)

    const tempV = new THREE.Vector3()
    let animId
    const animate = () => {
      animId = requestAnimationFrame(animate)

      // Smooth camera interpolation towards region presets
      if (targetCamPosRef.current && cameraRef.current) {
        cameraRef.current.position.lerp(targetCamPosRef.current, 0.05)
        if (cameraRef.current.position.distanceTo(targetCamPosRef.current) < 0.2) {
          targetCamPosRef.current = null
        }
      }

      controls.update()

      // Pulsate discrepancy beacon rings & calamities scaled by vectorSpeed
      const vSpeed = vectorSpeedRef.current || 1.0
      const timeSec = Date.now() * 0.003 * vSpeed

      // Animate 3D Calamity Vortex & Seismic Rings
      if (calamitiesGroupRef.current) {
        calamitiesGroupRef.current.children.forEach(c => {
          c.children.forEach(part => {
            if (part.userData?.isCycloneVortex) {
              part.rotation.z -= 0.025 * vSpeed
            } else if (part.userData?.isSeismicRing) {
              const phase = part.userData.phase || 0
              const s = 1.0 + 0.3 * Math.sin(timeSec * 3 + phase)
              part.scale.set(s, s, 1)
            }
          })
        })
      }

      // Animate 3D AIS Vessel Halos
      if (vesselsGroupRef.current) {
        vesselsGroupRef.current.children.forEach(vMesh => {
          const halo = vMesh.children.find(c => c.userData?.isVesselHalo)
          if (halo) {
            const s = 1.0 + 0.25 * Math.sin(timeSec * 2 + (vMesh.userData?.phase || 0))
            halo.scale.set(s, s, 1)
          }
        })
      }
      if (markersRef.current) {
        markersRef.current.children.forEach(mesh => {
          mesh.children.forEach(c => {
            if (c.userData?.isDiscrepancyRing) {
              const phase = c.userData.phase || 0
              if (c.userData.isHighAlert) {
                const scale = 1.0 + 0.35 * Math.sin(timeSec * 4 + phase)
                c.scale.set(scale, scale, 1)
                if (c.material) c.material.opacity = 0.5 + 0.45 * Math.sin(timeSec * 4 + phase)
              } else {
                const scale = 1.0 + 0.15 * Math.sin(timeSec * 2 + phase)
                c.scale.set(scale, scale, 1)
              }
            }
          })
        })
      }

      // Animate Glider along 3D Sawtooth Curve
      if (gliderVesselRef.current && gliderCurveRef.current) {
        const loopT = (Date.now() * 0.00004) % 1.0
        const vPos = gliderCurveRef.current.getPointAt(loopT)
        gliderVesselRef.current.position.copy(vPos)
        const nextPos = gliderCurveRef.current.getPointAt((loopT + 0.005) % 1.0)
        gliderVesselRef.current.lookAt(nextPos)
      }

      // Animate Coastal Port Radar Rings
      if (coastalGroupRef.current) {
        coastalGroupRef.current.children.forEach(c => {
          if (c.userData?.isPortRadarRing) {
            const phase = c.userData.phase || 0
            const s = 1.0 + 0.35 * Math.sin(timeSec * 3 + phase)
            c.scale.set(s, s, 1)
          }
        })
      }

      // Animate 3D Orbiting Satellites along inclined orbital paths
      if (satellitesGroupRef.current) {
        const R_BASE = volumeGroupRef.current?.userData?.R_BASE || 20
        satellitesGroupRef.current.children.forEach(obj => {
          if (obj.userData?.isSatellite) {
            const data = obj.userData
            data.u = (data.u + data.orbitSpeed * vSpeed) % (2 * Math.PI)
            const u = data.u
            const r = data.rOrb
            const inc = data.incRad
            const raan = data.raanRad

            // Calculate 3D position
            const xOrb = r * Math.cos(u)
            const yOrb = r * Math.sin(u)
            const x1 = xOrb
            const y1 = yOrb * Math.cos(inc)
            const z1 = yOrb * Math.sin(inc)
            const x2 = x1 * Math.cos(raan) + z1 * Math.sin(raan)
            const y2 = y1
            const z2 = -x1 * Math.sin(raan) + z1 * Math.cos(raan)

            obj.position.set(x2, y2, z2)
            obj.lookAt(0, 0, 0)

            // Pulsating halo
            const halo = obj.children.find(c => c.userData?.isSatHalo)
            if (halo) {
              const s = 1.0 + 0.25 * Math.sin(timeSec * 3 + (data.satIdx || 0))
              halo.scale.set(s, s, 1)
            }

            // Subsatellite point on Earth surface
            const subSat = obj.position.clone().normalize().multiplyScalar(R_BASE + 0.1)

            // Update Nadir Projection Line
            if (data.nadirLine) {
              const posArr = data.nadirLine.geometry.attributes.position.array
              posArr[0] = x2; posArr[1] = y2; posArr[2] = z2
              posArr[3] = subSat.x; posArr[4] = subSat.y; posArr[5] = subSat.z
              data.nadirLine.geometry.attributes.position.needsUpdate = true
            }

            // Update Swath Footprint on Earth
            if (data.swathMesh) {
              data.swathMesh.position.copy(subSat)
              data.swathMesh.lookAt(0, 0, 0)
            }
          }
        })
      }
      
      if (markersRef.current && labelsContainerRef.current) {
        markersRef.current.children.forEach(mesh => {
          if (mesh.userData.labelDiv) {
            // Only render label if it is hovered
            if (mesh.userData.id !== hoveredInstrumentIdRef.current) {
              if (mesh.userData.labelDiv.style.display !== 'none') {
                 mesh.userData.labelDiv.style.display = 'none'
              }
              return
            }
            
            if (mesh.userData.endPosition) {
              tempV.copy(mesh.position).add(mesh.userData.endPosition)
            } else {
              tempV.copy(mesh.position)
            }
            // Apply group transforms (vertical exaggeration)
            tempV.applyMatrix4(markersRef.current.matrixWorld)
            // No +0.5 here since it should be right at the end of the glider path
            tempV.y -= 0.1 // slightly below the end of the path
            
            tempV.project(camera)
            
            if (tempV.z > 1) {
              if (mesh.userData.labelDiv.style.display !== 'none') mesh.userData.labelDiv.style.display = 'none'
            } else {
              const x = (tempV.x * 0.5 + 0.5) * container.clientWidth
              const y = (tempV.y * -0.5 + 0.5) * container.clientHeight
              if (mesh.userData.labelDiv.style.display !== 'block') mesh.userData.labelDiv.style.display = 'block'
              mesh.userData.labelDiv.style.transform = `translate(-50%, -100%) translate(${x}px, ${y}px)`
            }
          }
        })
      }
      
      renderer.render(scene, camera)
    }
    animate()

    const onResize = () => {
      const w = container.clientWidth
      const h = container.clientHeight
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
    }
    window.addEventListener('resize', onResize)

    /* ── Interaction handlers ──────── */
    container.addEventListener('pointerdown', (e) => {
      pointerDownPosRef.current = { x: e.clientX, y: e.clientY }
    })
    container.addEventListener('pointerup', (e) => {
      const dx = e.clientX - pointerDownPosRef.current.x
      const dy = e.clientY - pointerDownPosRef.current.y
      if (Math.hypot(dx, dy) > 8) return // user dragged to rotate the globe
      if (!cameraRef.current) return
      
      const rect = container.getBoundingClientRect()
      mouseRef.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
      mouseRef.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1
      
      raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current)
      
      // 1. Check in-situ instrument markers first
      if (markersRef.current) {
        const markerIntersects = raycasterRef.current.intersectObjects(markersRef.current.children, true)
        if (markerIntersects.length > 0) {
          let instrumentMesh = markerIntersects[0].object
          while (instrumentMesh && !instrumentMesh.userData?.isInstrument) {
            instrumentMesh = instrumentMesh.parent
          }
          if (instrumentMesh) {
            onMarkerClick(instrumentMesh.userData.id)
            setSurfacePointInfo(null)
            setSelectedVessel(null)
            setSelectedCalamity(null)
            setSelectedSatellite(null)
            return
          }
        }
      }

      // 2. Check glider waypoint intersections
      if (gliderGroupRef.current) {
        const gliderHits = raycasterRef.current.intersectObjects(gliderGroupRef.current.children, true)
        const wpObj = gliderHits.find(h => h.object.userData?.isGliderWaypoint)
        if (wpObj) {
          setSelectedGliderWaypoint(wpObj.object.userData.waypoint)
          setSurfacePointInfo(null)
          setSelectedVessel(null)
          setSelectedCalamity(null)
          setSelectedSatellite(null)
          return
        }
      }

      // 3. Check coastal port intersections
      if (coastalGroupRef.current) {
        const portHits = raycasterRef.current.intersectObjects(coastalGroupRef.current.children, true)
        const portObj = portHits.find(h => h.object.userData?.isCoastalPort)
        if (portObj) {
          setSelectedPort(portObj.object.userData.portData)
          setIsCoastalRiskModalOpen(true)
          setSurfacePointInfo(null)
          setSelectedVessel(null)
          setSelectedCalamity(null)
          setSelectedSatellite(null)
          return
        }
      }

      // 4. Check 3D ocean satellites
      if (satellitesGroupRef.current) {
        const satHits = raycasterRef.current.intersectObjects(satellitesGroupRef.current.children, true)
        const sObj = satHits.find(h => h.object.userData?.isSatellite || h.object.parent?.userData?.isSatellite)
        if (sObj) {
          const sData = sObj.object.userData?.satellite || sObj.object.parent?.userData?.satellite
          setSelectedSatellite(sData)
          setSelectedVessel(null)
          setSelectedCalamity(null)
          setSurfacePointInfo(null)
          return
        }
      }

      // 5. Check vessel intersections
      if (vesselsGroupRef.current) {
        const vesselHits = raycasterRef.current.intersectObjects(vesselsGroupRef.current.children, true)
        const vObj = vesselHits.find(h => h.object.userData?.isVessel || h.object.parent?.userData?.isVessel)
        if (vObj) {
          const vData = vObj.object.userData?.vessel || vObj.object.parent?.userData?.vessel
          setSelectedVessel(vData)
          setSelectedCalamity(null)
          setSelectedSatellite(null)
          setSurfacePointInfo(null)
          return
        }
      }

      // 6. Check calamity intersections
      if (calamitiesGroupRef.current) {
        const calHits = raycasterRef.current.intersectObjects(calamitiesGroupRef.current.children, true)
        const cObj = calHits.find(h => h.object.userData?.isCalamity || h.object.parent?.userData?.isCalamity)
        if (cObj) {
          const cData = cObj.object.userData?.calamity || cObj.object.parent?.userData?.calamity
          setSelectedCalamity(cData)
          setSelectedVessel(null)
          setSelectedSatellite(null)
          setSurfacePointInfo(null)
          return
        }
      }
      
      // 7. Universal Surface Intersections (Volume meshes or base Earth globe)
      let hitSurfacePoint = null
      if (volumeGroupRef.current) {
         const surfaceIntersects = raycasterRef.current.intersectObjects(volumeGroupRef.current.children, true)
         const validSurface = surfaceIntersects.find(i => i.object.userData?.isVolumePart)
         if (validSurface) {
            hitSurfacePoint = validSurface.point
         }
      }
      if (!hitSurfacePoint && earthMeshRef.current) {
         const earthIntersects = raycasterRef.current.intersectObject(earthMeshRef.current)
         if (earthIntersects.length > 0) {
            hitSurfacePoint = earthIntersects[0].point
         }
      }

      if (hitSurfacePoint) {
         const p = hitSurfacePoint
         const normP = p.clone().normalize()
         const clickedLat = Math.asin(normP.y) * 180 / Math.PI
         let theta = Math.atan2(normP.x, normP.z)
         if (theta < 0) theta += 2 * Math.PI
         const clickedLon = (theta * 180 / Math.PI) - 180
         
         // Measure Mode Logic
         if (measureModeRef.current) {
           measurePointsRef.current.push({ lat: clickedLat, lon: clickedLon, pos: p.clone() })
           
           if (measurePointsRef.current.length === 1) {
              const markerGeo = new THREE.SphereGeometry(0.2, 16, 16)
              const markerMat = new THREE.MeshBasicMaterial({ color: 0xff00ff })
              const marker = new THREE.Mesh(markerGeo, markerMat)
              marker.position.copy(p)
              marker.userData.isMeasureMarker = true
              volumeGroupRef.current?.add(marker)
           } else if (measurePointsRef.current.length === 2) {
              const [p1, p2] = measurePointsRef.current
              const markerGeo = new THREE.SphereGeometry(0.2, 16, 16)
              const markerMat = new THREE.MeshBasicMaterial({ color: 0xff00ff })
              const marker = new THREE.Mesh(markerGeo, markerMat)
              marker.position.copy(p2.pos)
              marker.userData.isMeasureMarker = true
              volumeGroupRef.current?.add(marker)
              
              const lineGeo = new THREE.BufferGeometry().setFromPoints([p1.pos, p2.pos])
              const lineMat = new THREE.LineBasicMaterial({ color: 0xff00ff, linewidth: 2 })
              const line = new THREE.Line(lineGeo, lineMat)
              line.userData.isMeasureMarker = true
              volumeGroupRef.current?.add(line)
              
              const R_EARTH_KM = 6371
              const dLat = (p2.lat - p1.lat) * Math.PI / 180
              const dLon = (p2.lon - p1.lon) * Math.PI / 180
              const a = Math.sin(dLat/2)*Math.sin(dLat/2) + Math.cos(p1.lat*Math.PI/180)*Math.cos(p2.lat*Math.PI/180)*Math.sin(dLon/2)*Math.sin(dLon/2)
              const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
              const distKm = R_EARTH_KM * c
              
              alert(`Distance: ${distKm.toFixed(1)} km`)
              measurePointsRef.current = []
              setMeasureMode(false)
           }
           return
         }

         // Drop tactical animated inspection ping beacon at point
         if (volumeGroupRef.current) {
           const oldPings = volumeGroupRef.current.children.filter(c => c.userData?.isClickPing)
           oldPings.forEach(c => volumeGroupRef.current.remove(c))

           const pingGroup = new THREE.Group()
           pingGroup.position.copy(p)
           pingGroup.lookAt(0, 0, 0)

           const ringGeo = new THREE.RingGeometry(0.22, 0.48, 32)
           const ringMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide, transparent: true, opacity: 0.9 })
           const ring = new THREE.Mesh(ringGeo, ringMat)
           ring.userData = { isClickPingRing: true }
           pingGroup.add(ring)

           const dotGeo = new THREE.SphereGeometry(0.1, 14, 14)
           const dotMat = new THREE.MeshBasicMaterial({ color: 0x06b6d4 })
           const dot = new THREE.Mesh(dotGeo, dotMat)
           dot.position.set(0, 0, 0.06)
           pingGroup.add(dot)

           pingGroup.userData = { isClickPing: true }
           volumeGroupRef.current.add(pingGroup)
         }

         // Convert 3D world coordinate to 2D screen coordinate for the popup
         const tempV = p.clone()
         tempV.project(cameraRef.current)
         const sx = (tempV.x * 0.5 + 0.5) * rect.width
         const sy = (tempV.y * -0.5 + 0.5) * rect.height
         
         let value = null
         if (gridDataRef.current && gridDataRef.current.validData) {
           const pts = gridDataRef.current.validData
           let minDist = Infinity
           for (let pt of pts) {
             const d = Math.pow(pt.lat - clickedLat, 2) + Math.pow(pt.lon - clickedLon, 2)
             if (d < minDist) { minDist = d; value = pt.value }
           }
         }

         setSurfacePointInfo({
            lat: clickedLat,
            lon: clickedLon,
            val: value,
            x: sx,
            y: sy
         })
         setSelectedVessel(null)
         setSelectedCalamity(null)
         setSelectedSatellite(null)
         return
      }
      
      setSurfacePointInfo(null)
    })

    container.addEventListener('pointermove', (e) => {
      if (!markersRef.current || !cameraRef.current) return
      
      const rect = container.getBoundingClientRect()
      mouseRef.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
      mouseRef.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1
      
      raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current)
      const intersects = raycasterRef.current.intersectObjects(markersRef.current.children, true)
      let foundId = null
      if (intersects.length > 0) {
        let instrumentMesh = intersects[0].object
        while (instrumentMesh && !instrumentMesh.userData?.isInstrument) {
          instrumentMesh = instrumentMesh.parent
        }
        if (instrumentMesh) {
          foundId = instrumentMesh.userData.id
        }
      }
      
      if (hoveredInstrumentIdRef.current !== foundId) {
        hoveredInstrumentIdRef.current = foundId
        container.style.cursor = foundId ? 'pointer' : 'default'
      }
    })

    /* ── End Interaction handlers ──────── */

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', onResize)
      controls.dispose()
      renderer.dispose()
      container.removeChild(renderer.domElement)
    }
  }, [])

  // Initial API Fetch
  useEffect(() => {
    fetch('/api/variables')
      .then(r => r.json())
      .then(data => {
        setMetadata(data)
        if (data.variables?.length > 0) setActiveVar(data.variables[0])
        if (data.depths?.length > 0) setActiveDepth(data.depths[0])
        if (data.times?.length > 0) setActiveTime(data.times[0])
      })
      .catch(console.error)
  }, [])

  // Fetch and render grid — TRUE 3D VOLUME BOX
  useEffect(() => {
    if (!activeVar || activeDepth == null || !activeTime || !sceneRef.current) return

    fetch(`/api/grid?variable=${activeVar}&depth=${activeDepth}&time=${activeTime}`)
      .then(r => r.json())
      .then(data => {
        const scene = sceneRef.current
        if (!volumeGroupRef.current) {
          volumeGroupRef.current = new THREE.Group()
          scene.add(volumeGroupRef.current)
        }
        const group = volumeGroupRef.current

        // Clean up previous volume meshes
        const toRemove = []
        group.children.forEach(c => {
          if (c.userData?.isVolumePart) toRemove.push(c)
        })
        toRemove.forEach(c => {
          group.remove(c)
          c.geometry?.dispose()
          if (c.material?.map) c.material.map.dispose()
          c.material?.dispose()
        })
        
        if (!data || data.length === 0) return

        const rawPoints = Array.isArray(data) ? data : data.points
        const validData = rawPoints.filter(d => d.value != null && !isNaN(d.value) && d.value > -100 && d.value < 1000)
        let minVal = Infinity, maxVal = -Infinity
        const uniqueLats = new Set(), uniqueLons = new Set()
        validData.forEach(d => {
          if (d.value < minVal) minVal = d.value
          if (d.value > maxVal) maxVal = d.value
          uniqueLats.add(d.lat)
          uniqueLons.add(d.lon)
        })
        setValueRange({ min: minVal, max: maxVal })

        // Use true grid dimensions if provided, otherwise fallback to extracted unique coordinates
        const sortedLats = (data.lats && Array.isArray(data.lats)) ? [...data.lats].sort((a,b) => a-b) : [...uniqueLats].sort((a,b) => a-b)
        const sortedLons = (data.lons && Array.isArray(data.lons)) ? [...data.lons].sort((a,b) => a-b) : [...uniqueLons].sort((a,b) => a-b)
        coordCenterRef.current = { latCenter: (sortedLats[0] + sortedLats[sortedLats.length-1]) / 2, lonCenter: (sortedLons[0] + sortedLons[sortedLons.length-1]) / 2 }
        gridDataRef.current = { validData, sortedLats, sortedLons, minVal, maxVal }
        
        // Signal that new data is ready to trigger the render effect
        setGridDataReady(Date.now())
      })
      .catch(console.error)
  }, [activeVar, activeDepth, activeTime])

  // EFFECT: Render the 3D grid based on current grid data and visualization settings
  useEffect(() => {
    if (!gridDataReady || !gridDataRef.current || !sceneRef.current) return

    const { validData, sortedLats, sortedLons } = gridDataRef.current
    const scene = sceneRef.current
    if (!volumeGroupRef.current) {
      volumeGroupRef.current = new THREE.Group()
      scene.add(volumeGroupRef.current)
    }
    const group = volumeGroupRef.current

    // Clean up previous volume meshes
    const toRemove = []
    group.children.forEach(c => {
      if (c.userData?.isVolumePart) toRemove.push(c)
    })
    toRemove.forEach(c => {
      group.remove(c)
      c.geometry?.dispose()
      if (c.material?.map) c.material.map.dispose()
      c.material?.dispose()
    })

    const minLat = sortedLats[0], maxLat = sortedLats[sortedLats.length-1]
    const minLon = sortedLons[0], maxLon = sortedLons[sortedLons.length-1]
    const maxDepthVal = metadata?.depths ? Math.max(...metadata.depths) : 5000
    
    // R is 20 for the base globe.
    const R_BASE = 20
    const GLOBE_DEPTH_SCALE = 0.0002 // 1000m -> 0.2 units
    
    // UV Mapping to match ESRI Earth
    const phiStart = (90 - maxLat) * Math.PI / 180
    const phiLength = (maxLat - minLat) * Math.PI / 180
    const thetaStart = (minLon + 180) * Math.PI / 180
    let thetaLength = (maxLon - minLon) * Math.PI / 180
    if (maxLon - minLon >= 359.0) thetaLength = 2 * Math.PI

    const currentMin = colorMin !== 0 ? colorMin : gridDataRef.current.minVal
    const currentMax = colorMax !== 0 ? colorMax : gridDataRef.current.maxVal

    const canvas = createHeatmapCanvas(validData, sortedLats, sortedLons, currentMin, currentMax, palette, logScale)
    const texture = new THREE.CanvasTexture(canvas)
    texture.minFilter = THREE.LinearFilter
    texture.magFilter = THREE.LinearFilter
    texture.generateMipmaps = false

    // === TOP SURFACE (ocean surface patch) ===
    const topR = R_BASE + 0.05
    const topGeo = new THREE.SphereGeometry(topR, 64, 64, thetaStart, thetaLength, phiStart, phiLength)
    
    // X-Ray Mode: Make surface highly transparent if we are looking at a deeper slice
    const isDeepSlice = activeDepth > 0;
    const surfaceOpacity = isDeepSlice ? (opacity * 0.15) : (opacity * 0.85);

    const topPlane = new THREE.Mesh(
      topGeo,
      new THREE.MeshBasicMaterial({ map: texture, transparent: true, opacity: surfaceOpacity, side: THREE.DoubleSide, alphaTest: 0.05 })
    )
    topPlane.userData = { isVolumePart: true, isSurface: true }
    group.add(topPlane)

    // === FLOATING DEPTH SLICE ===
    const sliceR = topR - (activeDepth * GLOBE_DEPTH_SCALE)
    const sliceGeo = new THREE.SphereGeometry(sliceR, 64, 64, thetaStart, thetaLength, phiStart, phiLength)
    const slicePlane = new THREE.Mesh(
      sliceGeo,
      new THREE.MeshBasicMaterial({ map: texture, transparent: true, opacity: opacity * 0.9, side: THREE.DoubleSide, alphaTest: 0.05 })
    )
    slicePlane.visible = isDeepSlice
    slicePlane.userData = { isVolumePart: true, isSlicePlane: true }
    group.add(slicePlane)

    group.userData.DEPTH_SCALE = GLOBE_DEPTH_SCALE
    group.userData.R_BASE = R_BASE

    // === Spherical mapping complete. Flat decorations removed. ===
    
    // Trigger marker re-render if needed
    if (markersRef.current) {
        markersRef.current.position.y = 0; // force a minor update
    }
    
  }, [gridDataReady, colorMin, colorMax, palette, logScale, opacity, activeDepth, metadata])

  // === ISOSURFACE / CONTOUR LINES ===
  useEffect(() => {
    if (!volumeGroupRef.current || !gridDataRef.current) return
    const group = volumeGroupRef.current

    // Remove old contour lines
    const oldContours = []
    group.children.forEach(c => { if (c.userData?.isContourLine) oldContours.push(c) })
    oldContours.forEach(c => { group.remove(c); c.geometry?.dispose(); c.material?.dispose() })

    if (!showIso || !gridDataRef.current.validData) return

    const { validData, sortedLats, sortedLons } = gridDataRef.current
    const W = sortedLons[sortedLons.length-1] - sortedLons[0]
    const D = sortedLats[sortedLats.length-1] - sortedLats[0]
    const DEPTH_SCALE = group.userData.DEPTH_SCALE || 1.2
    const sliceY = -(activeDepth * DEPTH_SCALE)

    // Build a 2D grid for marching squares
    const nLat = sortedLats.length, nLon = sortedLons.length
    const grid2D = new Array(nLat).fill(null).map(() => new Array(nLon).fill(NaN))
    const latMap = new Map(sortedLats.map((v, i) => [v, i]))
    const lonMap = new Map(sortedLons.map((v, i) => [v, i]))
    validData.forEach(d => {
      const li = latMap.get(d.lat), lo = lonMap.get(d.lon)
      if (li !== undefined && lo !== undefined) grid2D[li][lo] = d.value
    })

    // Marching squares: extract contour segments at isoValue
    const segments = []
    for (let i = 0; i < nLat - 1; i++) {
      for (let j = 0; j < nLon - 1; j++) {
        const v = [grid2D[i][j], grid2D[i][j+1], grid2D[i+1][j+1], grid2D[i+1][j]]
        if (v.some(x => isNaN(x))) continue

        const b = v.map(x => x >= isoValue ? 1 : 0)
        const idx = b[0] * 8 + b[1] * 4 + b[2] * 2 + b[3]
        if (idx === 0 || idx === 15) continue

        // Linear interpolation helper
        const lerp = (va, vb, pa, pb) => {
          const t = (isoValue - va) / (vb - va || 1)
          return [pa[0] + t * (pb[0] - pa[0]), pa[1] + t * (pb[1] - pa[1])]
        }

        const corners = [
          [sortedLons[j], sortedLats[i]],
          [sortedLons[j+1], sortedLats[i]],
          [sortedLons[j+1], sortedLats[i+1]],
          [sortedLons[j], sortedLats[i+1]]
        ]

        // Edge midpoints via interpolation
        const edges = [
          lerp(v[0], v[1], corners[0], corners[1]), // top
          lerp(v[1], v[2], corners[1], corners[2]), // right
          lerp(v[2], v[3], corners[2], corners[3]), // bottom
          lerp(v[3], v[0], corners[3], corners[0]), // left
        ]

        // Lookup table for which edges to connect (simplified)
        const edgePairs = {
          1: [[2,3]], 2: [[1,2]], 3: [[1,3]], 4: [[0,1]], 5: [[0,3],[1,2]],
          6: [[0,2]], 7: [[0,3]], 8: [[0,3]], 9: [[0,2]], 10: [[0,1],[2,3]],
          11: [[0,1]], 12: [[1,3]], 13: [[1,2]], 14: [[2,3]]
        }

        const pairs = edgePairs[idx] || []
        pairs.forEach(([a, b]) => {
          segments.push([edges[a], edges[b]])
        })
      }
    }

    if (segments.length === 0) return

    const center = coordCenterRef.current
    segments.forEach(([p1, p2]) => {
      const R_BASE = group.userData.R_BASE || 20
      const DS = group.userData.DEPTH_SCALE || 0.0002
      const sliceR = R_BASE - (activeDepth * DS) + 0.06
      
      const getSpherical = (lon, lat) => {
        const phi = (90 - lat) * Math.PI / 180
        const theta = (lon + 180) * Math.PI / 180
        return new THREE.Vector3().setFromSphericalCoords(sliceR, phi, theta)
      }
      
      const pts = [getSpherical(p1[0], p1[1]), getSpherical(p2[0], p2[1])]
      const geo = new THREE.BufferGeometry().setFromPoints(pts)
      const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0xeab308, linewidth: 2, transparent: true, opacity: 0.9 }))
      line.userData = { isContourLine: true, isVolumePart: false }
      group.add(line)
    })
  }, [showIso, isoValue, gridDataReady, activeDepth])

  // === CURRENT VECTOR ARROWS (when uo or vo is active) ===
  useEffect(() => {
    if (!volumeGroupRef.current) return
    const group = volumeGroupRef.current

    // Remove old arrows
    const oldArrows = []
    group.children.forEach(c => { if (c.userData?.isCurrentArrow) oldArrows.push(c) })
    oldArrows.forEach(c => { group.remove(c); c.geometry?.dispose(); c.material?.dispose() })

    // Only show arrows for current variables
    if (activeVar !== 'uo' && activeVar !== 'vo') return
    if (!gridDataRef.current?.validData) return

    const { validData, sortedLats, sortedLons } = gridDataRef.current
    const DEPTH_SCALE = group.userData.DEPTH_SCALE || 1.2
    const sliceY = -(activeDepth * DEPTH_SCALE)
    const center = coordCenterRef.current
    const currentMin = colorMin !== 0 ? colorMin : gridDataRef.current.minVal
    const currentMax = colorMax !== 0 ? colorMax : gridDataRef.current.maxVal

    // Subsample for performance (every 10th point)
    const step = 10
    const palColors = PALETTES[palette] || PALETTES.thermal
    const c1 = new THREE.Color(palColors[0])
    const c2 = new THREE.Color(palColors[1])
    const tempC = new THREE.Color()

    for (let i = 0; i < validData.length; i += step) {
      const d = validData[i]
      const magnitude = Math.abs(d.value)
      const direction = d.value >= 0 ? 1 : -1

      let normalized = (d.value - currentMin) / (currentMax - currentMin || 1)
      normalized = Math.max(0, Math.min(1, normalized))
      if (palette === 'thermal') tempC.setHSL(0.66 * (1.0 - normalized), 1.0, 0.5)
      else tempC.lerpColors(c1, c2, normalized)

      const radLat = d.lat * Math.PI / 180
      const radLon = (d.lon + 180) * Math.PI / 180
      const R_BASE = group.userData.R_BASE || 20
      const DS = group.userData.DEPTH_SCALE || 0.0002
      const sliceR = R_BASE - (activeDepth * DS) + 0.06 // Slightly above slice
      
      const phi = (90 - d.lat) * Math.PI / 180
      const theta = (d.lon + 180) * Math.PI / 180
      const pvec = new THREE.Vector3().setFromSphericalCoords(sliceR, phi, theta)
      const px = pvec.x
      const py = pvec.y
      const pz = pvec.z

      const arrowGroup = new THREE.Group()
      arrowGroup.position.set(px, py, pz)
      arrowGroup.lookAt(0, 0, 0)
      
      // lookAt(0,0,0) points local +Z towards center (Down).
      // Local +Y aligns with world +Y (North).
      // Local +X points West. Local -X points East.
      const dirX = activeVar === 'uo' ? -direction : 0
      const dirY = activeVar === 'vo' ? direction : 0
      const localDir = new THREE.Vector3(dirX, dirY, 0).normalize()

      const arrowLen = Math.min(0.8, magnitude * 2)
      if (arrowLen < 0.02) continue

      const arrow = new THREE.ArrowHelper(localDir, new THREE.Vector3(0,0,0), arrowLen, tempC.getHex(), 0.15, 0.08)
      arrowGroup.userData = { isCurrentArrow: true }
      arrowGroup.add(arrow)
      group.add(arrowGroup)
    }
  }, [activeVar, gridDataReady, activeDepth, colorMin, colorMax, palette])

  // Live update vertical exaggeration
  useEffect(() => {
    if (!volumeGroupRef.current) return
    volumeGroupRef.current.scale.set(1, vertExag, 1)
    if (markersRef.current) {
      markersRef.current.scale.set(1, vertExag, 1)
    }
  }, [vertExag])

  // Fetch Instruments & Draw Profiles
  useEffect(() => {
    // BUG FIX 2: Wait until grid data has loaded so coordCenterRef is set
    if (!coordCenterRef.current || (coordCenterRef.current.latCenter === 0 && coordCenterRef.current.lonCenter === 0)) return
    if (!sceneRef.current) return

    fetch('/api/instruments')
      .then(r => r.json())
      .then(async (instruments) => {
        const scene = sceneRef.current
        if (!volumeGroupRef.current) return
        if (markersRef.current) {
          // Cleanup old DOM labels
          markersRef.current.children.forEach(c => {
             if (c.userData.labelDiv) c.userData.labelDiv.remove()
             c.geometry?.dispose()
             c.material?.dispose()
             if (c.children) {
                 c.children.forEach(cc => {
                    cc.geometry?.dispose()
                    cc.material?.dispose()
                 })
             }
          })
          scene.remove(markersRef.current)
        }
        
        if (labelsContainerRef.current) {
          labelsContainerRef.current.innerHTML = ''
        }
        
        const group = new THREE.Group()
        const latCenter = coordCenterRef.current.latCenter
        const lonCenter = coordCenterRef.current.lonCenter

        // Load profiles for each instrument
        const promises = instruments.map(inst => 
          fetch(`/api/instruments/${inst.id}/profile`)
            .then(r => r.json())
            .catch(() => null)
        )
        const profiles = await Promise.all(promises)

        const palColors = PALETTES[palette] || PALETTES.thermal
        const c1 = new THREE.Color(palColors[0])
        const c2 = new THREE.Color(palColors[1])
        const tempC = new THREE.Color()

        instruments.forEach((inst, idx) => {
          const profileRaw = profiles[idx]
          const profile = Array.isArray(profileRaw) ? profileRaw : (profileRaw?.profile || [])
          if (!profile || profile.length < 2) return

          const R_BASE = volumeGroupRef.current?.userData?.R_BASE || 20
          const phi = (90 - inst.lat) * Math.PI / 180
          const theta = (inst.lon + 180) * Math.PI / 180
          const pos = new THREE.Vector3().setFromSphericalCoords(R_BASE, phi, theta)
          
          const px = pos.x
          const py = pos.y
          const pz = pos.z
          
          profile.sort((a,b) => a.depth - b.depth)
          const DS = volumeGroupRef.current?.userData?.DEPTH_SCALE || 0.0002
          
          // ── Clean Vertical CTD Profiling Depth Needle (Authentic Argo In-Situ Cast) ──
          const biasVal = Math.abs(inst.bias ?? 0)
          const isHighAlert = biasVal >= 1.5
          const isModerate = biasVal >= 0.5 && biasVal < 1.5
          const haloColor = isHighAlert ? 0xef4444 : (isModerate ? 0xf59e0b : 0x10b981)

          const maxProfileDepth = profile[profile.length - 1]?.depth || 2000
          const soundingGeo = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, 0, 0.05),
            new THREE.Vector3(0, 0, -(maxProfileDepth * DS))
          ])
          const soundingMat = new THREE.LineBasicMaterial({
            color: haloColor,
            transparent: true,
            opacity: 0.65,
            linewidth: 1
          })
          const soundingLine = new THREE.Line(soundingGeo, soundingMat)

          // Subsurface CTD Sensor Package at cast bottom
          const sensorGeo = new THREE.SphereGeometry(0.08, 8, 8)
          const sensorMat = new THREE.MeshBasicMaterial({ color: haloColor })
          const sensorMesh = new THREE.Mesh(sensorGeo, sensorMat)
          sensorMesh.position.set(0, 0, -(maxProfileDepth * DS))

          const mesh = new THREE.Group()
          mesh.position.set(px, py, pz)
          mesh.lookAt(0, 0, 0)
          mesh.add(soundingLine)
          mesh.add(sensorMesh)

          // Sea-Surface Glowing Radar Ring
          const haloGeo = new THREE.RingGeometry(0.22, 0.44, 32)
          const haloMat = new THREE.MeshBasicMaterial({
            color: haloColor,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.85
          })
          const haloMesh = new THREE.Mesh(haloGeo, haloMat)
          haloMesh.position.set(0, 0, 0.04) // flush to sea surface
          haloMesh.userData = {
            isDiscrepancyRing: true,
            isHighAlert: isHighAlert,
            phase: Math.random() * Math.PI * 2
          }
          haloMesh.visible = showDiscrepancy
          mesh.add(haloMesh)

          // Center Surface Buoy Beacon Pin
          const pinGeo = new THREE.SphereGeometry(0.12, 16, 16)
          const pinMat = new THREE.MeshBasicMaterial({ color: haloColor })
          const pinMesh = new THREE.Mesh(pinGeo, pinMat)
          pinMesh.position.set(0, 0, 0.08)
          pinMesh.userData = { isDiscrepancyRing: true }
          pinMesh.visible = showDiscrepancy
          mesh.add(pinMesh)

          mesh.userData = { 
            id: inst.id, 
            isInstrument: true,
            bias: inst.bias,
            region: inst.region,
            discrepancy_status: inst.discrepancy_status,
            fullInstrument: inst,
            latestTemp: profile[0].temperature,
            latestSalt: profile[0].salinity,
            endPosition: points[points.length - 1]
          }
          
          if (labelsContainerRef.current) {
            const labelDiv = document.createElement('div')
            labelDiv.style.position = 'absolute'
            labelDiv.style.top = '0'
            labelDiv.style.left = '0'
            labelDiv.style.pointerEvents = 'none'
            labelDiv.style.background = 'rgba(15, 23, 42, 0.7)'
            labelDiv.style.border = '1px solid rgba(255, 255, 255, 0.1)'
            labelDiv.style.padding = '6px 12px'
            labelDiv.style.borderRadius = '6px'
            labelDiv.style.color = '#e2e8f0'
            labelDiv.style.fontSize = '0.75rem'
            labelDiv.style.whiteSpace = 'nowrap'
            labelDiv.style.boxShadow = '0 4px 12px rgba(0,0,0,0.5)'
            labelDiv.style.zIndex = '20'
            labelDiv.style.backdropFilter = 'blur(8px)'
            
            const timeStr = activeTime ? new Date(activeTime).toLocaleTimeString('en-GB', {hour: '2-digit', minute:'2-digit', timeZone:'UTC'}) + ' UTC' : '14:30 UTC'
            
            labelDiv.innerHTML = `<span style="color:#ffffff;font-weight:600;">Glider ID: ${inst.id}</span> | Temp: ${profile[0].temperature.toFixed(1)}&deg;C | Salinity: ${profile[0].salinity.toFixed(1)} PSU | Time: ${timeStr}`
            labelsContainerRef.current.appendChild(labelDiv)
            mesh.userData.labelDiv = labelDiv
          }

          group.add(mesh)
        })

        group.scale.set(1, vertExag, 1)
        scene.add(group)
        markersRef.current = group
      })
      .catch(console.error)
  }, [palette, colorMin, colorMax, activeVar, activeDepth, activeTime])

  // Toggle Discrepancy Rings Visibility
  useEffect(() => {
    if (!markersRef.current) return
    markersRef.current.children.forEach(tubeMesh => {
      const ring = tubeMesh.children.find(c => c.userData?.isDiscrepancyRing)
      if (ring) ring.visible = showDiscrepancy
    })
  }, [showDiscrepancy])

  // ── Render 3D Autonomous Glider Sawtooth Trajectory ──
  useEffect(() => {
    if (!sceneRef.current) return
    const scene = sceneRef.current

    if (gliderGroupRef.current) {
      scene.remove(gliderGroupRef.current)
      gliderGroupRef.current.traverse(obj => {
        obj.geometry?.dispose()
        obj.material?.dispose()
      })
      gliderGroupRef.current = null
      gliderVesselRef.current = null
      gliderCurveRef.current = null
    }

    if (!showGlider) return

    fetch('/api/glider/trajectory')
      .then(r => r.json())
      .then(data => {
        if (!data || !data.waypoints || data.waypoints.length === 0) return

        const group = new THREE.Group()
        group.userData = { isGliderGroup: true }
        const R_BASE = volumeGroupRef.current?.userData?.R_BASE || 20
        const DS = 0.003

        const pathPoints = []
        const waypointsData = data.waypoints

        waypointsData.forEach((wp) => {
          const phi = (90 - wp.lat) * Math.PI / 180
          const theta = (wp.lon + 180) * Math.PI / 180

          // Surface position
          const surfPos = new THREE.Vector3().setFromSphericalCoords(R_BASE + 0.14, phi, theta)
          pathPoints.push(surfPos)

          // Dive position (Sawtooth bottom)
          const diveDepth = wp.dive_max_depth || 250
          const divePos = new THREE.Vector3().setFromSphericalCoords(R_BASE - diveDepth * DS, phi, theta)
          pathPoints.push(divePos)

          // Glowing surface beacon
          const beaconGeo = new THREE.SphereGeometry(0.16, 12, 12)
          const beaconMat = new THREE.MeshBasicMaterial({ color: 0xc084fc })
          const beaconMesh = new THREE.Mesh(beaconGeo, beaconMat)
          beaconMesh.position.copy(surfPos)
          beaconMesh.userData = { isGliderWaypoint: true, waypoint: wp, cycle: wp.cycle }
          group.add(beaconMesh)

          // Waypoint halo ring
          const ringGeo = new THREE.RingGeometry(0.24, 0.32, 16)
          const ringMat = new THREE.MeshBasicMaterial({ color: 0xa855f7, side: THREE.DoubleSide, transparent: true, opacity: 0.85 })
          const ringMesh = new THREE.Mesh(ringGeo, ringMat)
          ringMesh.position.copy(surfPos)
          ringMesh.lookAt(0, 0, 0)
          group.add(ringMesh)
        })

        // Construct 3D Sawtooth spline curve
        if (pathPoints.length >= 2) {
          const curve = new THREE.CatmullRomCurve3(pathPoints, false, 'centripetal', 0.15)
          gliderCurveRef.current = curve

          const tubeGeo = new THREE.TubeGeometry(curve, pathPoints.length * 8, 0.055, 6, false)
          const tubeMat = new THREE.MeshBasicMaterial({ color: 0x06b6d4, wireframe: false, transparent: true, opacity: 0.9 })
          const tubeMesh = new THREE.Mesh(tubeGeo, tubeMat)
          group.add(tubeMesh)

          // Add animated 3D Glider Vessel Body
          const vesselGroup = new THREE.Group()
          const hullGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.55, 8)
          hullGeo.rotateZ(Math.PI / 2)
          const hullMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 })
          const hull = new THREE.Mesh(hullGeo, hullMat)
          vesselGroup.add(hull)

          // Glider swept wings
          const wingGeo = new THREE.BoxGeometry(0.8, 0.02, 0.18)
          const wingMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b })
          const wings = new THREE.Mesh(wingGeo, wingMat)
          vesselGroup.add(wings)

          vesselGroup.position.copy(pathPoints[0])
          group.add(vesselGroup)
          gliderVesselRef.current = vesselGroup
        }

        scene.add(group)
        gliderGroupRef.current = group
      })
      .catch(err => console.error('Error rendering glider:', err))
  }, [showGlider, vertExag])

  // ── Render Coastal Multi-Hazard Port Markers ──
  useEffect(() => {
    if (!sceneRef.current) return
    const scene = sceneRef.current

    if (coastalGroupRef.current) {
      scene.remove(coastalGroupRef.current)
      coastalGroupRef.current.traverse(obj => {
        obj.geometry?.dispose()
        obj.material?.dispose()
      })
      coastalGroupRef.current = null
    }

    if (!showCoastalRisk) return

    fetch('/api/coastal_risk')
      .then(r => r.json())
      .then(data => {
        if (!data || !data.ports) return

        const group = new THREE.Group()
        group.userData = { isCoastalGroup: true }
        const R_BASE = volumeGroupRef.current?.userData?.R_BASE || 20

        data.ports.forEach((port, pIdx) => {
          const phi = (90 - port.lat) * Math.PI / 180
          const theta = (port.lon + 180) * Math.PI / 180
          const pos = new THREE.Vector3().setFromSphericalCoords(R_BASE + 0.15, phi, theta)

          let colorHex = 0x10b981
          if (port.risk_level === 'HIGH') colorHex = 0xef4444
          else if (port.risk_level === 'MODERATE') colorHex = 0xf59e0b

          // Vertical glowing beacon cylinder
          const cylinderGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.45, 8)
          cylinderGeo.rotateX(Math.PI / 2)
          const cylinderMat = new THREE.MeshBasicMaterial({ color: colorHex })
          const cylinderMesh = new THREE.Mesh(cylinderGeo, cylinderMat)
          cylinderMesh.position.copy(pos)
          cylinderMesh.lookAt(0, 0, 0)
          cylinderMesh.userData = { isCoastalPort: true, portData: port }
          group.add(cylinderMesh)

          // Beacon Top Sphere
          const sphereGeo = new THREE.SphereGeometry(0.12, 12, 12)
          const sphereMat = new THREE.MeshBasicMaterial({ color: colorHex })
          const sphereMesh = new THREE.Mesh(sphereGeo, sphereMat)
          sphereMesh.position.copy(pos)
          sphereMesh.userData = { isCoastalPort: true, portData: port }
          group.add(sphereMesh)

          // Pulsing Coastal Hazard Radar Ring
          const ringGeo = new THREE.RingGeometry(0.2, 0.32, 16)
          const ringMat = new THREE.MeshBasicMaterial({ color: colorHex, side: THREE.DoubleSide, transparent: true, opacity: 0.8 })
          const ringMesh = new THREE.Mesh(ringGeo, ringMat)
          ringMesh.position.copy(pos)
          ringMesh.lookAt(0, 0, 0)
          ringMesh.userData = { isPortRadarRing: true, phase: pIdx * 0.8 }
          group.add(ringMesh)
        })

        scene.add(group)
        coastalGroupRef.current = group
      })
      .catch(err => console.error('Error rendering coastal risk ports:', err))
  }, [showCoastalRisk])

  // ── Render 3D AIS Maritime Vessels Layer ──
  useEffect(() => {
    if (!sceneRef.current) return
    const scene = sceneRef.current

    if (vesselsGroupRef.current) {
      scene.remove(vesselsGroupRef.current)
      vesselsGroupRef.current.traverse(obj => {
        obj.geometry?.dispose()
        obj.material?.dispose()
      })
      vesselsGroupRef.current = null
    }

    if (!showVessels) return

    fetch('/api/vessels')
      .then(r => r.json())
      .then(data => {
        if (!data || !data.vessels) return

        const group = new THREE.Group()
        group.userData = { isVesselsGroup: true }
        const R_BASE = volumeGroupRef.current?.userData?.R_BASE || 20

        data.vessels.forEach((v, vIdx) => {
          const phi = (90 - v.lat) * Math.PI / 180
          const theta = (v.lon + 180) * Math.PI / 180
          const pos = new THREE.Vector3().setFromSphericalCoords(R_BASE + 0.16, phi, theta)

          let shipColor = 0x38bdf8 // Default cyan for research/patrol
          if (v.type.toLowerCase().includes('tanker') || v.type.toLowerCase().includes('lng')) shipColor = 0xf97316 // orange/amber
          else if (v.type.toLowerCase().includes('container') || v.type.toLowerCase().includes('bulk')) shipColor = 0x10b981 // teal/green
          else if (v.type.toLowerCase().includes('trawler')) shipColor = 0xeab308 // yellow

          const vMesh = new THREE.Group()
          vMesh.position.copy(pos)
          vMesh.lookAt(0, 0, 0)

          // 3D Ship Hull (Arrow-shaped wedge pointing in direction of course)
          const hullGeo = new THREE.ConeGeometry(0.12, 0.45, 4)
          hullGeo.rotateZ(Math.PI / 2)
          const courseRad = (v.course_deg || 0) * Math.PI / 180
          hullGeo.rotateY(courseRad)

          const hullMat = new THREE.MeshBasicMaterial({ color: shipColor })
          const hull = new THREE.Mesh(hullGeo, hullMat)
          hull.position.set(0, 0, 0.08)
          vMesh.add(hull)

          // Surface Pulsing Radar Ring
          const ringGeo = new THREE.RingGeometry(0.18, 0.32, 16)
          const ringMat = new THREE.MeshBasicMaterial({ color: shipColor, side: THREE.DoubleSide, transparent: true, opacity: 0.75 })
          const ringMesh = new THREE.Mesh(ringGeo, ringMat)
          ringMesh.position.set(0, 0, 0.03)
          ringMesh.userData = { isVesselHalo: true }
          vMesh.add(ringMesh)

          vMesh.userData = { isVessel: true, vessel: v, phase: vIdx * 0.7 }
          group.add(vMesh)
        })

        scene.add(group)
        vesselsGroupRef.current = group
      })
      .catch(err => console.error('Error rendering vessels:', err))
  }, [showVessels])

  // ── Render 3D Calamity & Cyclone Radar Layer ──
  useEffect(() => {
    if (!sceneRef.current) return
    const scene = sceneRef.current

    if (calamitiesGroupRef.current) {
      scene.remove(calamitiesGroupRef.current)
      calamitiesGroupRef.current.traverse(obj => {
        obj.geometry?.dispose()
        obj.material?.dispose()
      })
      calamitiesGroupRef.current = null
    }

    if (!showCalamities) return

    fetch('/api/calamities')
      .then(r => r.json())
      .then(res => {
        if (!res || !res.data) return
        const data = res.data
        const group = new THREE.Group()
        group.userData = { isCalamitiesGroup: true }
        const R_BASE = volumeGroupRef.current?.userData?.R_BASE || 20

        // 1. Cyclones (Rotating Spiral Vortex)
        if (data.active_cyclones) {
          data.active_cyclones.forEach((cyc) => {
            const phi = (90 - cyc.center_lat) * Math.PI / 180
            const theta = (cyc.center_lon + 180) * Math.PI / 180
            const pos = new THREE.Vector3().setFromSphericalCoords(R_BASE + 0.18, phi, theta)

            const cycGroup = new THREE.Group()
            cycGroup.position.copy(pos)
            cycGroup.lookAt(0, 0, 0)

            // Outer Storm Surge Warning Ring (Crimson)
            const outerRingGeo = new THREE.RingGeometry(0.7, 1.05, 32)
            const outerRingMat = new THREE.MeshBasicMaterial({ color: 0xef4444, side: THREE.DoubleSide, transparent: true, opacity: 0.65 })
            const outerRing = new THREE.Mesh(outerRingGeo, outerRingMat)
            outerRing.userData = { isCycloneVortex: true }
            cycGroup.add(outerRing)

            // Inner Core Spiral Ring (Amber/Orange)
            const innerRingGeo = new THREE.RingGeometry(0.28, 0.52, 24)
            const innerRingMat = new THREE.MeshBasicMaterial({ color: 0xf97316, side: THREE.DoubleSide, transparent: true, opacity: 0.85 })
            const innerRing = new THREE.Mesh(innerRingGeo, innerRingMat)
            innerRing.userData = { isCycloneVortex: true }
            cycGroup.add(innerRing)

            // Center Eye Sphere
            const eyeGeo = new THREE.SphereGeometry(0.18, 16, 16)
            const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff0000 })
            const eyeMesh = new THREE.Mesh(eyeGeo, eyeMat)
            eyeMesh.position.set(0, 0, 0.1)
            cycGroup.add(eyeMesh)

            cycGroup.userData = { isCalamity: true, calamityType: 'cyclone', calamity: cyc }
            group.add(cycGroup)
          })
        }

        // 2. Submarine Seismic & Tsunami Events
        if (data.seismic_tsunami_events) {
          data.seismic_tsunami_events.forEach((eq, eqIdx) => {
            const phi = (90 - eq.center_lat) * Math.PI / 180
            const theta = (eq.center_lon + 180) * Math.PI / 180
            const pos = new THREE.Vector3().setFromSphericalCoords(R_BASE + 0.16, phi, theta)

            const eqGroup = new THREE.Group()
            eqGroup.position.copy(pos)
            eqGroup.lookAt(0, 0, 0)

            const ringGeo = new THREE.RingGeometry(0.35, 0.55, 24)
            const ringMat = new THREE.MeshBasicMaterial({ color: 0x14b8a6, side: THREE.DoubleSide, transparent: true, opacity: 0.8 })
            const ringMesh = new THREE.Mesh(ringGeo, ringMat)
            ringMesh.userData = { isSeismicRing: true, phase: eqIdx * 1.2 }
            eqGroup.add(ringMesh)

            const epicenterGeo = new THREE.SphereGeometry(0.14, 14, 14)
            const epicenterMat = new THREE.MeshBasicMaterial({ color: 0x2dd4bf })
            const epicenter = new THREE.Mesh(epicenterGeo, epicenterMat)
            epicenter.position.set(0, 0, 0.08)
            eqGroup.add(epicenter)

            eqGroup.userData = { isCalamity: true, calamityType: 'earthquake', calamity: eq }
            group.add(eqGroup)
          })
        }

        // 3. Marine Heatwaves
        if (data.marine_heatwaves) {
          data.marine_heatwaves.forEach((mhw) => {
            const phi = (90 - mhw.center_lat) * Math.PI / 180
            const theta = (mhw.center_lon + 180) * Math.PI / 180
            const pos = new THREE.Vector3().setFromSphericalCoords(R_BASE + 0.14, phi, theta)

            const mhwGroup = new THREE.Group()
            mhwGroup.position.copy(pos)
            mhwGroup.lookAt(0, 0, 0)

            const diskGeo = new THREE.CircleGeometry(0.6, 24)
            const diskMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b, side: THREE.DoubleSide, transparent: true, opacity: 0.45 })
            const disk = new THREE.Mesh(diskGeo, diskMat)
            mhwGroup.add(disk)

            mhwGroup.userData = { isCalamity: true, calamityType: 'heatwave', calamity: mhw }
            group.add(mhwGroup)
          })
        }

        scene.add(group)
        calamitiesGroupRef.current = group
      })
      .catch(err => console.error('Error rendering calamities:', err))
  }, [showCalamities])

  // ── Render 3D Ocean Satellites & Orbits Layer ──
  useEffect(() => {
    if (!sceneRef.current) return
    const scene = sceneRef.current

    if (satellitesGroupRef.current) {
      scene.remove(satellitesGroupRef.current)
      satellitesGroupRef.current.traverse(obj => {
        obj.geometry?.dispose()
        if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose())
        else obj.material?.dispose()
      })
      satellitesGroupRef.current = null
    }

    if (!showSatellites) return

    fetch('/api/satellites')
      .then(r => r.json())
      .then(res => {
        if (!res || !res.satellites) return
        const satellites = res.satellites
        const group = new THREE.Group()
        group.userData = { isSatellitesGroup: true }
        const R_BASE = volumeGroupRef.current?.userData?.R_BASE || 20

        satellites.forEach((sat, satIdx) => {
          const isGeo = sat.altitude_km > 30000
          const rOrb = isGeo ? (R_BASE + 18) : (R_BASE + 5.5 + (satIdx * 0.9))
          const incRad = (sat.inclination_deg || 0) * Math.PI / 180
          const raanRad = (satIdx * (Math.PI / 3))

          // 1. Draw 3D Elliptical Orbit Ring
          const orbitPts = []
          const segments = 120
          for (let s = 0; s <= segments; s++) {
            const u = (s / segments) * 2 * Math.PI
            const xOrb = rOrb * Math.cos(u)
            const yOrb = rOrb * Math.sin(u)
            // Inclination around X
            const x1 = xOrb
            const y1 = yOrb * Math.cos(incRad)
            const z1 = yOrb * Math.sin(incRad)
            // RAAN around Y
            const x2 = x1 * Math.cos(raanRad) + z1 * Math.sin(raanRad)
            const y2 = y1
            const z2 = -x1 * Math.sin(raanRad) + z1 * Math.cos(raanRad)
            orbitPts.push(new THREE.Vector3(x2, y2, z2))
          }
          const orbitGeo = new THREE.BufferGeometry().setFromPoints(orbitPts)
          let orbitColor = 0xa78bfa
          if (sat.id === 'OCEANSAT-3') orbitColor = 0x38bdf8
          else if (sat.id === 'INSAT-3DR') orbitColor = 0xf59e0b
          else if (sat.id === 'SENTINEL-3A') orbitColor = 0x10b981
          else if (sat.id === 'SWOT') orbitColor = 0xec4899

          const orbitMat = new THREE.LineBasicMaterial({
            color: orbitColor,
            transparent: true,
            opacity: 0.45
          })
          const orbitLine = new THREE.Line(orbitGeo, orbitMat)
          group.add(orbitLine)

          // 2. 3D Satellite Body
          const satBodyGroup = new THREE.Group()

          // Main Bus
          const busGeo = new THREE.BoxGeometry(0.3, 0.3, 0.45)
          const busMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 })
          const busMesh = new THREE.Mesh(busGeo, busMat)
          satBodyGroup.add(busMesh)

          // Solar Array Wings
          const wingGeo = new THREE.BoxGeometry(1.4, 0.03, 0.35)
          const wingMat = new THREE.MeshBasicMaterial({ color: 0x1e3a8a })
          const wings = new THREE.Mesh(wingGeo, wingMat)
          satBodyGroup.add(wings)

          // Instrument Parabolic Antenna
          const dishGeo = new THREE.ConeGeometry(0.18, 0.12, 16)
          dishGeo.rotateX(Math.PI)
          const dishMat = new THREE.MeshBasicMaterial({ color: 0x94a3b8 })
          const dish = new THREE.Mesh(dishGeo, dishMat)
          dish.position.set(0, -0.2, 0)
          satBodyGroup.add(dish)

          // Pulsing Glow Halo
          const haloGeo = new THREE.RingGeometry(0.35, 0.6, 16)
          const haloMat = new THREE.MeshBasicMaterial({ color: orbitColor, side: THREE.DoubleSide, transparent: true, opacity: 0.75 })
          const halo = new THREE.Mesh(haloGeo, haloMat)
          halo.userData = { isSatHalo: true }
          satBodyGroup.add(halo)

          // 3. Nadir Projection Line
          const nadirGeo = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(0, 0, 0)
          ])
          const nadirMat = new THREE.LineBasicMaterial({
            color: orbitColor,
            transparent: true,
            opacity: 0.5
          })
          const nadirLine = new THREE.Line(nadirGeo, nadirMat)
          group.add(nadirLine)

          // 4. Ground Swath Footprint Circle on Earth
          const swathRadius = Math.min(2.5, Math.max(0.7, (sat.swath_width_km || 1000) / 700))
          const swathGeo = new THREE.RingGeometry(swathRadius * 0.7, swathRadius, 32)
          const swathMat = new THREE.MeshBasicMaterial({ color: orbitColor, side: THREE.DoubleSide, transparent: true, opacity: 0.4 })
          const swathMesh = new THREE.Mesh(swathGeo, swathMat)
          group.add(swathMesh)

          satBodyGroup.userData = {
            isSatellite: true,
            satellite: sat,
            satIdx,
            rOrb,
            incRad,
            raanRad,
            u: (satIdx * 1.05),
            orbitSpeed: (2 * Math.PI) / ((sat.period_min || 100) * 20),
            nadirLine,
            swathMesh
          }

          group.add(satBodyGroup)
        })

        scene.add(group)
        satellitesGroupRef.current = group
      })
      .catch(err => console.error('Error rendering satellites:', err))
  }, [showSatellites])

  // Satellite Overlay (NASA GIBS) has been removed because the global ESRI map serves this purpose natively.

  return (
    <div ref={mountRef} style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}>
      <div ref={labelsContainerRef} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', overflow: 'hidden' }} />
      
      {/* Top Left Header & SDG Badges */}
      <div style={{ position: 'absolute', top: 16, left: 24, zIndex: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 800, margin: 0, background: 'linear-gradient(135deg, #6366f1, #06b6d4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '-0.02em' }}>
              AQUA-VIS
            </h1>
            <span style={{ fontSize: '0.68rem', padding: '3px 8px', borderRadius: 4, background: 'rgba(99,102,241,0.2)', border: '1px solid rgba(99,102,241,0.4)', color: '#a5b4fc', fontWeight: 700 }}>
              SIH 26067
            </span>
          </div>
          <p style={{ fontSize: '0.72rem', color: '#94a3b8', margin: '3px 0 0 0', fontWeight: 500 }}>
            INCOIS • Ministry of Earth Sciences • 3D Ocean Digital Twin
          </p>
        </div>

        {/* SDG Impact Badges */}
        <div style={{ display: 'flex', gap: 6, marginTop: 2 }}>
          <div style={{
            fontSize: '0.65rem', fontWeight: 600, padding: '2px 8px', borderRadius: 12,
            background: 'rgba(14, 165, 233, 0.15)', border: '1px solid rgba(14, 165, 233, 0.3)', color: '#38bdf8'
          }}>
            🌊 SDG 14: Life Below Water
          </div>
          <div style={{
            fontSize: '0.65rem', fontWeight: 600, padding: '2px 8px', borderRadius: 12,
            background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#34d399'
          }}>
            🌍 SDG 13: Climate Action
          </div>
        </div>
      </div>

      {/* Top Center: Regional Presets Bar & Discrepancy HUD */}
      <div style={{
        position: 'absolute', top: 16, left: '50%', transform: 'translateX(-50%)',
        zIndex: 15, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8
      }}>
        {/* Regional Camera Presets */}
        <div style={{
          display: 'flex', gap: 4, padding: '4px', borderRadius: 10,
          background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255, 255, 255, 0.12)', boxShadow: '0 8px 24px rgba(0,0,0,0.4)'
        }}>
          {[
            { id: 'indian_ocean', label: '🇮🇳 Indian Ocean (EEZ)' },
            { id: 'arabian_sea', label: '🌊 Arabian Sea' },
            { id: 'bay_of_bengal', label: '🌀 Bay of Bengal' },
            { id: 'global', label: '🌐 Global Basin' }
          ].map(r => (
            <button
              key={r.id}
              onClick={() => flyTo(r.id)}
              style={{
                background: activeRegion === r.id ? 'linear-gradient(135deg, #6366f1, #06b6d4)' : 'transparent',
                border: 'none',
                color: activeRegion === r.id ? '#ffffff' : '#94a3b8',
                padding: '6px 12px',
                borderRadius: 6,
                fontSize: '0.75rem',
                fontWeight: activeRegion === r.id ? 700 : 500,
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              {r.label}
            </button>
          ))}
        </div>

        {/* Live Discrepancy Metrics Pill */}
        {discrepancySummary && !outreachMode && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 14,
            padding: '5px 14px', borderRadius: 20,
            background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(12px)',
            border: '1px solid rgba(99, 102, 241, 0.25)',
            fontSize: '0.72rem', color: '#e2e8f0', boxShadow: '0 4px 16px rgba(0,0,0,0.3)'
          }}>
            <span>
              📡 Probes: <strong style={{ color: '#38bdf8' }}>{discrepancySummary.total_instruments}</strong>
            </span>
            <span style={{ color: 'rgba(255,255,255,0.2)' }}>•</span>
            <span>
              Model Agreement: <strong style={{ color: '#10b981' }}>{discrepancySummary.agreement_rate}%</strong>
            </span>
            <span style={{ color: 'rgba(255,255,255,0.2)' }}>•</span>
            <span>
              Mean Bias: <strong style={{ color: '#f59e0b' }}>{discrepancySummary.average_bias >= 0 ? `+${discrepancySummary.average_bias}` : discrepancySummary.average_bias}°C</strong>
            </span>
          </div>
        )}
      </div>

      {/* Surface Interaction Popup */}
      {surfacePointInfo && !outreachMode && (
        <PointAnalytics
          lat={surfacePointInfo.lat}
          lon={surfacePointInfo.lon}
          activeVar={activeVar}
          activeDepth={activeDepth}
          activeTime={activeTime}
          onClose={() => setSurfacePointInfo(null)}
        />
      )}

      {/* Top right buttons (Measure & Outreach) */}
      <div style={{ position: 'absolute', top: 16, right: 24, zIndex: 15, display: 'flex', gap: '8px' }}>
        <button
          onClick={() => {
             setMeasureMode(!measureMode)
             if (measureMode && volumeGroupRef.current) {
                const toRemove = volumeGroupRef.current.children.filter(c => c.userData.isMeasureMarker)
                toRemove.forEach(c => volumeGroupRef.current.remove(c))
                measurePointsRef.current = []
             }
          }}
          style={{
            background: measureMode ? 'rgba(236,72,153,0.2)' : 'rgba(15,23,42,0.65)',
            border: `1px solid ${measureMode ? 'rgba(236,72,153,0.4)' : 'rgba(255,255,255,0.1)'}`,
            color: measureMode ? '#f472b6' : '#e2e8f0',
            padding: '6px 14px',
            borderRadius: 8,
            fontSize: '0.78rem',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            backdropFilter: 'blur(16px)'
          }}
        >
          {measureMode ? '📏 Measuring...' : '📏 Measure Distance'}
        </button>
        <button
          onClick={() => setOutreachMode(!outreachMode)}
          style={{
            background: outreachMode ? 'rgba(16,185,129,0.2)' : 'rgba(99,102,241,0.15)',
            border: `1px solid ${outreachMode ? 'rgba(16,185,129,0.4)' : 'rgba(99,102,241,0.3)'}`,
            color: outreachMode ? '#10b981' : '#a5b4fc',
            padding: '6px 14px',
            borderRadius: 8,
            fontSize: '0.78rem',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            backdropFilter: 'blur(16px)'
          }}
        >
          {outreachMode ? '🎓 Expert Mode' : '🌊 Outreach Mode'}
        </button>
      </div>

      {/* Outreach caption */}
      {outreachMode && activeVar && activeDepth !== null && activeTime && (
        <div style={{
          position: 'absolute', top: 76, left: '50%', transform: 'translateX(-50%)',
          zIndex: 10, pointerEvents: 'none', textAlign: 'center',
          maxWidth: 620,
        }} className="glass-panel p-3">
          <p style={{ fontSize: '0.88rem', color: '#e2e8f0', lineHeight: 1.5, margin: 0 }}>
            Visualizing <strong style={{ color: '#6366f1' }}>{VAR_FRIENDLY[activeVar] || activeVar}</strong> across the{' '}
            <strong style={{ color: '#38bdf8' }}>Indian Ocean & Global Seas</strong> at{' '}
            <strong style={{ color: '#06b6d4' }}>{activeDepth}m depth</strong> on{' '}
            <strong style={{ color: '#f97316' }}>{new Date(activeTime).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</strong>.
            Click any float beacon to examine in-situ validation curves.
          </p>
        </div>
      )}

      {/* Controls Panel - docked left (hide in outreach mode) */}
      {!outreachMode && (
        <ControlsPanel
          metadata={metadata}
          activeVar={activeVar} setActiveVar={setActiveVar}
          activeDepth={activeDepth} setActiveDepth={setActiveDepth}
          palette={palette} setPalette={setPalette}
          colorMin={colorMin} setColorMin={setColorMin}
          colorMax={colorMax} setColorMax={setColorMax}
          logScale={logScale} setLogScale={setLogScale}
          opacity={opacity} setOpacity={setOpacity}
          vertExag={vertExag} setVertExag={setVertExag}
          vectorSpeed={vectorSpeed} setVectorSpeed={setVectorSpeed}
          showDiscrepancy={showDiscrepancy} setShowDiscrepancy={setShowDiscrepancy}
          onlyDivergent={onlyDivergent} setOnlyDivergent={setOnlyDivergent}
          showSatellite={showSatellite} setShowSatellite={setShowSatellite}
          isoValue={isoValue} setIsoValue={setIsoValue}
          showIso={showIso} setShowIso={setShowIso}
          showGlider={showGlider} setShowGlider={setShowGlider}
          showCoastalRisk={showCoastalRisk} setShowCoastalRisk={setShowCoastalRisk}
          showVessels={showVessels} setShowVessels={setShowVessels}
          showCalamities={showCalamities} setShowCalamities={setShowCalamities}
          showSatellites={showSatellites} setShowSatellites={setShowSatellites}
          onOpenCoastalRisk={() => setIsCoastalRiskModalOpen(true)}
          onOpenWorldMonitor={() => setIsWorldMonitorOpen(true)}
          onOpenUpload={() => setIsUploadModalOpen(true)}
        />
      )}

      {/* Simplified variable selector in outreach mode */}
      {outreachMode && metadata && (
        <div style={{ position: 'absolute', top: 70, left: 24, zIndex: 15 }} className="glass-panel p-3">
          <select
            value={activeVar || ''}
            onChange={(e) => setActiveVar(e.target.value)}
            style={{
              background: 'rgba(15,23,42,0.8)', color: '#e2e8f0',
              border: '1px solid rgba(99,102,241,0.25)', borderRadius: 6,
              padding: '6px 10px', fontSize: '0.85rem', cursor: 'pointer', outline: 'none',
            }}
          >
            {metadata.variables?.map(v => (
              <option key={v} value={v}>{VAR_FRIENDLY[v] || v}</option>
            ))}
          </select>
        </div>
      )}

      {/* Vertical Legend Overlay */}
      <div style={{ position: 'absolute', bottom: 90, right: 24, zIndex: 10, display: 'flex', gap: 20, background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '12px', padding: '14px', boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)' }}>
        
        {/* Model Legend */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#e2e8f0', marginBottom: 8 }}>Model Grid</span>
          <div style={{ display: 'flex', height: 110 }}>
            <div style={{ width: 10, borderRadius: 5, background: palette === 'thermal' ? 'linear-gradient(to top, blue, cyan, green, yellow, red)' : `linear-gradient(to top, ${(PALETTES[palette] || PALETTES.thermal)[0]}, ${(PALETTES[palette] || PALETTES.thermal)[1]})` }} />
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', marginLeft: 8, fontSize: '0.68rem', color: '#94a3b8', height: '100%' }}>
              <span>{colorMax.toFixed(1)}</span>
              <span>{colorMin.toFixed(1)}</span>
            </div>
          </div>
        </div>

        {/* Float Probe Discrepancy Legend */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#e2e8f0', marginBottom: 8 }}>Discrepancy</span>
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: 110, fontSize: '0.65rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444' }} />
              <span style={{ color: '#ef4444' }}>&gt;1.5°C</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#f59e0b' }} />
              <span style={{ color: '#f59e0b' }}>0.5-1.5°C</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981' }} />
              <span style={{ color: '#10b981' }}>&lt;0.5°C</span>
            </div>
          </div>
        </div>
      </div>

      {/* Full-width Timeline Bar */}
      {metadata && metadata.times && activeTime !== null && (
        <div style={{
          position: 'absolute', bottom: 0, left: 0, width: '100%',
          zIndex: 10,
          background: 'rgba(15,23,42,0.88)',
          backdropFilter: 'blur(12px)',
          borderTop: '1px solid rgba(99,102,241,0.25)',
          padding: '10px 24px',
          display: 'flex', alignItems: 'center', gap: 20
        }}>
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            style={{
              background: isPlaying ? '#ef4444' : '#10b981',
              color: '#fff', border: 'none', borderRadius: 6,
              padding: '6px 16px', fontSize: '0.8rem', fontWeight: 'bold',
              cursor: 'pointer', textTransform: 'uppercase', minWidth: 80,
              boxShadow: isPlaying ? '0 0 12px rgba(239,68,68,0.4)' : '0 0 12px rgba(16,185,129,0.4)',
              transition: 'all 0.2s ease'
            }}
          >
            {isPlaying ? 'Pause' : 'Play 4D'}
          </button>
          
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4, position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#94a3b8' }}>
              <span>{new Date(metadata.times[0]).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
              <span style={{ color: '#38bdf8', fontWeight: 'bold', fontSize: '0.85rem' }}>
                Forecast: {new Date(activeTime).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
              <span>{new Date(metadata.times[metadata.times.length - 1]).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
            </div>
            
            <div style={{ position: 'relative', height: 20 }}>
              <input
                type="range"
                min={0} max={metadata.times.length - 1} step={1}
                value={metadata.times.indexOf(activeTime)}
                onChange={(e) => setActiveTime(metadata.times[Number(e.target.value)])}
                style={{ width: '100%', cursor: 'pointer', accentColor: '#38bdf8' }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Profile side panel */}
      {selectedProfile && (
        <ProfilePanel
          profileData={selectedProfile}
          instrumentId={selectedInstrumentId}
          outreachMode={outreachMode}
          onClose={() => { setSelectedProfile(null); setSelectedInstrumentId(null); }}
        />
      )}

      {/* Ingestion Upload Modal */}
      <UploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onUploadSuccess={() => {
          fetch('/api/variables')
            .then(r => r.json())
            .then(setMetadata)
            .catch(console.error)
          refreshDiscrepancySummary()
        }}
      />
      {/* Glider Telemetry Popup */}
      {selectedGliderWaypoint && (
        <div style={{
          position: 'absolute',
          top: 100,
          right: 24,
          zIndex: 40,
          width: 330,
          background: 'rgba(15, 23, 42, 0.9)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(168, 85, 247, 0.5)',
          borderRadius: 14,
          padding: 16,
          color: '#e2e8f0',
          boxShadow: '0 12px 40px rgba(0,0,0,0.7), 0 0 25px rgba(168,85,247,0.2)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: '1.3rem' }}>🤖</span>
              <div>
                <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#f8fafc' }}>
                  AUV Glider Sawtooth Telemetry
                </div>
                <div style={{ fontSize: '0.68rem', color: '#c084fc' }}>
                  Cycle #{selectedGliderWaypoint.cycle} • Slocum G3 Profiler
                </div>
              </div>
            </div>
            <button
              onClick={() => setSelectedGliderWaypoint(null)}
              style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '1.2rem', cursor: 'pointer', padding: 2 }}
            >
              ✕
            </button>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
            <div style={{ background: 'rgba(255,255,255,0.04)', padding: '8px 10px', borderRadius: 8 }}>
              <div style={{ fontSize: '0.65rem', color: '#94a3b8' }}>DIVE MAXIMUM</div>
              <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#38bdf8' }}>
                {selectedGliderWaypoint.dive_max_depth}m
              </div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.04)', padding: '8px 10px', borderRadius: 8 }}>
              <div style={{ fontSize: '0.65rem', color: '#94a3b8' }}>BATTERY VOLTAGE</div>
              <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#34d399' }}>
                {selectedGliderWaypoint.battery_voltage_v}V
              </div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.04)', padding: '8px 10px', borderRadius: 8 }}>
              <div style={{ fontSize: '0.65rem', color: '#94a3b8' }}>PUMP POWER</div>
              <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#fbbf24' }}>
                {selectedGliderWaypoint.pump_power_w}W
              </div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.04)', padding: '8px 10px', borderRadius: 8 }}>
              <div style={{ fontSize: '0.65rem', color: '#94a3b8' }}>INTERNAL TEMP</div>
              <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#f472b6' }}>
                {selectedGliderWaypoint.internal_temp_c}°C
              </div>
            </div>
          </div>
          
          <div style={{ fontSize: '0.72rem', color: '#cbd5e1', background: 'rgba(0,0,0,0.3)', padding: '8px 10px', borderRadius: 8, lineHeight: 1.4 }}>
            📍 Coords: {selectedGliderWaypoint.lat.toFixed(3)}°N, {selectedGliderWaypoint.lon.toFixed(3)}°E<br />
            🌊 Transect: Bay of Bengal Deep Channel (Chennai - Andaman)<br />
            ⚙️ Mode: Autonomous 3D Sawtooth Yo-Yo Profiling (0-280m)
          </div>
        </div>
      )}

      {/* Coastal Multi-Hazard Risk Index Modal */}
      <CoastalRiskPanel
        isOpen={isCoastalRiskModalOpen}
        onClose={() => setIsCoastalRiskModalOpen(false)}
        onFocusPort={(p) => {
          flyToPoint(p.lat, p.lon, 22)
          setSelectedPort(p)
        }}
      />

      {/* World Monitor OSINT Dashboard Modal */}
      <WorldMonitorPanel
        isOpen={isWorldMonitorOpen}
        onClose={() => setIsWorldMonitorOpen(false)}
        onFocusCoordinates={(lat, lon, dist) => flyToPoint(lat, lon, dist)}
        onSelectVessel={(v) => setSelectedVessel(v)}
        onSelectSatellite={(sat) => {
          setSelectedSatellite(sat)
          setShowSatellites(true)
          if (sat.current_lat != null && sat.current_lon != null) {
            flyToPoint(sat.current_lat, sat.current_lon, 32)
          }
        }}
      />

      {/* Tactical Vessel HUD Card */}
      {selectedVessel && (
        <div style={{
          position: 'absolute', top: 100, right: 24, zIndex: 40, width: 340,
          background: 'rgba(15, 23, 42, 0.95)', backdropFilter: 'blur(20px)',
          border: '1px solid rgba(6, 182, 212, 0.5)', borderRadius: 14, padding: 16,
          color: '#e2e8f0', boxShadow: '0 12px 40px rgba(0,0,0,0.8), 0 0 25px rgba(6,182,212,0.2)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: '1.4rem' }}>🚢</span>
              <div>
                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#38bdf8' }}>{selectedVessel.name}</div>
                <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>{selectedVessel.type} • {selectedVessel.flag}</div>
              </div>
            </div>
            <button onClick={() => setSelectedVessel(null)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: '0.75rem', marginBottom: 10 }}>
            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '6px 8px', borderRadius: 6 }}>
              <div style={{ fontSize: '0.62rem', color: '#94a3b8' }}>SPEED</div>
              <strong style={{ color: '#2dd4bf', fontSize: '0.9rem' }}>{selectedVessel.speed_knots} kts</strong>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '6px 8px', borderRadius: 6 }}>
              <div style={{ fontSize: '0.62rem', color: '#94a3b8' }}>COURSE</div>
              <strong style={{ color: '#cbd5e1', fontSize: '0.9rem' }}>{selectedVessel.course_deg}°</strong>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '6px 8px', borderRadius: 6 }}>
              <div style={{ fontSize: '0.62rem', color: '#94a3b8' }}>DRAFT</div>
              <strong style={{ color: '#cbd5e1', fontSize: '0.9rem' }}>{selectedVessel.draft_m} m</strong>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '6px 8px', borderRadius: 6 }}>
              <div style={{ fontSize: '0.62rem', color: '#94a3b8' }}>MMSI</div>
              <strong style={{ color: '#cbd5e1', fontSize: '0.75rem' }}>{selectedVessel.mmsi}</strong>
            </div>
          </div>
          <div style={{ fontSize: '0.72rem', color: '#cbd5e1', background: 'rgba(0,0,0,0.35)', padding: '8px 10px', borderRadius: 8, lineHeight: 1.4 }}>
            🎯 <strong>Destination:</strong> {selectedVessel.destination}<br />
            📍 <strong>Region:</strong> {selectedVessel.region}<br />
            ⚙️ <strong>Status:</strong> {selectedVessel.status}
          </div>
        </div>
      )}

      {/* Tactical Calamity Alert HUD Card */}
      {selectedCalamity && (
        <div style={{
          position: 'absolute', top: 100, right: 24, zIndex: 40, width: 350,
          background: 'rgba(15, 23, 42, 0.95)', backdropFilter: 'blur(20px)',
          border: '1px solid rgba(239, 68, 68, 0.6)', borderRadius: 14, padding: 16,
          color: '#e2e8f0', boxShadow: '0 12px 40px rgba(0,0,0,0.8), 0 0 30px rgba(239,68,68,0.25)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: '1.4rem' }}>{selectedCalamity.name ? '🌪️' : (selectedCalamity.magnitude_mw ? '🌊' : '🔥')}</span>
              <div>
                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#f87171' }}>
                  {selectedCalamity.name || selectedCalamity.location || selectedCalamity.region}
                </div>
                <div style={{ fontSize: '0.68rem', color: '#fca5a5' }}>
                  {selectedCalamity.category || selectedCalamity.itewc_status || 'Environmental Threat Alert'}
                </div>
              </div>
            </div>
            <button onClick={() => setSelectedCalamity(null)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
          </div>
          {selectedCalamity.max_sustained_winds_knots && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: '0.75rem', marginBottom: 10 }}>
              <div style={{ background: 'rgba(239,68,68,0.1)', padding: '6px 8px', borderRadius: 6 }}>
                <div style={{ fontSize: '0.62rem', color: '#fca5a5' }}>MAX WIND</div>
                <strong style={{ color: '#ef4444', fontSize: '0.9rem' }}>{selectedCalamity.max_sustained_winds_knots} kts</strong>
              </div>
              <div style={{ background: 'rgba(239,68,68,0.1)', padding: '6px 8px', borderRadius: 6 }}>
                <div style={{ fontSize: '0.62rem', color: '#fca5a5' }}>SURGE</div>
                <strong style={{ color: '#38bdf8', fontSize: '0.9rem' }}>+{selectedCalamity.storm_surge_forecast_m} m</strong>
              </div>
            </div>
          )}
          <div style={{ fontSize: '0.72rem', color: '#e2e8f0', background: 'rgba(0,0,0,0.4)', padding: '8px 10px', borderRadius: 8, lineHeight: 1.4 }}>
            {selectedCalamity.advisory || selectedCalamity.impact || `Status: ${selectedCalamity.itewc_status}`}
          </div>
        </div>
      )}

      {/* Tactical Satellite Telemetry HUD Card */}
      {selectedSatellite && (
        <div style={{
          position: 'absolute', top: 100, right: 24, zIndex: 40, width: 350,
          background: 'rgba(15, 23, 42, 0.95)', backdropFilter: 'blur(20px)',
          border: '1px solid rgba(167, 139, 250, 0.6)', borderRadius: 14, padding: 16,
          color: '#e2e8f0', boxShadow: '0 12px 40px rgba(0,0,0,0.8), 0 0 30px rgba(167,139,250,0.25)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: '1.4rem' }}>🛰️</span>
              <div>
                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#c084fc' }}>{selectedSatellite.name}</div>
                <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>{selectedSatellite.agency} • {selectedSatellite.type}</div>
              </div>
            </div>
            <button onClick={() => setSelectedSatellite(null)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: '0.75rem', marginBottom: 10 }}>
            <div style={{ background: 'rgba(167,139,250,0.08)', padding: '6px 8px', borderRadius: 6 }}>
              <div style={{ fontSize: '0.62rem', color: '#c4b5fd' }}>ALTITUDE</div>
              <strong style={{ color: '#a78bfa', fontSize: '0.9rem' }}>{selectedSatellite.altitude_km} km</strong>
            </div>
            <div style={{ background: 'rgba(167,139,250,0.08)', padding: '6px 8px', borderRadius: 6 }}>
              <div style={{ fontSize: '0.62rem', color: '#c4b5fd' }}>VELOCITY</div>
              <strong style={{ color: '#38bdf8', fontSize: '0.9rem' }}>{selectedSatellite.velocity_kms} km/s</strong>
            </div>
            <div style={{ background: 'rgba(167,139,250,0.08)', padding: '6px 8px', borderRadius: 6 }}>
              <div style={{ fontSize: '0.62rem', color: '#c4b5fd' }}>INCLINATION</div>
              <strong style={{ color: '#cbd5e1', fontSize: '0.9rem' }}>{selectedSatellite.inclination_deg}°</strong>
            </div>
            <div style={{ background: 'rgba(167,139,250,0.08)', padding: '6px 8px', borderRadius: 6 }}>
              <div style={{ fontSize: '0.62rem', color: '#c4b5fd' }}>SWATH WIDTH</div>
              <strong style={{ color: '#34d399', fontSize: '0.9rem' }}>{selectedSatellite.swath_width_km} km</strong>
            </div>
          </div>
          <div style={{ fontSize: '0.72rem', color: '#cbd5e1', background: 'rgba(0,0,0,0.35)', padding: '8px 10px', borderRadius: 8, lineHeight: 1.4, marginBottom: 8 }}>
            🔬 <strong>Payload Sensor:</strong> {selectedSatellite.sensor}<br />
            🏛️ <strong>INCOIS Role:</strong> {selectedSatellite.incois_role}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.68rem', color: '#94a3b8', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 6 }}>
            <span>📍 Nadir: {selectedSatellite.current_lat != null ? `${selectedSatellite.current_lat.toFixed(1)}°N, ${selectedSatellite.current_lon.toFixed(1)}°E` : 'Orbital'}</span>
            <span style={{ color: '#10b981', fontWeight: 600 }}>● {selectedSatellite.status || 'OPERATIONAL'}</span>
          </div>
        </div>
      )}

      {/* OceanIQ Intelligent AI Conversational Assistant */}
      <OceanIQAssistant
        onExecuteAIAction={handleAIAction}
        onOpenCoastalRisk={() => setIsCoastalRiskModalOpen(true)}
        onOpenGlider={() => setShowGlider(true)}
        onOpenDiscrepancy={() => setShowDiscrepancy(true)}
        onOpenWorldMonitor={() => setIsWorldMonitorOpen(true)}
      />
    </div>
  )
}
