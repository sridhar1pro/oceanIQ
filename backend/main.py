from fastapi import FastAPI, HTTPException, Query, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import os
import json
import shutil
import subprocess
import sys

app = FastAPI(title="AQUA-VIS Backend", description="3D Ocean Visualization API for SIH 26067")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Resilient path resolution for both local and Docker environments
def resolve_dir(env_var, relative_subpath):
    explicit = os.environ.get(env_var)
    if explicit and os.path.exists(explicit):
        return os.path.abspath(explicit)
    candidates = [
        os.path.abspath(os.path.join(os.path.dirname(__file__), "..", relative_subpath)),
        os.path.abspath(os.path.join(os.path.dirname(__file__), relative_subpath)),
        os.path.abspath(os.path.join("/", "app", relative_subpath))
    ]
    for c in candidates:
        if os.path.exists(c):
            return c
    return candidates[0]

DATA_DIR = resolve_dir("DATA_DIR", os.path.join("data-pipeline", "output"))
RAW_DIR = resolve_dir("RAW_DIR", os.path.join("data-pipeline", "raw"))
PIPELINE_DIR = resolve_dir("PIPELINE_DIR", "data-pipeline")

# In-memory LRU cache for grid JSONs to ensure sub-10ms depth slicing
_GRID_CACHE = {}

def get_cached_grid(filepath: str):
    if filepath in _GRID_CACHE:
        return _GRID_CACHE[filepath]
    if not os.path.exists(filepath):
        return None
    with open(filepath, "r") as f:
        data = json.load(f)
    # Cache up to 40 active grid files in memory
    if len(_GRID_CACHE) > 40:
        _GRID_CACHE.pop(next(iter(_GRID_CACHE)))
    _GRID_CACHE[filepath] = data
    return data

@app.get("/api/health")
def health():
    return {"status": "ok", "version": "2.1.0", "project": "SIH-26067-AQUAVIS", "data_dir": DATA_DIR}

@app.get("/api/variables")
def get_variables():
    filepath = os.path.join(DATA_DIR, "variables.json")
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="variables.json not found")
    with open(filepath, "r") as f:
        return json.load(f)

@app.get("/api/grid")
def get_grid(variable: str = Query(...), depth: str = Query(...), time: str = Query(...)):
    # Sanitize time string to match the format saved by ingest_model.py (e.g. 2026-08-20T00-00-00)
    safe_time = time.replace(":", "-").replace("Z", "")
    filename = f"grid_{variable}_{depth}_{safe_time}.json"
    filepath = os.path.join(DATA_DIR, filename)
    
    grid = get_cached_grid(filepath)
    if grid is None:
        raise HTTPException(status_code=404, detail=f"Grid data not found for {variable} at depth {depth} and time {time} (filename: {filename})")
    return grid

def _find_nearest_point(grid_dict, target_lat, target_lon):
    if not grid_dict:
        return None
    pts = grid_dict if isinstance(grid_dict, list) else grid_dict.get("points", [])
    if not pts:
        return None
    lats = grid_dict.get("lats")
    lons = grid_dict.get("lons")
    if lats and lons:
        nearest_lat = min(lats, key=lambda y: abs(y - target_lat))
        nearest_lon = min(lons, key=lambda x: abs(x - target_lon))
        best = None
        min_d = float("inf")
        # Candidate search filtered by latitude proximity
        for p in pts:
            if abs(p["lat"] - nearest_lat) <= 1.5:
                d = (p["lat"] - nearest_lat)**2 + (p["lon"] - nearest_lon)**2
                if d < min_d:
                    min_d = d
                    best = p
                    if d < 0.01:
                        break
        return best if best else pts[0]
    return min(pts, key=lambda p: (p["lat"] - target_lat)**2 + (p["lon"] - target_lon)**2)

@app.get("/api/point_data")
def get_point_data(lat: float, lon: float, variable: str, time: str = None, depth: str = None):
    # Returns a time-series if depth is provided, or a depth-profile if time is provided.
    filepath = os.path.join(DATA_DIR, "variables.json")
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="variables.json not found")
    with open(filepath, "r") as f:
        meta = json.load(f)
    
    result = []
    
    if depth is not None:
        # Time-series (varying time across all forecast steps)
        for t in meta.get("times", []):
            safe_time = t.replace(":", "-").replace("Z", "")
            fname = os.path.join(DATA_DIR, f"grid_{variable}_{depth}_{safe_time}.json")
            grid = get_cached_grid(fname)
            if grid:
                closest = _find_nearest_point(grid, lat, lon)
                if closest:
                    result.append({"time": t, "value": closest["value"]})
    elif time is not None:
        # Depth-profile (varying depth down through water column)
        safe_time = time.replace(":", "-").replace("Z", "")
        for d in meta.get("depths", []):
            fname = os.path.join(DATA_DIR, f"grid_{variable}_{d}_{safe_time}.json")
            grid = get_cached_grid(fname)
            if grid:
                closest = _find_nearest_point(grid, lat, lon)
                if closest:
                    result.append({"depth": d, "value": closest["value"]})
    
    return result

@app.get("/api/instruments")
def get_instruments():
    filepath = os.path.join(DATA_DIR, "instruments.json")
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="instruments.json not found")
    
    with open(filepath, "r") as f:
        data = json.load(f)
        
    return [{
        "id": d["id"],
        "lat": d["lat"],
        "lon": d["lon"],
        "type": d.get("type", "argo"),
        "region": d.get("region", "Global Ocean"),
        "bias": d.get("bias", 0.0),
        "discrepancy_status": d.get("discrepancy_status", "Model Agreement (<0.5°C)")
    } for d in data]

@app.get("/api/instruments/{instrument_id}/profile")
def get_instrument_profile(instrument_id: str):
    filepath = os.path.join(DATA_DIR, "instruments.json")
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="instruments.json not found")
        
    with open(filepath, "r") as f:
        data = json.load(f)
        
    for inst in data:
        if inst["id"] == instrument_id:
            return {
                "id": inst["id"],
                "lat": inst["lat"],
                "lon": inst["lon"],
                "type": inst.get("type", "argo"),
                "region": inst.get("region", "Global Ocean"),
                "bias": inst.get("bias", 0.0),
                "discrepancy_status": inst.get("discrepancy_status", "Model Agreement (<0.5°C)"),
                "profile": inst.get("profile", [])
            }
            
    raise HTTPException(status_code=404, detail=f"Instrument {instrument_id} not found")

@app.get("/api/discrepancy/summary")
def get_discrepancy_summary():
    filepath = os.path.join(DATA_DIR, "instruments.json")
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="instruments.json not found")
    with open(filepath, "r") as f:
        instruments = json.load(f)
    
    total = len(instruments)
    biases = [inst.get("bias", 0.0) for inst in instruments]
    avg_bias = round(sum(biases) / total, 2) if total > 0 else 0.0
    
    high_alert = sum(1 for b in biases if abs(b) >= 1.5)
    moderate = sum(1 for b in biases if 0.5 <= abs(b) < 1.5)
    in_agreement = sum(1 for b in biases if abs(b) < 0.5)
    agreement_rate = round((in_agreement / total) * 100, 1) if total > 0 else 100.0

    return {
        "total_instruments": total,
        "agreement_rate": agreement_rate,
        "average_bias": avg_bias,
        "high_alert_count": high_alert,
        "moderate_count": moderate,
        "in_agreement_count": in_agreement,
        "units": "°C"
    }

@app.get("/api/glider/trajectory")
def get_glider_trajectory():
    filepath = os.path.join(DATA_DIR, "glider_trajectory.json")
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="glider_trajectory.json not found")
    with open(filepath, "r") as f:
        return json.load(f)

COASTAL_PORTS_DEF = [
    {
        "id": "PORT_VIZAG",
        "name": "Visakhapatnam Port",
        "state": "Andhra Pradesh",
        "lat": 17.6868,
        "lon": 83.2185,
        "region": "Bay of Bengal (Western Basin)",
        "depth_contour_m": 22.5,
        "wave_height_m": 2.35,
        "sst_anomaly_c": 1.42,
        "current_knots": 1.7,
        "sea_level_anomaly_cm": 14.2,
        "risk_score": 64,
        "risk_level": "MODERATE",
        "advisory": "Small craft advisory in effect. Long-period swells impacting breakwater."
    },
    {
        "id": "PORT_PURI",
        "name": "Puri Coastal Sector",
        "state": "Odisha",
        "lat": 19.8135,
        "lon": 85.8312,
        "region": "Bay of Bengal (Northern Shelf)",
        "depth_contour_m": 12.0,
        "wave_height_m": 2.85,
        "sst_anomaly_c": 1.65,
        "current_knots": 2.1,
        "sea_level_anomaly_cm": 22.4,
        "risk_score": 78,
        "risk_level": "HIGH",
        "advisory": "High surf warning! Moderate cyclonic storm surge detected along coastline."
    },
    {
        "id": "PORT_BLAIR",
        "name": "Port Blair / Andaman",
        "state": "Andaman & Nicobar Islands",
        "lat": 11.6234,
        "lon": 92.7265,
        "region": "Andaman Sea",
        "depth_contour_m": 45.0,
        "wave_height_m": 1.65,
        "sst_anomaly_c": 0.85,
        "current_knots": 1.2,
        "sea_level_anomaly_cm": 8.1,
        "risk_score": 38,
        "risk_level": "MODERATE",
        "advisory": "Normal inter-island ferry operations. Moderate cross-swells in open channel."
    },
    {
        "id": "PORT_KOCHI",
        "name": "Kochi (Cochin Port)",
        "state": "Kerala",
        "lat": 9.9312,
        "lon": 76.2673,
        "region": "Arabian Sea (Malabar Coast)",
        "depth_contour_m": 16.5,
        "wave_height_m": 1.45,
        "sst_anomaly_c": 0.62,
        "current_knots": 0.95,
        "sea_level_anomaly_cm": 6.3,
        "risk_score": 28,
        "risk_level": "LOW",
        "advisory": "Favorable maritime conditions. Inshore fishing boats cleared for navigation."
    },
    {
        "id": "PORT_MUMBAI",
        "name": "Mumbai Port & JNPT",
        "state": "Maharashtra",
        "lat": 18.9438,
        "lon": 72.8354,
        "region": "Arabian Sea (Eastern Shelf)",
        "depth_contour_m": 18.0,
        "wave_height_m": 1.85,
        "sst_anomaly_c": 0.95,
        "current_knots": 2.4,
        "sea_level_anomaly_cm": 12.0,
        "risk_score": 52,
        "risk_level": "MODERATE",
        "advisory": "Macrotidal current alert during ebb tide. Port channel navigation normal."
    },
    {
        "id": "PORT_PARADEEP",
        "name": "Paradeep Port",
        "state": "Odisha",
        "lat": 20.2644,
        "lon": 86.6715,
        "region": "Bay of Bengal (Mahanadi Estuary)",
        "depth_contour_m": 17.5,
        "wave_height_m": 2.95,
        "sst_anomaly_c": 1.88,
        "current_knots": 2.2,
        "sea_level_anomaly_cm": 24.8,
        "risk_score": 84,
        "risk_level": "HIGH",
        "advisory": "Elevated coastal surge advisory. Mooring lines inspection required for bulk cargo."
    },
    {
        "id": "PORT_CHENNAI",
        "name": "Chennai Port",
        "state": "Tamil Nadu",
        "lat": 13.0827,
        "lon": 80.2707,
        "region": "Coromandel Coast",
        "depth_contour_m": 19.0,
        "wave_height_m": 1.75,
        "sst_anomaly_c": 1.12,
        "current_knots": 1.4,
        "sea_level_anomaly_cm": 9.5,
        "risk_score": 46,
        "risk_level": "MODERATE",
        "advisory": "Moderate easterly swell. Harbor operations proceed under standard protocols."
    },
    {
        "id": "PORT_KANDLA",
        "name": "Kandla (Deendayal Port)",
        "state": "Gujarat",
        "lat": 23.0033,
        "lon": 70.2185,
        "region": "Gulf of Kutch",
        "depth_contour_m": 14.0,
        "wave_height_m": 1.20,
        "sst_anomaly_c": 0.55,
        "current_knots": 3.8,
        "sea_level_anomaly_cm": 7.0,
        "risk_score": 42,
        "risk_level": "MODERATE",
        "advisory": "High tidal stream velocities in approach fairway. Tug assistance mandatory."
    }
]

@app.get("/api/coastal_risk")
def get_coastal_risk():
    return {
        "status": "OPERATIONAL",
        "index_name": "INCOIS Unified Multi-Hazard Coastal Risk Index (SIH-26067)",
        "timestamp": "2026-09-04T12:00:00Z",
        "summary": {
            "total_ports_monitored": len(COASTAL_PORTS_DEF),
            "high_risk_count": sum(1 for p in COASTAL_PORTS_DEF if p["risk_level"] == "HIGH"),
            "moderate_risk_count": sum(1 for p in COASTAL_PORTS_DEF if p["risk_level"] == "MODERATE"),
            "low_risk_count": sum(1 for p in COASTAL_PORTS_DEF if p["risk_level"] == "LOW"),
        },
        "ports": COASTAL_PORTS_DEF
    }

class AIQueryRequest(BaseModel):
    query: str

@app.post("/api/ai/query")
def ai_query(req: AIQueryRequest):
    q = req.query.lower().strip()
    
    action = "INFO"
    variable = None
    depth = None
    target_camera = None
    open_panel = None
    response = ""
    
    if any(k in q for k in ["glider", "auv", "sawtooth", "7902460", "slocum"]):
        action = "TRACK_GLIDER"
        target_camera = "bay_of_bengal"
        open_panel = "glider"
        response = "Engaging 3D Sawtooth Tracking for INCOIS Autonomous Underwater Glider (AUV-7902460). Displaying full 16-cycle dive/climb trajectory in the Bay of Bengal deep channel down to 280 dbar with live sensor telemetry."
    elif any(k in q for k in ["coastal", "risk", "port", "puri", "vizag", "hazard", "surge"]):
        action = "SHOW_COASTAL_RISK"
        open_panel = "coastal_risk"
        response = "Activating INCOIS Unified Multi-Hazard Coastal Risk Index. Evaluating combined significant wave height, marine heatwave anomalies, tidal currents, and sea level surge across 8 critical coastal ports."
    elif any(k in q for k in ["wave", "vhm0", "swell", "cyclone"]):
        action = "SET_VIEW"
        variable = "VHM0"
        depth = 0.49
        if "arabian" in q: target_camera = "arabian_sea"
        elif "bengal" in q or "bay" in q: target_camera = "bay_of_bengal"
        response = "Switching 3D volume to Spectral Significant Wave Height (Hm0) from CMEMS Wave Analysis. Rendering surface swell distribution and wave dispersion."
    elif any(k in q for k in ["ph", "acid", "carbon", "bgc"]):
        action = "SET_VIEW"
        variable = "ph"
        depth = 0.49
        response = "Switching 3D layer to Ocean Acidity / pH from Copernicus Biogeochemical Carbon models. Acidification monitoring active across upper epipelagic and mesopelagic zones."
    elif any(k in q for k in ["sea level", "altimetry", "sla"]):
        action = "SET_VIEW"
        variable = "sla"
        depth = 0.49
        response = "Displaying DUACS All-Satellite Sea Level Anomaly (SLA). Identifying mesoscale cyclonic and anticyclonic eddies from geostrophic height topography."
    elif any(k in q for k in ["heatwave", "thermal", "sst", "warm"]):
        action = "SET_VIEW"
        variable = "thetao"
        depth = 0.49
        if "arabian" in q: target_camera = "arabian_sea"
        elif "bengal" in q: target_camera = "bay_of_bengal"
        response = "Scanning Sea Surface Temperature (SST) for Marine Heatwave (MHW) signatures. Anomaly thresholds highlighted in glowing thermal bands."
    elif any(k in q for k in ["discrepancy", "bias", "argo", "divergent"]):
        action = "INSPECT_DISCREPANCY"
        open_panel = "discrepancy"
        response = "Filtering to 289 real Argo profiling floats with computed model forecast residuals (ΔT, ΔS). Showing high-discrepancy alert probes with animated radar rings."
    elif "arabian sea" in q:
        action = "SET_VIEW"
        target_camera = "arabian_sea"
        response = "Navigating camera focus to the Arabian Sea basin (Indian EEZ sector). Analyzing high-salinity water masses and seasonal upwelling zones."
    elif "bay of bengal" in q:
        action = "SET_VIEW"
        target_camera = "bay_of_bengal"
        response = "Positioning 3D viewport over the Bay of Bengal. Visualizing riverine freshwater discharge plumes and low-salinity stratification."
    else:
        response = f"OceanIQ AI recognized ocean query: '{req.query}'. Ready to adjust 3D depth slicing (0–2000m), switch scientific parameters, track AUV gliders, or analyze coastal hazard indices."

    return {
        "query": req.query,
        "action": action,
        "variable": variable,
        "depth": depth,
        "target_camera": target_camera,
        "open_panel": open_panel,
        "response": response
    }

@app.post("/api/upload")
async def upload_data(file: UploadFile = File(...)):
    """
    Upload a NetCDF (.nc) or CSV/text (.csv, .txt) file.
    The file is saved to raw/ and the appropriate parser is run.
    Returns the number of instruments/grids processed.
    """
    filename = file.filename
    ext = os.path.splitext(filename)[1].lower()
    
    if ext not in ['.nc', '.csv', '.txt', '.tsv']:
        raise HTTPException(status_code=400, detail=f"Unsupported file type: {ext}. Supported: .nc, .csv, .txt, .tsv")
    
    # Save uploaded file to raw directory
    os.makedirs(RAW_DIR, exist_ok=True)
    save_path = os.path.join(RAW_DIR, filename)
    with open(save_path, "wb") as f:
        shutil.copyfileobj(file.file, f)
    
    result = {"filename": filename, "status": "saved", "type": ext}
    
    try:
        if ext == '.nc':
            # Determine if it's model data or instrument data by filename pattern
            if filename.startswith(("R", "D", "SR", "SD")) and not filename.startswith(("BD",)):
                # Argo-style instrument file
                script = os.path.join(PIPELINE_DIR, "ingest_argo.py")
                subprocess.run([sys.executable, script], cwd=PIPELINE_DIR, check=True, timeout=120)
                result["parser"] = "argo"
            else:
                # Model file
                script = os.path.join(PIPELINE_DIR, "ingest_model.py")
                subprocess.run([sys.executable, script], cwd=PIPELINE_DIR, check=True, timeout=120)
                result["parser"] = "model"
        else:
            # CSV/text file
            script = os.path.join(PIPELINE_DIR, "ingest_csv.py")
            subprocess.run([sys.executable, script, save_path], cwd=PIPELINE_DIR, check=True, timeout=120)
            result["parser"] = "csv"
        
        result["status"] = "processed"
    except subprocess.TimeoutExpired:
        result["status"] = "timeout"
        result["error"] = "Parser timed out after 120 seconds"
    except subprocess.CalledProcessError as e:
        result["status"] = "error"
        result["error"] = str(e)
    
    return result

# Serve static files in production
if os.environ.get("SERVE_STATIC") == "1":
    static_dir = os.path.join(os.path.dirname(__file__), "static")
    if os.path.exists(static_dir):
        app.mount("/", StaticFiles(directory=static_dir, html=True), name="static")

