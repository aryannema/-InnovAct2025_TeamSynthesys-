from fastapi import FastAPI

app = FastAPI(title="geoai", version="0.1.0")

@app.get("/")
def read_root():
    return {"status": "ok", "app": "geoai"}

@app.get("/health")
def health():
    return {"health": "up"}
