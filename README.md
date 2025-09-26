# Agentic Compliance Officer

A production-ready AI-powered web application for regulatory document analysis and compliance reporting.

## 🚀 Features

- **Document Upload**: Seamless upload of PDF, DOC, and DOCX files with drag-and-drop interface
- **AI-Powered Analysis**: Advanced document analysis using LangChain and GPT-4
- **Compliance Reporting**: Professional PDF and CSV reports with detailed insights
- **Audit Trails**: Complete tracking of all document operations and system events
- **Real-time Progress**: Live status updates during document processing
- **Responsive Design**: Modern, mobile-first interface built with Next.js and Tailwind CSS

## 🏗️ Architecture

- **Frontend**: Next.js 15 with TypeScript and Tailwind CSS
- **Backend**: FastAPI with Python 3.11
- **Database**: PostgreSQL with SQLAlchemy ORM
- **AI/ML**: LangChain with OpenAI GPT-4
- **Caching**: Redis for session management
- **Deployment**: Docker with Docker Compose
- **CI/CD**: GitHub Actions and GitLab CI support

## 📋 Prerequisites

- Docker and Docker Compose
- Node.js 18+ and npm
- Python 3.11+
- OpenAI API key

## 🚀 Quick Start

### Development Setup

1. **Clone the repository**
   \`\`\`bash
   git clone https://github.com/your-username/agentic-compliance-officer.git
   cd agentic-compliance-officer
   \`\`\`

2. **Run the setup script**
   \`\`\`bash
   chmod +x scripts/setup.sh
   ./scripts/setup.sh
   \`\`\`

3. **Configure environment variables**
   \`\`\`bash
   cp .env.example .env
   # Edit .env and add your OpenAI API key
   \`\`\`

4. **Start the development environment**
   \`\`\`bash
   make dev
   \`\`\`

5. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - API Documentation: http://localhost:8000/docs

### Production Deployment

1. **Configure production environment**
   \`\`\`bash
   cp .env.example .env
   # Edit .env with production values
   \`\`\`

2. **Deploy with Docker Compose**
   \`\`\`bash
   make deploy
   \`\`\`

3. **Run health checks**
   \`\`\`bash
   make health
   \`\`\`

## 🛠️ Development

### Available Commands

\`\`\`bash
make help          # Show all available commands
make dev           # Start development environment
make test          # Run tests
make build         # Build production images
make logs          # Show application logs
make clean         # Clean up containers and volumes
make shell         # Open shell in backend container
make db-shell      # Open database shell
\`\`\`

### Project Structure

\`\`\`
agentic-compliance-officer/
├── app/                    # Next.js frontend
├── backend/               # FastAPI backend
│   ├── main.py           # Main application
│   ├── document_analyzer.py  # LangChain analysis
│   ├── report_generator.py   # PDF/CSV generation
│   ├── database.py       # Database models and services
│   └── requirements.txt  # Python dependencies
├── components/           # React components
├── scripts/             # Deployment and utility scripts
├── nginx/              # Nginx configuration
├── .github/workflows/  # GitHub Actions CI/CD
├── docker-compose.yml  # Production Docker setup
└── Makefile           # Development commands
\`\`\`

## 🧪 Testing

### Backend Tests
\`\`\`bash
cd backend
pytest --cov=. --cov-report=html
\`\`\`

### Frontend Tests
\`\`\`bash
npm test
npm run test:coverage
\`\`\`

### Integration Tests
\`\`\`bash
make test
\`\`\`

## 📊 Monitoring and Logging

- **Health Checks**: `/health` endpoint for monitoring
- **Audit Trails**: Complete logging of all operations
- **Metrics**: System performance tracking
- **Error Handling**: Comprehensive error logging and reporting

## 🔒 Security Features

- **Rate Limiting**: API rate limiting with Nginx
- **Input Validation**: Comprehensive file type and size validation
- **Security Headers**: OWASP recommended security headers
- **Database Security**: Parameterized queries and ORM protection
- **Container Security**: Non-root user containers

## 🚀 Deployment Options

### Docker Compose (Recommended)
\`\`\`bash
docker-compose up -d
\`\`\`

### Kubernetes
\`\`\`bash
# Kubernetes manifests available in k8s/ directory
kubectl apply -f k8s/
\`\`\`

### Cloud Deployment
- **AWS**: ECS, EKS, or Elastic Beanstalk
- **Google Cloud**: Cloud Run, GKE, or App Engine
- **Azure**: Container Instances, AKS, or App Service

## 📈 Performance

- **File Processing**: Handles files up to 50MB
- **Concurrent Users**: Supports 100+ concurrent users
- **Response Time**: < 2s for document upload, analysis varies by size
- **Scalability**: Horizontal scaling with load balancer

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: Check the `/docs` directory
- **Issues**: Report bugs on GitHub Issues
- **Discussions**: Join GitHub Discussions for questions

## 🔄 Changelog

See [CHANGELOG.md](CHANGELOG.md) for version history and updates.
