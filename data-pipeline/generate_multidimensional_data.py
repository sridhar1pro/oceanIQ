import os
import json
import math
import numpy as np

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
OUT_DIR = os.path.join(BASE_DIR, "output")
os.makedirs(OUT_DIR, exist_ok=True)

# Standard Ocean Depth Levels (in meters)
DEPTHS = [0.49, 10.0, 25.0, 50.0, 100.0, 200.0, 500.0, 1000.0, 2000.0]

# 7-Day Forecast Time Steps (ISO 8601 UTC)
TIMES = [
    "2026-09-08T23:00:00Z",
    "2026-09-09T23:00:00Z",
    "2026-09-10T23:00:00Z",
    "2026-09-11T23:00:00Z",
    "2026-09-12T23:00:00Z",
    "2026-09-13T23:00:00Z",
    "2026-09-14T23:00:00Z"
]

def load_surface_grid(var_name):
    filename = f"grid_{var_name}_0.49_2026-09-08T23-00-00.json"
    filepath = os.path.join(OUT_DIR, filename)
    if not os.path.exists(filepath):
        raise FileNotFoundError(f"Base surface file {filepath} not found.")
    print(f"Loading base surface grid for {var_name} from {filename}...")
    with open(filepath, "r") as f:
        return json.load(f)

def generate_multidimensional_data():
    print("Generating multi-dimensional oceanographic datasets for AQUA-VIS...")
    
    # 1. Load base surface slices for thetao, so, uo, vo
    base_grids = {}
    for var in ['thetao', 'so', 'uo', 'vo']:
        base_grids[var] = load_surface_grid(var)

    lats = base_grids['thetao']['lats']
    lons = base_grids['thetao']['lons']

    # 2. Generate depth slices for the primary time (T=0)
    t0_str = TIMES[0]
    safe_t0 = t0_str.replace(":", "-").replace("Z", "")

    for var_name in ['thetao', 'so', 'uo', 'vo']:
        base_pts = base_grids[var_name]['points']
        print(f"Generating depth slices for {var_name} (9 depth levels)...")
        
        for depth in DEPTHS:
            if depth == 0.49:
                # Already exists for T0
                continue
            
            # Physics-based vertical decay:
            # Temperature (thetao): Exponential thermocline decay towards deep water (3.5 - 4.0 °C)
            # Salinity (so): Halocline transition towards 34.8 PSU deep ocean water
            # Currents (uo, vo): Ekman wind-drift exponential decay with depth
            pts = []
            for p in base_pts:
                lat = p['lat']
                lon = p['lon']
                surf_val = p['value']
                
                if var_name == 'thetao':
                    # Thermocline decay
                    # Mixed layer thickness: ~40m, thermocline steepness between 50-250m
                    thermocline_depth = 80.0
                    abyssal_temp = 3.5 + 1.0 * math.cos(math.radians(lat))
                    decay = math.exp(-depth / 350.0)
                    thermocline_factor = 1.0 / (1.0 + math.exp((depth - thermocline_depth) / 45.0))
                    val = abyssal_temp + (surf_val - abyssal_temp) * (0.6 * decay + 0.4 * thermocline_factor)
                
                elif var_name == 'so':
                    # Deep ocean salinity stabilizes around 34.75 - 34.85 PSU
                    deep_salinity = 34.80
                    depth_weight = math.exp(-depth / 200.0)
                    val = deep_salinity + (surf_val - deep_salinity) * depth_weight
                
                elif var_name in ['uo', 'vo']:
                    # Currents attenuate rapidly with depth (Ekman depth ~50-100m)
                    attenuation = math.exp(-depth / 120.0)
                    val = surf_val * attenuation
                else:
                    val = surf_val

                pts.append({
                    "lat": lat,
                    "lon": lon,
                    "value": round(float(val), 3)
                })

            out_data = {
                "lats": lats,
                "lons": lons,
                "points": pts
            }
            out_filename = f"grid_{var_name}_{depth}_{safe_t0}.json"
            with open(os.path.join(OUT_DIR, out_filename), "w") as f:
                json.dump(out_data, f)
            print(f"  Saved {out_filename}")

    # 3. Generate temporal forecast steps for surface layer (depth = 0.49m)
    print("Generating 7-day forecast cycle for temporal animation...")
    for day_idx, t_str in enumerate(TIMES[1:], start=1):
        safe_t = t_str.replace(":", "-").replace("Z", "")
        # Phase shift for currents and temperature oscillation
        time_phase = day_idx * (2 * math.pi / 7.0)

        for var_name in ['thetao', 'so', 'uo', 'vo']:
            base_pts = base_grids[var_name]['points']
            pts = []
            for p in base_pts:
                lat = p['lat']
                lon = p['lon']
                surf_val = p['value']
                
                if var_name == 'thetao':
                    # Slight daily temperature fluctuation +/- 0.4 deg C
                    var_delta = 0.35 * math.sin(time_phase + math.radians(lon * 2))
                    val = surf_val + var_delta
                elif var_name == 'so':
                    # Slight salinity variation
                    var_delta = 0.08 * math.cos(time_phase + math.radians(lat * 3))
                    val = surf_val + var_delta
                elif var_name in ['uo', 'vo']:
                    # Rotating eddy currents
                    eddy_rot = math.sin(time_phase + math.radians(lat * 4 + lon * 4))
                    val = surf_val * (1.0 + 0.25 * eddy_rot)
                else:
                    val = surf_val

                pts.append({
                    "lat": lat,
                    "lon": lon,
                    "value": round(float(val), 3)
                })

            out_data = {
                "lats": lats,
                "lons": lons,
                "points": pts
            }
            out_filename = f"grid_{var_name}_0.49_{safe_t}.json"
            with open(os.path.join(OUT_DIR, out_filename), "w") as f:
                json.dump(out_data, f)
            print(f"  Saved {out_filename}")

    # 4. Update variables.json metadata
    variables_metadata = {
        "variables": ["thetao", "so", "uo", "vo"],
        "depths": DEPTHS,
        "times": TIMES
    }
    with open(os.path.join(OUT_DIR, "variables.json"), "w") as f:
        json.dump(variables_metadata, f, indent=2)
    print("Updated variables.json metadata with 9 depths and 7 timestamps.")

    # 5. Generate realistic INCOIS Argo Floats and Gliders
    print("Generating realistic INCOIS and Global Argo float fleet with discrepancy tracking...")
    instruments = []

    # High-density cluster in Indian Ocean, Arabian Sea, and Bay of Bengal (INCOIS EEZ)
    incois_floats = [
        # Arabian Sea (High Salinity, Upwelling)
        {"id": "INCOIS_2902123", "lat": 15.2, "lon": 68.5, "type": "argo", "sub": "Arabian Sea Central"},
        {"id": "INCOIS_2902124", "lat": 18.4, "lon": 66.2, "type": "argo", "sub": "Arabian Sea North"},
        {"id": "INCOIS_2902125", "lat": 11.5, "lon": 72.8, "type": "argo", "sub": "Lakshadweep Basin"},
        {"id": "INCOIS_2902126", "lat": 8.5, "lon": 75.2, "type": "argo", "sub": "South India Coastal"},
        {"id": "GLIDER_INCOIS_01", "lat": 16.8, "lon": 71.4, "type": "glider", "sub": "Goa Offshore Transect"},
        {"id": "GLIDER_INCOIS_02", "lat": 13.5, "lon": 73.1, "type": "glider", "sub": "Mangalore Glider Line"},
        
        # Bay of Bengal (Freshwater plume, Cyclone genesis zone)
        {"id": "INCOIS_2903344", "lat": 14.8, "lon": 84.5, "type": "argo", "sub": "Bay of Bengal Central"},
        {"id": "INCOIS_2903345", "lat": 18.2, "lon": 87.8, "type": "argo", "sub": "North BoB Plume"},
        {"id": "INCOIS_2903346", "lat": 11.2, "lon": 82.5, "type": "argo", "sub": "Chennai Offshore"},
        {"id": "INCOIS_2903347", "lat": 7.5, "lon": 88.0, "type": "argo", "sub": "Nicobar Sea"},
        {"id": "GLIDER_INCOIS_03", "lat": 15.6, "lon": 82.8, "type": "glider", "sub": "Godavari Outflow Glider"},
        {"id": "GLIDER_INCOIS_04", "lat": 12.8, "lon": 85.2, "type": "glider", "sub": "Andaman Transect"},

        # Equatorial Indian Ocean
        {"id": "INCOIS_2904551", "lat": 2.0, "lon": 78.0, "type": "argo", "sub": "Equatorial Indian Ocean"},
        {"id": "INCOIS_2904552", "lat": -3.5, "lon": 85.0, "type": "argo", "sub": "South Equatorial Indian Ocean"},
        {"id": "INCOIS_2904553", "lat": -1.2, "lon": 65.5, "type": "argo", "sub": "Western Equatorial Indian Ocean"},
        {"id": "INCOIS_2904554", "lat": 5.0, "lon": 92.0, "type": "argo", "sub": "Sumatra Western Gateway"}
    ]

    # Additional global reference floats across Atlantic, Pacific, and Southern Oceans
    global_wmo = [
        {"id": "WMO_6903212", "lat": 25.4, "lon": -45.2, "type": "argo"},
        {"id": "WMO_6903215", "lat": 32.1, "lon": -64.8, "type": "argo"},
        {"id": "WMO_4901822", "lat": 22.0, "lon": 142.5, "type": "argo"},
        {"id": "WMO_4901826", "lat": -15.2, "lon": 175.4, "type": "argo"},
        {"id": "WMO_5904891", "lat": -42.5, "lon": 45.2, "type": "argo"},
        {"id": "WMO_5904892", "lat": -55.0, "lon": 90.0, "type": "argo"},
        {"id": "WMO_1901521", "lat": -28.4, "lon": -15.2, "type": "argo"},
        {"id": "WMO_3901994", "lat": 18.0, "lon": -110.2, "type": "argo"},
        {"id": "WMO_5906233", "lat": 44.5, "lon": -130.2, "type": "argo"},
        {"id": "WMO_6902998", "lat": 58.2, "lon": -25.4, "type": "argo"}
    ]

    all_float_defs = incois_floats + global_wmo

    # Generate realistic full dive profiles down to 2000m
    float_depth_levels = [0.0, 10.0, 25.0, 50.0, 100.0, 150.0, 200.0, 300.0, 500.0, 750.0, 1000.0, 1500.0, 2000.0]

    for idx, fdef in enumerate(all_float_defs):
        lat = fdef["lat"]
        lon = fdef["lon"]

        # Surface baseline temperature depends on latitude
        if abs(lat) < 20:
            surf_temp = 28.5 + (0.5 if lon > 70 and lon < 90 else 0.0) # Warm pool in Indian Ocean
        else:
            surf_temp = max(2.0, 28.0 - (abs(lat) * 0.45))

        # Surface salinity
        if 5 <= lat <= 22 and 80 <= lon <= 95:
            surf_sal = 32.2
        elif 8 <= lat <= 24 and 60 <= lon <= 77:
            surf_sal = 36.4
        else:
            surf_sal = 34.5 + 0.5 * math.cos(math.radians(lat))

        # Discrepancy bias for model vs in-situ validation demonstration
        if idx in [1, 7]:  # High discrepancy floats (Red alert)
            bias = 1.85
            discrepancy_status = "High Alert (>1.5°C)"
        elif idx in [3, 9, 14]: # Moderate discrepancy floats (Amber alert)
            bias = 0.95
            discrepancy_status = "Moderate (0.5-1.5°C)"
        else: # Normal agreement (Green)
            bias = 0.22
            discrepancy_status = "Model Agreement (<0.5°C)"

        profile = []
        for d in float_depth_levels:
            thermocline_factor = 1.0 / (1.0 + math.exp((d - 85.0) / 40.0))
            abyssal = 3.6
            temp = abyssal + (surf_temp - abyssal) * (0.6 * math.exp(-d / 300.0) + 0.4 * thermocline_factor)
            obs_temp = temp + (bias * math.exp(-d / 250.0))

            deep_sal = 34.80
            obs_sal = deep_sal + (surf_sal - deep_sal) * math.exp(-d / 180.0)

            profile.append({
                "depth": float(d),
                "temperature": round(float(obs_temp), 2),
                "model_temperature": round(float(temp), 2),
                "salinity": round(float(obs_sal), 2),
                "model_salinity": round(float(deep_sal + (surf_sal - deep_sal) * math.exp(-d / 180.0) - 0.05), 2),
                "discrepancy": round(float(obs_temp - temp), 2),
                "timestamp": "2026-09-08T23:00:00Z"
            })

        instruments.append({
            "id": fdef["id"],
            "lat": round(lat, 3),
            "lon": round(lon, 3),
            "type": fdef.get("type", "argo"),
            "region": fdef.get("sub", "Global Ocean"),
            "bias": round(bias, 2),
            "discrepancy_status": discrepancy_status,
            "profile": profile
        })

    with open(os.path.join(OUT_DIR, "instruments.json"), "w") as f:
        json.dump(instruments, f, indent=2)
    print(f"Saved {len(instruments)} instruments with full dive profiles and discrepancy metadata to instruments.json.")
    print("Multi-dimensional data generation successfully finished!")

if __name__ == "__main__":
    generate_multidimensional_data()
