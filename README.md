# Smart Road Infrastructure Management System

Monorepo scaffold for Smart Road Infrastructure Management System.

Stack:
- Frontend: Next.js + TypeScript + Tailwind CSS + Framer Motion
- Backend: FastAPI (Python) with SQLAlchemy
- AI Service: YOLOv8-ready Python inference service (stub)
- Satellite Service: Google Earth Engine integration (stub)
- DB: PostgreSQL (docker-compose), defaults to SQLite for local dev
- Mapping: Mapbox/Google Maps (placeholder env keys)

Quick dev (uses docker-compose):

1. Copy `.env.example` to `.env` and fill keys.
2. From `infra/` run:

```bash
docker-compose up --build
```

Frontend dev: `cd frontend && npm install && npm run dev`
Backend dev: `cd backend && pip install -r requirements.txt && alembic upgrade head && uvicorn app.main:app --reload`
AI service: `cd services/ai && pip install -r requirements.txt && uvicorn app:app --reload`

## Supabase

This project is ready to use the supplied Supabase project. Copy `.env.example` to `.env` and set:

```dotenv
SUPABASE_URL=https://ajeldseedlhflyedyham.supabase.co
SUPABASE_REST_URL=https://ajeldseedlhflyedyham.supabase.co/rest/v1
SUPABASE_DB_URL=postgresql://...your Supabase Postgres connection string...
```

Find `SUPABASE_DB_URL` in Supabase Dashboard → **Connect** → **ORMS** → **SQLAlchemy**. It must include your database password and `sslmode=require`; it is intentionally not stored in this repository. When set, `SUPABASE_DB_URL` overrides the local `DATABASE_URL`. Run `cd backend && alembic upgrade head` once to create the schema in Supabase.

If the browser will call Supabase directly, also set `NEXT_PUBLIC_SUPABASE_ANON_KEY` from Dashboard → **Settings** → **API**. Never expose the service-role key in the frontend.

Notes:
- This scaffold contains minimal runnable stubs and TODOs for full features like YOLO model weights, Google Earth Engine credentials, Mapbox keys, Firebase, and payment integrations.

Suggested AI prompt for image-based damage detection:

```text
Build a world-class AI-Powered Smart Road Infrastructure Management System.
Analyze this road image and GPS location for automatic detection, monitoring, and management of road damage.
Detect potholes, cracks, edge failures, broken roads, damaged bridges, uneven surfaces, missing lane markings, waterlogging, and other infrastructure problems.
Automatically capture GPS coordinates, date, time, road name, district, city, state, weather conditions, and device information.
Classify every damage event as Minor, Moderate, Major, or Critical with confidence scores.
Estimate damaged road length, width, depth (if available), damaged area, total damaged percentage, repair priority, and expected remaining road life.
Return a structured report with Road ID, Road Name, GPS Location, District, Damage Type, Damage Severity, Damaged Length, Damaged Width, Total Area, Materials Required, Estimated Cost, Contractor Assignment, Expected Start and Completion Dates, Budget Approval Status, and Engineer Verification Status.
```
- License: MIT
