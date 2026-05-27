# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

CA Firm Compliance Platform — a local-first web app for Indian tax compliance (TDS, GST, ITR, Litigation, Accounting). All AI runs via Ollama on-premises; no data leaves the machine.

## Running the Stack

### Infrastructure (required first)

Using **Colima** (macOS, no Docker Desktop needed):
```bash
colima start --cpu 4 --memory 16 --disk 60   # 8 GB RAM: --memory 8
docker compose up -d          # PostgreSQL :5432, Ollama :11434, pgAdmin :5050
bash ollama-models.sh         # one-time model pull (~5 GB)
```
Use `docker compose` (plugin syntax), not `docker-compose` (legacy). Between reboots run `colima start` before `docker compose up -d`.

### Backend
```bash
cd backend
python3 -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn backend.main:app --reload --port 8000
```
API docs at http://localhost:8000/docs. Run `uvicorn` from the repo root so `backend.*` import paths resolve correctly.

### Frontend
```bash
cd frontend
npm install
npm run dev                   # http://localhost:5173
```
Vite proxies all `/api/*` requests to `http://localhost:8000`, so the frontend never calls the backend directly.

### Seed demo data
```bash
cd backend && python seed.py  # creates 5 clients with TDS/GST/ITR/depreciation records
```

### Changing the AI model
Set `OLLAMA_MODEL` in `backend/.env` (loaded by `pydantic-settings`). Default is `llama3.1:8b`; `llama3.2:3b` works on 8 GB RAM.
```bash
docker exec ca-firm-ollama-1 ollama pull <model-name>
```

## Architecture

### Backend (`backend/`)

**Entry point**: `main.py` — registers all routers, initialises DB via `init_db()` on startup, configures CORS.

**Configuration**: `config.py` — `Settings` (pydantic-settings) reads from `backend/.env`. All defaults are hardcoded for development. Key settings: `DATABASE_URL`, `OLLAMA_MODEL`, `OLLAMA_TIMEOUT`, `FILE_STORAGE_PATH`.

**Database**: `database.py` — SQLAlchemy async engine (`asyncpg` driver). `get_db()` is a dependency-injected `AsyncSession` that auto-commits on success and rolls back on exception. Schema is created via `Base.metadata.create_all` on startup — there are no Alembic migrations; schema changes require dropping and recreating tables in dev (`docker compose down -v && docker compose up -d`).

**Layer structure**:
```
routers/   → HTTP layer (FastAPI route handlers, Depends(get_db))
services/  → business logic (ollama, excel parsing, tax computation, depreciation, GST)
models/    → SQLAlchemy ORM entities
schemas/   → Pydantic request/response models
core/      → validators.py (PAN/GSTIN regex, TDS section + deductee_name validation)
           → constants.py (TDS sections, GST rates, FY 2024-25 tax slabs, surcharge brackets)
```

**AI integration** (`services/ollama_service.py`): All LLM calls go through `_call_ollama()`. Returns `None` when Ollama is offline — callers must handle `None` gracefully (the app degrades without AI features). LLM responses that return JSON are stripped of markdown fences via regex then parsed; malformed JSON falls back to empty dict/list.

**Tax computation** (`services/itr_service.py`): Implements FY 2024-25 slabs, regime-specific rebate 87A, full surcharge brackets, cess. Uses plain `float` arithmetic (not `Decimal`). Dashboard builds client summaries with three bulk queries (not per-client queries).

**File uploads**: Excel/CSV parsed by `services/excel_parser.py` using openpyxl/pandas. Files stored at `./uploads/` (configurable via `FILE_STORAGE_PATH`).

### Frontend (`frontend/src/`)

**Routing**: `App.tsx` — 8 routes, all using React Router v7.

**API client**: `lib/api.ts` — single Axios instance with `baseURL: '/api'` and 30-second timeout. All API calls are named exports from this file. Import API functions statically at the top of each page — do not use dynamic `import()` inside event handlers.

**Pages** map 1:1 to compliance modules: `tds/TDSForm.tsx` (upload → column map → validate → JSON), `gst/GSTR2B.tsx`, `itr/ITRWizard.tsx` (multi-step), `accounting/Depreciation.tsx`, `litigation/CaseList.tsx`.

**UI**: Radix UI headless components + inline styles. No global state management — each page manages its own state with `useState`/`useEffect`. Each async operation has its own loading flag and error state (not a single shared `loading` boolean).

## Key Domain Rules

- **PAN format**: `^[A-Z]{5}[0-9]{4}[A-Z]{1}$` — validated in `core/validators.py`
- **GSTIN format**: `^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$`
- **TDS sections**: Valid 26Q/24Q sections enumerated in `core/constants.py`; `TDS_SECTIONS` dict holds rates. `deductee_name` is required — `validate_tds_deductee` checks it.
- **GST period format**: `Mon-YYYY` e.g. `"Oct-2024"` — enforced by `_validate_period()` in `routers/gst.py` (returns 422 on bad format)
- **ITR uniqueness**: One ITR per `(client_id, financial_year)` — `POST /itr/save` returns 409 if already exists
- **ITR AI review**: PAN, name, and address are stripped before sending to Ollama (`routers/itr.py`)
- **Litigation draft versioning**: `draft_version` is only incremented by `POST /cases/{id}/draft` (draft all). Single-section re-drafts (`POST /cases/{id}/draft/{section}`) do not bump the version.
- **GST cross-check**: `POST /itr/{id}/gst-crosscheck` sums actual `GSTInvoice` sale records across all 12 periods of the ITR's FY — it does not rely on user-entered turnover fields.

## FY 2024-25 Tax Law (implemented in `core/constants.py` + `services/itr_service.py`)

**New Regime slabs**: 0%/5%/10%/15%/20%/30% (₹0/3L/7L/10L/12L/15L thresholds). Rebate 87A: ₹25,000 for income ≤ ₹7L. Surcharge capped at 25% (no 37% bracket under new regime).

**Old Regime slabs**: 0%/5%/20%/30% (₹0/2.5L/5L/10L thresholds). Rebate 87A: ₹12,500 for income ≤ ₹5L. Surcharge: 10%/15%/25%/37% at ₹50L/1Cr/2Cr/5Cr thresholds.

**Capital Gains (Budget 2024, effective 23 Jul 2024)**: Equity STCG (Sec 111A) = **20%** (raised from 15%). Equity LTCG (Sec 112A) = 12.5%, exempt up to ₹1.25L.

## Known Constraints

- **No authentication**: All endpoints are publicly accessible — intentional for local-only deployment.
- **No database migrations**: Schema changes require `docker compose down -v && docker compose up -d` to reset volumes in dev.
- **No pagination**: List endpoints (`/clients`, `/litigation/cases`) load all rows.
- **Ollama timeout asymmetry**: Backend timeout is 120s; frontend Axios timeout is 30s. Long AI calls appear to fail on the frontend while still running on the backend.
- **Capital gains taxed at slab rates in ITRWizard**: LTCG/STCG amounts are currently added to total income and taxed at slab rates. Proper special-rate treatment (flat 20%/12.5%) is not yet implemented in the wizard flow.
