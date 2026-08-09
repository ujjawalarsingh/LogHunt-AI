from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.parser.detector import UnknownLogFormatError
from app.schemas.log import UploadResponse
from app.services.ingestion_service import process_log_file

router = APIRouter(prefix="/upload", tags=["Upload"])

@router.post("", response_model=UploadResponse)
async def upload_log_file(
    file: UploadFile = File(...),
    project_id: int = Form(None),
    db: Session = Depends(get_db)
):
    """
    Upload a log file for ingestion.
    Auto-detects the format (Apache, JSON, Syslog), parses the contents,
    and bulk inserts the entries into the database.
    """
    try:
        content_bytes = await file.read()
        file_content = content_bytes.decode("utf-8", errors="replace")
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail=f"Failed to read file: {str(e)}"
        )
        
    try:
        response = process_log_file(
            db=db, 
            file_content=file_content, 
            filename=file.filename, 
            project_id=project_id
        )
        return response
    except UnknownLogFormatError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail=f"Internal processing error: {str(e)}"
        )
