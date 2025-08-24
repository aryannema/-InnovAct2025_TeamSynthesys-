import os
from src.utils.geo import get_city_polygon
from src.etl.osm_ingest import fetch_pois_within

CITY = os.environ.get("CITY", "Bengaluru, India")
OUT = "data/interim/pois.geojson"

if __name__ == "__main__":
    polygon = get_city_polygon(CITY)
    pois = fetch_pois_within(polygon, "config/categories.yaml")
    os.makedirs("data/interim", exist_ok=True)
    pois.to_file(OUT, driver="GeoJSON")
    print(f"✅ Saved {len(pois)} POIs → {OUT}")
