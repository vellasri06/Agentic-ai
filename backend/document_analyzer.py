import os
import asyncio
from pathlib import Path
from typing import Dict, List, Any, Optional
import logging
from datetime import datetime

# Document processing
from langchain.document_loaders import PyPDFLoader, Docx2txtLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.schema import Document
from langchain.chains import LLMChain
from langchain.prompts import PromptTemplate
from langchain_openai import ChatOpenAI
from langchain.chains.summarize import load_summarize_chain

# PDF and document processing
import PyPDF2
from docx import Document as DocxDocument
import pandas as pd

logger = logging.getLogger(__name__)

class ComplianceAnalyzer:
    """AI-powered compliance document analyzer using LangChain"""
    
    def __init__(self, openai_api_key: Optional[str] = None):
        self.openai_api_key = openai_api_key or os.getenv("OPENAI_API_KEY")
        if not self.openai_api_key:
            raise ValueError("OpenAI API key is required for document analysis")
        
        # Initialize LLM
        self.llm = ChatOpenAI(
            temperature=0.1,
            model_name="gpt-4",
            openai_api_key=self.openai_api_key
        )
        
        # Text splitter for large documents
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=4000,
            chunk_overlap=200,
            length_function=len,
        )
        
        # Compliance frameworks to analyze
        self.compliance_frameworks = {
            "GDPR": "General Data Protection Regulation",
            "CCPA": "California Consumer Privacy Act",
            "HIPAA": "Health Insurance Portability and Accountability Act",
            "SOX": "Sarbanes-Oxley Act",
            "PCI_DSS": "Payment Card Industry Data Security Standard",
            "ISO_27001": "ISO/IEC 27001 Information Security Management",
            "NIST": "NIST Cybersecurity Framework"
        }

    async def analyze_document(self, file_path: Path, filename: str) -> Dict[str, Any]:
        """Main method to analyze a document for compliance"""
        try:
            logger.info(f"Starting analysis of document: {filename}")
            
            # Load and parse document
            documents = await self._load_document(file_path)
            if not documents:
                raise ValueError("Could not extract text from document")
            
            # Split into chunks for processing
            chunks = self.text_splitter.split_documents(documents)
            logger.info(f"Document split into {len(chunks)} chunks")
            
            # Perform compliance analysis
            analysis_results = await self._perform_compliance_analysis(chunks, filename)
            
            # Generate compliance score
            compliance_score = self._calculate_compliance_score(analysis_results)
            
            # Extract key insights
            insights = await self._extract_key_insights(chunks)
            
            # Identify regulatory frameworks
            frameworks = await self._identify_regulatory_frameworks(chunks)
            
            # Assess risk level
            risk_level = self._assess_risk_level(compliance_score, analysis_results)
            
            result = {
                "compliance_score": compliance_score,
                "risk_level": risk_level,
                "regulatory_frameworks": frameworks,
                "detailed_findings": analysis_results,
                "key_insights": insights,
                "recommendations": self._generate_recommendations(analysis_results),
                "analysis_timestamp": datetime.now().isoformat(),
                "document_metadata": {
                    "filename": filename,
                    "chunks_processed": len(chunks),
                    "total_characters": sum(len(chunk.page_content) for chunk in chunks)
                }
            }
            
            logger.info(f"Analysis completed for {filename}")
            return result
            
        except Exception as e:
            logger.error(f"Error analyzing document {filename}: {str(e)}")
            raise

    async def _load_document(self, file_path: Path) -> List[Document]:
        """Load document based on file type"""
        file_extension = file_path.suffix.lower()
        
        try:
            if file_extension == ".pdf":
                loader = PyPDFLoader(str(file_path))
                return loader.load()
            elif file_extension in [".doc", ".docx"]:
                loader = Docx2txtLoader(str(file_path))
                return loader.load()
            else:
                raise ValueError(f"Unsupported file type: {file_extension}")
        except Exception as e:
            logger.error(f"Error loading document {file_path}: {str(e)}")
            return []

    async def _perform_compliance_analysis(self, chunks: List[Document], filename: str) -> Dict[str, Any]:
        """Perform detailed compliance analysis on document chunks"""
        
        # Compliance analysis prompt
        compliance_prompt = PromptTemplate(
            input_variables=["text", "frameworks"],
            template="""
            Analyze the following document text for compliance with major regulatory frameworks.
            
            Document Text:
            {text}
            
            Regulatory Frameworks to Consider:
            {frameworks}
            
            Please provide a detailed analysis including:
            1. Compliance status for each relevant framework
            2. Specific issues or gaps identified
            3. Sections that are compliant
            4. Missing elements or requirements
            5. Data protection and privacy concerns
            6. Security measures mentioned
            7. Risk assessment
            
            Format your response as a structured analysis with clear sections.
            """
        )
        
        compliance_chain = LLMChain(llm=self.llm, prompt=compliance_prompt)
        
        # Analyze each chunk
        chunk_analyses = []
        frameworks_text = "\n".join([f"- {code}: {name}" for code, name in self.compliance_frameworks.items()])
        
        for i, chunk in enumerate(chunks[:5]):  # Limit to first 5 chunks for efficiency
            try:
                analysis = await compliance_chain.arun(
                    text=chunk.page_content,
                    frameworks=frameworks_text
                )
                chunk_analyses.append({
                    "chunk_index": i,
                    "analysis": analysis,
                    "chunk_length": len(chunk.page_content)
                })
            except Exception as e:
                logger.error(f"Error analyzing chunk {i}: {str(e)}")
                continue
        
        # Synthesize overall analysis
        overall_analysis = await self._synthesize_analysis(chunk_analyses)
        
        return {
            "chunk_analyses": chunk_analyses,
            "overall_analysis": overall_analysis,
            "total_chunks_analyzed": len(chunk_analyses)
        }

    async def _synthesize_analysis(self, chunk_analyses: List[Dict]) -> str:
        """Synthesize individual chunk analyses into overall assessment"""
        
        synthesis_prompt = PromptTemplate(
            input_variables=["analyses"],
            template="""
            Based on the following individual section analyses of a compliance document,
            provide a comprehensive overall assessment:
            
            Individual Analyses:
            {analyses}
            
            Please provide:
            1. Overall compliance status
            2. Major compliance gaps
            3. Strengths in current compliance posture
            4. Priority areas for improvement
            5. Risk assessment summary
            
            Keep the response concise but comprehensive.
            """
        )
        
        synthesis_chain = LLMChain(llm=self.llm, prompt=synthesis_prompt)
        
        analyses_text = "\n\n".join([
            f"Section {analysis['chunk_index'] + 1}:\n{analysis['analysis']}"
            for analysis in chunk_analyses
        ])
        
        try:
            return await synthesis_chain.arun(analyses=analyses_text)
        except Exception as e:
            logger.error(f"Error synthesizing analysis: {str(e)}")
            return "Unable to generate comprehensive analysis due to processing error."

    async def _extract_key_insights(self, chunks: List[Document]) -> List[str]:
        """Extract key compliance insights from the document"""
        
        insights_prompt = PromptTemplate(
            input_variables=["text"],
            template="""
            Extract the top 5 most important compliance insights from this document text:
            
            {text}
            
            Focus on:
            - Data protection measures
            - Privacy policies
            - Security controls
            - Regulatory compliance statements
            - Risk management approaches
            
            Return only the insights as a numbered list, one insight per line.
            """
        )
        
        insights_chain = LLMChain(llm=self.llm, prompt=insights_prompt)
        
        # Combine first few chunks for insight extraction
        combined_text = "\n\n".join([chunk.page_content for chunk in chunks[:3]])
        
        try:
            insights_text = await insights_chain.arun(text=combined_text)
            # Parse insights into list
            insights = [
                line.strip().split('. ', 1)[-1] 
                for line in insights_text.split('\n') 
                if line.strip() and any(char.isdigit() for char in line[:3])
            ]
            return insights[:5]  # Return top 5
        except Exception as e:
            logger.error(f"Error extracting insights: {str(e)}")
            return ["Unable to extract specific insights due to processing error."]

    async def _identify_regulatory_frameworks(self, chunks: List[Document]) -> List[str]:
        """Identify which regulatory frameworks are relevant to the document"""
        
        framework_prompt = PromptTemplate(
            input_variables=["text", "frameworks"],
            template="""
            Based on the following document text, identify which regulatory frameworks are most relevant:
            
            Document Text:
            {text}
            
            Available Frameworks:
            {frameworks}
            
            Return only the framework codes (e.g., GDPR, CCPA, HIPAA) that are relevant to this document,
            separated by commas. Consider the document's content, industry context, and compliance requirements.
            """
        )
        
        framework_chain = LLMChain(llm=self.llm, prompt=framework_prompt)
        
        # Use first chunk for framework identification
        sample_text = chunks[0].page_content if chunks else ""
        frameworks_text = "\n".join([f"- {code}: {name}" for code, name in self.compliance_frameworks.items()])
        
        try:
            frameworks_text_result = await framework_chain.arun(
                text=sample_text,
                frameworks=frameworks_text
            )
            # Parse framework codes
            frameworks = [
                fw.strip() for fw in frameworks_text_result.split(',')
                if fw.strip() in self.compliance_frameworks
            ]
            return frameworks if frameworks else ["GDPR"]  # Default to GDPR
        except Exception as e:
            logger.error(f"Error identifying frameworks: {str(e)}")
            return ["GDPR", "CCPA"]  # Default frameworks

    def _calculate_compliance_score(self, analysis_results: Dict[str, Any]) -> int:
        """Calculate overall compliance score based on analysis results"""
        try:
            # Simple scoring algorithm based on analysis content
            overall_analysis = analysis_results.get("overall_analysis", "").lower()
            
            # Positive indicators
            positive_keywords = [
                "compliant", "adequate", "sufficient", "proper", "implemented",
                "secure", "protected", "documented", "established", "maintained"
            ]
            
            # Negative indicators
            negative_keywords = [
                "missing", "inadequate", "insufficient", "lacking", "absent",
                "non-compliant", "vulnerable", "weak", "incomplete", "outdated"
            ]
            
            positive_count = sum(1 for keyword in positive_keywords if keyword in overall_analysis)
            negative_count = sum(1 for keyword in negative_keywords if keyword in overall_analysis)
            
            # Base score calculation
            base_score = 70  # Start with neutral score
            positive_boost = min(positive_count * 5, 25)  # Max 25 points boost
            negative_penalty = min(negative_count * 8, 40)  # Max 40 points penalty
            
            score = max(0, min(100, base_score + positive_boost - negative_penalty))
            return int(score)
            
        except Exception as e:
            logger.error(f"Error calculating compliance score: {str(e)}")
            return 75  # Default score

    def _assess_risk_level(self, compliance_score: int, analysis_results: Dict[str, Any]) -> str:
        """Assess risk level based on compliance score and analysis"""
        if compliance_score >= 85:
            return "Low"
        elif compliance_score >= 70:
            return "Medium"
        elif compliance_score >= 50:
            return "High"
        else:
            return "Critical"

    def _generate_recommendations(self, analysis_results: Dict[str, Any]) -> List[str]:
        """Generate actionable recommendations based on analysis"""
        try:
            overall_analysis = analysis_results.get("overall_analysis", "").lower()
            
            recommendations = []
            
            # Common compliance recommendations based on analysis content
            if "privacy policy" in overall_analysis and "missing" in overall_analysis:
                recommendations.append("Develop comprehensive privacy policy addressing data collection and usage")
            
            if "data retention" in overall_analysis:
                recommendations.append("Implement clear data retention and deletion policies")
            
            if "consent" in overall_analysis and ("lacking" in overall_analysis or "missing" in overall_analysis):
                recommendations.append("Establish proper user consent mechanisms for data processing")
            
            if "security" in overall_analysis and ("weak" in overall_analysis or "inadequate" in overall_analysis):
                recommendations.append("Strengthen technical and organizational security measures")
            
            if "training" in overall_analysis:
                recommendations.append("Provide regular compliance training for staff members")
            
            # Default recommendations if none generated
            if not recommendations:
                recommendations = [
                    "Review and update privacy policies to ensure regulatory compliance",
                    "Implement regular compliance audits and assessments",
                    "Establish clear data governance procedures",
                    "Enhance security measures for data protection"
                ]
            
            return recommendations[:5]  # Return top 5 recommendations
            
        except Exception as e:
            logger.error(f"Error generating recommendations: {str(e)}")
            return ["Conduct comprehensive compliance review with legal counsel"]

# Utility functions for document processing
def extract_text_from_pdf(file_path: Path) -> str:
    """Extract text from PDF file"""
    try:
        with open(file_path, 'rb') as file:
            pdf_reader = PyPDF2.PdfReader(file)
            text = ""
            for page in pdf_reader.pages:
                text += page.extract_text() + "\n"
        return text
    except Exception as e:
        logger.error(f"Error extracting text from PDF {file_path}: {str(e)}")
        return ""

def extract_text_from_docx(file_path: Path) -> str:
    """Extract text from DOCX file"""
    try:
        doc = DocxDocument(file_path)
        text = ""
        for paragraph in doc.paragraphs:
            text += paragraph.text + "\n"
        return text
    except Exception as e:
        logger.error(f"Error extracting text from DOCX {file_path}: {str(e)}")
        return ""
