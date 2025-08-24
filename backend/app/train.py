from pathlib import Path
import joblib, pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder
from sklearn.pipeline import Pipeline
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import classification_report
from features import CAT_FEATURES, NUM_FEATURES, ALL_FEATURES

ROOT = Path(__file__).resolve().parents[1].parents[0]
DATA_DIR = ROOT / "data"
CACHE_DIR = Path(__file__).resolve().parents[1] / "cache"
TRAIN_CSV = DATA_DIR / "training.csv"
MODEL_PATH = CACHE_DIR / "model.joblib"

def main():
    if not TRAIN_CSV.exists():
        # build from raster + points.csv or generated grid
        from build_dataset import build as build_ds
        build_ds()

    df = pd.read_csv(TRAIN_CSV)
    X = df[ALL_FEATURES].copy()
    y = df["label"].astype(int)

    pre = ColumnTransformer([
        ("cat", OneHotEncoder(handle_unknown="ignore"), CAT_FEATURES),
        ("num", "passthrough", NUM_FEATURES),
    ])
    clf = Pipeline([("pre", pre), ("lr", LogisticRegression(max_iter=300))]).fit(X, y)

    yhat = clf.predict(X)
    print(classification_report(y, yhat, digits=3))

    CACHE_DIR.mkdir(exist_ok=True, parents=True)
    joblib.dump(clf, MODEL_PATH)
    print(f"[train] Saved model → {MODEL_PATH}")

if __name__ == "__main__":
    main()
