# Documentation Tables

## Table 1: Key Acronyms & Abbreviations

| Acronym | Full Form | Relevance to AQUA-VIS |
|---------|-----------|------------------------|
| **ADCP** | Acoustic Doppler Current Profiler | Potential future in-situ data source for ocean currents |
| **API** | Application Programming Interface | REST interface connecting the React frontend to the Python backend |
| **BGC** | Biogeochemical | Data type representing chlorophyll, oxygen, and nutrients |
| **CF** | Climate and Forecast Conventions | Metadata standards used by NetCDF files for Earth science data |
| **CTD** | Conductivity, Temperature, Depth | Primary instrument suite used on gliders, floats, and research vessels |
| **EEZ** | Exclusive Economic Zone | The primary geographic focus area for INCOIS monitoring |
| **INCOIS**| Indian National Centre for Ocean Information Services | The primary stakeholder and end-user for this visualization platform |
| **MoES** | Ministry of Earth Sciences | Parent organization of INCOIS |
| **NetCDF**| Network Common Data Form | The primary data format used for INCOIS model outputs and Argo float profiles |
| **OGC** | Open Geospatial Consortium | Standards body defining WMS/WCS protocols |
| **SIH** | Smart India Hackathon | The context for problem statement 26067 |
| **WCS** | Web Coverage Service | OGC standard for requesting raw gridded data |
| **WMS** | Web Map Service | OGC standard for requesting rendered map images |
| **WebGL** | Web Graphics Library | The core rendering technology used by Three.js in the browser |

## Table 2: Dataset References

| Dataset Type | Expected Format | Example Source / Portal Link |
|--------------|-----------------|------------------------------|
| **Ocean Model Output** | NetCDF (`.nc`) | [Copernicus Marine Service (CMEMS)](https://marine.copernicus.eu/) |
| **Argo Profiling Floats** | NetCDF (`R*.nc`, `D*.nc`) | [Euro-Argo Fleet Monitoring](https://fleetmonitoring.euro-argo.eu/dashboard) / INCOIS Live Access Server |
| **Underwater Gliders** | NetCDF (`GLIDER*.nc`) | [IOOS Glider DAC](https://gliders.ioos.us/) |
| **CTD Casts** | ASCII / CSV / `.txt` | Various Research Vessel cruise reports |
