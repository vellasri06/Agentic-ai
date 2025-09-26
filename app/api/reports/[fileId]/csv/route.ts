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
      riskAreas: [
        { area: "Data Privacy", score: 85, status: "Compliant" },
        { area: "Terms of Service", score: 92, status: "Compliant" },
        { area: "Cookie Policy", score: 78, status: "Needs Review" },
        { area: "User Rights", score: 88, status: "Compliant" },
      ],
    }

    // Generate CSV content
    const csvContent = generateCSVContent(reportData)

    return new NextResponse(csvContent, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="compliance_data_${params.fileId}.csv"`,
      },
    })
  } catch (error) {
    console.error("Error generating CSV data:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

function generateCSVContent(data: any): string {
  const csvRows = [
    // Header row
    "Category,Item,Score,Status,Type",

    // Basic info
    `Document Info,File ID,${data.fileId},,Metadata`,
    `Document Info,File Name,${data.fileName},,Metadata`,
    `Document Info,Analysis Date,${new Date(data.analysisDate).toLocaleDateString()},,Metadata`,
    `Document Info,Overall Compliance Score,${data.complianceScore},,Score`,

    // Risk areas
    ...data.riskAreas.map((risk: any) => `Risk Assessment,${risk.area},${risk.score},${risk.status},Risk Area`),

    // Findings
    ...data.findings.map(
      (finding: string, index: number) => `Findings,Finding ${index + 1},,"${finding.replace(/"/g, '""')}",Finding`,
    ),

    // Recommendations
    ...data.recommendations.map(
      (rec: string, index: number) =>
        `Recommendations,Recommendation ${index + 1},,"${rec.replace(/"/g, '""')}",Recommendation`,
    ),
  ]

  return csvRows.join("\n")
}
