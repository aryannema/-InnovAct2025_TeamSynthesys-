from __future__ import annotations
import numpy as np
import pandas as pd
import geopandas as gpd
import h3

def comp_density(points_gdf: gpd.GeoDataFrame, hex_gdf: gpd.GeoDataFrame, category: str, res: int = 8) -> pd.Series:
    pts = points_gdf[points_gdf["category"] == category].copy()
    if pts.empty:
        return pd.Series(0.0, index=hex_gdf.index)

    pts["h3"] = pts.geometry.apply(lambda p: h3.geo_to_h3(p.y, p.x, res))
    counts = pts.groupby("h3").size()

    base = hex_gdf.set_index("h3").index.to_series().map(counts).fillna(0.0)

    # simple smoothing via neighbors (k-ring) with decay
    smoothed = base.copy()
    for h in base.index:
        val = base.loc[h]
        acc = val
        for k in (1, 2):  # look 1 and 2 rings out
            nbrs = h3.k_ring(h, k) - {h}
            decay = np.exp(-k)
            acc += decay * base.reindex(nbrs).fillna(0.0).sum()
        smoothed.loc[h] = acc

    smoothed.index = hex_gdf.index  # align to hex_gdf ordering
    return smoothed
