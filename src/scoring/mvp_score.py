from __future__ import annotations
import pandas as pd

def compute_gap(pop: pd.Series, comp: pd.Series, alpha: float | None = None) -> pd.Series:
    # Fit alpha so total predicted ~ total observed
    if alpha is None:
        alpha = (comp.sum() / (pop.sum() + 1e-9)) if pop.sum() > 0 else 0.0
    pred = alpha * pop
    return pred - comp

def score_hex(pop: pd.Series, comp: pd.Series) -> pd.Series:
    gap = compute_gap(pop, comp)
    # rank to [0,1] so it’s scale-free
    return gap.rank(pct=True)
