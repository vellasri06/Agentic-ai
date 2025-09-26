#!/bin/bash

# Setup script for Agentic Compliance Officer development environment

set -e

echo "🔧 Setting up Agentic Compliance Officer development environment..."

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3 first."
    exit 1
fi

echo "✅ All prerequisites are installed"

# Create environment file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cat > .env << EOF
# OpenAI API Key (required for document analysis)
OPENAI_API_KEY=your_openai_api_key_here

# LangChain API Key (optional)
LANGCHAIN_API_KEY=your_langchain_api_key_here

# Database configuration
DATABASE_URL=postgresql://compliance_user:compliance_pass@localhost:5432/compliance_db

# Redis configuration
REDIS_URL=redis://localhost:6379

# Environment
NODE_ENV=development
EOF
    echo "⚠️  Please edit .env file and add your API keys"
fi

# Install Node.js dependencies
echo "📦 Installing Node.js dependencies..."
npm install

# Install Python dependencies
echo "📦 Installing Python dependencies..."
cd backend
pip install -r requirements.txt
cd ..

# Build Docker images
echo "🐳 Building Docker images..."
docker-compose -f docker-compose.dev.yml build

# Start development environment
echo "🚀 Starting development environment..."
docker-compose -f docker-compose.dev.yml up -d

# Wait for services to be ready
echo "⏳ Waiting for services to start..."
sleep 10

# Initialize database
echo "🗄️ Initializing database..."
docker-compose -f docker-compose.dev.yml exec backend python scripts/init_database.py

echo "✅ Setup completed successfully!"
echo ""
echo "🎉 Your development environment is ready!"
echo ""
echo "📋 Next steps:"
echo "  1. Edit .env file and add your OpenAI API key"
echo "  2. Visit http://localhost:3000 to access the application"
echo "  3. API documentation is available at http://localhost:8000/docs"
echo ""
echo "🛠️  Useful commands:"
echo "  - make dev     : Start development environment"
echo "  - make logs    : View application logs"
echo "  - make test    : Run tests"
echo "  - make clean   : Clean up containers"
