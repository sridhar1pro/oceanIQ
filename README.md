# AQUA-VIS: 3D Ocean Digital Twin & Decision Support System
### Smart India Hackathon (SIH 26067) • Ministry of Earth Sciences (MoES) • INCOIS

[![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-009688?style=flat&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat&logo=react&logoColor=black)](https://reactjs.org/)
[![Three.js](https://img.shields.io/badge/Three.js-r128-black?style=flat&logo=three.js&logoColor=white)](https://threejs.org/)
[![Vite](https://img.shields.io/badge/Vite-5.0-646CFF?style=flat&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Python](https://img.shields.io/badge/Python-3.10+-3776AB?style=flat&logo=python&logoColor=white)](https://www.python.org/)
[![SDG 14](https://img.shields.io/badge/UN%20SDG-14%20Life%20Below%20Water-0A97D9?style=flat)](https://sdgs.un.org/goals/goal14)
[![SDG 13](https://img.shields.io/badge/UN%20SDG-13%20Climate%20Action-3F7E44?style=flat)](https://sdgs.un.org/goals/goal13)

**AQUA-VIS** is a production-ready, interactive 3D Ocean Digital Twin and Decision Support System developed for the **Indian National Centre for Ocean Information Services (INCOIS)**. It fuses global numerical ocean models with real-world in-situ observational networks (Argo floats, underwater gliders, CTD casts, and HF radars) to provide operational oceanographers with volumetric depth slicing, real-time forecast calibration, multi-hazard coastal risk indices, and conversational AI insights.

---

## 🌟 Key Capabilities

### 1. Multi-Parameter Scientific Ocean Layers
Interactive global 3D visualization of 7 critical oceanographic variables:
- **Sea Water Potential Temperature (`thetao`)** [°C] — Thermal gradients and thermocline structure
- **Sea Water Salinity (`so`)** [PSU] — Halocline dynamics and freshwater river runoff
- **Significant Wave Height (`VHM0`)** [m] — Wave energy and high-sea roughness (0.05m – 10.8m)
- **Ocean Acidity / pH (`ph`)** — Biogeochemical health and acidification monitoring
- **Sea Level Anomaly (`sla`)** [m] — Satellite altimetry sea height deviations
- **Current Velocity Vectors (`uo`, `vo`)** [m/s] — 3D oceanic circulation and eddies

### 2. 3D Volumetric Depth Slicing (0m – 2000m)
Interactive vertical slicing across standardized depth levels:
- **Sea Surface**: `0.49m`, `10m`, `25m`
- **Thermocline Zone**: `50m`, `100m`, `200m`
- **Intermediate & Abyssal Depths**: `500m`, `1000m`, `2000m`

### 3. 289 Real-Time In-Situ Argo Profiling Floats
- Ingested directly from genuine Copernicus / Coriolis NetCDF observational datasets.
- 289 active float profiles across the Indian Ocean and global basins with authentic WMO numbers.
- **Model vs. In-Situ Discrepancy Engine**: Computes observed vs. forecast divergence ($\Delta T = T_{\text{observed}} - T_{\text{model}}$) with color-coded pulsating 3D radar beacons (🟢 Agreement <0.5°C, 🟡 Moderate 0.5–1.5°C, 🔴 Drift >1.5°C).
- Dual-line interactive CTD curve comparison charts down to 2000m depth.

### 4. Autonomous Underwater Glider 3D Sawtooth Mission Tracking
- Continuous tracking of AUV Glider WMO 7902460 across 16 consecutive mission dive-climb cycles down to 1000m in the Bay of Bengal.
- Glowing 3D depth ribbon, animated winged glider hull, surfacing waypoints, and battery/pump telemetry.

### 5. Multi-Hazard Coastal Risk Index Dashboard (8 Strategic Indian Ports)
Real-time composite hazard scoring (0–100) and automated maritime advisories for:
- 🇮🇳 **Visakhapatnam**, **Puri**, **Port Blair**, **Kochi**, **Mumbai**, **Chennai**, **Paradeep**, and **Kandla**.
- Evaluates significant wave height ($H_{m0}$), SST thermal anomalies, current speed, and storm surge indices.

### 6. OceanIQ AI Conversational Assistant
- Natural language query interface powered by semantic parsing.
- Translates voice/text commands into real-time 3D camera orbits, depth slice transitions, variable selections, and float inspections.
- Interactive quick prompt chips for one-click discovery.

---

## 🏛️ System Architecture

```mermaid
graph TD
    subgraph Data Layer
        CM[Copernicus Marine Data Store]
        Argo[Argo In-Situ NetCDFs]
        Glider[Glider Mission Cycles]
        Radar[HF Radar / Satellite Altimetry]
    end

    subgraph Data Pipeline & Ingestion
        IR[ingest_real_argo.py]
        IM[ingest_multi_parameters.py]
        IC[ingest_csv.py]
        PR[Plugin Registry]
    end

    subgraph Backend API (FastAPI)
        API[FastAPI REST Engine]
        LRU[In-Memory Sliced Grid Cache]
        DISC[Discrepancy & Validation Engine]
        RISK[Coastal Risk Index Module]
        NLP[OceanIQ AI Query Parser]
    end

    subgraph Frontend Engine (Three.js + React)
        Globe[Three.js 3D WebGL Globe]
        Ribbon[3D Glider Sawtooth Ribbon]
        Beacons[Pulsing Discrepancy Beacons]
        Controls[Glassmorphic Controls Panel]
        Profiles[Recharts Dual-Curve In-Situ Panel]
        RiskModal[Coastal Risk Index Dashboard]
        AIChat[OceanIQ Assistant]
    end

    CM --> IM
    Argo --> IR
    Glider --> IR
    Radar --> IM
    
    IR --> API
    IM --> API
    IC --> API
    PR --> API
    
    API --> LRU
    API --> DISC
    API --> RISK
    API --> NLP

    API --> Controls
    API --> Globe
    API --> Ribbon
    API --> Beacons
    API --> Profiles
    API --> RiskModal
    API --> AIChat
```

---

## 🌍 UN Sustainable Development Goals (SDGs)

| SDG | Target | AQUA-VIS Contribution |
| :--- | :--- | :--- |
| **SDG 14: Life Below Water** | **14.1 & 14.3** | Monitors ocean acidification (`ph`), marine heatwaves, and subsurface thermocline shifts to safeguard marine biodiversity. |
| **SDG 13: Climate Action** | **13.1 & 13.2** | Accelerates numerical model calibration for cyclone track intensity prediction and Indian monsoon forecasting. |
| **SDG 9: Industry & Innovation** | **9.5** | Delivers sovereign, institutional-grade ocean digital twin tooling for Indian scientific research. |

---

## 🔌 API Reference

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/api/health` | `GET` | Health check, API version `2.2.0`, and active datasets |
| `/api/variables` | `GET` | Available variables, depth layers (0–2000m), and forecast timestamps |
| `/api/grid` | `GET` | Sub-10ms cached volumetric 2D slices for 3D globe visualization |
| `/api/instruments` | `GET` | Metadata and coordinates for 289 real Argo floats |
| `/api/instruments/{id}/profile` | `GET` | Dual-curve CTD depth profiles (Observed vs Model) |
| `/api/glider/trajectory` | `GET` | 3D sawtooth coordinates, dive-climb phases, and telemetry |
| `/api/coastal_risk` | `GET` | Multi-hazard composite scores and advisories for 8 key Indian ports |
| `/api/ai/query` | `POST` | Natural language semantic query translation into 3D camera actions |
| `/api/upload` | `POST` | Drag-and-drop ingestion for NetCDF and CSV ocean datasets |

---

## 🚀 Quickstart & Installation

### Prerequisites
- **Python 3.10+**
- **Node.js 18+** and **npm**

### 1. Clone the Repository
```bash
git clone https://github.com/<your-username>/aqua-vis.git
cd aqua-vis
```

### 2. Start the Backend
```bash
cd backend
python -m venv venv
# On Windows:
.\venv\Scripts\activate
# On Linux/macOS:
# source venv/bin/activate

pip install -r requirements.txt
python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```
The backend API is accessible at: `http://localhost:8000` (API Docs: `http://localhost:8000/docs`).

### 3. Start the Frontend
In a new terminal:
```bash
cd frontend
npm install
npm run dev
```
Open your browser at: `http://localhost:5173`

---

## 🐳 Docker Deployment

To build and run the full stack container:
```bash
docker build -t aqua-vis:latest .
docker run -p 8000:8000 aqua-vis:latest
```

---

## 👥 Contributors & Institutional Affiliation
- **Team**: AQUA-VIS Engineering Team
- **Problem Statement**: SIH 26067
- **Nodal Agency**: Indian National Centre for Ocean Information Services (INCOIS), Hyderabad
- **Ministry**: Ministry of Earth Sciences (MoES), Government of India
