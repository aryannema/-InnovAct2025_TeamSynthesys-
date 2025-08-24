import os, math
from pathlib import Path
from typing import Optional, Tuple, List
import numpy as np
import pandas as pd

RASTER_OK = True
try:
    import rasterio
    from rasterio.windows import Window
    from pyproj import Transformer
except Exception:
    RASTER_OK = False

ROOT = Path(__file__).resolve().parents[1].parents[0]
DATA_DIR = ROOT / "data"
POINTS_CSV = DATA_DIR / "points.csv"
TRAIN_CSV = DATA_DIR / "training.csv"

POP_TIF_PATH = os.getenv("POP_TIF_PATH", str(DATA_DIR / "population_density.tif"))

def mean_density(tif_path: str, lat: float, lon: float, radius_m: int) -> Optional[float]:
    if not (RASTER_OK and os.path.exists(tif_path)):
        return None
    with rasterio.open(tif_path) as ds:
        transformer = Transformer.from_crs("EPSG:4326", ds.crs, always_xy=True)
        x, y = transformer.transform(lon, lat)
        px_w, px_h = abs(ds.transform.a), abs(ds.transform.e)
        is_geo = ds.crs and ds.crs.is_geographic
        if is_geo:
            lat_rad = math.radians(lat)
            m_per_deg_x = 111_320 * math.cos(lat_rad)
            m_per_deg_y = 110_540
            rpx_x = max(1, int((radius_m / m_per_deg_x) / px_w))
            rpx_y = max(1, int((radius_m / m_per_deg_y) / px_h))
        else:
            rpx_x = max(1, int(radius_m / px_w))
            rpx_y = max(1, int(radius_m / px_h))
        row, col = ds.index(x, y)
        col0, row0 = max(0, col - rpx_x), max(0, row - rpx_y)
        width, height = min(ds.width - col0, 2*rpx_x + 1), min(ds.height - row0, 2*rpx_y + 1)
        win = Window(col_off=col0, row_off=row0, width=width, height=height)
        arr = ds.read(1, window=win, masked=True)
        if arr.size == 0:
            return None
        yy, xx = np.ogrid[:height, :width]
        cy, cx = row - row0, col - col0
        circular = (xx-cx)**2/(rpx_x**2+1e-6) + (yy-cy)**2/(rpx_y**2+1e-6) <= 1.0
        arr = np.ma.array(arr, mask=np.logical_or(arr.mask, ~circular))
        return float(arr.mean()) if arr.count() > 0 else None

def density_to_demand_score(mean_density_val: Optional[float]) -> float:
    if (mean_density_val is None) or (mean_density_val != mean_density_val):
        return 60.0
    return float(max(0, min(100, (mean_density_val / 8000.0) * 100)))

def generate_grid(center_lat: float, center_lon: float, n: int = 120, step_m: int = 250) -> List[Tuple[float,float]]:
    lat_rad = math.radians(center_lat)
    deg_per_m_lat = 1 / 110_540
    deg_per_m_lon = 1 / (111_320 * math.cos(lat_rad) + 1e-6)
    side = int(math.sqrt(n))
    coords = []
    for i in range(-side//2, side//2):
        for j in range(-side//2, side//2):
            dlat = i * step_m * deg_per_m_lat
            dlon = j * step_m * deg_per_m_lon
            coords.append((center_lat + dlat, center_lon + dlon))
    return coords[:n]

def build():
    DATA_DIR.mkdir(exist_ok=True, parents=True)

    if POINTS_CSV.exists():
        df = pd.read_csv(POINTS_CSV)
        print(f"[build_dataset] Using points from {POINTS_CSV}")
    else:
        center_lat, center_lon = 12.9698, 79.1559  # Vellore
        pts = generate_grid(center_lat, center_lon, n=120, step_m=300)
        df = pd.DataFrame(pts, columns=["lat","lon"])
        df["project_type"] = "cafe"
        df["city"] = "Vellore"
        df["radius_m"] = 500
        df["budget_lakh"] = 12
        df["seating_capacity"] = 40
        print(f"[build_dataset] Generated {len(df)} grid points.")

    # demand from raster
    demands = []
    for _, row in df.iterrows():
        m = mean_density(POP_TIF_PATH, float(row["lat"]), float(row["lon"]), int(row.get("radius_m", 500)))
        demands.append(density_to_demand_score(m))
    df["demand_score"] = demands

    # Balanced weak labels via median threshold (guarantees both classes)
    if "label" not in df.columns:
        score = (0.6*df["demand_score"] + 0.2*df["budget_lakh"] + 0.2*df["seating_capacity"]
                 - 0.1*(df["radius_m"]/10))
        thr = score.median()
        df["label"] = (score > thr).astype(int)
        print("[build_dataset] Created weak labels using median threshold.")
    else:
        print("[build_dataset] Found label column; using provided labels.")

    cols = ["project_type","city","demand_score","budget_lakh","seating_capacity","radius_m","label","lat","lon"]
    for c in cols:
        if c not in df.columns: df[c] = np.nan
    df = df[cols]
    df.to_csv(TRAIN_CSV, index=False)
    print(f"[build_dataset] Wrote {TRAIN_CSV} ({len(df)} rows)")

if __name__ == "__main__":
    build()
