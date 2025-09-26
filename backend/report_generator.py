from reportlab.lib.pagesizes import letter, A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib.colors import HexColor, black, white, red, green, orange
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
from reportlab.platypus.tableofcontents import TableOfContents
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT, TA_JUSTIFY
from reportlab.graphics.shapes import Drawing, Rect
from reportlab.graphics.charts.piecharts import Pie
from reportlab.graphics.charts.barcharts import VerticalBarChart
from reportlab.graphics import renderPDF

import pandas as pd
import csv
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Any, Optional
import logging

logger = logging.getLogger(__name__)

class ComplianceReportGenerator:
    """Generate professional compliance reports in PDF and CSV formats"""
    
    def __init__(self):
        self.styles = getSampleStyleSheet()
        self._setup_custom_styles()
    
    def _setup_custom_styles(self):
        """Setup custom styles for the report"""
        # Title style
        self.styles.add(ParagraphStyle(
            name='CustomTitle',
            parent=self.styles['Title'],
            fontSize=24,
            spaceAfter=30,
            textColor=HexColor('#1f2937'),
            alignment=TA_CENTER
        ))
        
        # Heading styles
        self.styles.add(ParagraphStyle(
            name='CustomHeading1',
            parent=self.styles['Heading1'],
            fontSize=18,
            spaceAfter=12,
            spaceBefore=20,
            textColor=HexColor('#374151'),
            borderWidth=1,
            borderColor=HexColor('#e5e7eb'),
            borderPadding=5
        ))
        
        self.styles.add(ParagraphStyle(
            name='CustomHeading2',
            parent=self.styles['Heading2'],
            fontSize=14,
            spaceAfter=8,
            spaceBefore=12,
            textColor=HexColor('#4b5563')
        ))
        
        # Body text
        self.styles.add(ParagraphStyle(
            name='CustomBody',
            parent=self.styles['Normal'],
            fontSize=11,
            spaceAfter=6,
            alignment=TA_JUSTIFY,
            textColor=HexColor('#374151')
        ))
        
        # Bullet points
        self.styles.add(ParagraphStyle(
            name='BulletPoint',
            parent=self.styles['Normal'],
            fontSize=11,
            spaceAfter=4,
            leftIndent=20,
            bulletIndent=10,
            textColor=HexColor('#374151')
        ))
        
        # Executive summary
        self.styles.add(ParagraphStyle(
            name='ExecutiveSummary',
            parent=self.styles['Normal'],
            fontSize=12,
            spaceAfter=8,
            alignment=TA_JUSTIFY,
            textColor=HexColor('#1f2937'),
            backColor=HexColor('#f9fafb'),
            borderWidth=1,
            borderColor=HexColor('#e5e7eb'),
            borderPadding=10
        ))

    def generate_pdf_report(self, file_id: str, filename: str, analysis_result: Dict[str, Any], output_path: Path) -> bool:
        """Generate a comprehensive PDF compliance report"""
        try:
            doc = SimpleDocTemplate(
                str(output_path),
                pagesize=A4,
                rightMargin=72,
                leftMargin=72,
                topMargin=72,
                bottomMargin=18
            )
            
            story = []
            
            # Title page
            story.extend(self._create_title_page(filename, analysis_result))
            story.append(PageBreak())
            
            # Executive summary
            story.extend(self._create_executive_summary(analysis_result))
            story.append(Spacer(1, 20))
            
            # Compliance score visualization
            story.extend(self._create_score_section(analysis_result))
            story.append(Spacer(1, 20))
            
            # Key insights
            story.extend(self._create_insights_section(analysis_result))
            story.append(Spacer(1, 20))
            
            # Detailed findings
            story.extend(self._create_findings_section(analysis_result))
            story.append(Spacer(1, 20))
            
            # Recommendations
            story.extend(self._create_recommendations_section(analysis_result))
            story.append(Spacer(1, 20))
            
            # Regulatory frameworks
            story.extend(self._create_frameworks_section(analysis_result))
            story.append(Spacer(1, 20))
            
            # Appendix
            story.extend(self._create_appendix(analysis_result))
            
            # Build PDF
            doc.build(story)
            logger.info(f"PDF report generated successfully: {output_path}")
            return True
            
        except Exception as e:
            logger.error(f"Error generating PDF report: {str(e)}")
            return False

    def _create_title_page(self, filename: str, analysis_result: Dict[str, Any]) -> List:
        """Create the title page of the report"""
        story = []
        
        # Main title
        story.append(Paragraph("COMPLIANCE ANALYSIS REPORT", self.styles['CustomTitle']))
        story.append(Spacer(1, 40))
        
        # Document info table
        doc_info = [
            ['Document Name:', filename],
            ['Analysis Date:', datetime.now().strftime('%B %d, %Y at %I:%M %p')],
            ['Compliance Score:', f"{analysis_result.get('compliance_score', 'N/A')}/100"],
            ['Risk Level:', analysis_result.get('risk_level', 'Unknown')],
            ['Frameworks Analyzed:', ', '.join(analysis_result.get('regulatory_frameworks', []))]
        ]
        
        doc_table = Table(doc_info, colWidths=[2*inch, 4*inch])
        doc_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, -1), HexColor('#f3f4f6')),
            ('TEXTCOLOR', (0, 0), (-1, -1), black),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 12),
            ('GRID', (0, 0), (-1, -1), 1, HexColor('#e5e7eb')),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('ROWBACKGROUNDS', (0, 0), (-1, -1), [HexColor('#ffffff'), HexColor('#f9fafb')])
        ]))
        
        story.append(doc_table)
        story.append(Spacer(1, 60))
        
        # Disclaimer
        disclaimer = """
        This report has been generated using AI-powered analysis and should be reviewed by qualified 
        compliance professionals. The analysis is based on the document content and current regulatory 
        frameworks as of the analysis date. Organizations should conduct additional reviews and consult 
        with legal counsel for comprehensive compliance assessment.
        """
        story.append(Paragraph(disclaimer, self.styles['CustomBody']))
        
        return story

    def _create_executive_summary(self, analysis_result: Dict[str, Any]) -> List:
        """Create executive summary section"""
        story = []
        
        story.append(Paragraph("EXECUTIVE SUMMARY", self.styles['CustomHeading1']))
        
        # Summary content
        compliance_score = analysis_result.get('compliance_score', 0)
        risk_level = analysis_result.get('risk_level', 'Unknown')
        frameworks = analysis_result.get('regulatory_frameworks', [])
        
        summary_text = f"""
        This compliance analysis report evaluates the submitted document against major regulatory frameworks 
        including {', '.join(frameworks) if frameworks else 'standard compliance requirements'}. 
        
        The document achieved an overall compliance score of {compliance_score}/100, indicating a 
        {risk_level.lower()} risk level. The analysis identified key areas for improvement and provides 
        actionable recommendations to enhance compliance posture.
        
        Key findings include regulatory alignment assessment, gap analysis, and strategic recommendations 
        for maintaining and improving compliance standards.
        """
        
        story.append(Paragraph(summary_text, self.styles['ExecutiveSummary']))
        
        return story

    def _create_score_section(self, analysis_result: Dict[str, Any]) -> List:
        """Create compliance score visualization section"""
        story = []
        
        story.append(Paragraph("COMPLIANCE SCORE ANALYSIS", self.styles['CustomHeading1']))
        
        compliance_score = analysis_result.get('compliance_score', 0)
        risk_level = analysis_result.get('risk_level', 'Unknown')
        
        # Score interpretation table
        score_data = [
            ['Metric', 'Value', 'Assessment'],
            ['Overall Compliance Score', f'{compliance_score}/100', self._get_score_assessment(compliance_score)],
            ['Risk Level', risk_level, self._get_risk_description(risk_level)],
            ['Frameworks Analyzed', str(len(analysis_result.get('regulatory_frameworks', []))), 'Comprehensive Coverage'],
            ['Key Issues Identified', str(len(analysis_result.get('recommendations', []))), 'Action Items Available']
        ]
        
        score_table = Table(score_data, colWidths=[2.5*inch, 1.5*inch, 2.5*inch])
        score_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), HexColor('#374151')),
            ('TEXTCOLOR', (0, 0), (-1, 0), white),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 11),
            ('GRID', (0, 0), (-1, -1), 1, HexColor('#e5e7eb')),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [HexColor('#ffffff'), HexColor('#f9fafb')])
        ]))
        
        story.append(score_table)
        
        return story

    def _create_insights_section(self, analysis_result: Dict[str, Any]) -> List:
        """Create key insights section"""
        story = []
        
        story.append(Paragraph("KEY INSIGHTS", self.styles['CustomHeading1']))
        
        insights = analysis_result.get('key_insights', [])
        if insights:
            for i, insight in enumerate(insights, 1):
                story.append(Paragraph(f"{i}. {insight}", self.styles['BulletPoint']))
        else:
            story.append(Paragraph("No specific insights were identified during the analysis.", self.styles['CustomBody']))
        
        return story

    def _create_findings_section(self, analysis_result: Dict[str, Any]) -> List:
        """Create detailed findings section"""
        story = []
        
        story.append(Paragraph("DETAILED FINDINGS", self.styles['CustomHeading1']))
        
        detailed_findings = analysis_result.get('detailed_findings', {})
        overall_analysis = detailed_findings.get('overall_analysis', '')
        
        if overall_analysis:
            story.append(Paragraph(overall_analysis, self.styles['CustomBody']))
        else:
            story.append(Paragraph("Detailed analysis findings are not available.", self.styles['CustomBody']))
        
        # Add chunk analysis summary if available
        chunk_analyses = detailed_findings.get('chunk_analyses', [])
        if chunk_analyses:
            story.append(Paragraph("Document Section Analysis", self.styles['CustomHeading2']))
            story.append(Paragraph(f"The document was analyzed in {len(chunk_analyses)} sections for comprehensive coverage.", self.styles['CustomBody']))
        
        return story

    def _create_recommendations_section(self, analysis_result: Dict[str, Any]) -> List:
        """Create recommendations section"""
        story = []
        
        story.append(Paragraph("RECOMMENDATIONS", self.styles['CustomHeading1']))
        
        recommendations = analysis_result.get('recommendations', [])
        if recommendations:
            for i, recommendation in enumerate(recommendations, 1):
                story.append(Paragraph(f"{i}. {recommendation}", self.styles['BulletPoint']))
        else:
            story.append(Paragraph("No specific recommendations were generated.", self.styles['CustomBody']))
        
        return story

    def _create_frameworks_section(self, analysis_result: Dict[str, Any]) -> List:
        """Create regulatory frameworks section"""
        story = []
        
        story.append(Paragraph("REGULATORY FRAMEWORKS", self.styles['CustomHeading1']))
        
        frameworks = analysis_result.get('regulatory_frameworks', [])
        framework_descriptions = {
            'GDPR': 'General Data Protection Regulation - EU data protection and privacy regulation',
            'CCPA': 'California Consumer Privacy Act - California state privacy law',
            'HIPAA': 'Health Insurance Portability and Accountability Act - US healthcare privacy law',
            'SOX': 'Sarbanes-Oxley Act - US financial reporting and corporate governance',
            'PCI_DSS': 'Payment Card Industry Data Security Standard - Payment card data protection',
            'ISO_27001': 'ISO/IEC 27001 - International information security management standard',
            'NIST': 'NIST Cybersecurity Framework - US cybersecurity guidelines'
        }
        
        if frameworks:
            framework_data = [['Framework', 'Description']]
            for framework in frameworks:
                description = framework_descriptions.get(framework, 'Regulatory compliance framework')
                framework_data.append([framework, description])
            
            framework_table = Table(framework_data, colWidths=[1.5*inch, 4.5*inch])
            framework_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), HexColor('#374151')),
                ('TEXTCOLOR', (0, 0), (-1, 0), white),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
                ('FONTSIZE', (0, 0), (-1, -1), 10),
                ('GRID', (0, 0), (-1, -1), 1, HexColor('#e5e7eb')),
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                ('ROWBACKGROUNDS', (0, 1), (-1, -1), [HexColor('#ffffff'), HexColor('#f9fafb')])
            ]))
            
            story.append(framework_table)
        else:
            story.append(Paragraph("No specific regulatory frameworks were identified.", self.styles['CustomBody']))
        
        return story

    def _create_appendix(self, analysis_result: Dict[str, Any]) -> List:
        """Create appendix section"""
        story = []
        
        story.append(Paragraph("APPENDIX", self.styles['CustomHeading1']))
        
        # Analysis metadata
        metadata = analysis_result.get('document_metadata', {})
        analysis_timestamp = analysis_result.get('analysis_timestamp', datetime.now().isoformat())
        
        appendix_data = [
            ['Analysis Timestamp', analysis_timestamp],
            ['Chunks Processed', str(metadata.get('chunks_processed', 'N/A'))],
            ['Total Characters', str(metadata.get('total_characters', 'N/A'))],
            ['Analysis Method', 'AI-Powered LangChain Analysis'],
            ['Report Generated', datetime.now().strftime('%Y-%m-%d %H:%M:%S')]
        ]
        
        appendix_table = Table(appendix_data, colWidths=[2*inch, 4*inch])
        appendix_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, -1), HexColor('#f3f4f6')),
            ('TEXTCOLOR', (0, 0), (-1, -1), black),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('GRID', (0, 0), (-1, -1), 1, HexColor('#e5e7eb')),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE')
        ]))
        
        story.append(appendix_table)
        
        return story

    def generate_csv_report(self, file_id: str, filename: str, analysis_result: Dict[str, Any], output_path: Path) -> bool:
        """Generate detailed CSV report with structured data"""
        try:
            csv_data = []
            
            # Document metadata
            csv_data.append({
                'Category': 'Document Info',
                'Item': 'Filename',
                'Value': filename,
                'Score': '',
                'Status': 'Processed',
                'Notes': f"Analyzed on {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"
            })
            
            csv_data.append({
                'Category': 'Document Info',
                'Item': 'Analysis Timestamp',
                'Value': analysis_result.get('analysis_timestamp', datetime.now().isoformat()),
                'Score': '',
                'Status': 'Completed',
                'Notes': 'AI-powered compliance analysis'
            })
            
            # Overall compliance metrics
            csv_data.append({
                'Category': 'Compliance Metrics',
                'Item': 'Overall Compliance Score',
                'Value': f"{analysis_result.get('compliance_score', 0)}/100",
                'Score': analysis_result.get('compliance_score', 0),
                'Status': self._get_score_assessment(analysis_result.get('compliance_score', 0)),
                'Notes': f"Risk Level: {analysis_result.get('risk_level', 'Unknown')}"
            })
            
            # Regulatory frameworks
            frameworks = analysis_result.get('regulatory_frameworks', [])
            for framework in frameworks:
                csv_data.append({
                    'Category': 'Regulatory Framework',
                    'Item': framework,
                    'Value': 'Analyzed',
                    'Score': analysis_result.get('compliance_score', 0),
                    'Status': 'Assessed',
                    'Notes': f'Compliance assessment for {framework} framework'
                })
            
            # Key insights
            insights = analysis_result.get('key_insights', [])
            for i, insight in enumerate(insights, 1):
                csv_data.append({
                    'Category': 'Key Insight',
                    'Item': f'Insight {i}',
                    'Value': insight,
                    'Score': '',
                    'Status': 'Identified',
                    'Notes': 'AI-generated compliance insight'
                })
            
            # Recommendations
            recommendations = analysis_result.get('recommendations', [])
            for i, recommendation in enumerate(recommendations, 1):
                csv_data.append({
                    'Category': 'Recommendation',
                    'Item': f'Action Item {i}',
                    'Value': recommendation,
                    'Score': '',
                    'Status': 'Action Required',
                    'Notes': 'Recommended compliance improvement'
                })
            
            # Document processing metadata
            metadata = analysis_result.get('document_metadata', {})
            if metadata:
                csv_data.append({
                    'Category': 'Processing Info',
                    'Item': 'Chunks Processed',
                    'Value': str(metadata.get('chunks_processed', 'N/A')),
                    'Score': '',
                    'Status': 'Completed',
                    'Notes': 'Document sections analyzed'
                })
                
                csv_data.append({
                    'Category': 'Processing Info',
                    'Item': 'Total Characters',
                    'Value': str(metadata.get('total_characters', 'N/A')),
                    'Score': '',
                    'Status': 'Processed',
                    'Notes': 'Character count of analyzed content'
                })
            
            # Write CSV file
            with open(output_path, 'w', newline='', encoding='utf-8') as csvfile:
                fieldnames = ['Category', 'Item', 'Value', 'Score', 'Status', 'Notes']
                writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
                writer.writeheader()
                writer.writerows(csv_data)
            
            logger.info(f"CSV report generated successfully: {output_path}")
            return True
            
        except Exception as e:
            logger.error(f"Error generating CSV report: {str(e)}")
            return False

    def _get_score_assessment(self, score: int) -> str:
        """Get assessment text based on compliance score"""
        if score >= 90:
            return "Excellent"
        elif score >= 80:
            return "Good"
        elif score >= 70:
            return "Satisfactory"
        elif score >= 60:
            return "Needs Improvement"
        else:
            return "Poor"

    def _get_risk_description(self, risk_level: str) -> str:
        """Get risk level description"""
        descriptions = {
            "Low": "Minimal compliance risks identified",
            "Medium": "Moderate compliance risks require attention",
            "High": "Significant compliance risks need immediate action",
            "Critical": "Critical compliance gaps require urgent remediation"
        }
        return descriptions.get(risk_level, "Risk level assessment unavailable")
