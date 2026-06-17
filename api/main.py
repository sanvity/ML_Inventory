"""
ML Playground — FastAPI Backend
Runs on port 7860 (same as the previous Flask backend — no frontend changes needed).
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.db import create_tables
from api.routers import column_stats, history, predict, train, upload


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Create DB tables on startup."""
    create_tables()
    yield


app = FastAPI(
    title="ML Playground API",
    description="Backend for the ML Playground no-code machine learning application.",
    version="2.0.0",
    lifespan=lifespan,
)

# ── CORS (allow the Vite dev server on port 3000) ────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ──────────────────────────────────────────────────────────────────
app.include_router(upload.router,       prefix="/api", tags=["Upload"])
app.include_router(train.router,        prefix="/api", tags=["Training"])
app.include_router(predict.router,      prefix="/api", tags=["Prediction"])
app.include_router(history.router,      prefix="/api", tags=["History"])
app.include_router(column_stats.router, prefix="/api", tags=["Stats"])


@app.get("/")
async def root():
    return {
        "app":     "ML Playground",
        "version": "2.0.0",
        "docs":    "/docs",
    }


@app.get("/health")
async def health():
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("api.main:app", host="0.0.0.0", port=7860, reload=True)
