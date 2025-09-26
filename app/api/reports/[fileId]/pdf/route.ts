import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest, { params }: { params: { fileId: string } }) {
  try {
    const reportData = {
      fileId: params.fileId,
      fileName: `document_${params.fileId}.pdf`,
      analysisDate: new Date().toISOString(),
      complianceScore: Math.floor(Math.random() * 30) + 70, // 70-100
      findings: [
        "Document contains required privacy policy sections",
        "Terms of service are clearly defined",
        "Data retention policies are specified",
        "User consent mechanisms are implemented",
      ],
      recommendations: [
        "Consider adding more specific GDPR compliance clauses",
        "Update cookie policy to reflect current practices",
        "Add clearer data subject rights information",
      ],
    }

    // Generate simple PDF content (mock implementation)
    const pdfContent = generatePDFContent(reportData)

    // Convert to blob
    const blob = new Blob([pdfContent], { type: "application/pdf" })

    return new NextResponse(blob, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="compliance_report_${params.fileId}.pdf"`,
      },
    })
  } catch (error) {
    console.error("Error generating PDF report:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

function generatePDFContent(data: any): string {
  // Simple PDF-like content (this would normally use a proper PDF library)
  return `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj

2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj

3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
>>
endobj

4 0 obj
<<
/Length 200
>>
stream
BT
/F1 12 Tf
50 750 Td
(Compliance Analysis Report) Tj
0 -20 Td
(File: ${data.fileName}) Tj
0 -20 Td
(Analysis Date: ${new Date(data.analysisDate).toLocaleDateString()}) Tj
0 -20 Td
(Compliance Score: ${data.complianceScore}%) Tj
0 -40 Td
(Key Findings:) Tj
${data.findings.map((finding: string, index: number) => `0 -15 Td (${index + 1}. ${finding}) Tj`).join("\n")}
0 -40 Td
(Recommendations:) Tj
${data.recommendations.map((rec: string, index: number) => `0 -15 Td (${index + 1}. ${rec}) Tj`).join("\n")}
ET
endstream
endobj

xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000206 00000 n 
trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
456
%%EOF`
}
