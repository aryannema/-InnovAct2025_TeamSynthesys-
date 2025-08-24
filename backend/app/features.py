from typing import List, Dict, Any
import pandas as pd

# Categorical and numeric features used by both training and inference
CAT_FEATURES: List[str] = ["project_type", "city"]
NUM_FEATURES: List[str] = ["demand_score", "budget_lakh", "seating_capacity", "radius_m"]
ALL_FEATURES: List[str] = CAT_FEATURES + NUM_FEATURES

DEFAULTS = {"demand_score": 60.0, "budget_lakh": 10.0, "seating_capacity": 30, "radius_m": 500}

def to_dataframe(rows: List[Dict[str, Any]]) -> pd.DataFrame:
    """Build a DataFrame with exactly the schema we train on."""
    df = pd.DataFrame(rows)
    for c in CAT_FEATURES:
        if c not in df: df[c] = "unknown"
    for c in NUM_FEATURES:
        if c not in df: df[c] = DEFAULTS[c]
    return df[ALL_FEATURES]
