from fastapi import APIRouter, UploadFile, File, Depends
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from app.core.database import get_db
from app.services.csv_service import CsvService

router = APIRouter(prefix="/csv", tags=["CSV Tools"])

@router.post("/preview")
async def preview_csv(file: UploadFile = File(...)):
    contents = await file.read()
    rows = CsvService.parse_csv_stream(contents)
    return {"total_rows": len(rows), "preview": rows[:10]}

@router.post("/import")
async def import_csv(file: UploadFile = File(...), db: Session = Depends(get_db)):
    contents = await file.read()
    rows = CsvService.parse_csv_stream(contents)
    count = CsvService.bulk_import(db, rows)
    return {"imported": count, "message": f"Successfully imported {count} transactions"}
