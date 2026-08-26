"""
services/gemini_service.py

Service for converting natural language queries to read-only SQL queries
against the logs and alerts schema, using Gemini.
"""
import logging
import re
import time
from typing import Any

from google import genai
from google.genai import types
from google.genai.errors import APIError
from sqlalchemy.orm import Session
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from dotenv import load_dotenv

from app.repositories.alert_repository import get_alert_by_id


load_dotenv()  # Ensure .env is loaded (especially for tests)

logger = logging.getLogger(__name__)

# Initialize the Gemini client. It automatically picks up GEMINI_API_KEY 
# from the environment (loaded by python-dotenv in the app).
client = genai.Client()
GEMINI_MODEL = "models/gemini-3.5-flash"

class GeminiServiceError(Exception):
    def __init__(self, message, status_code=500):
        super().__init__(message)
        self.status_code = status_code

def _generate_content_with_retry(model: str, contents: str) -> Any:
    """Helper to retry Gemini API calls with exponential backoff on 503/429/504 errors."""
    max_retries = 3
    base_delay = 2

    for attempt in range(max_retries + 1):
        try:
            return client.models.generate_content(model=model, contents=contents)
        except APIError as e:
            # e.code corresponds to HTTP status code in new google-genai SDK
            if e.code in (429, 503, 504):
                if attempt < max_retries:
                    delay = base_delay * (2 ** attempt)
                    logger.warning(f"Gemini API returned {e.code}. Retrying in {delay} seconds (attempt {attempt+1}/{max_retries})...")
                    time.sleep(delay)
                    continue
                else:
                    logger.error(f"Gemini API failed after {max_retries} retries with {e.code}.")
                    raise GeminiServiceError(f"AI service temporarily unavailable (Error {e.code}). Please try again later.", status_code=e.code) from e
            else:
                # E.g. 400 Bad Request, 404 Not Found, etc.
                logger.error(f"Gemini API failed with unrecoverable error {e.code}: {e.message}")
                raise GeminiServiceError(f"AI service error: {e.message}", status_code=e.code) from e
        except Exception as e:
            logger.error(f"Unexpected error during Gemini API call: {e}")
            raise GeminiServiceError("An unexpected error occurred communicating with the AI service.", status_code=500) from e


_SCHEMA_PROMPT = """You are a PostgreSQL expert assisting a security analyst.
Your task is to convert a natural language question into a PostgreSQL query.

The database contains the following tables:

1. `projects`
   - `id` (INTEGER PRIMARY KEY)
   - `name` (VARCHAR, NOT NULL)
   - `created_at` (TIMESTAMP WITH TIME ZONE, NOT NULL)

2. `logs`
   - `id` (INTEGER PRIMARY KEY)
   - `timestamp` (TIMESTAMP WITH TIME ZONE)
   - `source_ip` (VARCHAR)
   - `destination_ip` (VARCHAR)
   - `hostname` (VARCHAR)
   - `username` (VARCHAR)
   - `event_type` (VARCHAR)
   - `severity` (VARCHAR)
   - `message` (TEXT)
   - `raw_log` (TEXT, NOT NULL)
   - `source_format` (VARCHAR) - e.g., 'apache', 'json', 'syslog'
   - `project_id` (INTEGER) - Foreign key to projects.id
   - `created_at` (TIMESTAMP WITH TIME ZONE, NOT NULL)

3. `alerts`
   - `id` (INTEGER PRIMARY KEY)
   - `log_id` (INTEGER NOT NULL) - Foreign key to logs.id
   - `alert_type` (VARCHAR NOT NULL) - e.g., 'brute_force', 'credential_stuffing', 'privilege_escalation'
   - `source` (VARCHAR NOT NULL) - 'rule_engine' or 'lora_classifier'
   - `severity` (VARCHAR NOT NULL)
   - `confidence_score` (FLOAT) - only for lora_classifier
   - `description` (TEXT NOT NULL)
   - `created_at` (TIMESTAMP WITH TIME ZONE, NOT NULL)

RULES:
- Return ONLY a valid PostgreSQL SELECT query.
- Do not include any markdown formatting (like ```sql), just the raw SQL query.
- Do NOT use any DROP, DELETE, UPDATE, INSERT, ALTER, TRUNCATE commands.
- Use explicit JOINs if querying across tables.
- Limit the results to 50 rows maximum by default unless the user specifically asks for more, to prevent massive responses.
"""

def _validate_sql(sql: str) -> None:
    """Ensure the SQL query is a SELECT statement and contains no forbidden keywords."""
    sql_upper = sql.upper()
    
    if not sql_upper.strip().startswith("SELECT"):
        raise ValueError("Query must be a SELECT statement.")
        
    forbidden = ["DROP", "DELETE", "UPDATE", "INSERT", "ALTER", "TRUNCATE", "COMMIT", "ROLLBACK", "GRANT", "REVOKE"]
    for word in forbidden:
        # Check for the word as a distinct token
        if re.search(r'\b' + word + r'\b', sql_upper):
            raise ValueError(f"Query contains forbidden keyword: {word}")
            
    # Check for comments that might hide malicious code
    if "--" in sql or "/*" in sql:
        raise ValueError("Query contains comments, which are not permitted.")


# Destructive SQL command keywords that should never appear in a read-only question.
_DESTRUCTIVE_INTENT_KEYWORDS = [
    "delete", "drop", "update", "insert", "truncate",
    "alter", "grant", "revoke", "commit", "rollback",
]

def _check_question_intent(question: str) -> None:
    """
    Pre-Gemini guard: reject questions that express destructive SQL intent.

    Uses word-boundary regex so that words like 'updates' (used in a normal
    sentence) do NOT trigger this guard — only standalone command tokens do.

    This is Layer 1 (user intent). _validate_sql() remains as Layer 2
    (generated SQL). Both layers must be satisfied.

    Raises ValueError if a destructive intent keyword is found.
    """
    q_lower = question.lower()
    for keyword in _DESTRUCTIVE_INTENT_KEYWORDS:
        if re.search(r'\b' + keyword + r'\b', q_lower):
            raise ValueError(
                f"Only read-only queries are allowed. "
                f"Questions containing '{keyword}' operations are not permitted."
            )


def natural_language_to_sql(question: str, db: Session) -> dict[str, Any]:
    """
    Converts a natural language question into SQL using Gemini, executes it, 
    and returns the SQL and results.
    """
    # 0. Layer 1: Raw question intent check — BEFORE calling Gemini
    _check_question_intent(question)

    # 1. Get distinct values for context
    try:
        event_types = [str(row[0]) for row in db.execute(text("SELECT DISTINCT event_type FROM logs WHERE event_type IS NOT NULL LIMIT 50")).fetchall()]
        severities = [str(row[0]) for row in db.execute(text("SELECT DISTINCT severity FROM logs WHERE severity IS NOT NULL LIMIT 50")).fetchall()]
        
        dynamic_context = (
            "ACTUAL DATA CONTEXT:\n"
            f"- Distinct `logs.event_type` values currently in DB: {', '.join(event_types)}\n"
            f"- Distinct `logs.severity` values currently in DB: {', '.join(severities)}\n"
            "CRITICAL: When the user asks to filter by event type (like 'failed logins'), or severity, "
            "you MUST use one of the exact distinct values listed above that best matches their intent, "
            "instead of inventing a value like 'failed_login'.\n\n"
        )
    except Exception as e:
        logger.warning(f"Could not fetch distinct values for prompt context: {e}")
        dynamic_context = ""

    # 1. Ask Gemini for the SQL
    prompt = f"{_SCHEMA_PROMPT}\n\n{dynamic_context}Question: {question}\nSQL Query:"
    
    try:
        response = _generate_content_with_retry(
            model=GEMINI_MODEL,
            contents=prompt,
        )
        sql_query = response.text.strip()
    except GeminiServiceError as e:
        raise e
    except Exception as e:
        logger.error(f"Gemini API error: {e}")
        raise GeminiServiceError("Failed to generate SQL from natural language.") from e

    # Sometimes Gemini still wraps in markdown despite instructions, so strip it if present
    if sql_query.startswith("```sql"):
        sql_query = sql_query[6:]
    if sql_query.startswith("```"):
        sql_query = sql_query[3:]
    if sql_query.endswith("```"):
        sql_query = sql_query[:-3]
    sql_query = sql_query.strip()
    
    # 2. Validate the SQL
    try:
        _validate_sql(sql_query)
    except ValueError as e:
        logger.warning(f"SQL validation failed: {e}. Query: {sql_query}")
        raise ValueError(f"Generated SQL failed validation: {e}")

    # 3. Execute the SQL
    try:
        result_proxy = db.execute(text(sql_query))
        
        # Determine columns from the result proxy
        columns = list(result_proxy.keys())
        
        # Fetch rows and convert to list of dicts
        results = [dict(zip(columns, row)) for row in result_proxy.fetchall()]
        
        return {
            "sql": sql_query,
            "results": results
        }
    except SQLAlchemyError as e:
        logger.error(f"Database execution error: {e}")
        # Return a generic database error to avoid leaking exact internal DB errors to user
        raise ValueError(f"Failed to execute generated SQL query: {e}")


def explain_alert(alert_id: int, db: Session) -> str:
    """
    Given an alert_id, fetches the real alert and triggering log from the database,
    and asks Gemini to explain what happened in plain English without inventing facts.
    """
    alert = get_alert_by_id(db, alert_id)
    if not alert:
        raise ValueError(f"Alert with id {alert_id} not found.")

    log = alert.log
    if not log:
        raise ValueError(f"Alert {alert_id} has no associated log data.")

    # Construct the factual context from the database
    context = (
        "You are an expert security analyst. Please explain the following security alert "
        "in plain, accessible English. Focus on what happened and why it matters.\n\n"
        "CRITICAL RULES:\n"
        "- ONLY use the facts provided below. Do not invent IP addresses, usernames, timestamps, or attack techniques that are not explicitly present.\n"
        "- Do not guess the outcome if it is not stated.\n\n"
        "--- SECURITY ALERT DATA ---\n"
        f"Alert Type: {alert.alert_type}\n"
        f"Severity: {alert.severity}\n"
        f"Detection Source: {alert.source}\n"
        f"Confidence Score: {alert.confidence_score if alert.confidence_score is not None else 'N/A'}\n"
        f"System Description: {alert.description}\n"
        f"Alert Created At: {alert.created_at}\n\n"
        "--- TRIGGERING LOG LINE ---\n"
        f"Log Timestamp: {log.timestamp or 'N/A'}\n"
        f"Source IP: {log.source_ip or 'N/A'}\n"
        f"Destination IP: {log.destination_ip or 'N/A'}\n"
        f"Username: {log.username or 'N/A'}\n"
        f"Event Type: {log.event_type or 'N/A'}\n"
        f"Raw Log Text: {log.raw_log}\n"
        "---------------------------\n\n"
        "Explanation:"
    )

    try:
        response = _generate_content_with_retry(
            model=GEMINI_MODEL,
            contents=context,
        )
        return response.text.strip()
    except GeminiServiceError as e:
        raise e
    except Exception as e:
        logger.error(f"Gemini API error during explain_alert: {e}")
        raise GeminiServiceError("Failed to generate alert explanation using Gemini.") from e


def recommend_mitigation(alert_id: int, db: Session) -> str:
    """
    Given an alert_id, fetches the real alert from the database,
    and asks Gemini to recommend concrete, actionable mitigation steps.
    """
    alert = get_alert_by_id(db, alert_id)
    if not alert:
        raise ValueError(f"Alert with id {alert_id} not found.")

    log = alert.log
    if not log:
        raise ValueError(f"Alert {alert_id} has no associated log data.")

    # Construct the factual context from the database
    context = (
        "You are an expert security analyst. Please provide concrete, actionable "
        "mitigation steps and security recommendations for the following security alert.\n\n"
        "CRITICAL RULES:\n"
        "- Base your recommendations on the specific Alert Type and details provided.\n"
        "- Do not make assumptions about the environment (e.g. don't say 'reconfigure your firewall' unless the alert specifically involves firewall evasion).\n"
        "- Provide specific, technical remediation steps rather than generic 'improve your security posture' advice.\n\n"
        "--- SECURITY ALERT DATA ---\n"
        f"Alert Type: {alert.alert_type}\n"
        f"Severity: {alert.severity}\n"
        f"Detection Source: {alert.source}\n"
        f"System Description: {alert.description}\n"
        f"Alert Created At: {alert.created_at}\n\n"
        "--- TRIGGERING LOG SUMMARY ---\n"
        f"Username (if known): {log.username or 'N/A'}\n"
        f"Source IP (if known): {log.source_ip or 'N/A'}\n"
        f"Event Type: {log.event_type or 'N/A'}\n"
        f"Raw Log Text: {log.raw_log}\n"
        "---------------------------\n\n"
        "Recommendations:"
    )

    try:
        response = _generate_content_with_retry(
            model=GEMINI_MODEL,
            contents=context,
        )
        return response.text.strip()
    except GeminiServiceError as e:
        raise e
    except Exception as e:
        logger.error(f"Gemini API error during recommend_mitigation: {e}")
        raise GeminiServiceError("Failed to generate mitigation recommendations using Gemini.") from e



