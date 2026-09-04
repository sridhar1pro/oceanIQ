import os
import xarray as xr

DOWNLOADS_DIR = r"C:\Users\siban\Downloads"

files = [
    "20260803_prof.nc",
    "20260802_prof.nc",
    "R7902460_016_aux.nc",
    "cmems_mod_glo_wav_anfc_0.083deg_PT3H-i_1788528875369.nc",
    "cmems_obs-oc_glo_bgc-optics_my_l4-multi-4km_P1M_1788528608992.nc",
    "cmems_obs-sl_glo_phy-ssh_my_allsat-demo-l4-duacs-0.125deg_P1D-i_1788528369432.nc",
    "cmems_mod_glo_bgc-car_anfc_0.25deg_P1D-m_1788527431176.nc",
    "cmems_mod_glo_phy_anfc_0.083deg_PT1H-m_1788527618245.nc",
]

for fname in files:
    fpath = os.path.join(DOWNLOADS_DIR, fname)
    if not os.path.exists(fpath):
        print(f"MISSING: {fname}")
        continue
    size_mb = os.path.getsize(fpath) / (1024 * 1024)
    print(f"\n=======================================================")
    print(f"FILE: {fname} ({size_mb:.2f} MB)")
    try:
        ds = xr.open_dataset(fpath)
        print("DIMENSIONS:", dict(ds.dims))
        print("COORDINATES:", list(ds.coords.keys()))
        data_vars = {}
        for var_name, var in ds.data_vars.items():
            data_vars[var_name] = {
                "dims": var.dims,
                "shape": var.shape,
                "units": var.attrs.get("units", "N/A"),
                "long_name": var.attrs.get("long_name", var.attrs.get("standard_name", "N/A"))
            }
        print("VARIABLES:")
        for k, v in data_vars.items():
            print(f"  - {k}: {v['long_name']} | units: {v['units']} | shape: {v['shape']}")
        
        # Check lat/lon if present
        for c in ["latitude", "lat", "LATITUDE", "longitude", "lon", "LONGITUDE", "depth", "DEPTH", "time", "TIME"]:
            if c in ds:
                vals = ds[c].values
                if hasattr(vals, '__len__') and len(vals) > 0:
                    print(f"  coord {c}: min={vals.min()}, max={vals.max()}, count={len(vals)}")
        ds.close()
    except Exception as e:
        print(f"  Error reading with xarray: {e}")
