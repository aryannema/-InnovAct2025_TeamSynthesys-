from __future__ import annotations
import rasterio
import numpy as np
import geopandas as gpd
from rasterio.mask import mask

def sum_population_per_hex(hex_gdf: gpd.GeoDataFrame, pop_tif_path: str) -> gpd.GeoDataFrame:
    hex_gdf = hex_gdf.copy()
    results = []
    with rasterio.open(pop_tif_path) as src:
        for _, row in hex_gdf.iterrows():
            geom = [row.geometry.__geo_interface__]
            try:
                out_img, _ = mask(src, geom, crop=True)
                pop_sum = float(np.nansum(out_img))
            except Exception:
                pop_sum = 0.0
            results.append(pop_sum)
    hex_gdf["pop"] = results
    return hex_gdf
