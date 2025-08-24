import os
import yaml
import pandas as pd
import geopandas as gpd
from src.utils.geo import get_city_polygon
from src.features.tiling import polygon_to_h3
from src.features.population import sum_population_per_hex
from src.features.competition import comp_density
from src.scoring.mvp_score import score_hex

CITY = os.environ.get("CITY", "Bengaluru, India")
RES = int(os.environ.get("H3_RES", "8"))
POP_TIF = os.environ.get("POP_TIF", "data/raw/population.tif")

if __name__ == "__main__":
    polygon = get_city_polygon(CITY)
    hexes = polygon_to_h3(polygon.iloc[0], RES)
    hexes.to_file("data/interim/hexes.geojson", driver="GeoJSON")

    # population
    if os.path.exists(POP_TIF):
        hexes = sum_population_per_hex(hexes, POP_TIF)
    else:
        # Fallback: uniform pop so you can proceed; replace once you add a raster
        hexes["pop"] = 1.0

    # read POIs from previous step
    pois = gpd.read_file("data/interim/pois.geojson")

    # categories config
    with open("config/categories.yaml", "r", encoding="utf-8") as f:
        cfg = yaml.safe_load(f)

    out_frames = []
    for cat in cfg["categories"].keys():
        comp = comp_density(pois, hexes, category=cat, res=RES)
        s = score_hex(hexes["pop"], comp)
        out = hexes.copy()
        out["category"] = cat
        out["comp_density"] = comp.values
        out["score"] = s.values
        out_frames.append(out[["h3", "category", "pop", "comp_density", "score", "geometry"]])

    full = pd.concat(out_frames).pipe(gpd.GeoDataFrame, geometry="geometry", crs="EPSG:4326")
    os.makedirs("data/processed", exist_ok=True)
    full.to_file("data/processed/opportunity.geojson", driver="GeoJSON")
    print("✅ Built dataset → data/processed/opportunity.geojson")
