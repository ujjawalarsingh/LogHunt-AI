"""
services/gemini_service.py

Service for converting natural language queries to read-only SQL queries
against the logs and alerts schema, using Gemini.
"""
import logging
import re
from typing import Any

from google import genai
from google.genai import types
from sqlalchemy.orm import Session
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from dotenv import load_dotenv

load_dotenv()  # Ensure .env is loaded (especially for tests)

logger = logging.getLogger(__name__)

# Initialize the Gemini client. It automatically picks up GEMINI_API_KEY 
# from the environment (loaded by python-dotenv in the app).
client = genai.Client()


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


def natural_language_to_sql(question: str, db: Session) -> dict[str, Any]:
    """
    Converts a natural language question into SQL using Gemini, executes it, 
    and returns the SQL and results.
    """
    # 0. Get distinct values for context
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
        response = client.models.generate_content(
            model="gemini-3.5-flash",
            contents=prompt,
        )
        sql_query = response.text.strip()
    except Exception as e:
        logger.error(f"Gemini API error: {e}")
        raise RuntimeError("Failed to generate SQL from natural language.") from e

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

