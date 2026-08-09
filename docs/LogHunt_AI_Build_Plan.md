# LogHunt AI — Build Plan
Every phase has tasks → subtasks → a verification step. Don't move to the next task
until its verification passes. This file is the checklist; ask for the Antigravity
prompt for whichever task you're on.

---

## Phase 0 — Environment Setup

### 0.1 Docker + Postgres
- [ ] Start Docker Desktop, confirm `docker ps` runs clean (no errors)
- [ ] Run the Postgres container (`loghunt-postgres`, port 5432)
- [ ] **Verify:** `docker exec -it loghunt-postgres psql -U loghunt -d loghunt_db` opens a working SQL shell

### 0.2 Python environment
- [ ] Create a virtual environment for the backend (`python -m venv venv`)
- [ ] Activate it, install: `fastapi uvicorn[standard] sqlalchemy psycopg2-binary pydantic python-dotenv google-genai`
- [ ] **Verify:** `pip list` shows all packages installed with no errors. If `psycopg2-binary` fails to build, switch this venv to Python 3.12 and retry.

### 0.3 Gemini API key
- [ ] Get a free API key from Google AI Studio
- [ ] Store it in a `.env` file in the backend (never commit this file)
- [ ] **Verify:** a one-line test script successfully calls Gemini and gets a response back

### 0.4 Frontend check
- [ ] Confirm the existing React app still runs: `npm run dev`
- [ ] **Verify:** landing page and dashboard load in the browser exactly as before

---

## Phase 1 — Database Foundation

### 1.1 Schema design
- [ ] Define tables: `logs`, `alerts`, `projects` (per architecture doc's normalized schema)
- [ ] Define SQLAlchemy models matching these tables
- [ ] **Verify:** running the model creation script produces the tables in Postgres — check with `\dt` in the psql shell

### 1.2 FastAPI skeleton
- [ ] Set up `app/main.py`, `app/database.py` (DB session handling), basic project structure (`api/`, `services/`, `repositories/`, `models/`, `schemas/`)
- [ ] Add a `/health` endpoint
- [ ] **Verify:** `uvicorn app.main:app --reload` starts cleanly, `GET localhost:8000/health` returns 200

---

## Phase 2 — Log Parser

### 2.1 Apache log parser
- [ ] Write parser for standard Apache access log format → normalized schema
- [ ] **Verify:** run against a real sample Apache log file, manually check 5-10 parsed rows for correctness (right IPs, timestamps, status codes)

### 2.2 JSON log parser
- [ ] Write parser for structured JSON log lines → normalized schema
- [ ] **Verify:** same manual spot-check against a sample JSON log file

### 2.3 Syslog parser
- [ ] Write parser for standard syslog format → normalized schema
- [ ] **Verify:** same manual spot-check against a sample syslog file

### 2.4 Format auto-detection
- [ ] Add logic to detect which parser to use based on file content/extension
- [ ] **Verify:** feed all three sample file types through the same entry point, confirm each routes to the correct parser

---

## Phase 3 — Persistence (Upload Pipeline)

### 3.1 `/upload` endpoint
- [ ] Accept a file upload, run it through the parser, write normalized rows to `logs` table
- [ ] **Verify:** upload a sample file via the API (or Swagger docs at `/docs`), then query Postgres directly (`SELECT * FROM logs LIMIT 10;`) and confirm row count and content match the source file

### 3.2 Error handling
- [ ] Handle malformed lines gracefully — skip and log, don't crash, don't fabricate fields
- [ ] **Verify:** upload a file with a few broken lines mixed in, confirm valid lines are stored and broken ones are skipped/reported, not guessed at

---

## Phase 4 — Detection Engine (Rule-Based)

### 4.1 Brute Force rule
- [ ] Implement: N failed logins from same IP within a time window → alert
- [ ] **Verify:** craft a test log file that should trigger this rule, confirm an alert is created with correct details. Craft one that should NOT trigger it, confirm no alert appears.

### 4.2 Credential Stuffing rule
- [ ] Implement: successful login immediately after multiple failures → alert
- [ ] **Verify:** same positive/negative test pattern as above

### 4.3 Privilege Escalation rule
- [ ] Implement: unexpected privilege-level change for a user → alert
- [ ] **Verify:** same positive/negative test pattern

### 4.4 Alerts persistence
- [ ] Store alerts with severity, timestamp, triggering rule, related log reference
- [ ] **Verify:** query `alerts` table directly, confirm every alert traces back to real log rows

---

## Phase 5 — Dashboard Wiring

### 5.1 Backend read endpoints
- [ ] `/dashboard` (summary stats), `/logs` (paginated), `/alerts` (list/filter)
- [ ] **Verify:** call each endpoint directly (Swagger docs or curl), confirm numbers match what's actually in Postgres

### 5.2 Frontend integration
- [ ] Replace every hardcoded number/stat in `Dashboard.jsx` with real API calls
- [ ] **Verify:** upload data, refresh the dashboard, confirm displayed numbers change accordingly. Clear the DB, confirm dashboard shows honest empty states — not zeros pretending to be real, but a clear "no data yet."

---

## Phase 6 — LoRA Threat Classifier

### 6.1 Dataset prep
- [ ] Get a labeled subset of CICIDS2017, map its labels to your threat categories
- [ ] Split into train/test sets
- [ ] **Verify:** print class distribution, confirm no category is empty or wildly imbalanced beyond reason

### 6.2 Training (on Colab)
- [ ] Load a small base model (e.g. DistilBERT), configure LoRA via `peft` (rank, alpha, target modules)
- [ ] Fine-tune on the training set
- [ ] **Verify:** training loss decreases across epochs (sanity check it's actually learning, not stuck)

### 6.3 Evaluation
- [ ] Run the fine-tuned model against the held-out test set
- [ ] Record precision/recall/F1 per class
- [ ] **Verify:** results are real numbers from real predictions — save this table, it goes directly into your research paper's results section

### 6.4 Export + integrate
- [ ] Save the LoRA adapter weights, download them into the backend project
- [ ] Write an inference service that loads the adapter and classifies a log line
- [ ] Add a `/classify` endpoint or wire it into the detection pipeline
- [ ] **Verify:** feed a handful of manually-written log lines through the classifier, sanity-check the predicted categories make sense

---

## Phase 7 — Gemini Integration

### 7.1 NL2SQL service
- [ ] Prompt Gemini to convert a natural language question into a safe, read-only SQL query against the known schema
- [ ] Add validation: reject anything that isn't a `SELECT`, parameterize where possible
- [ ] **Verify:** test 5-10 different natural language questions, confirm generated SQL is correct and actually runs. Try one deliberately tricky/adversarial input, confirm it's rejected or sanitized, not executed blindly.

### 7.2 Incident explanation service
- [ ] Given an alert, have Gemini generate a plain-English explanation grounded in the alert's real data
- [ ] **Verify:** check explanations against a few known alerts — do they accurately describe what's actually in the data, or do they hallucinate details not present?

### 7.3 Recommendation service
- [ ] Given an alert type, generate mitigation suggestions
- [ ] **Verify:** spot-check a few outputs for relevance and correctness

### 7.4 Frontend wiring
- [ ] Wire the Query Lab UI to `/query`, remove the old hardcoded `QUERY_MAP`
- [ ] Wire alert detail views to the explanation/recommendation endpoints
- [ ] **Verify:** full click-through in the browser — ask a real question, see real SQL and real results; click an alert, see a real explanation

---

## Phase 8 — Remaining Sidebar Pages

### 8.1 LLM Analysis page
- [ ] Show classifier status, recent classifications, confidence scores — from real data
- [ ] **Verify:** matches what's actually in the DB, no static numbers left

### 8.2 Analytics page
- [ ] Real trend charts (Recharts) driven by actual alert/log history
- [ ] **Verify:** charts update as new data is uploaded

### 8.3 Settings page
- [ ] Basic real configuration (e.g. detection thresholds, API key status display — not the key itself)
- [ ] **Verify:** changes actually persist/take effect, nothing is decorative

---

## Phase 9 — End-to-End Pass

- [ ] Full walkthrough: upload → parse → detect (rules + LoRA) → dashboard updates → ask a natural language question → get real SQL + results → click an alert → get real explanation
- [ ] Grep the whole codebase for leftover hardcoded values, fake badges/stats (e.g. old "LoRA Fine-Tuned r=16..." decorative UI), remove or make them reflect real state
- [ ] Confirm empty states behave honestly with a fresh/empty database
- [ ] **Verify:** run through the whole flow as if you were the reviewer seeing it for the first time — does every number and claim on screen trace back to something real?

---

## Phase 10 — Research Paper Support (ongoing, not a separate day)

- [ ] Document the LoRA methodology as you go: base model, dataset, hyperparameters, training curves, evaluation table (this is why Phase 6.3 numbers matter — write them down immediately, don't try to remember them later)
- [ ] Document the detection engine rules and their logic
- [ ] Document the overall architecture (the architecture file already covers this — reuse it)

---

## Explicitly Deferred (Future Work, Not This Submission)
- Docker Compose for the full stack / cloud deployment
- Authentication & RBAC
- Additional log formats (Nginx, CloudTrail, Suricata, Windows EVTX, Zeek)
- MITRE ATT&CK mapping, Sigma/YARA rules
- Multi-user workspaces
