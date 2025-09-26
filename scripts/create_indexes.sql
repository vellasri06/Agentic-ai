-- Performance indexes for the Agentic Compliance Officer database

-- Documents table indexes
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON documents(created_at);
CREATE INDEX IF NOT EXISTS idx_documents_file_type ON documents(file_type);

-- Analysis results table indexes
CREATE INDEX IF NOT EXISTS idx_analysis_results_document_id ON analysis_results(document_id);
CREATE INDEX IF NOT EXISTS idx_analysis_results_compliance_score ON analysis_results(compliance_score);
CREATE INDEX IF NOT EXISTS idx_analysis_results_risk_level ON analysis_results(risk_level);
CREATE INDEX IF NOT EXISTS idx_analysis_results_created_at ON analysis_results(created_at);

-- Audit logs table indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_document_id ON audit_logs(document_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_event_type ON audit_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

-- System metrics table indexes
CREATE INDEX IF NOT EXISTS idx_system_metrics_metric_name ON system_metrics(metric_name);
CREATE INDEX IF NOT EXISTS idx_system_metrics_recorded_at ON system_metrics(recorded_at);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_documents_status_created_at ON documents(status, created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_document_event_time ON audit_logs(document_id, event_type, created_at);
