from __future__ import annotations

import geopandas as gpd
from shapely.geometry import Polygon

# --- Robust H3 import (supports both "import h3" and "from h3 import h3 as h3core") ---
try:
    import h3  # modern package exposes functions at top-level
    _polyfill = getattr(h3, "polyfill", None)
    _to_boundary = getattr(h3, "h3_to_geo_boundary", None)
    if _polyfill is None or _to_boundary is None:
        raise ImportError("Top-level h3 API missing; try submodule import.")
except Exception:
    # Fallback to older submodule API: from h3 import h3 as h3core
    from h3 import h3 as h3core  # type: ignore
    _polyfill = h3core.polyfill
    _to_boundary = h3core.h3_to_geo_boundary

def polygon_to_h3(polygon, res: int = 8) -> gpd.GeoDataFrame:
    geojson = polygon.__geo_interface__
    hex_ids = list(_polyfill(geojson, res))
    geoms = [Polygon(_to_boundary(h, geo_json=True)) for h in hex_ids]
    return gpd.GeoDataFrame({"h3": hex_ids}, geometry=geoms, crs="EPSG:4326")


def assign_points_to_h3(points_gdf: gpd.GeoDataFrame, res: int = 8) -> gpd.GeoDataFrame:
    # Works for both API styles because geo_to_h3 exists in each
    try:
        import h3
        geo_to_h3 = getattr(h3, "geo_to_h3", None)
        if geo_to_h3 is None:
            from h3 import h3 as h3core
            geo_to_h3 = h3core.geo_to_h3
    except Exception:
        from h3 import h3 as h3core
        geo_to_h3 = h3core.geo_to_h3

    out = points_gdf.copy()
    out["h3"] = out.geometry.apply(lambda p: geo_to_h3(p.y, p.x, res))
    return out
