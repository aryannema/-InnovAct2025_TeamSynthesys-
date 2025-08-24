from __future__ import annotations
import geopandas as gpd

def get_city_polygon(place_name: str = "Bengaluru, India") -> gpd.GeoSeries:
    import osmnx as ox
    gdf = ox.geocode_to_gdf(place_name)
    return gdf.geometry
