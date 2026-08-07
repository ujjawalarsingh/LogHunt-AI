from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from typing import List
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.services.log_service import LogService
from app.schemas.log_schema import AnalyzeResponse

router = APIRouter()

@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze_logs(files: List[UploadFile] = File(...), db: Session = Depends(get_db)):
    if not files:
        raise HTTPException(status_code=400, detail="No files provided")
        
    service = LogService(db)
    
    total_logs = 0
    all_logs_data = []
    
    for file in files:
        content = await file.read()
        try:
            decoded = content.decode("utf-8", errors="ignore")
            result = service.analyze_content(decoded)
            total_logs += result["total_logs_analyzed"]
            all_logs_data.extend(result["all_logs"])
        except Exception as e:
            # Gracefully handle decoding or parsing errors per file
            pass
            
    return {
        "status": "success",
        "total_logs_analyzed": total_logs,
        "threats_detected": 0,
        "critical_count": 0,
        "threat_summary": [],
        "all_logs": all_logs_data[:500]
    }
