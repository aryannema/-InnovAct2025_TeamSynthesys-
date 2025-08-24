"""
FastAPI app for GeoAI / Sythesys
- POST /analyze : computes demand, risk, competition from inputs; returns summary + pros/cons + scores
- POST /predict : uses trained scikit-learn model (joblib) to return label + confidence

Run:
  conda activate geoai-backend
  uvicorn app.main:app --app-dir backend --reload --port 8000
"""

from __future__ import annotations

import os
import json
import math
import time
import hashlib
from typing import List, Dict, Optional, Tuple

import numpy as np
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Optional: load .env if present
try:
    from dotenv import load_dotenv
    load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "..", ".env"))
except Exception:
    pass

# ---- ML model loading -------------------------------------------------------

MODEL = None
TO_DF = None

try:
    # joblib model
    from joblib import load as joblib_load
    # features helper to build a pandas.DataFrame with the right columns
    # (this file is expected at backend/app/features.py from earlier steps)
    from .features import to_dataframe as _to_dataframe  # type: ignore

    cache_path = os.path.join(os.path.dirname(__file__), "..", "cache", "model.joblib")
    cache_path = os.path.abspath(cache_path)
    if os.path.exists(cache_path):
        MODEL = joblib_load(cache_path)
    TO_DF = _to_dataframe
except Exception as e:
    # Safe fallback if features.py or model is missing
    def _simple_to_dataframe(rows: List[Dict]):
        import pandas as pd
        return pd.DataFrame(rows)
    TO_DF = _simple_to_dataframe  # type: ignore

# ---- Geospatial libs (optional but recommended) -----------------------------

# Population raster (rasterio), geometry transforms (pyproj/shapely)
try:
    import rasterio
    from rasterio.mask import mask
    from shapely.geometry import Point, mapping
    from shapely.ops import transform as shapely_transform
    from pyproj import Transformer, CRS
    GEO_OK = True
except Exception:
    GEO_OK = False

# Overpass for POIs (competition)
import requests

# -----------------------------------------------------------------------------

app = FastAPI(title="Sythesys API", version="1.0")

# CORS for local dev (you can tighten or remove when using Next.js proxy)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---- Business profiles & helpers --------------------------------------------

BUSINESS_PROFILES: Dict[str, Dict] = {
    "cafe": {
        "label": "Cafe",
        "typ_budget": (8, 25),           # in lakh
        "typ_seating": (15, 60),
        "poi_tags": {"amenity": "cafe"},
    },
    "gym": {
        "label": "Gym / Fitness",
        "typ_budget": (30, 120),
        "typ_seating": (0, 0),
        "poi_tags": {"leisure": "fitness_centre"},
    },
    "stationery": {
        "label": "Stationery / Print",
        "typ_budget": (3, 12),
        "typ_seating": (0, 0),
        "poi_tags": {"shop": "stationery"},
    },
    "hostel_mess": {
        "label": "Hostel Mess",
        "typ_budget": (10, 40),
        "typ_seating": (40, 200),
        "poi_tags": {"amenity": "restaurant"},
    },
}

def _norm_project_key(name: str) -> str:
    return (name or "").strip().lower().replace(" ", "_")

def tags_for_project_type(project_type: str) -> Dict[str, str]:
    pk = _norm_project_key(project_type)
    return BUSINESS_PROFILES.get(pk, BUSINESS_PROFILES["cafe"])["poi_tags"]

def clamp(x: float, lo: int = 0, hi: int = 100) -> int:
    return max(lo, min(hi, int(round(x))))

# ---- Demand from population raster ------------------------------------------

def mean_density_from_raster(lat: float, lon: float, radius_m: int) -> Optional[float]:
    """
    Computes the mean value within a circular buffer around (lat, lon) from the raster at POP_TIF_PATH.
    Returns None if raster is not available or any error occurs.
    """
    if not GEO_OK:
        return None

    tif_path = os.getenv("POP_TIF_PATH", "")
    if not tif_path or not os.path.exists(tif_path):
        return None

    try:
        with rasterio.open(tif_path) as ds:
            # Build circle in meters (WebMercator) then transform to the raster CRS
            wgs84 = CRS.from_epsg(4326)
            webm = CRS.from_epsg(3857)  # meters
            to_m = Transformer.from_crs(wgs84, webm, always_xy=True).transform
            to_ds = Transformer.from_crs(webm, ds.crs, always_xy=True).transform

            x_m, y_m = to_m(lon, lat)  # always_xy=True => (lon, lat)
            circle_m = Point(x_m, y_m).buffer(radius_m, resolution=64)
            circle_ds = shapely_transform(to_ds, circle_m)

            out_img, _ = mask(ds, [mapping(circle_ds)], crop=True)
            arr = out_img.astype("float32")
            if ds.nodata is not None:
                arr[arr == ds.nodata] = np.nan
            mean_val = float(np.nanmean(arr))
            if np.isnan(mean_val):
                return None
            return mean_val
    except Exception:
        return None

def density_to_score(mean_density: Optional[float], max_val: Optional[float] = None) -> int:
    """
    Map raw raster mean to 0..100. Tune 'max_val' by dataset:
    - You can set POP_MAX_DENSITY in .env to calibrate scaling for your raster.
    """
    if mean_density is None:
        return 60  # neutral fallback that keeps the UI moving

    if max_val is None:
        try:
            max_val = float(os.getenv("POP_MAX_DENSITY", "5000"))
        except Exception:
            max_val = 5000.0

    score = int(round(100.0 * (mean_density / max_val)))
    return clamp(score, 0, 100)

# ---- Competition from OSM Overpass ------------------------------------------

OVERPASS_URL = "https://overpass-api.de/api/interpreter"
POI_CACHE_DIR = os.path.join(os.path.dirname(__file__), "..", "cache", "pois")
os.makedirs(POI_CACHE_DIR, exist_ok=True)

def _poi_cache_key(lat: float, lon: float, r: int, tags: Dict[str, str]) -> str:
    key = f"{lat:.5f}_{lon:.5f}_{r}_{json.dumps(tags, sort_keys=True)}"
    return hashlib.md5(key.encode()).hexdigest()

def fetch_pois_overpass(lat: float, lon: float, radius_m: int, tags: Dict[str, str]) -> List[Dict]:
    """
    Query Overpass for POIs with 'tags' around (lat, lon) within 'radius_m'.
    Cached to disk for 1 hour to avoid rate limits.
    """
    cache_fp = os.path.join(POI_CACHE_DIR, f"{_poi_cache_key(lat, lon, radius_m, tags)}.json")
    if os.path.exists(cache_fp) and (time.time() - os.path.getmtime(cache_fp) < 3600):
        try:
            return json.load(open(cache_fp, "r", encoding="utf-8"))
        except Exception:
            pass

    filters = "".join([f'["{k}"="{v}"]' for k, v in tags.items()])
    ql = f"""
    [out:json][timeout:25];
    (
      node{filters}(around:{radius_m},{lat},{lon});
      way{filters}(around:{radius_m},{lat},{lon});
      relation{filters}(around:{radius_m},{lat},{lon});
    );
    out center;
    """
    try:
        r = requests.post(OVERPASS_URL, data={"data": ql}, timeout=30)
        r.raise_for_status()
        data = r.json()
    except Exception:
        return []

    pois: List[Dict] = []
    for el in data.get("elements", []):
        lat0 = el.get("lat") or (el.get("center") or {}).get("lat")
        lon0 = el.get("lon") or (el.get("center") or {}).get("lon")
        if lat0 is None or lon0 is None:
            continue
        name = (el.get("tags") or {}).get("name", "")
        pois.append({"lat": float(lat0), "lon": float(lon0), "name": name, "type": el["type"]})

    try:
        json.dump(pois, open(cache_fp, "w", encoding="utf-8"))
    except Exception:
        pass
    return pois

def competition_score_from_pois(pois: List[Dict], radius_m: int) -> int:
    """
    Convert POI count density (per km^2) into a 0..100 "competition" score.
    Tune the factor to your city. Here ~15 POIs/km^2 ≈ 100.
    """
    area_km2 = math.pi * (radius_m / 1000.0) ** 2
    dens = (len(pois) / area_km2) if area_km2 > 0 else 0.0
    score = int(round(dens * 15))
    return clamp(score)

# ---- Risk & Narrative --------------------------------------------------------

def risk_from_inputs(project_type: str, budget_lakh: float, seating: int,
                     hours_str: Optional[str], demand: int, competition: int) -> int:
    prof = BUSINESS_PROFILES.get(_norm_project_key(project_type), BUSINESS_PROFILES["cafe"])
    lo_b, hi_b = prof["typ_budget"]
    lo_s, hi_s = prof["typ_seating"]

    risk = 50
    # budget vs typical
    if budget_lakh < lo_b:
        risk += 15
    if budget_lakh > hi_b:
        risk -= 10
    # seating vs typical
    if hi_s > 0:
        if seating < lo_s:
            risk += 10
        if seating > hi_s:
            risk += 5
    # hours
    try:
        hspan = hours_str or "08:00-22:00"
        start, end = hspan.split("-")
        sh, eh = int(start.split(":")[0]), int(end.split(":")[0])
        open_h = (eh - sh) % 24
        if open_h >= 12:
            risk += 8
        if open_h >= 16:
            risk += 5
    except Exception:
        pass
    # demand & competition effects
    if demand <= 40:
        risk += 10
    if competition >= 70:
        risk += 12

    return clamp(risk)

def make_pros_cons(project_type: str, demand: int, risk: int, competition: int,
                   city: Optional[str], radius_m: int) -> Tuple[List[str], List[str]]:
    pros: List[str] = []
    cons: List[str] = []

    if demand >= 65:
        pros.append("Strong local demand near the chosen spot.")
    if competition <= 35:
        pros.append("Low saturation—clear headroom for growth.")
    if risk <= 40:
        pros.append("Operational risk appears manageable.")

    if demand < 45:
        cons.append("Weak customer base; consider moving closer to footfall.")
    if competition > 70:
        cons.append("Heavy competition within the catchment.")
    if risk > 65:
        cons.append("Operational risk (budget, hours, or seasonality) is elevated.")

    p = _norm_project_key(project_type)
    if "cafe" in p:
        if competition > 60:
            cons.append("Many cafés nearby—focus on niche (breakfast/late-night).")
        else:
            pros.append("Cafe format fits student/office crowd in this area.")
    if "gym" in p:
        if demand >= 60:
            pros.append("Good fitness interest; group classes could work.")
    if "stationery" in p:
        pros.append("Proximity to campus/offices favors stationery/print demand.")
    if "hostel_mess" in p:
        if demand >= 55:
            pros.append("Student density favors mess/meal plans.")

    pros.append(f"Radius {radius_m} m analyzed{(' in ' + city) if city else ''}.")
    return pros, cons

# ---- Payloads & Endpoints ----------------------------------------------------

class AnalyzePayload(BaseModel):
    project_type: str
    city: Optional[str] = None
    address: Optional[str] = None
    lat: Optional[float] = None
    lon: Optional[float] = None
    radius_m: int = 500
    budget_lakh: float = 10.0
    seating_capacity: int = 0
    open_hours: Optional[str] = "08:00-22:00"
    use_population_density: bool = True
    consider_competition: bool = True
    notes: Optional[str] = None

class PredictPayload(BaseModel):
    project_type: str
    city: str
    budget_lakh: float
    seating_capacity: int
    radius_m: int = 500
    demand_score: Optional[float] = None  # pass from /analyze if available

@app.get("/")
def root():
    return {"ok": True, "service": "Sythesys API", "endpoints": ["/analyze", "/predict"]}

@app.post("/analyze")
def analyze(p: AnalyzePayload):
    # 1) Demand from raster (if available)
    mean_den = None
    if p.use_population_density and p.lat is not None and p.lon is not None:
        mean_den = mean_density_from_raster(p.lat, p.lon, p.radius_m)
    demand = density_to_score(mean_den)

    # 2) Competition from OSM Overpass (optional)
    comp = 45  # neutral mid
    pois: List[Dict] = []
    if p.consider_competition and p.lat is not None and p.lon is not None:
        try:
            pois = fetch_pois_overpass(p.lat, p.lon, p.radius_m, tags_for_project_type(p.project_type))
            comp = competition_score_from_pois(pois, p.radius_m)
        except Exception:
            comp = 55  # safe fallback

    # 3) Risk from inputs + current scores
    risk = risk_from_inputs(p.project_type, p.budget_lakh, p.seating_capacity, p.open_hours, demand, comp)

    # 4) Narrative
    label = BUSINESS_PROFILES.get(_norm_project_key(p.project_type), {}).get("label", "business")
    summary = (
        f"Feasibility for a {label.lower()} in {p.city or 'this area'}: "
        f"demand {demand}, risk {risk}, competition {comp}"
        f"{'' if mean_den is None else f' (mean density: {round(mean_den, 1)})'}."
    )
    pros, cons = make_pros_cons(p.project_type, demand, risk, comp, p.city, p.radius_m)

    # Trim POIs if we return them (frontend can ignore or use later)
    pois_out = pois[:50] if pois else []

    return {
        "summary": summary,
        "pros": pros,
        "cons": cons,
        "scores": {"demand": demand, "risk": risk, "competition": comp},
        "debug": {"poi_count": len(pois), "mean_density": mean_den, "tif_used": mean_den is not None},
        "pois": pois_out,  # optional; front-end can plot later
    }

@app.post("/predict")
def predict(p: PredictPayload):
    """
    Uses the trained scikit-learn pipeline to classify viability.
    Expects tabular features; demand_score should preferably come from /analyze.
    """
    if TO_DF is None:
        return {"prediction": "Promising", "confidence": 0.78, "note": "features builder missing, using fallback."}

    # Safe fallback when model is not loaded
    if MODEL is None:
        return {"prediction": "Promising", "confidence": 0.78, "note": "model not loaded, using fallback."}

    # Build one-row dataframe for the model
    row = [{
        "project_type": p.project_type,
        "city": p.city,
        "budget_lakh": p.budget_lakh,
        "seating_capacity": p.seating_capacity,
        "radius_m": p.radius_m,
        "demand_score": float(p.demand_score) if p.demand_score is not None else 60.0,
    }]

    X = TO_DF(row)

    import numpy as np  # local import to avoid polluting module if unused
    try:
        proba = MODEL.predict_proba(X)[0]
        idx = int(np.argmax(proba))
        conf = float(proba[idx])
        label = ["Not viable", "Promising"][idx] if len(proba) == 2 else str(idx)
        return {"prediction": label, "confidence": conf}
    except Exception:
        # If the loaded object has no predict_proba, try predict
        try:
            y = MODEL.predict(X)
            label = str(y[0])
            return {"prediction": label, "confidence": 0.66}
        except Exception:
            return {"prediction": "Promising", "confidence": 0.78, "note": "model inference failed; using fallback."}
