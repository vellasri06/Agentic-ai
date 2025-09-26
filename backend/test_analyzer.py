import pytest
import asyncio
from pathlib import Path
from document_analyzer import ComplianceAnalyzer
import tempfile
import os

@pytest.fixture
def analyzer():
    """Create a compliance analyzer instance for testing"""
    # Skip if no OpenAI API key available
    if not os.getenv("OPENAI_API_KEY"):
        pytest.skip("OpenAI API key not available for testing")
    
    return ComplianceAnalyzer()

@pytest.fixture
def sample_pdf():
    """Create a sample PDF file for testing"""
    content = """
    PRIVACY POLICY
    
    This privacy policy describes how we collect, use, and protect your personal data
    in accordance with GDPR and CCPA regulations.
    
    DATA COLLECTION
    We collect personal information when you use our services.
    
    DATA RETENTION
    We retain your data for as long as necessary to provide our services.
    
    SECURITY MEASURES
    We implement appropriate technical and organizational measures to protect your data.
    """
    
    with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False) as f:
        f.write(content)
        return Path(f.name)

@pytest.mark.asyncio
async def test_document_analysis(analyzer, sample_pdf):
    """Test basic document analysis functionality"""
    if not analyzer:
        pytest.skip("Analyzer not available")
    
    # Note: This would need a real PDF file for full testing
    # For now, we'll test the analyzer initialization
    assert analyzer.llm is not None
    assert analyzer.text_splitter is not None
    assert len(analyzer.compliance_frameworks) > 0

def test_compliance_score_calculation():
    """Test compliance score calculation logic"""
    analyzer = ComplianceAnalyzer.__new__(ComplianceAnalyzer)  # Create without __init__
    
    # Test positive analysis
    positive_analysis = {
        "overall_analysis": "The document is compliant and adequate with proper security measures implemented"
    }
    score = analyzer._calculate_compliance_score(positive_analysis)
    assert score > 70
    
    # Test negative analysis
    negative_analysis = {
        "overall_analysis": "The document is missing critical elements and has inadequate security measures"
    }
    score = analyzer._calculate_compliance_score(negative_analysis)
    assert score < 70

def test_risk_assessment():
    """Test risk level assessment"""
    analyzer = ComplianceAnalyzer.__new__(ComplianceAnalyzer)  # Create without __init__
    
    assert analyzer._assess_risk_level(90, {}) == "Low"
    assert analyzer._assess_risk_level(75, {}) == "Medium"
    assert analyzer._assess_risk_level(60, {}) == "High"
    assert analyzer._assess_risk_level(40, {}) == "Critical"

def test_recommendation_generation():
    """Test recommendation generation"""
    analyzer = ComplianceAnalyzer.__new__(ComplianceAnalyzer)  # Create without __init__
    
    analysis_with_issues = {
        "overall_analysis": "privacy policy missing and data retention lacking with weak security"
    }
    
    recommendations = analyzer._generate_recommendations(analysis_with_issues)
    assert len(recommendations) > 0
    assert any("privacy policy" in rec.lower() for rec in recommendations)
