# LogHunt AI — Architecture
### Hybrid LoRA-Based Cybersecurity Analytics Assistant
Version: 3.0 (Final Submission Rebuild)

---

## 1. What This System Actually Is

LogHunt AI ingests security logs, classifies and detects threats in them, lets an analyst
ask questions about the logs in plain English, and explains what it found — all through
one connected pipeline instead of separate disconnected tools.

It is **hybrid** in a specific, literal sense — three different kinds of "intelligence"
work together, each doing the job it's actually good at:

| Layer | What it does | Why this layer exists |
|---|---|---|
| **Deterministic rules** | Catches known, well-defined attack patterns (e.g. 5 failed logins from one IP in 5 minutes) | Fast, 100% explainable, zero cost, no training needed |
| **LoRA-fine-tuned classifier** | Classifies ambiguous/unlabeled log lines into threat categories based on learned patterns | This is the actual research contribution — a small model *adapted* to cybersecurity log data, not a generic tool |
| **Gemini (general LLM)** | Converts natural language questions into SQL, explains alerts in plain English, suggests remediation | Language-heavy tasks that don't need domain fine-tuning — a general LLM is already good at these |

No single layer does everything, and nothing is faked — if a layer hasn't produced a
result, the system shows an empty state, not a made-up one.

---

## 2. How This Maps to the Problem Statement

Your Phase 1 report identified four specific gaps in existing systems. Here's exactly
where each one is addressed:

| Gap identified in problem statement | How this architecture closes it |
|---|---|
| Manual/rule-only analysis misses unknown attack patterns | LoRA classifier learns patterns from data, not just fixed rules |
| Systems don't understand context in log data | LoRA-tuned model + Gemini explanation layer add contextual understanding rules alone can't |
| Analysts must hand-write SQL to investigate | Gemini NL2SQL module — plain English in, safe SQL out |
| No system integrates AI detection + insight + querying together | This pipeline is the integration: parser → DB → detection (rules + LoRA) → dashboard → NL query (Gemini) → explanation |

---

## 3. Technology Stack — What and Why

### Frontend
- **React + Vite + Tailwind CSS** — already built, reused as-is. Fast dev cycle, component-based, matches what's already working.
- **Recharts** — real charts driven by real DB data (replacing the current static numbers).
- **Axios** — API calls to the backend.

### Backend
- **FastAPI** — async, fast, plays well with SQLAlchemy and Pydantic, easy to structure cleanly (routes → services → repositories).
- **SQLAlchemy** — ORM layer, keeps DB logic out of route handlers.
- **Pydantic** — request/response validation, catches bad data before it reaches the DB.
- **Python** — 3.14 on this machine. FastAPI/SQLAlchemy/Pydantic are fine on it; if the
  Postgres driver or ML packages (torch/transformers/peft) error on install, fall back
  to a Python 3.12 virtual environment for this project rather than fighting the newest
  release.

### Database
- **PostgreSQL** — real relational storage for logs, alerts, and classification results. Replaces the current "no database, everything client-side" setup. Chosen over SQLite because it's what the architecture doc specifies and it's realistic for a "production-inspired" system, not just a toy.

### AI / ML
- **PEFT (Parameter-Efficient Fine-Tuning) + a small base model (e.g. DistilBERT)** — this is where LoRA actually lives. A lightweight encoder is fine-tuned with LoRA adapters on a labeled subset of **CICIDS2017** to classify log lines into threat categories (Brute Force, SQL Injection, Privilege Escalation, Normal, etc.).
- **Google Gemini API** — handles natural language → SQL conversion, incident explanation, and remediation suggestions. Not fine-tuned — used as a general-purpose reasoning layer on top of the structured data the rest of the system produces.

### Deployment — Local, Not Cloud
Running entirely on `localhost` for now — no cloud hosting needed to demo a complete,
real system:
- **PostgreSQL** — runs in a single Docker container (`docker run ... postgres:16`),
  exposed on `localhost:5432`. Docker is used only as a convenient way to run Postgres
  without a manual install — the app talks to it exactly as it would a native install.
- **FastAPI backend** — runs directly via `uvicorn` on `localhost:8000` (not
  containerized, for fast reload during development).
- **React frontend** — runs directly via `npm run dev` on `localhost:5173`.
- **Gemini API** — the one component that isn't local; API calls go out to Google over
  the internet regardless of where the rest of the app runs.

Full containerization (frontend + backend + DB all in Docker Compose) and actual cloud
deployment (Vercel/Railway/Render) stay as future enhancements — not needed to have a
complete, real, demoable system.

---

## 4. System Components in Detail

### 4.1 Log Parser
Takes raw uploaded log files (Apache, JSON, Syslog to start) and converts each line into
one normalized record:

```
timestamp, source_ip, destination_ip, hostname, username,
event_type, severity, message, raw_log
```

Fields that can't be extracted stay `NULL` — never guessed or invented. This is the
foundation everything else builds on; if parsing is wrong, everything downstream is wrong.

### 4.2 Persistence Layer
Every parsed log line is written to PostgreSQL. This is what makes the dashboard, the
detection engine, and the NL2SQL queries all operate on *real, queryable, persistent*
data instead of whatever happens to be sitting in the browser's memory.

### 4.3 Detection Engine (Rule-Based)
Runs deterministic checks against newly stored logs:
- **Brute Force** — N failed logins from the same IP within a time window
- **Credential Stuffing** — successful login immediately following multiple failures
- **Privilege Escalation** — unexpected privilege-level change for a user

Each match writes a real alert row to the database — severity, timestamp, source log,
explanation of *why* it matched. Nothing here is a black box; every alert can be traced
back to the exact rule and log lines that triggered it.

### 4.4 LoRA Threat Classifier
The domain-specific ML piece. A small base model is fine-tuned with LoRA adapters on a
labeled subset of CICIDS2017 to classify individual log lines by threat type, including
patterns too fuzzy for a fixed rule to catch. Runs as a separate classification step
alongside the rule engine — a log line can be flagged by a rule, by the classifier, or
both, and the dashboard shows which.

This is the piece that makes the "LoRA-Based" half of the project title real: base model
weights stay frozen, only small low-rank adapter matrices are trained, exactly as
described in your Phase 1 methodology chapter.

### 4.5 Gemini AI Service
Three jobs, none of them threat detection:
- **NL2SQL** — turns a question like *"show failed logins from the last 48 hours"* into
  a real, parameterized, read-only SQL query, executed safely against Postgres.
- **Incident explanation** — takes a detected alert and writes a plain-English summary
  of what happened and why it matters.
- **Recommendations** — suggests concrete mitigation steps for a given alert type.

### 4.6 Dashboard (Frontend)
Every number, chart, and table pulls from real API responses backed by Postgres —
no hardcoded stats. Sidebar pages get real content instead of being dead buttons:
- **Dashboard** — live stats, recent alerts, upload panel
- **LLM Analysis** — classifier output, confidence scores, model status
- **SQL Query Lab** — the natural language query box, query history
- **Analytics** — trend charts, top threat sources, severity breakdown over time
- **Settings** — basic configuration

---

## 5. End-to-End Data Flow

```
Upload log file
      ↓
Parser detects format → extracts fields → normalizes
      ↓
Stored in PostgreSQL
      ↓
Detection Engine runs (rules) ──┐
LoRA Classifier runs             ├──→ Alerts written to DB
      ↓                          ┘
Dashboard updates with real data
      ↓
Analyst asks a question in plain English
      ↓
Gemini converts it to SQL → executed read-only against Postgres
      ↓
Results returned + Gemini explains findings / suggests next steps
```

---

## 6. What the Finished Product Looks and Feels Like

An analyst opens LogHunt AI, uploads a log file (Apache access log, JSON app log, or
syslog dump). Within seconds, the dashboard shows how many log lines came in, how many
were flagged, and by what — a rule, the LoRA classifier, or both. Clicking an alert shows
a plain-English explanation of what happened and a suggested next step, written by
Gemini but grounded in the real detected data, not invented.

The analyst can then type something like *"show me all brute force attempts today"* into
the query box. That gets turned into real SQL, run against the real database, and the
actual matching rows come back — not a canned response. The Analytics page shows real
trend charts built from whatever has actually been uploaded and detected so far. If
nothing's been uploaded yet, pages show honest empty states instead of placeholder
numbers.

---

## 7. Explicitly Out of Scope (For Now)

Consistent with your own report's conclusion, which frames these as future work:

- Authentication / RBAC
- MITRE ATT&CK mapping, Sigma/YARA rule support
- Additional log formats (Nginx, CloudTrail, Suricata, Windows EVTX, Zeek)
- Docker/Kubernetes deployment
- Multi-user workspaces

None of these are needed to make the core claims in your abstract true — they're
genuine extensions, not things being quietly skipped to hide gaps.
