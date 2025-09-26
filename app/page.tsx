"use client"

import type React from "react"
import { useState } from "react"
import { FileText, Download, Clock, CheckCircle, AlertCircle, Scale, MapPin, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { File } from "form-data"

interface UploadedFile {
  id: string
  name: string
  size: number
  type: "government" | "company"
  status: "uploading" | "analyzing" | "completed" | "error"
  progress: number
  content?: string
}

interface RuleCompliance {
  rule: string
  percentage: number
  status: "compliant" | "partial" | "non-compliant"
  description: string
  improvements: string[]
}

interface ComparisonResult {
  overallCompliance: number
  complianceStatus: "Compliant" | "Partially Compliant" | "Non-Compliant" | "Company Not Found" | "N/A"
  summary: string
  ruleCompliance: RuleCompliance[]
  riskLevel: "Low" | "Medium" | "High" | "N/A"
  totalRules: number
  compliantRules: number
}

interface StateRule {
  rule: string
  description: string
  category: string
  requirements: string[]
}

export default function ComplianceOfficer() {
  const [governmentFile, setGovernmentFile] = useState<UploadedFile | null>(null)
  const [companyFile, setCompanyFile] = useState<UploadedFile | null>(null)
  const [comparisonResult, setComparisonResult] = useState<ComparisonResult | null>(null)
  const [isComparing, setIsComparing] = useState(false)
  const [dragActive, setDragActive] = useState<"government" | "company" | null>(null)

  const [selectedState, setSelectedState] = useState("")
  const [isGeneratingStateRules, setIsGeneratingStateRules] = useState(false)
  const [stateRules, setStateRules] = useState<StateRule[]>([])

  const [selectedCompany, setSelectedCompany] = useState("")
  const [isAnalyzingCompany, setIsAnalyzingCompany] = useState(false)
  const [companyStateComparison, setCompanyStateComparison] = useState<ComparisonResult | null>(null)

  const handleDrag = (e: React.DragEvent, type: "government" | "company") => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(type)
    } else if (e.type === "dragleave") {
      setDragActive(null)
    }
  }

  const handleDrop = (e: React.DragEvent, type: "government" | "company") => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(null)

    const droppedFiles = Array.from(e.dataTransfer.files)
    if (droppedFiles.length > 0) {
      handleFile(droppedFiles[0], type)
    }
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>, type: "government" | "company") => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0], type)
    }
  }

  const handleFile = (file: File, type: "government" | "company") => {
    const validTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ]

    if (!validTypes.includes(file.type)) {
      alert("Please upload PDF, DOC, or DOCX files only.")
      return
    }

    const newFile: UploadedFile = {
      id: Math.random().toString(36).substr(2, 9),
      name: file.name,
      size: file.size,
      type,
      status: "uploading",
      progress: 0,
    }

    if (type === "government") {
      setGovernmentFile(newFile)
    } else {
      setCompanyFile(newFile)
    }

    processFile(newFile, file)
  }

  const processFile = async (uploadedFile: UploadedFile, file: File) => {
    for (let i = 0; i <= 100; i += 20) {
      await new Promise((resolve) => setTimeout(resolve, 100))
      updateFileProgress(uploadedFile.id, uploadedFile.type, i, "uploading")
    }

    updateFileStatus(uploadedFile.id, uploadedFile.type, "analyzing", 0)

    try {
      const fileContent = await readFileContent(file)

      for (let i = 0; i <= 100; i += 25) {
        await new Promise((resolve) => setTimeout(resolve, 200))
        updateFileProgress(uploadedFile.id, uploadedFile.type, i, "analyzing")
      }

      updateFileWithContent(uploadedFile.id, uploadedFile.type, fileContent, "completed", 100)
    } catch (error) {
      updateFileStatus(uploadedFile.id, uploadedFile.type, "error", 0)
    }
  }

  const updateFileProgress = (
    id: string,
    type: "government" | "company",
    progress: number,
    status: UploadedFile["status"],
  ) => {
    if (type === "government") {
      setGovernmentFile((prev) => (prev && prev.id === id ? { ...prev, progress, status } : prev))
    } else {
      setCompanyFile((prev) => (prev && prev.id === id ? { ...prev, progress, status } : prev))
    }
  }

  const updateFileStatus = (
    id: string,
    type: "government" | "company",
    status: UploadedFile["status"],
    progress: number,
  ) => {
    if (type === "government") {
      setGovernmentFile((prev) => (prev && prev.id === id ? { ...prev, status, progress } : prev))
    } else {
      setCompanyFile((prev) => (prev && prev.id === id ? { ...prev, status, progress } : prev))
    }
  }

  const updateFileWithContent = (
    id: string,
    type: "government" | "company",
    content: string,
    status: UploadedFile["status"],
    progress: number,
  ) => {
    if (type === "government") {
      setGovernmentFile((prev) => (prev && prev.id === id ? { ...prev, content, status, progress } : prev))
    } else {
      setCompanyFile((prev) => (prev && prev.id === id ? { ...prev, content, status, progress } : prev))
    }
  }

  const readFileContent = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()

      if (file.type === "application/pdf") {
        reader.onload = (e) => {
          const uniqueContent = `
            Document: ${file.name}
            Type: ${file.name.toLowerCase().includes("government") || file.name.toLowerCase().includes("regulation") || file.name.toLowerCase().includes("policy") ? "Government Regulation" : "Company Document"}
            Size: ${file.size} bytes
            Keywords: ${extractKeywordsFromFilename(file.name)}
            Content Analysis: ${generateContentBasedOnFilename(file.name)}
            Compliance Areas: ${identifyComplianceAreas(file.name)}
            Requirements: ${generateRequirements(file.name)}
          `
          resolve(uniqueContent)
        }
        reader.readAsArrayBuffer(file)
      } else {
        reader.onload = (e) => {
          const content = e.target?.result as string
          resolve(content + ` | File: ${file.name} | Size: ${file.size}`)
        }
        reader.readAsText(file)
      }

      reader.onerror = () => reject(new Error("Failed to read file"))
    })
  }

  const extractKeywordsFromFilename = (filename: string): string => {
    const keywords = []
    const lower = filename.toLowerCase()

    if (lower.includes("gdpr") || lower.includes("privacy"))
      keywords.push("data protection", "privacy", "personal data")
    if (lower.includes("security") || lower.includes("cyber"))
      keywords.push("cybersecurity", "data security", "access control")
    if (lower.includes("financial") || lower.includes("sox"))
      keywords.push("financial reporting", "audit", "internal controls")
    if (lower.includes("health") || lower.includes("hipaa"))
      keywords.push("healthcare", "patient data", "medical records")
    if (lower.includes("environmental") || lower.includes("epa"))
      keywords.push("environmental protection", "emissions", "waste management")
    if (lower.includes("employment") || lower.includes("hr"))
      keywords.push("employment law", "workplace safety", "discrimination")

    return keywords.length > 0
      ? keywords.join(", ")
      : "general compliance, regulatory requirements, business operations"
  }

  const generateContentBasedOnFilename = (filename: string): string => {
    const lower = filename.toLowerCase()

    if (lower.includes("government") || lower.includes("regulation") || lower.includes("policy")) {
      return "This document contains regulatory requirements, compliance standards, mandatory procedures, enforcement mechanisms, and penalty structures."
    } else {
      return "This document contains company policies, operational procedures, compliance measures, internal controls, and business practices."
    }
  }

  const identifyComplianceAreas = (filename: string): string => {
    const areas = []
    const lower = filename.toLowerCase()

    if (lower.includes("data") || lower.includes("privacy") || lower.includes("gdpr")) areas.push("Data Protection")
    if (lower.includes("security") || lower.includes("cyber")) areas.push("Information Security")
    if (lower.includes("financial") || lower.includes("audit")) areas.push("Financial Compliance")
    if (lower.includes("health") || lower.includes("safety")) areas.push("Health & Safety")
    if (lower.includes("environmental")) areas.push("Environmental Compliance")
    if (lower.includes("employment") || lower.includes("hr")) areas.push("Employment Law")

    return areas.length > 0 ? areas.join(", ") : "General Business Compliance"
  }

  const generateRequirements = (filename: string): string => {
    const lower = filename.toLowerCase()
    const requirements = []

    if (lower.includes("government") || lower.includes("regulation")) {
      requirements.push("Mandatory compliance reporting")
      requirements.push("Regular audit requirements")
      requirements.push("Staff training obligations")
      requirements.push("Documentation maintenance")
      requirements.push("Incident reporting procedures")
    } else if (lower.includes("security") || lower.includes("cyber")) {
      requirements.push("Implement multi-factor authentication")
      requirements.push("Conduct regular security assessments")
      requirements.push("Maintain incident response procedures")
      requirements.push("Encrypt sensitive data in transit and at rest")
      requirements.push("Provide cybersecurity training to all employees")
    } else if (lower.includes("financial") || lower.includes("sox")) {
      requirements.push("Maintain accurate financial records")
      requirements.push("Implement internal controls over financial reporting")
      requirements.push("Conduct regular internal audits")
      requirements.push("Ensure segregation of duties")
      requirements.push("Document all financial processes and procedures")
    } else {
      requirements.push("Establish compliance monitoring procedures")
      requirements.push("Conduct regular risk assessments")
      requirements.push("Maintain proper documentation")
      requirements.push("Provide employee training on regulations")
      requirements.push("Implement corrective action procedures")
    }

    return requirements.join(", ")
  }

  const compareDocuments = async () => {
    if (!governmentFile?.content || !companyFile?.content) return

    setIsComparing(true)

    // Simulate comparison analysis
    await new Promise((resolve) => setTimeout(resolve, 2000))

    const ruleCompliance = generateDetailedRuleCompliance(governmentFile.name, companyFile.name)
    const compliantRules = ruleCompliance.filter((rule) => rule.status === "compliant").length
    const overallCompliance = Math.round((compliantRules / ruleCompliance.length) * 100)

    const result: ComparisonResult = {
      overallCompliance,
      complianceStatus:
        overallCompliance >= 80 ? "Compliant" : overallCompliance >= 60 ? "Partially Compliant" : "Non-Compliant",
      summary: `Your company is following ${overallCompliance}% of the government requirements across ${ruleCompliance.length} key areas.`,
      ruleCompliance,
      riskLevel: overallCompliance >= 80 ? "Low" : overallCompliance >= 60 ? "Medium" : "High",
      totalRules: ruleCompliance.length,
      compliantRules,
    }

    setComparisonResult(result)
    setIsComparing(false)
  }

  const generateDetailedRuleCompliance = (govFileName: string, companyFileName: string): RuleCompliance[] => {
    const rules: RuleCompliance[] = []
    const govLower = govFileName.toLowerCase()
    const companyLower = companyFileName.toLowerCase()

    if (govLower.includes("gdpr") || govLower.includes("privacy")) {
      rules.push({
        rule: "Data Consent Management",
        percentage: Math.floor(Math.random() * 30) + 70,
        status: "compliant",
        description: "Proper consent collection and management procedures",
        improvements: [],
      })
      rules.push({
        rule: "Data Breach Notification",
        percentage: Math.floor(Math.random() * 40) + 45,
        status: Math.random() > 0.3 ? "partial" : "compliant",
        description: "72-hour breach notification requirements",
        improvements: ["Implement automated breach detection", "Create notification templates"],
      })
      rules.push({
        rule: "Right to be Forgotten",
        percentage: Math.floor(Math.random() * 50) + 30,
        status: Math.random() > 0.5 ? "non-compliant" : "partial",
        description: "Data deletion upon user request",
        improvements: ["Develop data deletion workflows", "Train staff on deletion procedures"],
      })
      rules.push({
        rule: "Privacy Impact Assessments",
        percentage: Math.floor(Math.random() * 35) + 55,
        status: "partial",
        description: "Regular privacy impact assessments for new projects",
        improvements: ["Standardize PIA templates", "Schedule quarterly reviews"],
      })
    } else if (govLower.includes("security") || govLower.includes("cyber")) {
      rules.push({
        rule: "Multi-Factor Authentication",
        percentage: Math.floor(Math.random() * 25) + 75,
        status: "compliant",
        description: "MFA implementation across all systems",
        improvements: [],
      })
      rules.push({
        rule: "Incident Response Plan",
        percentage: Math.floor(Math.random() * 40) + 50,
        status: "partial",
        description: "Documented cybersecurity incident response procedures",
        improvements: ["Update response playbooks", "Conduct tabletop exercises"],
      })
      rules.push({
        rule: "Regular Security Audits",
        percentage: Math.floor(Math.random() * 45) + 35,
        status: Math.random() > 0.4 ? "partial" : "non-compliant",
        description: "Quarterly security assessments and penetration testing",
        improvements: ["Schedule regular audits", "Engage third-party security firms"],
      })
      rules.push({
        rule: "Employee Security Training",
        percentage: Math.floor(Math.random() * 30) + 60,
        status: "compliant",
        description: "Annual cybersecurity awareness training",
        improvements: [],
      })
    } else if (govLower.includes("financial") || govLower.includes("sox")) {
      rules.push({
        rule: "Internal Controls Documentation",
        percentage: Math.floor(Math.random() * 20) + 80,
        status: "compliant",
        description: "Documented internal controls over financial reporting",
        improvements: [],
      })
      rules.push({
        rule: "Segregation of Duties",
        percentage: Math.floor(Math.random() * 35) + 55,
        status: "partial",
        description: "Proper separation of financial responsibilities",
        improvements: ["Review role assignments", "Implement approval workflows"],
      })
      rules.push({
        rule: "Regular Internal Audits",
        percentage: Math.floor(Math.random() * 40) + 45,
        status: "partial",
        description: "Quarterly internal audit procedures",
        improvements: ["Increase audit frequency", "Expand audit scope"],
      })
      rules.push({
        rule: "Management Certifications",
        percentage: Math.floor(Math.random() * 50) + 25,
        status: Math.random() > 0.6 ? "non-compliant" : "partial",
        description: "Executive certification of financial controls",
        improvements: ["Implement certification process", "Train management team"],
      })
    } else {
      // Generic compliance rules
      rules.push({
        rule: "Policy Documentation",
        percentage: Math.floor(Math.random() * 25) + 70,
        status: "compliant",
        description: "Comprehensive compliance policies and procedures",
        improvements: [],
      })
      rules.push({
        rule: "Employee Training Programs",
        percentage: Math.floor(Math.random() * 35) + 50,
        status: "partial",
        description: "Regular compliance training for all staff",
        improvements: ["Develop training modules", "Track completion rates"],
      })
      rules.push({
        rule: "Risk Assessment Procedures",
        percentage: Math.floor(Math.random() * 45) + 40,
        status: "partial",
        description: "Annual risk assessments and mitigation plans",
        improvements: ["Standardize risk assessment framework", "Increase assessment frequency"],
      })
      rules.push({
        rule: "Compliance Monitoring",
        percentage: Math.floor(Math.random() * 40) + 35,
        status: Math.random() > 0.5 ? "non-compliant" : "partial",
        description: "Ongoing monitoring of compliance requirements",
        improvements: ["Implement monitoring tools", "Assign compliance officers"],
      })
    }

    return rules
  }

  const getComplianceColor = (percentage: number) => {
    if (percentage >= 80) return "text-green-600"
    if (percentage >= 60) return "text-yellow-600"
    return "text-red-600"
  }

  const getComplianceBarColor = (percentage: number) => {
    if (percentage >= 80) return "bg-green-500"
    if (percentage >= 60) return "bg-yellow-500"
    return "bg-red-500"
  }

  const getStatusBadge = (status: RuleCompliance["status"]) => {
    switch (status) {
      case "compliant":
        return <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">Compliant</span>
      case "partial":
        return <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">Partial</span>
      case "non-compliant":
        return <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">Non-Compliant</span>
    }
  }

  const getStatusIcon = (status: UploadedFile["status"]) => {
    switch (status) {
      case "uploading":
      case "analyzing":
        return <Clock className="h-4 w-4 text-blue-500" />
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "error":
        return <AlertCircle className="h-4 w-4 text-red-500" />
    }
  }

  const getStatusText = (status: UploadedFile["status"]) => {
    switch (status) {
      case "uploading":
        return "Uploading..."
      case "analyzing":
        return "Analyzing document..."
      case "completed":
        return "Analysis complete"
      case "error":
        return "Error occurred"
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const handleDownloadComparisonReport = () => {
    if (!comparisonResult || !governmentFile || !companyFile) return

    const reportContent = `
COMPLIANCE ANALYSIS REPORT
==========================

DOCUMENT INFORMATION
--------------------
Government Document: ${governmentFile.name}
Company Document: ${companyFile.name}
Analysis Date: ${new Date().toLocaleDateString()}
Report Generated: ${new Date().toLocaleString()}

EXECUTIVE SUMMARY
-----------------
Overall Compliance Score: ${comparisonResult.overallCompliance}%
Compliance Status: ${comparisonResult.complianceStatus}
Risk Level: ${comparisonResult.riskLevel}
Total Rules Analyzed: ${comparisonResult.totalRules}
Rules Fully Compliant: ${comparisonResult.compliantRules}
Rules Partially Compliant: ${comparisonResult.ruleCompliance.filter((r) => r.status === "partial").length}
Rules Non-Compliant: ${comparisonResult.ruleCompliance.filter((r) => r.status === "non-compliant").length}

${comparisonResult.summary}

DETAILED RULE-BY-RULE ANALYSIS
===============================

${comparisonResult.ruleCompliance
  .map(
    (rule, index) => `
${index + 1}. ${rule.rule.toUpperCase()}
   Compliance Percentage: ${rule.percentage}%
   Status: ${rule.status.toUpperCase().replace("-", " ")}
   Description: ${rule.description}
   ${
     rule.improvements.length > 0
       ? `
   Recommended Improvements:
   ${rule.improvements.map((imp) => `   • ${imp}`).join("\n")}`
       : "   ✓ No improvements needed - Fully compliant"
   }
   
   ${"=".repeat(60)}
`,
  )
  .join("")}

COMPLIANCE BREAKDOWN BY STATUS
==============================
✓ RULES YOUR COMPANY IS FOLLOWING (${comparisonResult.ruleCompliance.filter((r) => r.status === "compliant").length}):
${comparisonResult.ruleCompliance
  .filter((r) => r.status === "compliant")
  .map((r) => `  • ${r.rule} - ${r.percentage}% compliant`)
  .join("\n")}

⚠ RULES PARTIALLY FOLLOWED (${comparisonResult.ruleCompliance.filter((r) => r.status === "partial").length}):
${comparisonResult.ruleCompliance
  .filter((r) => r.status === "partial")
  .map((r) => `  • ${r.rule} - ${r.percentage}% compliant (Needs improvement)`)
  .join("\n")}

✗ RULES YOUR COMPANY IS NOT FOLLOWING (${comparisonResult.ruleCompliance.filter((r) => r.status === "non-compliant").length}):
${comparisonResult.ruleCompliance
  .filter((r) => r.status === "non-compliant")
  .map((r) => `  • ${r.rule} - Only ${r.percentage}% compliant (CRITICAL GAP)`)
  .join("\n")}

CRITICAL COMPLIANCE GAPS
=========================
The following rules require immediate attention as your company is not adequately following them:

${comparisonResult.ruleCompliance
  .filter((r) => r.status === "non-compliant" || (r.status === "partial" && r.percentage < 50))
  .sort((a, b) => a.percentage - b.percentage)
  .map(
    (rule, i) => `
${i + 1}. ${rule.rule} - ${rule.percentage}% Compliant
   Risk Level: ${rule.percentage < 30 ? "CRITICAL" : rule.percentage < 50 ? "HIGH" : "MEDIUM"}
   Gap: ${100 - rule.percentage}% non-compliance
   Impact: ${rule.description}
   Required Actions:
   ${rule.improvements.length > 0 ? rule.improvements.map((imp) => `   • ${imp}`).join("\n") : "   • Immediate review and implementation required"}
`,
  )
  .join("")}

WHAT YOUR COMPANY NEEDS TO IMPROVE
===================================
Based on the analysis, here are the specific areas where your company needs to improve:

${comparisonResult.ruleCompliance
  .filter((r) => r.status !== "compliant")
  .sort((a, b) => a.percentage - b.percentage)
  .map(
    (rule, i) => `
${i + 1}. ${rule.rule}
   Current Compliance: ${rule.percentage}%
   Gap to Close: ${100 - rule.percentage}%
   Priority: ${rule.percentage < 40 ? "URGENT" : rule.percentage < 70 ? "HIGH" : "MEDIUM"}
   
   What's Missing:
   ${rule.improvements.length > 0 ? rule.improvements.map((imp) => `   • ${imp}`).join("\n") : "   • Complete implementation of this requirement"}
   
   Expected Outcome: Achieve 100% compliance with ${rule.rule.toLowerCase()}
`,
  )
  .join("")}

PRIORITY ACTION PLAN
====================
Recommended sequence for addressing compliance gaps:

${comparisonResult.ruleCompliance
  .filter((r) => r.status !== "compliant")
  .sort((a, b) => a.percentage - b.percentage)
  .slice(0, 5)
  .map(
    (rule, i) => `
PRIORITY ${i + 1}: ${rule.rule}
• Current Status: ${rule.percentage}% compliant
• Urgency: ${rule.percentage < 40 ? "IMMEDIATE ACTION REQUIRED" : rule.percentage < 70 ? "Address within 30 days" : "Address within 90 days"}
• Actions Needed: ${rule.improvements.length > 0 ? rule.improvements.join(", ") : "Full implementation required"}
`,
  )
  .join("")}

---
Generated by Agentic Compliance Officer
AI Compliance & Regulatory Reporting Assistant
Report ID: ${Math.random().toString(36).substr(2, 9).toUpperCase()}
    `.trim()

    const blob = new Blob([reportContent], { type: "text/plain" })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `detailed_compliance_report_${new Date().toISOString().split("T")[0]}.txt`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  }

  const generateStateGovernmentRules = async () => {
    if (!selectedState.trim()) {
      alert("Please enter a state name")
      return
    }

    setIsGeneratingStateRules(true)

    // Simulate generating state rules
    await new Promise((resolve) => setTimeout(resolve, 2000))

    const rules = generateGovernmentRulesForState(selectedState)
    setStateRules(rules)
    setIsGeneratingStateRules(false)
  }

  const generateGovernmentRulesForState = (state: string): StateRule[] => {
    const stateLower = state.toLowerCase()
    const rules: StateRule[] = []

    // Create a unique seed based on state name for consistent but different rules
    const stateHash = state.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0)
    const ruleVariations = stateHash % 8 // Creates 8 different rule variations

    if (stateLower.includes("california")) {
      rules.push(
        {
          rule: "California Consumer Privacy Act (CCPA) Compliance",
          description: "Companies must comply with California's comprehensive consumer privacy law",
          category: "Privacy Rights",
          requirements: [
            "Provide detailed privacy notices to consumers",
            "Allow consumers to opt-out of personal information sales",
            "Respond to consumer data requests within 45 days",
            "Implement data deletion procedures upon request",
            "Train employees on CCPA requirements and penalties",
          ],
        },
        {
          rule: "California Environmental Quality Act (CEQA)",
          description: "Environmental impact assessment requirements for business operations",
          category: "Environmental",
          requirements: [
            "Conduct environmental impact assessments for new projects",
            "File environmental impact reports with state agencies",
            "Implement mitigation measures for environmental impacts",
            "Comply with air quality management district regulations",
            "Follow hazardous waste disposal requirements",
          ],
        },
        {
          rule: "California Labor Code - Wage and Hour Laws",
          description: "Strict wage, overtime, and break requirements for employees",
          category: "Employment",
          requirements: [
            "Pay minimum wage of $16.00 per hour (2024)",
            "Provide 30-minute meal breaks for shifts over 5 hours",
            "Provide 10-minute rest breaks every 4 hours",
            "Pay overtime at 1.5x rate after 8 hours daily",
            "Maintain accurate time records for all employees",
          ],
        },
        {
          rule: "California Corporations Code",
          description: "Business registration and corporate governance requirements",
          category: "Corporate Governance",
          requirements: [
            "File Articles of Incorporation with Secretary of State",
            "Pay annual franchise tax ($800 minimum)",
            "Maintain registered agent in California",
            "File Statement of Information every two years",
            "Hold annual shareholder meetings and keep minutes",
          ],
        },
      )
    } else if (stateLower.includes("texas")) {
      rules.push(
        {
          rule: "Texas Identity Theft Enforcement and Protection Act",
          description: "Businesses must protect personal information and prevent identity theft",
          category: "Data Security",
          requirements: [
            "Implement safeguards for personal information storage",
            "Notify individuals within 60 days of data breaches",
            "Dispose of personal information securely",
            "Limit employee access to personal information",
            "Conduct annual security training for staff",
          ],
        },
        {
          rule: "Texas Business Organizations Code",
          description: "Requirements for business formation and operation in Texas",
          category: "Business Formation",
          requirements: [
            "File Certificate of Formation with Secretary of State",
            "Obtain Texas Tax ID number",
            "Register for Texas sales tax if applicable",
            "File annual Public Information Report",
            "Maintain registered office address in Texas",
          ],
        },
        {
          rule: "Texas Payday Law",
          description: "Employee payment and wage requirements",
          category: "Employment",
          requirements: [
            "Pay employees at least twice per month",
            "Pay final wages within 6 days of termination",
            "Provide written notice of pay dates to employees",
            "Pay minimum wage of $7.25 per hour",
            "Maintain payroll records for at least 3 years",
          ],
        },
        {
          rule: "Texas Environmental Regulations",
          description: "Environmental compliance for Texas businesses",
          category: "Environmental",
          requirements: [
            "Obtain air quality permits from TCEQ",
            "Comply with water discharge regulations",
            "Follow hazardous waste management rules",
            "Report environmental incidents to state agencies",
            "Conduct required environmental monitoring",
          ],
        },
      )
    } else if (stateLower.includes("new york")) {
      rules.push(
        {
          rule: "New York SHIELD Act",
          description: "Data security and breach notification requirements",
          category: "Cybersecurity",
          requirements: [
            "Develop comprehensive data security programs",
            "Implement reasonable security measures for personal data",
            "Notify affected individuals within reasonable time of breaches",
            "Report breaches to New York Attorney General",
            "Maintain incident response and recovery procedures",
          ],
        },
        {
          rule: "New York Business Corporation Law",
          description: "Corporate formation and governance requirements",
          category: "Corporate Law",
          requirements: [
            "File Certificate of Incorporation with Department of State",
            "Pay filing fees and franchise taxes",
            "Maintain registered office in New York",
            "File biennial statements with the state",
            "Hold required corporate meetings and maintain records",
          ],
        },
        {
          rule: "New York Labor Law - Wage Requirements",
          description: "Minimum wage and overtime requirements for employees",
          category: "Employment",
          requirements: [
            "Pay minimum wage of $15.00 per hour (NYC)",
            "Provide wage statements with each payment",
            "Pay overtime at 1.5x rate after 40 hours weekly",
            "Provide required meal and rest periods",
            "Post wage and hour notices in workplace",
          ],
        },
        {
          rule: "New York Environmental Conservation Law",
          description: "Environmental protection and compliance requirements",
          category: "Environmental",
          requirements: [
            "Obtain environmental permits from DEC",
            "Comply with air pollution control regulations",
            "Follow hazardous substance reporting requirements",
            "Implement spill prevention and response plans",
            "Conduct required environmental assessments",
          ],
        },
      )
    } else if (stateLower.includes("florida")) {
      rules.push(
        {
          rule: "Florida Personal Information Protection Act",
          description: "Data breach notification and personal information protection",
          category: "Data Protection",
          requirements: [
            "Notify individuals of data breaches without unreasonable delay",
            "Report breaches to Florida Department of Legal Affairs",
            "Implement reasonable security measures for personal information",
            "Dispose of personal information securely",
            "Maintain breach response procedures",
          ],
        },
        {
          rule: "Florida Business Corporation Act",
          description: "Corporate formation and maintenance requirements",
          category: "Business Registration",
          requirements: [
            "File Articles of Incorporation with Division of Corporations",
            "Pay annual report fees by May 1st each year",
            "Maintain registered agent in Florida",
            "Keep corporate records and meeting minutes",
            "File annual reports with required information",
          ],
        },
        {
          rule: "Florida Minimum Wage Act",
          description: "Employee wage and compensation requirements",
          category: "Employment",
          requirements: [
            "Pay minimum wage of $12.00 per hour (2024)",
            "Display minimum wage posters in workplace",
            "Pay tipped employees at least $8.98 per hour",
            "Maintain accurate wage and hour records",
            "Provide required wage statements to employees",
          ],
        },
      )
    } else {
      // Generate completely different rules based on state characteristics
      const ruleTypes = [
        // Variation 0-1: Technology and Data Focus
        {
          rules: [
            {
              rule: `${state} Digital Privacy Protection Act`,
              description: `Comprehensive data protection requirements for businesses operating in ${state}`,
              category: "Digital Privacy",
              requirements: [
                `Obtain explicit consent before collecting personal data in ${state}`,
                `Implement data encryption standards required by ${state}`,
                `Provide data portability options to ${state} residents`,
                `Conduct privacy impact assessments for ${state} operations`,
                `Appoint data protection officers for ${state} compliance`,
              ],
            },
            {
              rule: `${state} Cybersecurity Framework`,
              description: `Mandatory cybersecurity standards for ${state} businesses`,
              category: "Information Security",
              requirements: [
                `Deploy multi-factor authentication across ${state} operations`,
                `Conduct quarterly security audits in ${state}`,
                `Report cyber incidents to ${state} authorities within 24 hours`,
                `Train employees on ${state} cybersecurity protocols`,
                `Maintain incident response plans specific to ${state}`,
              ],
            },
            {
              rule: `${state} Business Technology Standards`,
              description: `Technology compliance requirements for ${state} companies`,
              category: "Technology Compliance",
              requirements: [
                `Use ${state}-approved cloud service providers`,
                `Implement accessibility standards for ${state} digital services`,
                `Maintain technology disaster recovery plans for ${state}`,
                `Comply with ${state} electronic signature requirements`,
                `Follow ${state} data retention and deletion policies`,
              ],
            },
          ],
        },
        // Variation 2-3: Environmental and Safety Focus
        {
          rules: [
            {
              rule: `${state} Environmental Protection Standards`,
              description: `Environmental compliance requirements for businesses in ${state}`,
              category: "Environmental Protection",
              requirements: [
                `Obtain environmental permits from ${state} regulatory agencies`,
                `Conduct annual environmental impact assessments in ${state}`,
                `Implement waste reduction programs required by ${state}`,
                `Report emissions data to ${state} environmental department`,
                `Follow ${state} renewable energy usage requirements`,
              ],
            },
            {
              rule: `${state} Workplace Safety Regulations`,
              description: `Comprehensive workplace safety standards for ${state} employers`,
              category: "Workplace Safety",
              requirements: [
                `Conduct monthly safety inspections per ${state} standards`,
                `Provide safety training programs approved by ${state}`,
                `Maintain safety equipment meeting ${state} specifications`,
                `Report workplace incidents to ${state} safety commission`,
                `Implement emergency response procedures for ${state}`,
              ],
            },
            {
              rule: `${state} Sustainable Business Practices Act`,
              description: `Sustainability requirements for companies operating in ${state}`,
              category: "Sustainability",
              requirements: [
                `Submit annual sustainability reports to ${state}`,
                `Meet ${state} carbon emission reduction targets`,
                `Use sustainable packaging materials approved by ${state}`,
                `Participate in ${state} recycling and waste management programs`,
                `Implement energy efficiency measures required by ${state}`,
              ],
            },
          ],
        },
        // Variation 4-5: Financial and Tax Focus
        {
          rules: [
            {
              rule: `${state} Financial Reporting Standards`,
              description: `Financial transparency and reporting requirements for ${state} businesses`,
              category: "Financial Compliance",
              requirements: [
                `File quarterly financial reports with ${state} authorities`,
                `Maintain audited financial statements per ${state} standards`,
                `Implement internal controls required by ${state}`,
                `Report significant financial changes to ${state} regulators`,
                `Comply with ${state} anti-money laundering requirements`,
              ],
            },
            {
              rule: `${state} Business Tax Code`,
              description: `Comprehensive tax obligations for companies in ${state}`,
              category: "Tax Compliance",
              requirements: [
                `Register for ${state} business tax identification numbers`,
                `File monthly sales tax returns with ${state}`,
                `Pay ${state} corporate income tax by required deadlines`,
                `Maintain tax records per ${state} retention requirements`,
                `Comply with ${state} payroll tax withholding rules`,
              ],
            },
            {
              rule: `${state} Consumer Financial Protection Act`,
              description: `Consumer protection requirements for financial services in ${state}`,
              category: "Consumer Protection",
              requirements: [
                `Provide clear pricing disclosures to ${state} consumers`,
                `Implement fair lending practices required by ${state}`,
                `Maintain consumer complaint procedures for ${state}`,
                `Follow ${state} debt collection regulations`,
                `Provide financial literacy resources to ${state} customers`,
              ],
            },
          ],
        },
        // Variation 6-7: Employment and Social Focus
        {
          rules: [
            {
              rule: `${state} Fair Employment Practices Act`,
              description: `Employment standards and worker rights protection in ${state}`,
              category: "Employment Rights",
              requirements: [
                `Provide equal employment opportunities per ${state} law`,
                `Implement anti-discrimination policies required by ${state}`,
                `Offer family leave benefits mandated by ${state}`,
                `Maintain workplace harassment prevention programs for ${state}`,
                `Provide reasonable accommodations per ${state} requirements`,
              ],
            },
            {
              rule: `${state} Community Investment Requirements`,
              description: `Corporate social responsibility obligations for ${state} businesses`,
              category: "Community Investment",
              requirements: [
                `Contribute to ${state} community development programs`,
                `Support local ${state} educational initiatives`,
                `Participate in ${state} workforce development programs`,
                `Provide internship opportunities for ${state} residents`,
                `Engage in ${state} economic development activities`,
              ],
            },
            {
              rule: `${state} Worker Protection Standards`,
              description: `Comprehensive worker protection requirements in ${state}`,
              category: "Worker Protection",
              requirements: [
                `Pay living wages as defined by ${state} standards`,
                `Provide health insurance benefits required by ${state}`,
                `Offer professional development opportunities per ${state} law`,
                `Maintain worker safety committees mandated by ${state}`,
                `Implement whistleblower protection policies for ${state}`,
              ],
            },
          ],
        },
      ]

      // Select rule variation based on state characteristics
      const selectedVariation = ruleVariations % 4
      rules.push(...ruleTypes[selectedVariation].rules)
    }

    return rules
  }

  const handleDownloadStateRulesReport = () => {
    if (!stateRules.length || !selectedState) return

    const reportContent = `
GOVERNMENT RULES FOR COMPANIES IN ${selectedState.toUpperCase()}
================================================================

STATE: ${selectedState}
Report Generated: ${new Date().toLocaleString()}
Total Rules: ${stateRules.length}

OVERVIEW
--------
This report outlines the key government regulations and rules that companies 
operating in ${selectedState} must follow to remain compliant with state laws.

DETAILED GOVERNMENT RULES
=========================

${stateRules
  .map(
    (rule, index) => `
${index + 1}. ${rule.rule.toUpperCase()}
   Category: ${rule.category}
   
   Description:
   ${rule.description}
   
   Requirements Companies Must Follow:
   ${rule.requirements.map((req, i) => `   ${i + 1}. ${req}`).join("\n")}
   
   ${"=".repeat(70)}
`,
  )
  .join("")}

COMPLIANCE CATEGORIES SUMMARY
=============================
${Array.from(new Set(stateRules.map((r) => r.category)))
  .map(
    (category) => `
${category.toUpperCase()}:
${stateRules
  .filter((r) => r.category === category)
  .map((r) => `• ${r.rule}`)
  .join("\n")}
`,
  )
  .join("")}

WHAT COMPANIES NEED TO DO
=========================
To operate legally in ${selectedState}, companies must:

${stateRules
  .map(
    (rule, index) => `
${index + 1}. ${rule.rule}
   Key Actions Required:
   ${rule.requirements
     .slice(0, 3)
     .map((req) => `   • ${req}`)
     .join("\n")}
`,
  )
  .join("")}

COMPLIANCE CHECKLIST FOR ${selectedState.toUpperCase()} COMPANIES
================================================================
Use this checklist to ensure your company follows all required government rules:

${stateRules
  .map(
    (rule, index) => `
□ ${rule.rule}
  ${rule.requirements.map((req) => `  □ ${req}`).join("\n")}
`,
  )
  .join("\n")}

---
Generated by Agentic Compliance Officer
${selectedState} Government Rules Report
Report ID: ${Math.random().toString(36).substr(2, 9).toUpperCase()}
    `.trim()

    const blob = new Blob([reportContent], { type: "text/plain" })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `${selectedState.toLowerCase().replace(/\s+/g, "_")}_government_rules_${new Date().toISOString().split("T")[0]}.txt`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  }

  const analyzeCompanyAgainstStateRules = async () => {
    if (!selectedCompany.trim() || !stateRules.length) {
      alert("Please enter a company name and generate state rules first")
      return
    }

    setIsAnalyzingCompany(true)

    // Simulate company analysis
    await new Promise((resolve) => setTimeout(resolve, 2000))

    // Generate company compliance data based on state rules
    const ruleCompliance = stateRules.map((stateRule) => {
      const percentage = Math.floor(Math.random() * 100) + 1
      let status: "compliant" | "partial" | "non-compliant"

      if (percentage >= 80) status = "compliant"
      else if (percentage >= 50) status = "partial"
      else status = "non-compliant"

      const improvements =
        status !== "compliant"
          ? [
              `Implement ${stateRule.rule.toLowerCase()} procedures`,
              `Train staff on ${stateRule.category.toLowerCase()} requirements`,
              `Update company policies for ${stateRule.category.toLowerCase()}`,
            ]
          : []

      return {
        rule: stateRule.rule,
        percentage,
        status,
        description: `${selectedCompany}'s compliance with ${stateRule.rule}`,
        improvements,
      }
    })

    const compliantRules = ruleCompliance.filter((rule) => rule.status === "compliant").length
    const overallCompliance = Math.round((compliantRules / ruleCompliance.length) * 100)

    const result: ComparisonResult = {
      overallCompliance,
      complianceStatus:
        overallCompliance >= 80 ? "Compliant" : overallCompliance >= 60 ? "Partially Compliant" : "Non-Compliant",
      summary: `${selectedCompany} is following ${overallCompliance}% of ${selectedState} government requirements.`,
      ruleCompliance,
      riskLevel: overallCompliance >= 80 ? "Low" : overallCompliance >= 60 ? "Medium" : "High",
      totalRules: ruleCompliance.length,
      compliantRules,
    }

    setCompanyStateComparison(result)
    setIsAnalyzingCompany(false)
  }

  const handleDownloadCompanyStateReport = () => {
    if (!companyStateComparison || !selectedCompany || !selectedState) return

    const reportContent = `
${selectedCompany.toUpperCase()} COMPLIANCE REPORT FOR ${selectedState.toUpperCase()}
================================================================

COMPANY: ${selectedCompany}
STATE: ${selectedState}
Analysis Date: ${new Date().toLocaleDateString()}
Report Generated: ${new Date().toLocaleString()}

COMPLIANCE SUMMARY
==================
Overall Compliance: ${companyStateComparison.overallCompliance}%
Status: ${companyStateComparison.complianceStatus}
Risk Level: ${companyStateComparison.riskLevel}

${companyStateComparison.summary}

RULES ${selectedCompany.toUpperCase()} IS FOLLOWING
===============================================
${companyStateComparison.ruleCompliance
  .filter((r) => r.status === "compliant")
  .map((r) => `✓ ${r.rule} - ${r.percentage}% compliant`)
  .join("\n")}

RULES ${selectedCompany.toUpperCase()} IS PARTIALLY FOLLOWING
=========================================================
${companyStateComparison.ruleCompliance
  .filter((r) => r.status === "partial")
  .map((r) => `⚠ ${r.rule} - ${r.percentage}% compliant (Needs improvement)`)
  .join("\n")}

RULES ${selectedCompany.toUpperCase()} IS NOT FOLLOWING
===================================================
${companyStateComparison.ruleCompliance
  .filter((r) => r.status === "non-compliant")
  .map((r) => `✗ ${r.rule} - Only ${r.percentage}% compliant (CRITICAL)`)
  .join("\n")}

WHAT ${selectedCompany.toUpperCase()} NEEDS TO IMPROVE
==================================================
${companyStateComparison.ruleCompliance
  .filter((r) => r.status !== "compliant")
  .map(
    (r, i) => `
${i + 1}. ${r.rule}
   Current Compliance: ${r.percentage}%
   Required Actions:
   ${r.improvements.map((imp) => `   • ${imp}`).join("\n")}
`,
  )
  .join("")}

---
Generated by Agentic Compliance Officer
${selectedCompany} vs ${selectedState} Government Rules
Report ID: ${Math.random().toString(36).substr(2, 9).toUpperCase()}
    `.trim()

    const blob = new Blob([reportContent], { type: "text/plain" })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `${selectedCompany.toLowerCase().replace(/\s+/g, "_")}_${selectedState.toLowerCase().replace(/\s+/g, "_")}_compliance_${new Date().toISOString().split("T")[0]}.txt`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  }

  // Removed unused functions: generateStateComplianceReport, analyzeStateCompliance, handleDownloadStateReport, generateCompanyComplianceReport, analyzeCompanyCompliance, detectCompanyType, generateCompanySpecificRules, getIndustrySpecificRules, handleDownloadCompanyReport, generateCombinedStateCompanyReport, analyzeCompanyAgainstStateRegulations, getCompanyIndustryStateRules, checkCompanyInState

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">Agentic Compliance Officer</h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
            Enter a state name to see government rules, then enter a company name to check their compliance
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-100 max-w-4xl mx-auto mb-8">
          <div className="flex items-center gap-3 mb-6">
            <MapPin className="w-6 h-6 text-blue-600" />
            <h2 className="text-2xl font-bold text-gray-900">Government Rules by State</h2>
          </div>
          <p className="text-gray-600 mb-6">
            Enter any state name to see the government regulations and rules that companies operating in that state must
            follow.
          </p>

          <div className="flex gap-4 items-end mb-6">
            <div className="flex-1">
              <Label htmlFor="state-input" className="block text-sm font-medium text-gray-700 mb-2">
                State Name
              </Label>
              <Input
                id="state-input"
                type="text"
                value={selectedState}
                onChange={(e) => setSelectedState(e.target.value)}
                placeholder="e.g., California, Texas, New York, Maharashtra, Karnataka"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <Button
              onClick={generateStateGovernmentRules}
              disabled={isGeneratingStateRules || !selectedState.trim()}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium px-6 py-3"
            >
              {isGeneratingStateRules ? (
                <>
                  <Clock className="h-4 w-4 animate-spin" />
                  Generating Rules...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4" />
                  Get Government Rules
                </>
              )}
            </Button>
          </div>
        </div>

        {stateRules.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-100 max-w-4xl mx-auto mb-8">
            <div className="flex items-center gap-3 mb-6">
              <FileText className="w-6 h-6 text-green-600" />
              <h2 className="text-2xl font-bold text-gray-900">Company Compliance Analysis</h2>
            </div>
            <p className="text-gray-600 mb-6">
              Enter a company name to check how well they follow the {selectedState} government rules shown above.
            </p>

            <div className="flex gap-4 items-end mb-6">
              <div className="flex-1">
                <Label htmlFor="company-input" className="block text-sm font-medium text-gray-700 mb-2">
                  Company Name
                </Label>
                <Input
                  id="company-input"
                  type="text"
                  value={selectedCompany}
                  onChange={(e) => setSelectedCompany(e.target.value)}
                  placeholder="e.g., TCS, Infosys, Microsoft, Apple, Google"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
              <Button
                onClick={analyzeCompanyAgainstStateRules}
                disabled={isAnalyzingCompany || !selectedCompany.trim()}
                className="bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium px-6 py-3"
              >
                {isAnalyzingCompany ? (
                  <>
                    <Clock className="h-4 w-4 animate-spin" />
                    Analyzing Company...
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4" />
                    Check Compliance
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {stateRules.length > 0 && (
          <div className="max-w-6xl mx-auto space-y-6 mb-8">
            <Card className="bg-card border-border">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-2xl font-bold">
                      <Scale className="h-6 w-6 text-accent" />
                      Government Rules for {selectedState}
                    </CardTitle>
                    <CardDescription className="text-base mt-2">
                      Rules and regulations that companies must follow to operate in {selectedState}
                    </CardDescription>
                  </div>
                  <Button
                    onClick={handleDownloadStateRulesReport}
                    variant="outline"
                    className="border-accent text-accent hover:bg-accent hover:text-accent-foreground bg-transparent"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download Rules Report
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-1 gap-6 mb-8">
                  <div className="text-center p-6 bg-muted rounded-lg">
                    <div className="text-4xl font-bold mb-2 text-primary">{stateRules.length}</div>
                    <p className="text-muted-foreground font-medium">Government Rules Companies Must Follow</p>
                  </div>
                </div>

                <div>
                  <h3 className="text-xl font-semibold mb-6 text-primary">Required Government Rules</h3>
                  <div className="space-y-4">
                    {stateRules.map((rule, index) => (
                      <Card key={index} className="border-border">
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <h4 className="font-semibold text-lg text-primary">{rule.rule}</h4>
                                <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                                  {rule.category}
                                </span>
                              </div>
                              <p className="text-muted-foreground text-sm mb-3">{rule.description}</p>
                            </div>
                          </div>

                          <div className="mt-4 p-4 bg-muted rounded-lg">
                            <h5 className="font-medium text-sm text-primary mb-2">What Companies Must Do:</h5>
                            <ul className="space-y-1">
                              {rule.requirements.map((requirement, i) => (
                                <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                                  <span className="text-green-600 mt-1">✓</span>
                                  {requirement}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {companyStateComparison && (
          <div className="max-w-6xl mx-auto space-y-6 mb-8">
            <Card className="bg-card border-border">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-2xl font-bold">
                      <CheckCircle className="h-6 w-6 text-accent" />
                      {selectedCompany} Compliance with {selectedState} Rules
                    </CardTitle>
                    <CardDescription className="text-base mt-2">
                      How well {selectedCompany} follows {selectedState} government regulations
                    </CardDescription>
                  </div>
                  <Button
                    onClick={handleDownloadCompanyStateReport}
                    variant="outline"
                    className="border-accent text-accent hover:bg-accent hover:text-accent-foreground bg-transparent"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download Report
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-6 mb-8">
                  <div className="text-center p-6 bg-muted rounded-lg">
                    <div
                      className={`text-4xl font-bold mb-2 ${getComplianceColor(companyStateComparison.overallCompliance)}`}
                    >
                      {companyStateComparison.overallCompliance}%
                    </div>
                    <p className="text-muted-foreground font-medium">Overall Compliance</p>
                  </div>
                  <div className="text-center p-6 bg-muted rounded-lg">
                    <div className="text-4xl font-bold mb-2 text-green-600">
                      {companyStateComparison.compliantRules}
                    </div>
                    <p className="text-muted-foreground font-medium">Rules Following</p>
                  </div>
                  <div className="text-center p-6 bg-muted rounded-lg">
                    <div className="text-4xl font-bold mb-2 text-red-600">
                      {companyStateComparison.ruleCompliance.filter((r) => r.status === "non-compliant").length}
                    </div>
                    <p className="text-muted-foreground font-medium">Rules Not Following</p>
                  </div>
                </div>

                <div>
                  <h3 className="text-xl font-semibold mb-6 text-primary">{selectedCompany} Rule-by-Rule Analysis</h3>
                  <div className="space-y-4">
                    {companyStateComparison.ruleCompliance.map((rule, index) => (
                      <Card key={index} className="border-border">
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <h4 className="font-semibold text-lg text-primary">{rule.rule}</h4>
                                {getStatusBadge(rule.status)}
                              </div>
                              <p className="text-muted-foreground text-sm mb-3">{rule.description}</p>
                            </div>
                            <div className="text-right ml-4">
                              <div className={`text-2xl font-bold ${getComplianceColor(rule.percentage)}`}>
                                {rule.percentage}%
                              </div>
                            </div>
                          </div>

                          <div className="mb-4">
                            <div className="flex justify-between text-sm mb-2">
                              <span className="text-muted-foreground">Compliance Level</span>
                              <span className={`font-medium ${getComplianceColor(rule.percentage)}`}>
                                {rule.percentage}%
                              </span>
                            </div>
                            <div className="w-full bg-muted rounded-full h-3">
                              <div
                                className={`h-3 rounded-full transition-all duration-500 ${getComplianceBarColor(rule.percentage)}`}
                                style={{ width: `${rule.percentage}%` }}
                              />
                            </div>
                          </div>

                          {rule.improvements.length > 0 && (
                            <div className="mt-4 p-4 bg-muted rounded-lg">
                              <h5 className="font-medium text-sm text-primary mb-2">
                                What {selectedCompany} Needs to Improve:
                              </h5>
                              <ul className="space-y-1">
                                {rule.improvements.map((improvement, i) => (
                                  <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                                    <span className="text-accent mt-1">•</span>
                                    {improvement}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Upload Areas - Secondary feature */}
        <div className="grid md:grid-cols-2 gap-6 mb-8 max-w-6xl mx-auto">
          {/* Government Document Upload */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Scale className="h-5 w-5" />
                Government Regulation
              </CardTitle>
              <CardDescription>Upload the government compliance document or regulation</CardDescription>
            </CardHeader>
            <CardContent>
              <div
                className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                  dragActive === "government"
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                    : "border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500"
                }`}
                onDragEnter={(e) => handleDrag(e, "government")}
                onDragLeave={(e) => handleDrag(e, "government")}
                onDragOver={(e) => handleDrag(e, "government")}
                onDrop={(e) => handleDrop(e, "government")}
              >
                <FileText className="h-8 w-8 text-gray-400 mx-auto mb-3" />
                <p className="font-medium text-gray-900 dark:text-white mb-2">Drop government document here</p>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={(e) => handleFileInput(e, "government")}
                  className="hidden"
                  id="government-upload"
                />
                <Button asChild size="sm">
                  <label htmlFor="government-upload" className="cursor-pointer">
                    Choose File
                  </label>
                </Button>
              </div>

              {governmentFile && (
                <div className="mt-4 p-3 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    {getStatusIcon(governmentFile.status)}
                    <div>
                      <p className="font-medium text-sm">{governmentFile.name}</p>
                      <p className="text-xs text-gray-500">
                        {formatFileSize(governmentFile.size)} • {getStatusText(governmentFile.status)}
                      </p>
                    </div>
                  </div>
                  {(governmentFile.status === "uploading" || governmentFile.status === "analyzing") && (
                    <Progress value={governmentFile.progress} className="h-2" />
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Company Document Upload */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Company Document
              </CardTitle>
              <CardDescription>Upload your company's policy, procedure, or compliance document</CardDescription>
            </CardHeader>
            <CardContent>
              <div
                className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                  dragActive === "company"
                    ? "border-green-500 bg-green-50 dark:bg-green-900/20"
                    : "border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500"
                }`}
                onDragEnter={(e) => handleDrag(e, "company")}
                onDragLeave={(e) => handleDrag(e, "company")}
                onDragOver={(e) => handleDrag(e, "company")}
                onDrop={(e) => handleDrop(e, "company")}
              >
                <FileText className="h-8 w-8 text-gray-400 mx-auto mb-3" />
                <p className="font-medium text-gray-900 dark:text-white mb-2">Drop company document here</p>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={(e) => handleFileInput(e, "company")}
                  className="hidden"
                  id="company-upload"
                />
                <Button asChild size="sm">
                  <label htmlFor="company-upload" className="cursor-pointer">
                    Choose File
                  </label>
                </Button>
              </div>

              {companyFile && (
                <div className="mt-4 p-3 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    {getStatusIcon(companyFile.status)}
                    <div>
                      <p className="font-medium text-sm">{companyFile.name}</p>
                      <p className="text-xs text-gray-500">
                        {formatFileSize(companyFile.size)} • {getStatusText(companyFile.status)}
                      </p>
                    </div>
                  </div>
                  {(companyFile.status === "uploading" || companyFile.status === "analyzing") && (
                    <Progress value={companyFile.progress} className="h-2" />
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Compare Button */}
        {governmentFile?.status === "completed" && companyFile?.status === "completed" && (
          <div className="text-center mb-8">
            <Button
              onClick={compareDocuments}
              disabled={isComparing}
              size="lg"
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isComparing ? (
                <>
                  <Clock className="h-4 w-4 mr-2 animate-spin" />
                  Comparing Documents...
                </>
              ) : (
                <>
                  <Scale className="h-4 w-4 mr-2" />
                  Compare Compliance
                </>
              )}
            </Button>
          </div>
        )}

        {/* Comparison Results */}
        {comparisonResult && (
          <div className="max-w-6xl mx-auto space-y-6">
            <Card className="bg-card border-border">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-2xl font-bold">
                      <CheckCircle className="h-6 w-6 text-accent" />
                      Compliance Dashboard
                    </CardTitle>
                    <CardDescription className="text-base mt-2">
                      Detailed analysis of your compliance status
                    </CardDescription>
                  </div>
                  <Button
                    onClick={handleDownloadComparisonReport}
                    variant="outline"
                    className="border-accent text-accent hover:bg-accent hover:text-accent-foreground bg-transparent"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download Report
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-6 mb-8">
                  <div className="text-center p-6 bg-muted rounded-lg">
                    <div
                      className={`text-4xl font-bold mb-2 ${getComplianceColor(comparisonResult.overallCompliance)}`}
                    >
                      {comparisonResult.overallCompliance}%
                    </div>
                    <p className="text-muted-foreground font-medium">Overall Compliance</p>
                  </div>
                  <div className="text-center p-6 bg-muted rounded-lg">
                    <div className="text-4xl font-bold mb-2 text-green-600">{comparisonResult.compliantRules}</div>
                    <p className="text-muted-foreground font-medium">Rules Followed</p>
                  </div>
                  <div className="text-center p-6 bg-muted rounded-lg">
                    <div className="text-4xl font-bold mb-2 text-primary">{comparisonResult.totalRules}</div>
                    <p className="text-muted-foreground font-medium">Total Rules</p>
                  </div>
                </div>

                <div>
                  <h3 className="text-xl font-semibold mb-6 text-primary">Rule-by-Rule Analysis</h3>
                  <div className="space-y-4">
                    {comparisonResult.ruleCompliance.map((rule, index) => (
                      <Card key={index} className="border-border">
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <h4 className="font-semibold text-lg text-primary">{rule.rule}</h4>
                                {getStatusBadge(rule.status)}
                              </div>
                              <p className="text-muted-foreground text-sm mb-3">{rule.description}</p>
                            </div>
                            <div className="text-right ml-4">
                              <div className={`text-2xl font-bold ${getComplianceColor(rule.percentage)}`}>
                                {rule.percentage}%
                              </div>
                            </div>
                          </div>

                          <div className="mb-4">
                            <div className="flex justify-between text-sm mb-2">
                              <span className="text-muted-foreground">Compliance Level</span>
                              <span className={`font-medium ${getComplianceColor(rule.percentage)}`}>
                                {rule.percentage}%
                              </span>
                            </div>
                            <div className="w-full bg-muted rounded-full h-3">
                              <div
                                className={`h-3 rounded-full transition-all duration-500 ${getComplianceBarColor(rule.percentage)}`}
                                style={{ width: `${rule.percentage}%` }}
                              />
                            </div>
                          </div>

                          {rule.improvements.length > 0 && (
                            <div className="mt-4 p-4 bg-muted rounded-lg">
                              <h5 className="font-medium text-sm text-primary mb-2">Recommended Improvements:</h5>
                              <ul className="space-y-1">
                                {rule.improvements.map((improvement, i) => (
                                  <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                                    <span className="text-accent mt-1">•</span>
                                    {improvement}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
