from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum

class FileStatusEnum(str, Enum):
    UPLOADING = "uploading"
    ANALYZING = "analyzing"
    COMPLETED = "completed"
    ERROR = "error"

class UploadResponse(BaseModel):
    file_id: str
    filename: str
    size: int
    status: FileStatusEnum

class FileStatusResponse(BaseModel):
    file_id: str
    filename: str
    size: int
    status: FileStatusEnum
    progress: int
    created_at: datetime
    analysis_result: Optional[Dict[str, Any]] = None
    error_message: Optional[str] = None

class AnalysisResult(BaseModel):
    compliance_score: int
    issues_found: int
    recommendations: List[str]
    regulatory_frameworks: List[str]
    risk_level: str
    detailed_findings: Optional[Dict[str, Any]] = None

class ComplianceInsight(BaseModel):
    section: str
    status: str
    score: int
    issues: List[str]
    recommendations: List[str]

class DocumentMetadata(BaseModel):
    filename: str
    file_type: str
    size: int
    upload_timestamp: datetime
    processing_duration: Optional[float] = None
