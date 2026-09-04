"""
CSV/ASCII Text Parser for AQUA-VIS
Ingests delimited text files with oceanographic data and outputs instruments.json format.
Supports: comma, tab, semicolon, and space delimiters.
Auto-detects columns by header names (CF Convention compatible).
"""
import os
import json
import csv
import re

OUT_DIR = os.path.join(os.path.dirname(__file__), "output")
os.makedirs(OUT_DIR, exist_ok=True)

# CF Convention and common column name mappings
COLUMN_ALIASES = {
    'lat': ['lat', 'latitude', 'LAT', 'LATITUDE', 'Lat', 'Latitude'],
    'lon': ['lon', 'longitude', 'LON', 'LONGITUDE', 'Lon', 'Longitude', 'long'],
    'depth': ['depth', 'DEPTH', 'Depth', 'pres', 'PRES', 'pressure', 'PRESSURE', 'z'],
    'temperature': ['temperature', 'temp', 'TEMP', 'TEMPERATURE', 'Temperature', 'sea_water_temperature', 'thetao', 'sst'],
    'salinity': ['salinity', 'sal', 'SAL', 'SALINITY', 'Salinity', 'sea_water_salinity', 'so', 'psal', 'PSAL'],
    'time': ['time', 'TIME', 'Time', 'timestamp', 'TIMESTAMP', 'datetime', 'date', 'DATE'],
    'id': ['id', 'ID', 'station', 'STATION', 'station_id', 'float_id', 'platform', 'PLATFORM_NUMBER'],
    'chlorophyll': ['chlorophyll', 'chl', 'CHL', 'CHLA', 'chla', 'chlorophyll_a'],
}


def detect_delimiter(filepath):
    """Auto-detect delimiter by checking first few lines."""
    with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
        sample = f.read(2000)
    
    for delim in ['\t', ',', ';']:
        if sample.count(delim) > 3:
            return delim
    # If no clear delimiter found, try space
    return None  # will use csv.Sniffer


def map_columns(headers):
    """Map header names to standard field names."""
    mapping = {}
    for std_name, aliases in COLUMN_ALIASES.items():
        for i, h in enumerate(headers):
            clean_h = h.strip().strip('"').strip("'")
            if clean_h in aliases:
                mapping[std_name] = i
                break
    return mapping


def parse_csv(filepath, station_prefix="CSV"):
    """Parse a CSV/ASCII file into the instruments.json format."""
    delimiter = detect_delimiter(filepath)
    
    with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
        if delimiter:
            reader = csv.reader(f, delimiter=delimiter)
        else:
            # Try csv.Sniffer
            sample = f.read(2000)
            f.seek(0)
            try:
                dialect = csv.Sniffer().sniff(sample)
                reader = csv.reader(f, dialect)
            except csv.Error:
                reader = csv.reader(f, delimiter=' ', skipinitialspace=True)
        
        rows = list(reader)
    
    if len(rows) < 2:
        print(f"Warning: File {filepath} has fewer than 2 rows.")
        return []
    
    # First row is header
    headers = rows[0]
    col_map = map_columns(headers)
    
    if 'lat' not in col_map or 'lon' not in col_map:
        print(f"Error: Could not find latitude/longitude columns in {filepath}")
        print(f"  Headers found: {headers}")
        return []
    
    # Group by station/id if available, otherwise by unique lat/lon
    instruments = {}
    
    for row_idx, row in enumerate(rows[1:], start=1):
        try:
            lat = float(row[col_map['lat']].strip())
            lon = float(row[col_map['lon']].strip())
        except (ValueError, IndexError):
            continue
        
        # Bounding box filter: Bay of Bengal EEZ region
        if not (5.0 <= lat <= 22.0 and 78.0 <= lon <= 95.0):
            continue
        
        # Station ID
        if 'id' in col_map:
            inst_id = row[col_map['id']].strip()
        else:
            inst_id = f"{station_prefix}_{lat:.2f}_{lon:.2f}"
        
        depth = float(row[col_map['depth']].strip()) if 'depth' in col_map else 0.0
        temp = None
        sal = None
        chl = None
        timestamp = "Unknown"
        
        if 'temperature' in col_map:
            try:
                temp = float(row[col_map['temperature']].strip())
            except (ValueError, IndexError):
                pass
        
        if 'salinity' in col_map:
            try:
                sal = float(row[col_map['salinity']].strip())
            except (ValueError, IndexError):
                pass
                
        if 'chlorophyll' in col_map:
            try:
                chl = float(row[col_map['chlorophyll']].strip())
            except (ValueError, IndexError):
                pass
        
        if 'time' in col_map:
            timestamp = row[col_map['time']].strip()
        
        profile_entry = {
            "depth": round(depth, 2),
            "temperature": round(temp, 3) if temp is not None else None,
            "salinity": round(sal, 3) if sal is not None else None,
            "timestamp": timestamp
        }
        if chl is not None:
            profile_entry["chlorophyll"] = round(chl, 3)
        
        if inst_id not in instruments:
            instruments[inst_id] = {
                "id": inst_id,
                "lat": round(lat, 4),
                "lon": round(lon, 4),
                "type": "csv",
                "profile": []
            }
        
        instruments[inst_id]["profile"].append(profile_entry)
    
    result = list(instruments.values())
    
    # Sort profiles by depth
    for inst in result:
        inst["profile"].sort(key=lambda x: x["depth"])
    
    return result


def ingest_csv(filepath=None, merge=True):
    """
    Ingest a CSV file and optionally merge with existing instruments.json.
    
    Args:
        filepath: Path to CSV file. If None, searches raw/ for *.csv and *.txt
        merge: If True, merges with existing instruments.json
    """
    import glob
    
    RAW_DIR = os.path.join(os.path.dirname(__file__), "raw")
    
    if filepath:
        files = [filepath]
    else:
        files = glob.glob(os.path.join(RAW_DIR, "*.csv")) + glob.glob(os.path.join(RAW_DIR, "*.txt"))
    
    if not files:
        print("No CSV/TXT files found.")
        return
    
    all_instruments = []
    
    for f in files:
        print(f"Parsing {os.path.basename(f)}...")
        instruments = parse_csv(f)
        print(f"  → Extracted {len(instruments)} stations")
        all_instruments.extend(instruments)
    
    if merge:
        existing_path = os.path.join(OUT_DIR, "instruments.json")
        if os.path.exists(existing_path):
            with open(existing_path, 'r') as ef:
                existing = json.load(ef)
            existing_ids = {e["id"] for e in existing}
            for inst in all_instruments:
                if inst["id"] not in existing_ids:
                    existing.append(inst)
            all_instruments = existing
    
    with open(os.path.join(OUT_DIR, "instruments.json"), "w") as f:
        json.dump(all_instruments, f)
    
    print(f"CSV ingestion complete. Total instruments: {len(all_instruments)}")


if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1:
        ingest_csv(filepath=sys.argv[1])
    else:
        ingest_csv()
