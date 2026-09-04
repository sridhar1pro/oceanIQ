import os
import json
import glob
import numpy as np
import xarray as xr
import pandas as pd

RAW_DIR = os.path.join(os.path.dirname(__file__), "raw")
OUT_DIR = os.path.join(os.path.dirname(__file__), "output")

os.makedirs(OUT_DIR, exist_ok=True)

def ingest_model():
    print("Starting model ingestion...")
    files = glob.glob(os.path.join(RAW_DIR, "cmems_*.nc"))
    if not files:
        print("Warning: No Copernicus cmems_*.nc files found in raw/")
        return

    variables_metadata = {
        "variables": [],
        "depths": [],
        "times": []
    }

    for file in files:
        print(f"Processing {os.path.basename(file)}")
        ds = xr.open_dataset(file)
        
        # Identify variables of interest present in the dataset
        target_vars = [v for v in ['thetao', 'so', 'uo', 'vo'] if v in ds.data_vars]
        for v in target_vars:
            if v not in variables_metadata["variables"]:
                variables_metadata["variables"].append(v)
        
        # Subset to first 5 depths and 6 times
        depth_coords = list(ds["depth"].values[:5])
        time_coords = list(ds["time"].values[:6])
        
        # Format depths to 2 decimal places and times without colons for windows file names
        fmt_depths = [round(float(d), 2) for d in depth_coords]
        fmt_times = [pd.to_datetime(t).strftime('%Y-%m-%dT%H-%M-%S') for t in time_coords]
        
        if not variables_metadata["depths"]:
            variables_metadata["depths"] = fmt_depths
        if not variables_metadata["times"]:
            variables_metadata["times"] = [pd.to_datetime(t).strftime('%Y-%m-%dT%H:%M:%SZ') for t in time_coords] # keep standard in json

        # Dynamically determine step size to keep point count around 40000 for limited memory
        lat_len = ds.dims.get('latitude', len(ds['latitude']))
        lon_len = ds.dims.get('longitude', len(ds['longitude']))
        total_pts = lat_len * lon_len
        target_pts = 40000
        step = max(1, int(np.sqrt(total_pts / target_pts)))
        print(f"Downsampling grid (size {lat_len}x{lon_len}) by step {step}")
        
        ds_sub = ds.isel(latitude=slice(0, None, step), longitude=slice(0, None, step))
        lats = ds_sub["latitude"].values
        lons = ds_sub["longitude"].values

        for var_name in target_vars:
            print(f"  Extracting {var_name}...")
            for i, t in enumerate(time_coords):
                for j, d in enumerate(depth_coords):
                    data = ds_sub[var_name].isel(time=i, depth=j).values
                    
                    points = []
                    for lat_idx, lat in enumerate(lats):
                        for lon_idx, lon in enumerate(lons):
                            val = data[lat_idx, lon_idx]
                            if not np.isnan(val):
                                points.append({
                                    "lat": round(float(lat), 3),
                                    "lon": round(float(lon), 3),
                                    "value": round(float(val), 3)
                                })
                    out_data = {
                        "lats": [round(float(l), 3) for l in lats],
                        "lons": [round(float(l), 3) for l in lons],
                        "points": points
                    }
                    # File name uses the sanitized time format
                    out_filename = f"grid_{var_name}_{fmt_depths[j]}_{fmt_times[i]}.json"
                    with open(os.path.join(OUT_DIR, out_filename), "w") as f:
                        json.dump(out_data, f)
                
    with open(os.path.join(OUT_DIR, "variables.json"), "w") as f:
        json.dump(variables_metadata, f)

    print("Model ingestion complete.")

if __name__ == "__main__":
    ingest_model()
