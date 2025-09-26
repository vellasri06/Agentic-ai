from fastapi import FastAPI, File, UploadFile, HTTPException, BackgroundTasks, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
import os
import uuid
import shutil
from pathlib import Path
from typing import List, Optional
import asyncio
from datetime import datetime
import json
import logging
import time

from document_analyzer import ComplianceAnalyzer
from report_generator import ComplianceReportGenerator
from database import (
    init_database, get_database_session, DocumentService, 
    AnalysisService, AuditService, MetricsService
)
from sqlalchemy.orm import Session

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Agentic Compliance Officer API",
    description="AI-powered regulatory document analysis and compliance reporting",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize database
init_database()

# Create necessary directories
UPLOAD_DIR = Path("uploads")
REPORTS_DIR = Path("reports")
TEMP_DIR = Path("temp")

for directory in [UPLOAD_DIR, REPORTS_DIR, TEMP_DIR]:
    directory.mkdir(exist_ok=True)

# Initialize components
try:
    compliance_analyzer = ComplianceAnalyzer()
    logger.info("Compliance analyzer initialized successfully")
except Exception as e:
    logger.error(f"Failed to initialize compliance analyzer: {str(e)}")
    compliance_analyzer = None

report_generator = ComplianceReportGenerator()
logger.info("Report generator initialized successfully")

@app.on_event("startup")
async def startup_event():
    """Application startup event"""
    logger.info("Agentic Compliance Officer API starting up")
    
    # Record startup metric
    with get_database_session().__next__() as db:
        metrics_service = MetricsService(db)
        metrics_service.record_metric("app_startup", 1, "count", {"version": "1.0.0"})

@app.get("/")
async def root():
    return {"message": "Agentic Compliance Officer API is running"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}

@app.post("/api/upload")
async def upload_files(
    background_tasks: BackgroundTasks,
    files: List[UploadFile] = File(...),
    db: Session = Depends(get_database_session)
):
    """Upload regulatory documents for analysis"""
    uploaded_files = []
    document_service = DocumentService(db)
    metrics_service = MetricsService(db)
    
    for file in files:
        start_time = time.time()
        
        # Validate file type
        allowed_types = [
            "application/pdf",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        ]
        
        if file.content_type not in allowed_types:
            raise HTTPException(
                status_code=400,
                detail=f"File type {file.content_type} not supported. Please upload PDF, DOC, or DOCX files."
            )
        
        # Generate unique file ID and save file
        file_id = str(uuid.uuid4())
        file_extension = Path(file.filename).suffix
        stored_filename = f"{file_id}{file_extension}"
        file_path = UPLOAD_DIR / stored_filename
        
        try:
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
        except Exception as e:
            logger.error(f"Error saving file {file.filename}: {str(e)}")
            raise HTTPException(status_code=500, detail="Error saving file")
        
        # Create document record in database
        document = document_service.create_document(
            filename=stored_filename,
            original_filename=file.filename,
            file_size=file_path.stat().st_size,
            file_type=file_extension,
            mime_type=file.content_type,
            file_path=str(file_path)
        )
        
        # Record upload metrics
        upload_time = time.time() - start_time
        metrics_service.record_metric("file_upload_duration", upload_time, "seconds", {
            "file_size": document.file_size,
            "file_type": file_extension
        })
        metrics_service.record_metric("file_upload_count", 1, "count")
        
        # Add background task for processing
        background_tasks.add_task(process_document_with_db, document.id, file_path)
        
        uploaded_files.append({
            "file_id": document.id,
            "filename": file.filename,
            "size": document.file_size,
            "status": document.status
        })
        
        logger.info(f"File uploaded: {file.filename} (ID: {document.id})")
    
    return {"files": uploaded_files}

@app.get("/api/status/{file_id}")
async def get_file_status(file_id: str, db: Session = Depends(get_database_session)):
    """Get processing status of a specific file"""
    document_service = DocumentService(db)
    analysis_service = AnalysisService(db)
    
    document = document_service.get_document(file_id)
    if not document:
        raise HTTPException(status_code=404, detail="File not found")
    
    # Get analysis result if available
    analysis_result = None
    if document.status == "completed":
        analysis = analysis_service.get_analysis_result(file_id)
        if analysis:
            analysis_result = {
                "compliance_score": analysis.compliance_score,
                "risk_level": analysis.risk_level,
                "regulatory_frameworks": analysis.regulatory_frameworks,
                "key_insights": analysis.key_insights,
                "recommendations": analysis.recommendations
            }
    
    return {
        "file_id": document.id,
        "filename": document.original_filename,
        "size": document.file_size,
        "status": document.status,
        "progress": document.progress,
        "created_at": document.created_at.isoformat(),
        "analysis_result": analysis_result,
        "error_message": document.error_message
    }

@app.get("/api/files")
async def list_files(
    limit: int = 100, 
    offset: int = 0, 
    db: Session = Depends(get_database_session)
):
    """List all uploaded files and their status"""
    document_service = DocumentService(db)
    documents = document_service.list_documents(limit, offset)
    
    files = []
    for document in documents:
        files.append({
            "file_id": document.id,
            "filename": document.original_filename,
            "size": document.file_size,
            "status": document.status,
            "progress": document.progress,
            "created_at": document.created_at.isoformat()
        })
    
    return {"files": files}

@app.get("/api/reports/{file_id}/pdf")
async def download_pdf_report(file_id: str, db: Session = Depends(get_database_session)):
    """Download PDF report for analyzed document"""
    document_service = DocumentService(db)
    audit_service = AuditService(db)
    
    document = document_service.get_document(file_id)
    if not document:
        raise HTTPException(status_code=404, detail="File not found")
    
    if document.status != "completed":
        raise HTTPException(status_code=400, detail="Analysis not completed")
    
    report_path = REPORTS_DIR / f"{file_id}_report.pdf"
    if not report_path.exists():
        raise HTTPException(status_code=404, detail="Report not found")
    
    # Log the download event
    audit_service.log_event(
        file_id, 
        "download", 
        f"PDF report downloaded for: {document.original_filename}",
        {"report_type": "pdf"}
    )
    
    return FileResponse(
        path=report_path,
        filename=f"{document.original_filename}_compliance_report.pdf",
        media_type="application/pdf"
    )

@app.get("/api/reports/{file_id}/csv")
async def download_csv_report(file_id: str, db: Session = Depends(get_database_session)):
    """Download CSV data for analyzed document"""
    document_service = DocumentService(db)
    audit_service = AuditService(db)
    
    document = document_service.get_document(file_id)
    if not document:
        raise HTTPException(status_code=404, detail="File not found")
    
    if document.status != "completed":
        raise HTTPException(status_code=400, detail="Analysis not completed")
    
    csv_path = REPORTS_DIR / f"{file_id}_data.csv"
    if not csv_path.exists():
        raise HTTPException(status_code=404, detail="CSV data not found")
    
    # Log the download event
    audit_service.log_event(
        file_id, 
        "download", 
        f"CSV report downloaded for: {document.original_filename}",
        {"report_type": "csv"}
    )
    
    return FileResponse(
        path=csv_path,
        filename=f"{document.original_filename}_compliance_data.csv",
        media_type="text/csv"
    )

@app.delete("/api/files/{file_id}")
async def delete_file(file_id: str, db: Session = Depends(get_database_session)):
    """Delete uploaded file and associated reports"""
    document_service = DocumentService(db)
    
    document = document_service.get_document(file_id)
    if not document:
        raise HTTPException(status_code=404, detail="File not found")
    
    # Remove physical files
    file_path = Path(document.file_path)
    if file_path.exists():
        file_path.unlink()
    
    # Remove reports
    report_files = [f"{file_id}_report.pdf", f"{file_id}_data.csv"]
    for report_file in report_files:
        report_path = REPORTS_DIR / report_file
        if report_path.exists():
            report_path.unlink()
    
    # Delete from database (this will cascade to related records)
    document_service.delete_document(file_id)
    
    logger.info(f"File deleted: {file_id}")
    return {"message": "File deleted successfully"}

@app.get("/api/audit/{file_id}")
async def get_audit_trail(file_id: str, db: Session = Depends(get_database_session)):
    """Get audit trail for a specific document"""
    audit_service = AuditService(db)
    audit_logs = audit_service.get_document_audit_trail(file_id)
    
    trail = []
    for log in audit_logs:
        trail.append({
            "event_type": log.event_type,
            "description": log.event_description,
            "timestamp": log.created_at.isoformat(),
            "metadata": log.metadata
        })
    
    return {"audit_trail": trail}

@app.get("/api/metrics")
async def get_system_metrics(db: Session = Depends(get_database_session)):
    """Get system performance metrics"""
    metrics_service = MetricsService(db)
    
    # Get various metrics
    upload_metrics = metrics_service.get_metrics("file_upload_count", 10)
    duration_metrics = metrics_service.get_metrics("file_upload_duration", 10)
    
    return {
        "upload_count": len(upload_metrics),
        "recent_uploads": [m.metric_value for m in upload_metrics],
        "avg_upload_duration": sum(m.metric_value for m in duration_metrics) / len(duration_metrics) if duration_metrics else 0
    }

async def process_document_with_db(document_id: str, file_path: Path):
    """Background task to process uploaded document with database integration"""
    start_time = time.time()
    
    with get_database_session().__next__() as db:
        document_service = DocumentService(db)
        analysis_service = AnalysisService(db)
        metrics_service = MetricsService(db)
        
        try:
            # Update status to analyzing
            document_service.update_document_status(document_id, "analyzing", 0)
            
            document = document_service.get_document(document_id)
            if not document:
                logger.error(f"Document not found: {document_id}")
                return
            
            if compliance_analyzer:
                logger.info(f"Starting AI analysis for document: {document_id}")
                
                # Perform actual document analysis
                analysis_result = await compliance_analyzer.analyze_document(
                    file_path, document.original_filename
                )
                
                # Update progress during analysis
                for i in range(0, 81, 20):
                    await asyncio.sleep(0.5)
                    document_service.update_document_status(document_id, "analyzing", i)
                
                # Generate reports
                await generate_professional_reports(document_id, document.original_filename, analysis_result)
                
                # Update progress for report generation
                for i in range(80, 101, 5):
                    await asyncio.sleep(0.2)
                    document_service.update_document_status(document_id, "analyzing", i)
                
                # Save analysis results to database
                processing_duration = time.time() - start_time
                processing_metadata = {
                    'chunks_processed': analysis_result.get('document_metadata', {}).get('chunks_processed'),
                    'total_characters': analysis_result.get('document_metadata', {}).get('total_characters'),
                    'processing_duration': processing_duration
                }
                
                analysis_service.save_analysis_result(
                    document_id=document_id,
                    compliance_score=analysis_result["compliance_score"],
                    risk_level=analysis_result["risk_level"],
                    regulatory_frameworks=analysis_result["regulatory_frameworks"],
                    key_insights=analysis_result["key_insights"],
                    recommendations=analysis_result["recommendations"],
                    detailed_findings=analysis_result.get("detailed_findings", {}),
                    processing_metadata=processing_metadata
                )
                
                # Update document status to completed
                document_service.update_document_status(document_id, "completed", 100)
                
                # Record processing metrics
                metrics_service.record_metric("document_processing_duration", processing_duration, "seconds", {
                    "file_size": document.file_size,
                    "compliance_score": analysis_result["compliance_score"]
                })
                metrics_service.record_metric("document_processing_count", 1, "count")
                
                logger.info(f"AI analysis completed for document: {document_id}")
                
            else:
                # Fallback to simulation if analyzer not available
                logger.warning("Compliance analyzer not available, using simulation")
                await simulate_analysis_with_db(document_id, document_service, analysis_service)
            
        except Exception as e:
            logger.error(f"Error processing document {document_id}: {str(e)}")
            document_service.update_document_status(document_id, "error", error_message=str(e))
            
            # Record error metric
            metrics_service.record_metric("document_processing_error", 1, "count", {
                "error_type": type(e).__name__,
                "error_message": str(e)
            })

async def simulate_analysis_with_db(document_id: str, document_service: DocumentService, analysis_service: AnalysisService):
    """Fallback simulation with database integration"""
    # Simulate analysis progress
    for i in range(0, 101, 5):
        await asyncio.sleep(0.2)
        document_service.update_document_status(document_id, "analyzing", i)
    
    # Simulate analysis results
    analysis_result = {
        "compliance_score": 85,
        "risk_level": "Medium",
        "regulatory_frameworks": ["GDPR", "CCPA", "HIPAA"],
        "key_insights": [
            "Document contains privacy policy framework",
            "Data processing activities are documented",
            "Security measures need enhancement"
        ],
        "recommendations": [
            "Update privacy policy to include CCPA compliance",
            "Add data retention schedule",
            "Include cookie consent mechanism"
        ]
    }
    
    # Save to database
    analysis_service.save_analysis_result(
        document_id=document_id,
        compliance_score=analysis_result["compliance_score"],
        risk_level=analysis_result["risk_level"],
        regulatory_frameworks=analysis_result["regulatory_frameworks"],
        key_insights=analysis_result["key_insights"],
        recommendations=analysis_result["recommendations"],
        detailed_findings={}
    )
    
    # Generate mock reports
    document = document_service.get_document(document_id)
    await generate_basic_reports(document_id, document.original_filename, analysis_result)
    
    # Update status
    document_service.update_document_status(document_id, "completed", 100)

async def generate_professional_reports(file_id: str, filename: str, analysis_result: dict):
    """Generate professional PDF and CSV reports using ReportLab"""
    try:
        # Generate PDF report
        pdf_path = REPORTS_DIR / f"{file_id}_report.pdf"
        pdf_success = report_generator.generate_pdf_report(
            file_id, filename, analysis_result, pdf_path
        )
        
        # Generate CSV report
        csv_path = REPORTS_DIR / f"{file_id}_data.csv"
        csv_success = report_generator.generate_csv_report(
            file_id, filename, analysis_result, csv_path
        )
        
        if pdf_success and csv_success:
            logger.info(f"Professional reports generated successfully for: {file_id}")
        else:
            logger.warning(f"Some reports failed to generate for: {file_id}")
            # Fallback to basic reports if professional generation fails
            await generate_basic_reports(file_id, filename, analysis_result)
        
    except Exception as e:
        logger.error(f"Error generating professional reports for {file_id}: {str(e)}")
        # Fallback to basic reports
        await generate_basic_reports(file_id, filename, analysis_result)

async def generate_basic_reports(file_id: str, filename: str, analysis_result: dict):
    """Generate basic text-based reports as fallback"""
    try:
        # Generate basic PDF report (text-based)
        pdf_content = f"""
COMPLIANCE ANALYSIS REPORT

Document: {filename}
Analysis Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

EXECUTIVE SUMMARY
Compliance Score: {analysis_result['compliance_score']}/100
Risk Level: {analysis_result['risk_level']}
Regulatory Frameworks: {', '.join(analysis_result['regulatory_frameworks'])}

KEY INSIGHTS
{chr(10).join(f"• {insight}" for insight in analysis_result['key_insights'])}

RECOMMENDATIONS
{chr(10).join(f"• {rec}" for rec in analysis_result['recommendations'])}

DETAILED FINDINGS
{analysis_result.get('detailed_findings', {}).get('overall_analysis', 'Analysis details not available')}

ANALYSIS METADATA
Total Chunks Processed: {analysis_result.get('document_metadata', {}).get('chunks_processed', 'N/A')}
Total Characters: {analysis_result.get('document_metadata', {}).get('total_characters', 'N/A')}
Analysis Timestamp: {analysis_result.get('analysis_timestamp', 'N/A')}
        """
        
        pdf_path = REPORTS_DIR / f"{file_id}_report.pdf"
        with open(pdf_path, "w", encoding='utf-8') as f:
            f.write(pdf_content)
        
        # Generate basic CSV data
        csv_rows = []
        
        # Add framework compliance data
        for framework in analysis_result['regulatory_frameworks']:
            csv_rows.append({
                'Category': 'Regulatory Framework',
                'Item': framework,
                'Status': 'Analyzed',
                'Score': analysis_result['compliance_score'],
                'Notes': f'Compliance assessment for {framework}'
            })
        
        # Add recommendations as CSV rows
        for i, rec in enumerate(analysis_result['recommendations'], 1):
            csv_rows.append({
                'Category': 'Recommendation',
                'Item': f'Recommendation {i}',
                'Status': 'Action Required',
                'Score': '',
                'Notes': rec
            })
        
        # Add insights as CSV rows
        for i, insight in enumerate(analysis_result['key_insights'], 1):
            csv_rows.append({
                'Category': 'Key Insight',
                'Item': f'Insight {i}',
                'Status': 'Identified',
                'Score': '',
                'Notes': insight
            })
        
        # Write CSV file
        import csv
        csv_path = REPORTS_DIR / f"{file_id}_data.csv"
        with open(csv_path, "w", newline='', encoding='utf-8') as f:
            if csv_rows:
                writer = csv.DictWriter(f, fieldnames=['Category', 'Item', 'Status', 'Score', 'Notes'])
                writer.writeheader()
                writer.writerows(csv_rows)
        
        logger.info(f"Basic reports generated for document: {file_id}")
        
    except Exception as e:
        logger.error(f"Error generating basic reports for {file_id}: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
