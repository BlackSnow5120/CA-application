# CA Firm Compliance Platform — Local AI Edition

All client data stays on-premises. AI runs via Ollama — no internet required for any AI feature.

## Prerequisites
- Docker & Docker Compose
- Python 3.11+
- Node.js 18+
- 16 GB RAM recommended (for llama3.1:8b), 8 GB minimum (llama3.2:3b)

---

## Setup (5 steps)

### 1. Start infrastructure
```bash
docker-compose up -d
```
PostgreSQL → `localhost:5432` · Ollama → `localhost:11434` · pgAdmin → `localhost:5050`

### 2. Pull AI models (one-time, ~5 GB)
```bash
bash ollama-models.sh
```
Models are cached in the `ollama_models` Docker volume — only downloads once.

### 3. Backend
```bash
cd backend
python -m venv venv

# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

pip install -r requirements.txt
cp .env.example .env    # review and adjust if needed

python seed.py          # creates 5 clients with full demo data
uvicorn backend.main:app --reload --port 8000
```
API docs: http://localhost:8000/docs

### 4. Frontend
```bash
cd frontend
npm install
npm run dev             # http://localhost:5173
```

### 5. Verify
- Dashboard: http://localhost:5173 — deadline tiles + client table
- pgAdmin: http://localhost:5050 (admin@cafirm.local / admin)
- API docs: http://localhost:8000/docs

---

## Modules

| Module | Path | AI Feature |
|---|---|---|
| Dashboard | `/` | — |
| Clients | `/clients` | — |
| TDS Returns | `/tds` | Column auto-mapping, Section suggestion |
| GST Reconciliation | `/gst` | — |
| ITR Wizard | `/itr` | Anomaly review (anonymised) |
| Depreciation | `/accounting/depreciation` | — |
| Litigation | `/litigation` | Statement of Facts, Grounds, Submissions |

---

## Data Privacy

| Data | Location |
|---|---|
| Client records | Local PostgreSQL Docker volume (`pgdata`) |
| File uploads | `./uploads/` on local disk |
| AI processing | Ollama at `localhost:11434` — **zero outbound traffic** |
| Backups | `docker cp ca-firm-postgres-1:/var/lib/postgresql/data ./backup` |

**ITR AI review**: PAN, client name, and address are stripped before the prompt is sent to Ollama.
**Litigation drafting**: Only provided case laws are cited — hallucination guard enabled at prompt level.

---

## Tax Verification

Run a quick sanity check:
- Taxable income ₹12,00,000 (new regime): slab tax ₹80,000 + cess ₹3,200 = **₹83,200** ✓
- Rebate 87A applies only below ₹7,00,000 (new regime)

---

## Changing the AI Model

Edit `OLLAMA_MODEL` in `.env`:
```env
OLLAMA_MODEL=llama3.1:8b    # default, best quality
# OLLAMA_MODEL=mistral:7b   # faster alternative
# OLLAMA_MODEL=qwen2.5:7b   # best for structured JSON tasks
# OLLAMA_MODEL=llama3.2:3b  # low-memory fallback (8 GB RAM)
```

Pull the model:
```bash
docker exec ca-firm-ollama-1 ollama pull <model-name>
```

---

## If Ollama is Offline

- All compliance features (TDS, GST, ITR computation, depreciation) work normally
- An amber banner appears: *"Local AI is offline"*
- No blocking errors — the system degrades gracefully

---

## Seeded Demo Data

| Client | Type | GST |
|---|---|---|
| Ramesh Traders | Firm | 27AABCR1234F1Z5 |
| Priya Software Pvt Ltd | Company | 27AABCP5678G1Z3 · Search & Seizure case |
| Dr. Anand Sharma | Individual | No GST · Sec. 148 reassessment case |
| Sunrise Exports LLP | LLP | 29AABCS9012H1Z1 |
| Kavitha Textiles | Firm | 33AABCK3456I1Z7 |

Each client has: 4 TDS quarters, 6 GST periods, 1 ITR, 2-3 depreciation assets.
