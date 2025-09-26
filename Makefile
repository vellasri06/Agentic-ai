# Makefile for Agentic Compliance Officer

.PHONY: help install dev build test clean deploy

# Default target
help:
	@echo "Available commands:"
	@echo "  install     - Install dependencies"
	@echo "  dev         - Start development environment"
	@echo "  build       - Build production images"
	@echo "  test        - Run tests"
	@echo "  clean       - Clean up containers and volumes"
	@echo "  deploy      - Deploy to production"
	@echo "  logs        - Show application logs"
	@echo "  shell       - Open shell in backend container"

# Install dependencies
install:
	npm install
	cd backend && pip install -r requirements.txt

# Start development environment
dev:
	docker-compose -f docker-compose.dev.yml up --build

# Build production images
build:
	docker-compose build

# Run tests
test:
	npm test
	cd backend && pytest

# Clean up
clean:
	docker-compose down -v
	docker system prune -f

# Deploy to production
deploy:
	docker-compose up -d --build

# Show logs
logs:
	docker-compose logs -f

# Backend shell
shell:
	docker-compose exec backend bash

# Database shell
db-shell:
	docker-compose exec db psql -U compliance_user -d compliance_db

# Initialize database
init-db:
	docker-compose exec backend python scripts/init_database.py

# Backup database
backup-db:
	docker-compose exec db pg_dump -U compliance_user compliance_db > backup_$(shell date +%Y%m%d_%H%M%S).sql

# Restore database
restore-db:
	@read -p "Enter backup file path: " backup_file; \
	docker-compose exec -T db psql -U compliance_user compliance_db < $$backup_file

# Health check
health:
	curl -f http://localhost:8000/health || exit 1
	curl -f http://localhost:3000 || exit 1

# Performance test
perf-test:
	@echo "Running performance tests..."
	@echo "This would run load testing tools like Apache Bench or Artillery"
