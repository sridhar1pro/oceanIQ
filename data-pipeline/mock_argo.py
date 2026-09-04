import json
import random
import os

OUT_DIR = os.path.join(os.path.dirname(__file__), "output")
os.makedirs(OUT_DIR, exist_ok=True)

instruments = []

# Generate 50 global Argo floats
for i in range(50):
    lat = random.uniform(-75, 75)
    lon = random.uniform(-180, 180)
    
    # Generate a realistic dive profile
    profile = []
    for depth in [0, 10, 50, 100, 200, 500, 1000]:
        # Temp drops as depth increases
        base_temp = 25 - (abs(lat) / 3) # Surface temp depends on lat
        temp = base_temp - (depth / 50) + random.uniform(-0.5, 0.5)
        temp = max(-2, temp)
        
        salinity = 34.0 + random.uniform(-1.0, 1.0)
        
        profile.append({
            "depth": float(depth),
            "temperature": round(float(temp), 3),
            "salinity": round(float(salinity), 3),
            "timestamp": "2026-08-31T00:00:00Z"
        })
        
    instruments.append({
        "id": f"GLO_{i}",
        "lat": round(lat, 3),
        "lon": round(lon, 3),
        "type": "argo",
        "profile": profile
    })

with open(os.path.join(OUT_DIR, "instruments.json"), "w") as f:
    json.dump(instruments, f)

print(f"Generated {len(instruments)} global mock Argo floats.")
