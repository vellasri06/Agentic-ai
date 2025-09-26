from sqlalchemy import create_engine, Column, Integer, String, DateTime, Text, Float, Boolean, ForeignKey, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session, relationship
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime
import uuid
import os
from typing import Optional, List, Dict, Any
import logging

logger = logging.getLogger(__name__)

# Database configuration
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./compliance_officer.db")

# Create engine
if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
else:
    engine = create_engine(DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class Document(Base):
    """Document model for tracking uploaded files"""
    __tablename__ = "documents"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    filename = Column(String, nullable=False)
    original_filename = Column(String, nullable=False)
    file_size = Column(Integer, nullable=False)
    file_type = Column(String, nullable=False)
    mime_type = Column(String, nullable=False)
    file_path = Column(String, nullable=False)
    
    # Status tracking
    status = Column(String, default="uploaded")  # uploaded, analyzing, completed, error
    progress = Column(Integer, default=0)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    analysis_started_at = Column(DateTime, nullable=True)
    analysis_completed_at = Column(DateTime, nullable=True)
    
    # Error handling
    error_message = Column(Text, nullable=True)
    
    # Relationships
    analysis_results = relationship("AnalysisResult", back_populates="document", cascade="all, delete-orphan")
    audit_logs = relationship("AuditLog", back_populates="document", cascade="all, delete-orphan")

class AnalysisResult(Base):
    """Analysis result model for storing compliance analysis data"""
    __tablename__ = "analysis_results"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    document_id = Column(String, ForeignKey("documents.id"), nullable=False)
    
    # Compliance metrics
    compliance_score = Column(Integer, nullable=False)
    risk_level = Column(String, nullable=False)
    
    # Analysis data
    regulatory_frameworks = Column(JSON, nullable=True)  # List of frameworks
    key_insights = Column(JSON, nullable=True)  # List of insights
    recommendations = Column(JSON, nullable=True)  # List of recommendations
    detailed_findings = Column(JSON, nullable=True)  # Detailed analysis results
    
    # Processing metadata
    chunks_processed = Column(Integer, nullable=True)
    total_characters = Column(Integer, nullable=True)
    processing_duration = Column(Float, nullable=True)  # Duration in seconds
    
    # Analysis configuration
    analysis_model = Column(String, default="gpt-4")
    analysis_version = Column(String, default="1.0")
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    document = relationship("Document", back_populates="analysis_results")

class AuditLog(Base):
    """Audit log model for tracking all system activities"""
    __tablename__ = "audit_logs"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    document_id = Column(String, ForeignKey("documents.id"), nullable=True)
    
    # Event details
    event_type = Column(String, nullable=False)  # upload, analysis_start, analysis_complete, download, delete
    event_description = Column(Text, nullable=False)
    
    # User/session information (for future use)
    user_id = Column(String, nullable=True)
    session_id = Column(String, nullable=True)
    ip_address = Column(String, nullable=True)
    user_agent = Column(String, nullable=True)
    
    # Additional metadata
    metadata = Column(JSON, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    document = relationship("Document", back_populates="audit_logs")

class SystemMetrics(Base):
    """System metrics model for tracking application performance"""
    __tablename__ = "system_metrics"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    
    # Metric details
    metric_name = Column(String, nullable=False)
    metric_value = Column(Float, nullable=False)
    metric_unit = Column(String, nullable=True)
    
    # Context
    context = Column(JSON, nullable=True)
    
    # Timestamps
    recorded_at = Column(DateTime, default=datetime.utcnow)

# Database utility functions
def get_db() -> Session:
    """Get database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_database():
    """Initialize database tables"""
    try:
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables created successfully")
    except Exception as e:
        logger.error(f"Error creating database tables: {str(e)}")
        raise

def get_db_session() -> Session:
    """Get a database session for direct use"""
    return SessionLocal()

# Database service classes
class DocumentService:
    """Service class for document operations"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def create_document(self, filename: str, original_filename: str, file_size: int, 
                       file_type: str, mime_type: str, file_path: str) -> Document:
        """Create a new document record"""
        document = Document(
            filename=filename,
            original_filename=original_filename,
            file_size=file_size,
            file_type=file_type,
            mime_type=mime_type,
            file_path=file_path
        )
        self.db.add(document)
        self.db.commit()
        self.db.refresh(document)
        
        # Log the upload event
        self._log_event(document.id, "upload", f"Document uploaded: {original_filename}")
        
        return document
    
    def get_document(self, document_id: str) -> Optional[Document]:
        """Get document by ID"""
        return self.db.query(Document).filter(Document.id == document_id).first()
    
    def update_document_status(self, document_id: str, status: str, progress: int = None, 
                              error_message: str = None) -> bool:
        """Update document status"""
        document = self.get_document(document_id)
        if not document:
            return False
        
        document.status = status
        if progress is not None:
            document.progress = progress
        if error_message:
            document.error_message = error_message
        
        # Update timestamps based on status
        if status == "analyzing" and not document.analysis_started_at:
            document.analysis_started_at = datetime.utcnow()
        elif status == "completed":
            document.analysis_completed_at = datetime.utcnow()
        
        self.db.commit()
        
        # Log the status change
        self._log_event(document_id, "status_change", f"Status changed to: {status}")
        
        return True
    
    def delete_document(self, document_id: str) -> bool:
        """Delete document and all related records"""
        document = self.get_document(document_id)
        if not document:
            return False
        
        # Log the deletion
        self._log_event(document_id, "delete", f"Document deleted: {document.original_filename}")
        
        self.db.delete(document)
        self.db.commit()
        return True
    
    def list_documents(self, limit: int = 100, offset: int = 0) -> List[Document]:
        """List documents with pagination"""
        return self.db.query(Document).offset(offset).limit(limit).all()
    
    def _log_event(self, document_id: str, event_type: str, description: str, metadata: Dict = None):
        """Log an audit event"""
        audit_service = AuditService(self.db)
        audit_service.log_event(document_id, event_type, description, metadata)

class AnalysisService:
    """Service class for analysis operations"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def save_analysis_result(self, document_id: str, compliance_score: int, risk_level: str,
                           regulatory_frameworks: List[str], key_insights: List[str],
                           recommendations: List[str], detailed_findings: Dict[str, Any],
                           processing_metadata: Dict[str, Any] = None) -> AnalysisResult:
        """Save analysis results"""
        analysis_result = AnalysisResult(
            document_id=document_id,
            compliance_score=compliance_score,
            risk_level=risk_level,
            regulatory_frameworks=regulatory_frameworks,
            key_insights=key_insights,
            recommendations=recommendations,
            detailed_findings=detailed_findings,
            chunks_processed=processing_metadata.get('chunks_processed') if processing_metadata else None,
            total_characters=processing_metadata.get('total_characters') if processing_metadata else None,
            processing_duration=processing_metadata.get('processing_duration') if processing_metadata else None
        )
        
        self.db.add(analysis_result)
        self.db.commit()
        self.db.refresh(analysis_result)
        
        # Log the analysis completion
        audit_service = AuditService(self.db)
        audit_service.log_event(
            document_id, 
            "analysis_complete", 
            f"Analysis completed with score: {compliance_score}/100",
            {"compliance_score": compliance_score, "risk_level": risk_level}
        )
        
        return analysis_result
    
    def get_analysis_result(self, document_id: str) -> Optional[AnalysisResult]:
        """Get analysis result for a document"""
        return self.db.query(AnalysisResult).filter(AnalysisResult.document_id == document_id).first()

class AuditService:
    """Service class for audit operations"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def log_event(self, document_id: str, event_type: str, description: str, 
                  metadata: Dict[str, Any] = None, user_id: str = None, 
                  session_id: str = None, ip_address: str = None, user_agent: str = None):
        """Log an audit event"""
        audit_log = AuditLog(
            document_id=document_id,
            event_type=event_type,
            event_description=description,
            metadata=metadata,
            user_id=user_id,
            session_id=session_id,
            ip_address=ip_address,
            user_agent=user_agent
        )
        
        self.db.add(audit_log)
        self.db.commit()
    
    def get_document_audit_trail(self, document_id: str) -> List[AuditLog]:
        """Get audit trail for a specific document"""
        return self.db.query(AuditLog).filter(AuditLog.document_id == document_id).order_by(AuditLog.created_at).all()
    
    def get_system_audit_logs(self, limit: int = 100, offset: int = 0) -> List[AuditLog]:
        """Get system-wide audit logs"""
        return self.db.query(AuditLog).order_by(AuditLog.created_at.desc()).offset(offset).limit(limit).all()

class MetricsService:
    """Service class for system metrics"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def record_metric(self, metric_name: str, metric_value: float, 
                     metric_unit: str = None, context: Dict[str, Any] = None):
        """Record a system metric"""
        metric = SystemMetrics(
            metric_name=metric_name,
            metric_value=metric_value,
            metric_unit=metric_unit,
            context=context
        )
        
        self.db.add(metric)
        self.db.commit()
    
    def get_metrics(self, metric_name: str = None, limit: int = 100) -> List[SystemMetrics]:
        """Get system metrics"""
        query = self.db.query(SystemMetrics)
        if metric_name:
            query = query.filter(SystemMetrics.metric_name == metric_name)
        return query.order_by(SystemMetrics.recorded_at.desc()).limit(limit).all()

# Database dependency for FastAPI
def get_database_session():
    """FastAPI dependency for database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
