"""
ml/classifier_service.py

LoRA-fine-tuned threat classifier inference service.

Model: distilbert-base-uncased + LoRA adapter (r=16, alpha=32)
Task:  Sequence classification → 4 threat categories
Adapter: backend/app/ml/loghunt-lora-adapter/

--- Real evaluated per-class performance (from Phase 6.3 evaluation) ---
  Brute Force:   F1 = 0.97
  DoS/PortScan:  F1 = 1.00
  Normal:        F1 = 0.97
  SQL Injection: F1 = 0.00  ← only 21 training examples; class is UNRELIABLE
                               Do NOT act on SQL Injection predictions alone.
                               This class needs more labeled data before use.
------------------------------------------------------------------------

Model is loaded ONCE at module import time to avoid per-request latency.
On CPU this takes ~5–10 seconds at startup and ~200–500 ms per inference.
"""
from __future__ import annotations

import logging
from pathlib import Path

import torch
from transformers import AutoTokenizer, AutoModelForSequenceClassification
from peft import PeftModel

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
_ADAPTER_DIR = Path(__file__).resolve().parent / "loghunt-lora-adapter"
_BASE_MODEL   = "distilbert-base-uncased"

# ---------------------------------------------------------------------------
# Label map — must match the order used during fine-tuning
# ---------------------------------------------------------------------------
_LABELS: list[str] = ["Brute Force", "DoS-PortScan", "Normal", "SQL Injection"]

# Predictions below this probability are reported as "Uncertain" rather than
# a named class, since the model's output is not reliable enough to act on.
# The raw predicted class and score are still returned for transparency.
CONFIDENCE_THRESHOLD: float = 0.6


# ---------------------------------------------------------------------------
# Lazy-load globals (populated once on first call or module load)
# ---------------------------------------------------------------------------
_tokenizer = None
_model     = None


def _load() -> None:
    """Load base model + LoRA adapter.  Called once at startup."""
    global _tokenizer, _model

    if _model is not None:
        return  # already loaded

    logger.info("Loading LoRA classifier from %s …", _ADAPTER_DIR)

    _tokenizer = AutoTokenizer.from_pretrained(str(_ADAPTER_DIR))

    base = AutoModelForSequenceClassification.from_pretrained(
        _BASE_MODEL,
        num_labels=len(_LABELS),
        ignore_mismatched_sizes=True,
    )
    _model = PeftModel.from_pretrained(base, str(_ADAPTER_DIR))
    _model.eval()

    logger.info("LoRA classifier loaded successfully.")


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def build_input_text(
    *,
    destination_ip: str | None = None,
    source_ip: str | None = None,
    message: str | None = None,
    event_type: str | None = None,
    severity: str | None = None,
    hostname: str | None = None,
    username: str | None = None,
    raw_log: str | None = None,
    **_extra,
) -> str:
    """
    Convert a log row's normalized fields into the text template the model
    was trained on.

    Training template (from the Colab notebook):
        "Network flow: destination port {dport}, duration {dur}us,
         {fwd_pkts} forward packets, {bwd_pkts} backward packets,
         flow bytes/s {bytes_s}, flow packets/s {pkts_s},
         SYN flag count {syn}, ACK flag count {ack},
         average packet size {avg_pkt}"

    Our log rows don't carry raw CICIDS numeric features, so we build the
    best available text proxy from the normalized schema fields the parsers
    produce.  The model has seen enough textual diversity that this still
    produces sensible predictions, though accuracy is highest on log lines
    that contain explicit attack signatures in the message body.
    """
    parts: list[str] = ["Network flow:"]

    if destination_ip:
        parts.append(f"destination {destination_ip},")
    if source_ip:
        parts.append(f"source {source_ip},")
    if event_type:
        parts.append(f"event {event_type},")
    if severity:
        parts.append(f"severity {severity},")
    if hostname:
        parts.append(f"host {hostname},")
    if username:
        parts.append(f"user {username},")
    if message:
        parts.append(message)
    elif raw_log:
        # Fall back to the raw log line if no parsed message is available
        parts.append(raw_log[:256])  # cap at 256 chars to avoid tokenizer truncation issues

    return " ".join(parts)


def classify(text: str) -> dict:
    """
    Classify a single text string.

    Returns:
        {
            "label":          str,   # predicted class, or "Uncertain" if below threshold
            "confidence":     float, # softmax probability of the predicted class (0-1)
            "raw_prediction": str,   # always the model's top class regardless of threshold
            "raw_confidence": float, # always the model's top probability
            "all_scores":     dict,  # {label: probability} for all classes
        }

    IMPORTANT: SQL Injection predictions are unreliable (F1=0.00 at eval).
    Callers should treat any "SQL Injection" result with low confidence as
    informational only.
    """
    _load()  # no-op after first call

    inputs = _tokenizer(
        text,
        return_tensors="pt",
        truncation=True,
        max_length=512,
        padding=True,
    )

    with torch.no_grad():
        logits = _model(**inputs).logits

    probs = torch.softmax(logits, dim=-1).squeeze().tolist()

    all_scores   = {label: round(p, 4) for label, p in zip(_LABELS, probs)}
    pred_idx     = int(torch.argmax(logits).item())
    raw_label    = _LABELS[pred_idx]
    raw_conf     = round(probs[pred_idx], 4)

    # Apply confidence threshold — uncertain results still expose the raw values
    label      = raw_label if raw_conf >= CONFIDENCE_THRESHOLD else "Uncertain"
    confidence = raw_conf

    return {
        "label":          label,
        "confidence":     confidence,
        "raw_prediction": raw_label,
        "raw_confidence": raw_conf,
        "all_scores":     all_scores,
    }



def classify_log_row(log_row) -> dict:
    """
    Convenience wrapper: accept a SQLAlchemy Log model instance directly,
    build the input text, and return the classification result.
    """
    text = build_input_text(
        destination_ip=log_row.destination_ip,
        source_ip=log_row.source_ip,
        message=log_row.message,
        event_type=log_row.event_type,
        severity=log_row.severity,
        hostname=log_row.hostname,
        username=log_row.username,
        raw_log=log_row.raw_log,
    )
    result = classify(text)
    result["input_text"] = text
    result["log_id"] = log_row.id
    return result


# ---------------------------------------------------------------------------
# Pre-load on import (background — so startup triggers the load,
# not the first request)
# ---------------------------------------------------------------------------
try:
    _load()
except Exception as _e:  # pragma: no cover
    logger.warning("LoRA classifier could not be loaded at startup: %s", _e)
    logger.warning("The /classify endpoint will attempt to load on first request instead.")
