#!/usr/bin/env python3
"""
Database initialization script for Agentic Compliance Officer
"""

import sys
import os
from pathlib import Path

# Add backend directory to path
backend_dir = Path(__file__).parent.parent / "backend"
sys.path.insert(0, str(backend_dir))

from database import init_database, get_db_session, MetricsService
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def main():
    """Initialize the database with tables and initial data"""
    try:
        # Initialize database tables
        logger.info("Initializing database tables...")
        init_database()
        
        # Add initial system metrics
        logger.info("Adding initial system metrics...")
        with get_db_session() as db:
            metrics_service = MetricsService(db)
            metrics_service.record_metric("system_initialized", 1, "count", {
                "version": "1.0.0",
                "initialization_date": "2024-01-01"
            })
        
        logger.info("Database initialization completed successfully!")
        
    except Exception as e:
        logger.error(f"Database initialization failed: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main()
