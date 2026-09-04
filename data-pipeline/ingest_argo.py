import os
import json
import glob
import numpy as np
import xarray as xr
import pandas as pd
from datetime import datetime

RAW_DIR = os.path.join(os.path.dirname(__file__), "raw")
OUT_DIR = os.path.join(os.path.dirname(__file__), "output")

os.makedirs(OUT_DIR, exist_ok=True)

def ingest_argo():
    print("Starting Argo profile ingestion with 2026-08 batch...")
    
    # 1. Parse ALL .nc files in data-pipeline/raw/
    all_files = glob.glob(os.path.join(RAW_DIR, "*.nc"))
    
    # Filter for R*.nc, D*.nc, SR*.nc, SD*.nc explicitly excluding old D1900121*, D1900122*, BD*, *_Rtraj.nc
    valid_files = []
    for f in all_files:
        basename = os.path.basename(f)
        if basename.startswith("BD") or basename.endswith("_Rtraj.nc"):
            continue
        if basename.startswith("D1900121") or basename.startswith("D1900122"):
            continue
        if basename.startswith("R") or basename.startswith("D") or basename.startswith("SR") or basename.startswith("SD"):
            valid_files.append(f)

    if not valid_files:
        print("Warning: No matching Argo files found in raw/")
        with open(os.path.join(OUT_DIR, "instruments.json"), "w") as f:
            json.dump([], f)
        return

    # Process files
    candidates = []
    
    for file in valid_files:
        base_name = os.path.basename(file).split(".")[0]
        # ID: e.g. "R1902373_078" -> "1902373_078"
        inst_id = base_name
        for prefix in ['SR', 'SD', 'R', 'D']:
            if inst_id.startswith(prefix):
                inst_id = inst_id[len(prefix):]
                break
                
        # Remove any _X suffix from conflict resolution during copy, e.g. _078_1 -> _078
        if "_" in inst_id:
            parts = inst_id.split("_")
            if len(parts) > 2:
                inst_id = f"{parts[0]}_{parts[1]}"
        
        try:
            ds = xr.open_dataset(file)
            n_prof = ds.dims.get("N_PROF", 1)
            
            for prof_idx in range(n_prof):
                lat = float(ds["LATITUDE"].values[prof_idx]) if "LATITUDE" in ds else 0.0
                lon = float(ds["LONGITUDE"].values[prof_idx]) if "LONGITUDE" in ds else 0.0
                
                # Process all global floats
                
                # Timestamp
                juld_dt = None
                timestamp = "Unknown"
                if "JULD" in ds and not pd.isnull(ds["JULD"].values[prof_idx]):
                    juld_dt = pd.to_datetime(ds["JULD"].values[prof_idx])
                    timestamp = juld_dt.strftime('%Y-%m-%dT%H:%M:%SZ')
                
                # Extract ADJUSTED vertical profile arrays
                pres = ds["PRES_ADJUSTED"].values[prof_idx] if "PRES_ADJUSTED" in ds else []
                temp = ds["TEMP_ADJUSTED"].values[prof_idx] if "TEMP_ADJUSTED" in ds else []
                psal = ds["PSAL_ADJUSTED"].values[prof_idx] if "PSAL_ADJUSTED" in ds else []
                
                profile_data = []
                for i in range(len(pres)):
                    if not np.isnan(pres[i]):
                        p_val = round(float(pres[i]), 2)
                        
                        t_val = round(float(temp[i]), 3) if i < len(temp) and not np.isnan(temp[i]) else None
                        s_val = round(float(psal[i]), 3) if i < len(psal) and not np.isnan(psal[i]) else None
                        
                        profile_data.append({
                            "depth": p_val,
                            "temperature": t_val,
                            "salinity": s_val,
                            "timestamp": timestamp
                        })
                
                if profile_data and juld_dt is not None:
                    candidates.append({
                        "id": inst_id,
                        "lat": lat,
                        "lon": lon,
                        "juld": juld_dt,
                        "type": "argo",
                        "profile": profile_data
                    })
            ds.close()
        except Exception as e:
            print(f"Error processing {file}: {e}")
            
    print(f"Extracted {len(candidates)} candidate profiles in bounding box.")
    
    # 4. Filter to 20 instruments closest to 2026-08-22, geographically spread
    target_date = pd.to_datetime("2026-08-22")
    
    # Sort candidates by absolute time difference from target_date
    candidates.sort(key=lambda x: abs((x["juld"] - target_date).total_seconds()))
    
    selected = []
    
    for c in candidates:
        if len(selected) >= 20:
            break
        
        # Check geographic spread (>1 degree distance)
        too_close = False
        for s in selected:
            dist = np.sqrt((c["lat"] - s["lat"])**2 + (c["lon"] - s["lon"])**2)
            if dist < 1.0:
                too_close = True
                break
                
        if not too_close:
            selected.append(c)
            
    # If we didn't get 20 because of the strict 1-degree constraint, relax it and fill up to 20
    if len(selected) < 20:
        for c in candidates:
            if len(selected) >= 20:
                break
            if not any(s["id"] == c["id"] for s in selected):
                selected.append(c)
                
    # Prepare final output
    final_instruments = []
    for s in selected:
        final_instruments.append({
            "id": s["id"],
            "lat": round(s["lat"], 4),
            "lon": round(s["lon"], 4),
            "type": s["type"],
            "profile": s["profile"]
        })
        
    with open(os.path.join(OUT_DIR, "instruments.json"), "w") as f:
        json.dump(final_instruments, f)
        
    print(f"Argo ingestion complete. Exported {len(final_instruments)} instruments.")
    
    if len(final_instruments) > 0:
        min_date = min([c["juld"] for c in selected])
        max_date = max([c["juld"] for c in selected])
        min_lat = min([c["lat"] for c in selected])
        max_lat = max([c["lat"] for c in selected])
        min_lon = min([c["lon"] for c in selected])
        max_lon = max([c["lon"] for c in selected])
        print(f"Date Range: {min_date.strftime('%Y-%m-%d')} to {max_date.strftime('%Y-%m-%d')}")
        print(f"Lat Range: {min_lat:.2f} to {max_lat:.2f}")
        print(f"Lon Range: {min_lon:.2f} to {max_lon:.2f}")

if __name__ == "__main__":
    ingest_argo()
