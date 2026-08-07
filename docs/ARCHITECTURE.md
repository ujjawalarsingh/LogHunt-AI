# LogHunt AI Architecture

Version: 2.0
Status: In Development

---

# Overview

LogHunt AI is an AI-assisted cybersecurity log analysis platform designed to help security analysts ingest, analyze, search, and investigate logs from multiple sources.

Unlike traditional demo projects, LogHunt AI aims to provide a production-inspired architecture with real log parsing, persistent storage, deterministic threat detection, and AI-assisted investigation.

---

# Goals

The system should:

- Ingest logs from multiple sources
- Parse and normalize logs into a unified schema
- Store logs in PostgreSQL
- Detect security threats using rule-based analytics
- Allow natural language querying
- Generate SQL using an LLM
- Explain security incidents
- Recommend remediation steps
- Provide an interactive dashboard

---

# Technology Stack

## Frontend

- React
- Tailwind CSS
- React Router
- Axios
- Recharts

---

## Backend

- FastAPI
- SQLAlchemy
- Alembic
- Pydantic

---

## Database

- PostgreSQL

---

## AI

- Google Gemini API

Responsibilities:

- Natural language → SQL
- Incident explanation
- Log summarization
- Remediation suggestions

---

## Deployment

Frontend

- Vercel

Backend

- Railway / Render

Database

- PostgreSQL

---

# High-Level Architecture

                +-----------------------+
                |      React UI         |
                +----------+------------+
                           |
                           |
                     REST API
                           |
                           v
                +-----------------------+
                |      FastAPI          |
                +----------+------------+
                           |
        +------------------+------------------+
        |                  |                  |
        |                  |                  |
        v                  v                  v

Log Parser Detection Engine AI Service
| | |
+------------------+------------------+
|
v
PostgreSQL Database

---

# Project Structure

loghunt-ai/

frontend/

backend/

    app/

        api/

        services/

        parser/

        detection/

        ai/

        database/

        models/

        schemas/

        utils/

docs/

sample_logs/

---

# Data Flow

User uploads log file

↓

Parser detects log format

↓

Parser extracts fields

↓

Logs normalized

↓

Stored in PostgreSQL

↓

Detection engine executes

↓

Alerts generated

↓

Dashboard updated

↓

User asks questions

↓

Gemini generates SQL

↓

SQL executed safely

↓

Results displayed

↓

Gemini explains findings

---

# Log Parsing Pipeline

Supported formats

- Apache
- Nginx
- Linux Syslog
- JSON
- CSV

Future

- Windows Event Logs
- Zeek
- Suricata
- CloudTrail

Normalization Schema

timestamp

source_ip

destination_ip

hostname

username

event_type

severity

message

raw_log

---

# Detection Engine

Rule-based.

Examples

Brute Force

Condition:

5 failed logins from same IP within 5 minutes

Output:

Alert

Credential Stuffing

Condition:

Successful login immediately after multiple failures

Output:

Alert

Impossible Travel

Condition:

Same user logs in from different countries within short interval

Output:

Alert

Privilege Escalation

Condition:

Unexpected privilege increase

Output:

Critical Alert

---

# AI Responsibilities

Gemini does NOT perform threat detection.

Gemini only assists.

Tasks:

Generate SQL

Explain alerts

Summarize incidents

Generate recommendations

Write investigation reports

---

# API Modules

/upload

Upload logs

/logs

Retrieve logs

/dashboard

Dashboard metrics

/query

Natural language query

/chat

AI assistant

/alerts

Threat alerts

/projects

Project management

---

# Database

Tables

projects

logs

alerts

users (future)

saved_queries (future)

---

# Security

Parameterized SQL

Input validation

File type validation

Maximum upload size

Prompt sanitization

Read-only AI SQL execution

---

# Future Enhancements

Authentication

RBAC

MITRE ATT&CK mapping

Sigma rule support

YARA integration

Suricata support

Windows EVTX support

Docker deployment

Kubernetes

Multi-user workspaces

---

# Non-Goals

The project will NOT:

Use fake logs

Generate fake analytics

Use hardcoded threat scores

Display fabricated confidence values

Pretend AI detected threats

Every displayed result should be reproducible.

---

# Design Principles

Single responsibility

Modular architecture

Production-inspired codebase

No hardcoded demo data

Explainable detections

AI assists—not replaces—the detection engine

Security-first development

Maintainability over shortcuts
