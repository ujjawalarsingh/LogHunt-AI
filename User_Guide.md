# LogHunt AI — User Guide

**Hybrid LoRA-Based Cybersecurity Analytics Assistant**
MVJ College of Engineering — Academic Year 2025–2026

This guide explains how to use LogHunt AI as an evaluator or analyst. It does not cover implementation details — see the Technical Documentation for that.

---

## 1. Introduction

LogHunt AI lets you upload server log files, automatically parses and normalizes them, runs them through a rule-based threat detector, and gives you several ways to investigate what was found — a dashboard, log/alert browsers, visual analytics, a natural-language query tool, AI-generated explanations and mitigation advice, and an experimental ML classifier you can try log lines against interactively.

It processes files you upload — it does not watch live servers in real time.

## 2. Quick Start / Demonstration Workflow

1. Start Docker Desktop.
2. From the project root, run `docker compose up -d` to start the PostgreSQL database.
3. Start the FastAPI backend: from `backend/`, activate the virtual environment and run `uvicorn app.main:app --reload`.
4. Start the React frontend: from `frontend/`, run `npm run dev`.
5. Open `http://localhost:5173` in a browser.
5. Upload `test_mixed.log`.
6. Verify Brute Force and SQL Injection alerts on the Dashboard and Alerts page.
7. Upload `brute_force_sample.log`.
8. Verify Brute Force and Credential Stuffing alerts (this file also triggers Credential Stuffing because it contains multiple failed logins followed by a successful login from the same source).
9. Upload `privilege_escalation_sample.log`.
10. Verify Privilege Escalation alerts.
11. Open an alert on the Alerts page and test **Explain** and **Recommend**.
12. Use **QueryLab** with a natural-language question.
13. Explore the **Analytics** and **LLM Analysis** pages.

(See the README for full first-time setup, including PostgreSQL creation and environment variables.)

## 3. Dashboard

The Dashboard is the landing page after the app loads. It shows:

- Total logs and total alerts stored.
- Alert counts broken down by type (Brute Force, Credential Stuffing, Privilege Escalation, SQL Injection) and by severity.
- Alert activity over time.
- The five most recent alerts.

If the database is empty, the Dashboard honestly shows zeros — it does not display placeholder or sample numbers.

## 4. Uploading Logs

Use the upload control (Dashboard or Logs page) to select a `.log`/`.txt` file. LogHunt will:

1. Auto-detect the format.
2. Parse every line.
3. Store the normalized results.
4. Immediately run all four detection rules against the newly uploaded data and generate any alerts that apply.

You'll see a summary: detected format, total lines, how many parsed successfully, how many fell back to "raw only" (unrecognized), and how many rows were inserted.

**Supported formats:** Apache access logs, Syslog (including the `/var/log/auth.log`-style format with no priority header), and JSON (one object per line).

## 5. Mixed-Format Upload

You don't need to split a file by format before uploading. If a single file contains a mix of Apache, Syslog, and JSON lines — even with a few garbled or unrecognized lines mixed in — LogHunt figures out the best format for each line individually. Lines it can't confidently parse are preserved with their original raw text so nothing is silently dropped, but they won't show normalized fields like source IP or severity.

## 6. Understanding Parsed Logs

Open the **Logs** page to browse everything that's been ingested. Each row shows the normalized fields LogHunt was able to extract (timestamp, source IP, hostname, username, event type, severity, message) where available. Clicking a row opens a detail view that also shows the original raw log line exactly as uploaded — useful when a field wasn't extracted and you want to see why.

You can filter by project (each upload session that didn't specify an existing project gets its own auto-created project).

## 7. Understanding Alerts

The **Alerts** page lists everything the rule engine has flagged:

- **Brute Force** — many failed logins from the same source in a short window.
- **Credential Stuffing** — several failed logins from one source followed by a successful login from that same source.
- **Privilege Escalation** — sudo/root-related activity.
- **SQL Injection** — known SQL injection payload patterns found in a log line.

Every alert links back to the specific log line that triggered it. You can filter the list by type or severity.

## 8. Alert Severity

| Alert Type | Severity |
|---|---|
| Brute Force | High |
| Credential Stuffing | Critical |
| Privilege Escalation | Critical |
| SQL Injection | Critical |

## 9. Explain

Click **Explain** on any alert to have Gemini generate a plain-English description of what the alert means and why it matters, grounded strictly in the actual stored alert and log data — it won't invent details that aren't present.

## 10. Recommend

Click **Recommend** on any alert to get concrete, alert-specific mitigation steps from Gemini — not generic "improve your security posture" advice, but recommendations tailored to what the alert actually shows.

## 11. Analytics

The Analytics page presents the same underlying alert data as the Dashboard through richer visualizations — distribution by threat type and by severity.

## 12. QueryLab

QueryLab lets you ask questions about your data in plain English instead of writing SQL:

- "Show all critical alerts"
- "How many SQL injection alerts are there?"
- "Show all high severity alerts"

LogHunt converts your question into a SQL query (using Gemini), shows you the exact SQL it ran, and displays the results.

## 13. QueryLab Safe-Query Behavior

QueryLab is read-only. It refuses to act on any question that implies a destructive intent (such as delete, drop, or update), and it checks every SQL query it generates before execution. Only safe, read-only queries are executed. You cannot use QueryLab to modify or delete data, no matter how the question is phrased.

## 14. LLM Analysis

The **LLM Analysis** page is a separate, experimental feature: pick any stored log entry from the dropdown and run it through a machine learning classifier. It returns a predicted category — Brute Force, DoS-PortScan, Normal, or SQL Injection — with a confidence score.

This is **not** the same as the operational Alerts system. Alerts are generated automatically and reliably by the rule engine described in §7; this page is an interactive experiment you run manually. If the model isn't confident in a prediction, it will output "Uncertain" rather than presenting a guess.

**Important Distinction for SQL Injection:** The experimental classifier's SQL Injection predictions are currently unreliable and have an F1 score of 0.00. If you get a "SQL Injection" prediction here, the interface will display a warning. This ML limitation does **not** mean that operational SQL Injection detection is broken. Operational SQL Injection alerts are generated independently and reliably by the deterministic rule engine.

## 15. Settings

The Settings page lets you adjust the detection engine's thresholds:

- Brute force: how many failed attempts, and over what time window, count as an attack.
- Credential stuffing: how many prior failures, and over what window, must precede a success.

Settings also shows whether a Gemini API key is currently configured on the backend (needed for Explain, Recommend, and QueryLab to work).



## 17. Troubleshooting

- **Explain/Recommend/QueryLab return an error** — check that a valid `GEMINI_API_KEY` is set in the backend's `.env` file, and check the Settings page's Gemini-configured indicator.
- **Upload fails immediately with a format error** — the file's first several lines didn't match any of the three supported formats; check that the file is genuinely Apache/Syslog/JSON-formatted text.
- **A log row has no source IP / severity / username** — that field genuinely wasn't extractable from that specific line; LogHunt never fabricates values, so a blank field means the information wasn't present in a recognizable pattern in that line.

## 18. Known Limitations

- Batch upload only — no live/real-time log streaming.
- Uploading the exact same file twice into the same project will generate a second, duplicate set of alerts (there is no cross-upload deduplication).
- The experimental LoRA classifier's SQL Injection predictions are unreliable (see §14) — this does not affect the reliable, rule-based SQL Injection alerts you see under Alerts.
- Three supported log formats: Apache, Syslog, JSON.
- No login/authentication — anyone who can reach the app can see and query all data.
