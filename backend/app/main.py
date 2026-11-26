from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from . import admin
from .database import Base, SessionLocal, engine
from .routers import applications
from .seed import seed_if_empty

# job_gate/admin_panel — the admin frontend, kept outside the backend package.
ADMIN_PANEL_DIR = Path(__file__).resolve().parents[2] / "admin_panel"


@asynccontextmanager
async def lifespan(_: FastAPI):
    Base.metadata.create_all(engine)
    with SessionLocal() as db:
        seed_if_empty(db)
    yield


app = FastAPI(title="Job Gate — My Applications API", lifespan=lifespan)

# Flutter web runs on a random localhost port, so allow all origins (prototype only).
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(applications.router)  # /api/applications  (citizen, read-only)
app.include_router(admin.router)         # /api/admin/*        (admin, token required)


@app.get("/health", tags=["system"])
def health():
    return {"status": "ok"}


# Serve the admin panel at /admin (mounted last so it never shadows API routes).
if ADMIN_PANEL_DIR.is_dir():
    app.mount("/admin", StaticFiles(directory=ADMIN_PANEL_DIR, html=True), name="admin-panel")
