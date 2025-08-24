# Sythesys (Geo‑AI Feasibility & Prediction)

A Next.js + FastAPI application that estimates **location feasibility** for small businesses using lightweight **AI/ML** and **geospatial** signals. Enter a candidate site (latitude/longitude), a radius, and your business type (e.g., Cafe, Gym). The app computes **Demand**, **Competition**, and **Risk**, explains the results, and provides an overall **Business Feasibility Score (BFS)**, recommendations, and charts.

---

## Table of Contents

- [Sythesys (Geo‑AI Feasibility \& Prediction)](#sythesys-geoai-feasibility--prediction)
  - [Table of Contents](#table-of-contents)
  - [Key Features](#key-features)
  - [How AI \& ML Are Used](#how-ai--ml-are-used)
    - [Features used by the model](#features-used-by-the-model)
    - [Model](#model)
  - [Architecture \& Workflow](#architecture--workflow)
  - [Tech Stack](#tech-stack)
  - [Repository Structure](#repository-structure)
  - [Getting Started](#getting-started)
    - [Prerequisites](#prerequisites)
    - [Backend Setup (FastAPI)](#backend-setup-fastapi)
    - [Frontend Setup (Next.js)](#frontend-setup-nextjs)
  - [Environment Variables](#environment-variables)
  - [APIs](#apis)
    - [`/analyze`](#analyze)
    - [`/predict`](#predict)
  - [Results Page — In Depth](#results-page--in-depth)
    - [Business Feasibility Score (0–100%)](#business-feasibility-score-0100)
    - [Scores: Demand / Risk / Competition](#scores-demand--risk--competition)
    - [Competition Map](#competition-map)
    - [Top Recommended Businesses](#top-recommended-businesses)
    - [Demand–Supply Gap](#demandsupply-gap)
    - [Trend Forecast (12 months)](#trend-forecast-12-months)
    - [Demographic Profile](#demographic-profile)
    - [Spending Behavior](#spending-behavior)
    - [Risk Factors](#risk-factors)
  - [Data Sources \& Extending with Real Data](#data-sources--extending-with-real-data)
  - [Training Pipeline](#training-pipeline)
  - [Troubleshooting](#troubleshooting)
  - [Roadmap](#roadmap)
  - [License](#license)
    - [Acknowledgements](#acknowledgements)

---

## Key Features

- **Feasibility analysis** of a location using **Demand**, **Competition**, and **Risk** scores.
- **Business Feasibility Score (BFS)** with a clear **cutoff** for “Feasible” vs “Not Feasible”.
- **Recommendations**: ranked **Top Recommended Businesses** with success probabilities.
- **Map**: candidate site + radius; (optional) competitor **POI pins**.
- **Charts**: **Demand–Supply Gap** and **Trend Forecast**.
- **Narratives**: automatic **Pros & Cons** explaining _why_.
- Clean **dark theme** UI with Tailwind + shadcn/ui.

---

## How AI & ML Are Used

### Features used by the model

- **Demand Score** — Derived from population density inside the user’s **lat/lon + radius**. We read a population **GeoTIFF** (e.g., WorldPop/GHSL) and compute the **mean density**; then scale to 0–100.
- **Competition Score** — Density of similar **POIs** (e.g., `amenity=cafe`) within the same radius, fetched through **OSM Overpass** (cached).
- **Risk Score** — A pragmatic heuristic combining budget vs typical, seating vs typical, long hours (operational risk), plus the effect of demand/competition (higher competition or lower demand increases risk).

These are used in two places:

1. **Client-side BFS** (see formula below) to give an instant overall picture.
2. **Backend ML model** (`/predict`) for an independent viability classification.

### Model

- **Type:** scikit-learn **Logistic Regression**, wrapped in a pipeline with **OneHotEncoder** for categorical features.
- **Training data:** Built via `build_dataset.py`. If you have real labels in `data/points.csv` (e.g., success/fail), the script uses them. Otherwise it creates a small grid and **weak labels** (median split) to produce a working demo dataset.
- **Artifact:** Saved to `backend/cache/model.joblib` and loaded at API start.
- **Example training run (user’s local):** `accuracy ≈ 0.91` (100 test samples). _This will vary with your data._

> **Note:** Logistic Regression is intentionally simple (transparent, small, fast). You can swap it for a tree-based model once you’ve collected real labels.

---

## Architecture & Workflow

```mermaid
flowchart LR
  A[Browser UI (Next.js, TS, Tailwind, shadcn)] -->|POST /analyze| B[FastAPI (Uvicorn)]
  B -->|Read GeoTIFF (rasterio)| C[Demand Score]
  B -->|Overpass (OSM) cached| D[Competition Score]
  B --> E[Risk Heuristic]
  B -->|JSON scores + narrative| A

  A -->|POST /predict| B
  B -->|scikit-learn model.joblib| F[Prediction (label + confidence)]
  F --> A

  subgraph Data
    G[population_density.tif]
    H[training.csv]
    I[cache/model.joblib]
  end
```

- Users enter **lat/lon** of the candidate site and a **radius (m)**.
- Backend computes **Demand** (raster mean), **Competition** (POI density), **Risk** (heuristic), and narrative **Pros/Cons**.
- Frontend renders the **Results** page and can request a **Prediction** from the trained ML model.

---

## Tech Stack

**Frontend**

- Next.js 15 (App Router), React 18, TypeScript
- Tailwind CSS, shadcn/ui, sonner (toasts)
- react-hook-form + zod (forms & validation)
- Leaflet + react-leaflet (map), Recharts (charts)

**Backend**

- FastAPI, Uvicorn
- scikit-learn, pandas, numpy, joblib
- rasterio, shapely, pyproj (for GeoTIFF & CRS transforms)
- requests (Overpass), python-dotenv

**Dev/Ops**

- Conda (Python 3.11 env), Node.js + npm
- `.env` files for configs
- Git/GitHub

---

## Repository Structure

```
<root>/
  backend/
    app/
      main.py            # API: /analyze, /predict (+helpers for raster & Overpass)
      train.py           # trains scikit-learn model → cache/model.joblib
      build_dataset.py   # builds data/training.csv (real labels OR weak labels)
      features.py        # to_dataframe() for model input
    cache/
      .gitkeep           # (model.joblib is git-ignored)
    environment.yml
    .env.example
  geoai-ui/
    src/app/
      page.tsx           # dark hero landing
      analyze/page.tsx   # form + POST /analyze
      results/page.tsx   # insights + charts + predict
      faqs/page.tsx
      contact/page.tsx
    src/components/      # Navbar, Hero, MapPreview, ScoreChart, ScenarioForm, etc.
    src/lib/
      api.ts             # analyze() / predict()
      insights.ts        # BFS + recommendations, gaps, trends, risk text
    public/
      logo-sythesys.png
    .env.local.example
  data/
    population_density.tif  # (not committed)
    training.csv            # (generated)
  README.md (this file)
```

---

## Getting Started

### Prerequisites

- **Node.js** 18+ (works on 22.x)
- **Conda** (or Python 3.11 + pip)
- (Optional) A **population GeoTIFF** covering your area, e.g., WorldPop/GHSL.

### Backend Setup (FastAPI)

```bash
conda env create -f backend/environment.yml
conda activate geoai-backend

# If you didn't use environment.yml:
# conda install -c conda-forge fastapi uvicorn scikit-learn pandas numpy joblib requests python-dotenv rasterio shapely pyproj

# Configure environment
copy backend\.env.example backend\.env
# Edit backend\.env → set POP_TIF_PATH to your GeoTIFF (if available)
# e.g., POP_TIF_PATH=D:\...\data\population_density.tif

# (Optional) Build dataset & train model
python backend/app/build_dataset.py
python backend/app/train.py

# Run API
uvicorn app.main:app --app-dir backend --reload --port 8000
# Swagger UI: http://127.0.0.1:8000/docs
```

### Frontend Setup (Next.js)

```bash
cd geoai-ui
npm install

# Configure environment
copy .env.local.example .env.local
# Option A (proxy): BACKEND_BASE=http://localhost:8000  (preferred)
# Option B (direct): NEXT_PUBLIC_API_BASE=http://localhost:8000

npm run dev
# open http://localhost:3000
```

---

## Environment Variables

**Backend (`backend/.env`)**

- `POP_TIF_PATH` — absolute path to population GeoTIFF.
- `POP_MAX_DENSITY` — optional scaling for density→score; default 5000.

**Frontend (`geoai-ui/.env.local`)**

- `BACKEND_BASE` — if using Next.js API routes `/api/analyze` & `/api/predict` as a proxy.
- `NEXT_PUBLIC_API_BASE` — if calling the backend directly from the browser (requires CORS).

> In development, prefer the **proxy** (set `BACKEND_BASE`) so you don’t fight CORS.

---

## APIs

### `/analyze`

**Method:** `POST`  
**Body:**

```json
{
  "project_type": "cafe",
  "city": "Vellore",
  "address": "Near VIT Gate",
  "lat": 12.971,
  "lon": 79.163,
  "radius_m": 600,
  "budget_lakh": 12,
  "seating_capacity": 40,
  "open_hours": "08:00-22:00",
  "use_population_density": true,
  "consider_competition": true,
  "notes": ""
}
```

**Response (shape):**

```json
{
  "summary": "...",
  "pros": ["..."],
  "cons": ["..."],
  "scores": { "demand": 72, "risk": 25, "competition": 64 },
  "debug": { "poi_count": 7, "mean_density": 3400.2, "tif_used": true },
  "pois": [{ "lat": 12.97, "lon": 79.16, "name": "Cafe X", "type": "node" }]
}
```

- **Demand**: mean raster density → 0–100 score.
- **Competition**: POI density via Overpass (cached, best-effort).
- **Risk**: heuristic from budget/seating/hours plus demand & competition.
- **Pros/Cons**: tailored messages by thresholds & project type.

### `/predict`

**Method:** `POST`  
**Body:**

```json
{
  "project_type": "cafe",
  "city": "Vellore",
  "budget_lakh": 12,
  "seating_capacity": 40,
  "radius_m": 600,
  "demand_score": 72
}
```

**Response:**

```json
{ "prediction": "Promising", "confidence": 0.89 }
```

---

## Results Page — In Depth

### Business Feasibility Score (0–100%)

A composite metric to summarize viability. Current formula (client-side):

```
BFS = 0.50 * Demand + 0.30 * (100 - Risk) + 0.20 * (100 - Competition)
```

- **Feasible** if **BFS ≥ 65**, else **Not Feasible**.
- Intuition: demand drives 50%, operational safety (low risk) 30%, open space (low competition) 20%.

### Scores: Demand / Risk / Competition

- **Demand (↑ better)** — Higher means more potential customers in the catchment. Driven by the population raster mean.
- **Risk (↓ better)** — Higher risk implies capital/operational/seasonality uncertainty. Computed from budget fit, capacity fit, long hours, and demand/competition context.
- **Competition (↓ better)** — Higher means a saturated market. Derived from **POI density** around the site (when enabled).

> These three scores feed BFS and all downstream visuals. When you change the input location or radius, they update.

### Competition Map

- Shows the **site marker** and **radius**.
- When POIs are enabled in `/analyze`, draw **pins** for nearby businesses of the selected **project type** (e.g., cafes). Density is summarized in the **Competition** score.
- Interpretation: clusters near the site suggest high competition; isolated pins suggest room to enter.

### Top Recommended Businesses

- Ranks 3 business categories with a “success probability” based on the current **Demand**, **Safety** (= 100−Risk), and **Open Space** (= 100−Competition).
- The currently selected category receives a small boost so the list reflects user intent.
- Replace this with a category-specific model as you collect real outcomes.

### Demand–Supply Gap

- Bar chart comparing **Demand** vs **Supply** for segments like `Food`, `Fitness`, `Services`.
- Until you wire real supply data, **supply is an approximation** derived from the **Competition** score (`supplyFactor = 0.3 .. 1.0`). Where competition is high, supply approaches demand; where competition is low, supply lags demand (larger “gap”).

### Trend Forecast (12 months)

- A **synthetic projection** starting from current demand with small drift and two “drags”:
  - **Risk drag:** higher risk → slower growth.
  - **Competition drag:** higher competition → slower growth.
- Replace with a real time-series model once you have historical data.

### Demographic Profile

- Summary items like **Student density**, **Age bands**, **Median income**.
- Currently **placeholder values**; replace with Census/OGD tables joined by ward or nearest polygon to your lat/lon.

### Spending Behavior

- Items like **Avg. ticket size** and **Monthly spend / person** for the catchment.
- Currently **placeholder values**; replace with real surveys or market data.

### Risk Factors

- Plain-language risks derived from thresholds
  - e.g., `risk ≥ 70` → “High operational risk”, `competition ≥ 70` → “Dense competition”.
- Extend this with domain-specific issues (permits, zoning, seasonal closures).

---

## Data Sources & Extending with Real Data

- **Population density:** Use an open raster (WorldPop/GHSL). Put it in `data/population_density.tif` and set `POP_TIF_PATH` in backend `.env`.
- **POIs (competition):** Overpass API (OSM) with caching. You can switch to Foursquare/Google Places if you have keys and budget.
- **Demographics & Spending:** Census of India / Open Government Data (CSV), private datasets, or your own surveys.
- **Historical trends:** Any monthly demand proxy you can compute (footfall sensors, search interest, card transactions, etc.).

---

## Training Pipeline

1. **Build dataset**:
   - If `data/points.csv` exists with columns like `lat, lon, project_type, city, budget_lakh, seating_capacity, label`, we compute features (demand from raster, competition from POIs) and use your **real labels**.
   - Else we generate a small grid and **weak labels** (median split) to make a demo dataset.
2. **Train** (Logistic Regression):
   - OneHot encodes categoricals, scales/uses numeric features.
   - Saves `backend/cache/model.joblib`.
3. **Predict**:
   - `/predict` loads the artifact and returns **label + confidence**.

> As you accumulate real outcomes, rebuild `training.csv` and retrain. Consider Gradient Boosting/LightGBM for non-linear interactions.

---

## Troubleshooting

- **Failed to fetch** on Results → “Get Prediction”  
  Use Next.js **proxy** (`/api/predict`) or enable backend **CORS** for `http://localhost:3000`.
- **ModuleNotFoundError: requests / dotenv**  
  Install in your backend conda env: `conda install -c conda-forge requests python-dotenv`.
- **Leaflet map not showing**  
  Import CSS in `src/app/layout.tsx`: `import "leaflet/dist/leaflet.css"` and ensure the map container has a height (e.g., 320px). Use dynamic import `{ ssr: false }` for MapPreview.
- **Raster demand always “n/a”**  
  Check `POP_TIF_PATH` exists and covers your location; verify file permissions and CRS reading.
- **Overpass errors / no POIs**  
  Temporary rate limits happen; caching avoids repeated calls. Try again or expand radius. Confirm your project type maps to correct OSM tags.
- **404 at /**  
  That’s normal for API root if you didn’t implement a home on the backend; use `/docs` for Swagger.

---

## Roadmap

- Add **/pois** response to the frontend map to plot competitor pins.
- Replace placeholder **Demographics/Spending/Trend** with real sources.
- Support **polygons** (catchments not strictly circular).
- Persist **analyses** and **POIs** to **PostGIS** (production).
- Train per-category models; A/B different BFS weightings.

---

## License

This project is for educational/hackathon use. Replace this with your preferred license (MIT/Apache 2.0).

---

### Acknowledgements

- OpenStreetMap & Overpass contributors (POIs).
- WorldPop / GHSL (population rasters).
- scikit-learn, FastAPI, Next.js communities.
