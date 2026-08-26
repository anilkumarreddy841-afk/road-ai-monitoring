from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.api import auth, reports, monitoring, contractor_workflow
from app.db import Base, engine
from app.tasks import run_reminder_check
import os

UPLOAD_DIR = os.path.join(os.getcwd(), 'backend', 'uploads')
os.makedirs(UPLOAD_DIR, exist_ok=True)

app = FastAPI(title="SmartRoads API")
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(reports.router, prefix="/api/reports", tags=["reports"])
app.include_router(monitoring.router, prefix="/api/monitoring", tags=["road monitoring"])
app.include_router(contractor_workflow.router, prefix="/api/workflow", tags=["contractor workflow"])


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.on_event("startup")
def on_startup():
    if os.getenv('SKIP_CREATE_TABLES', '0') != '1':
        Base.metadata.create_all(bind=engine)
    # Run an initial deadline check on startup
    try:
        from app.db import SessionLocal
        db = SessionLocal()
        run_reminder_check(db)
        db.close()
    except Exception:
        pass  # Non-fatal: reminders will be checked on next cron call
