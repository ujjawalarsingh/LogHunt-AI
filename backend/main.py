import json
import time
from typing import List
from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime

app = FastAPI(title="LogHunt AI Backend")

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173", "http://127.0.0.1:5173", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

THREAT_RULES = [
    {"keywords": ["failed login", "auth fail"], "type": "Brute Force", "severity": "critical", "confidence": 94},
    {"keywords": ["sql injection", "sql"], "type": "SQL Injection", "severity": "high", "confidence": 85},
    {"keywords": ["privilege escalation", "privilege"], "type": "Privilege Escalation", "severity": "critical", "confidence": 91},
    {"keywords": ["unauthorized"], "type": "Unauthorized Access", "severity": "high", "confidence": 87},
    {"keywords": ["timeout", "connection reset"], "type": "Anomaly", "severity": "medium", "confidence": 72},
]

@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}

@app.post("/api/analyze")
async def analyze_logs(files: List[UploadFile] = File(...)):
    start_time = time.time()
    
    total_logs = 0
    detections = []
    
    for file in files:
        content = await file.read()
        lines = []
        
        # Parse JSON natively or read as lines
        if file.filename.endswith(".json"):
            try:
                data = json.loads(content)
                if isinstance(data, list):
                    lines = [json.dumps(item) for item in data]
                else:
                    lines = [json.dumps(data)]
            except:
                lines = content.decode("utf-8", errors="ignore").splitlines()
        else:
            lines = content.decode("utf-8", errors="ignore").splitlines()
            
        total_logs += len(lines)
        
        for line in lines:
            lower_line = line.lower()
            matched = False
            for rule in THREAT_RULES:
                if any(kw in lower_line for kw in rule["keywords"]):
                    detections.append({
                        "timestamp": datetime.utcnow().isoformat() + "Z",
                        "source_ip": "192.168.1.100",
                        "raw_log": line[:200] + "..." if len(line) > 200 else line,
                        "threat_type": rule["type"],
                        "severity": rule["severity"],
                        "confidence": rule["confidence"]
                    })
                    matched = True
                    break
            
            if not matched:
                # Add safe logs as well so the frontend can display them
                detections.append({
                    "timestamp": datetime.utcnow().isoformat() + "Z",
                    "source_ip": "192.168.1.100",
                    "raw_log": line[:200] + "..." if len(line) > 200 else line,
                    "threat_type": "Normal",
                    "severity": "info",
                    "confidence": 100
                })
                    
    # Aggregate threat summary (only for actual threats)
    summary_dict = {}
    critical_count = 0
    threats_only = [d for d in detections if d["severity"] != "info"]
    
    for d in threats_only:
        t_type = d["threat_type"]
        if t_type not in summary_dict:
            summary_dict[t_type] = {
                "threat_type": t_type,
                "count": 0,
                "severity": d["severity"],
                "confidence": d["confidence"]
            }
        summary_dict[t_type]["count"] += 1
        if d["severity"] == "critical":
            critical_count += 1
            
    summary = list(summary_dict.values())
    
    inference_time = int((time.time() - start_time) * 1000)

    # Return all processed logs (limited to 500 for safety)
    return {
        "status": "success",
        "total_logs_analyzed": total_logs,
        "threats_detected": len(threats_only),
        "critical_count": critical_count,
        "threat_summary": summary,
        "all_logs": detections[:500],
        "inference_time_ms": inference_time
    }
