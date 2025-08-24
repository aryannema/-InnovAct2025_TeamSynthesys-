from __future__ import annotations
import geopandas as gpd
import pandas as pd
import osmnx as ox
import yaml

ox.settings.log_console = False
ox.settings.use_cache = True

def _ensure_columns(df: gpd.GeoDataFrame, cat: str) -> gpd.GeoDataFrame:
    df = df.reset_index()  # brings 'osmid' (if present) out of the index
    # Robust OSM id selection
    if "osmid" in df.columns:
        df = df.rename(columns={"osmid": "osm_id"})
    elif "id" in df.columns:
        df = df.rename(columns={"id": "osm_id"})
    else:
        df["osm_id"] = df.index  # fallback

    # Some POIs miss 'name'
    if "name" not in df.columns:
        df["name"] = None

    df["category"] = cat
    return df

def _centroid_safely(gdf: gpd.GeoDataFrame) -> gpd.GeoDataFrame:
    """
    Compute centroids in a projected CRS to avoid the geographic CRS warning,
    then return to EPSG:4326.
    """
    # If already points, keep as-is
    geom_type = gdf.geometry.geom_type.unique()
    if set(geom_type).issubset({"Point"}):
        return gdf

    # Project → centroid → back to WGS84
    gdf_proj = gdf.to_crs(3857)  # Web Mercator (meters)
    gdf_proj["geometry"] = gdf_proj.geometry.centroid
    return gdf_proj.to_crs(4326)

def fetch_pois_within(polygon, categories_yaml_path: str) -> gpd.GeoDataFrame:
    with open(categories_yaml_path, "r", encoding="utf-8") as f:
        cfg = yaml.safe_load(f)
    cats = cfg["categories"]

    frames: list[gpd.GeoDataFrame] = []

    for cat, tagmap in cats.items():
        # Query OSM features inside the polygon matching given tags
        gdf = ox.features_from_polygon(polygon.iloc[0], tagmap)
        if gdf is None or gdf.empty:
            continue

        gdf = _ensure_columns(gdf, cat)

        # Normalize geometry to points (centroid for polygons/lines)
        gdf = gpd.GeoDataFrame(gdf, geometry="geometry", crs="EPSG:4326")
        gdf = _centroid_safely(gdf)

        frames.append(gdf[["osm_id", "name", "geometry", "category"]])

    if not frames:
        return gpd.GeoDataFrame(columns=["osm_id", "name", "geometry", "category"], crs="EPSG:4326")

    out = pd.concat(frames, ignore_index=True)
    return gpd.GeoDataFrame(out, geometry="geometry", crs="EPSG:4326")
