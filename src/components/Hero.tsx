import { useState } from "react";
import { toast } from "sonner";
import BlurText from "./BlurText";
import ShinyText from "./ShinyText";
import AccessibilityStatement from "./AccessibilityStatement";
import { useAuth } from "@/lib/auth";
import {
  startScan,
  unlockReport,
  type ScanResult,
  type UnlockResult,
  type Finding,
  type PageResult,
  type PdfCheckResult,
  type VendorWarning,
  getSeverityBgColor,
  getWcagLevelClass,
  getScoreColor,
  getScoreRingColor,
} from "../lib/scanner";
import { trackEvent, identifyUser } from "../lib/analytics";

type ScannerState =
  | "IDLE"
  | "SCANNING"
  | "RESULTS_PREVIEW"
  | "UNLOCKING"
  | "REPORT_SENT";

const Hero = () => {
  const { user } = useAuth();
  const [state, setState] = useState<ScannerState>("IDLE");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [email, setEmail] = useState("");
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [fullReport, setFullReport] = useState<UnlockResult | null>(null);
  const [expandedPages, setExpandedPages] = useState<Set<string>>(new Set());
  const [showStatementGenerator, setShowStatementGenerator] = useState(false);
  const [expandedVendor, setExpandedVendor] = useState<string | null>(null);

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!websiteUrl.trim()) {
      toast.error("Please enter your website URL");
      return;
    }

    // Basic URL validation
    const urlRegex =
      /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/i;
    if (!urlRegex.test(websiteUrl)) {
      toast.error("Please enter a valid website URL");
      return;
    }

    setState("SCANNING");
    trackEvent("scan_started", { url: websiteUrl });

    try {
      const result = await startScan(websiteUrl, user?.id);

      if (!result.success) {
        toast.error(result.error || "Failed to scan website");
        setState("IDLE");
        trackEvent("scan_failed", { url: websiteUrl, error: result.error });
        return;
      }

      setScanResult(result);
      setState("RESULTS_PREVIEW");
      trackEvent("scan_completed", {
        url: websiteUrl,
        score: result.summary.accessibilityScore,
        issues: result.summary.total
      });

      if (result.cached) {
        toast.info("Using cached scan results (scanned within the last hour)");
      }
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Something went wrong";
      toast.error(message);
      setState("IDLE");
      trackEvent("scan_failed", { url: websiteUrl, error: message });
    }
  };

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      toast.error("Please enter your email");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error("Please enter a valid email address");
      return;
    }

    setState("UNLOCKING");

    try {
      const result = await unlockReport(email);

      if (!result.success) {
        toast.error(result.error || "Failed to unlock report");
        setState("RESULTS_PREVIEW");
        return;
      }

      setFullReport(result);
      setState("REPORT_SENT");
      toast.success("Full report sent to your email!");

      identifyUser(email);
      trackEvent("report_unlocked", { email, url: websiteUrl });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Something went wrong";
      toast.error(message);
      setState("RESULTS_PREVIEW");
    }
  };

  const handleReset = () => {
    setState("IDLE");
    setWebsiteUrl("");
    setEmail("");
    setScanResult(null);
    setFullReport(null);
    setExpandedPages(new Set());
    setShowStatementGenerator(false);
    setExpandedVendor(null);
  };

  const togglePage = (pageUrl: string) => {
    setExpandedPages((prev) => {
      const next = new Set(prev);
      if (next.has(pageUrl)) {
        next.delete(pageUrl);
      } else {
        next.add(pageUrl);
      }
      return next;
    });
  };

  const renderAccessibilityScore = (score: number) => (
    <div className="flex flex-col items-center">
      <div
        className={`w-20 h-20 rounded-full border-4 ${getScoreRingColor(score)} flex items-center justify-center bg-white`}
      >
        <span className={`text-2xl font-bold ${getScoreColor(score)}`}>
          {score}
        </span>
      </div>
      <span className="text-xs text-gray-500 mt-1">Accessibility Score</span>
    </div>
  );

  const renderFinding = (finding: Finding, index: number) => (
    <div
      key={`${finding.id}-${finding.pageUrl}-${index}`}
      className="flex items-start gap-3 p-3 rounded-lg bg-gray-50"
    >
      <div className="flex flex-col gap-1 shrink-0">
        <span
          className={`px-2 py-0.5 rounded text-xs font-medium ${getSeverityBgColor(finding.severity)}`}
        >
          {finding.severity.charAt(0).toUpperCase() + finding.severity.slice(1)}
        </span>
        {finding.wcagCriterion && (
          <span
            className={`px-2 py-0.5 rounded text-xs font-medium ${getWcagLevelClass(finding.wcagLevel || "A")}`}
          >
            {finding.wcagCriterion} {finding.wcagLevel}
          </span>
        )}
      </div>
      <div className="flex-1 text-left min-w-0">
        <p className="font-medium text-gray-900 text-sm">{finding.check}</p>
        <p className="text-gray-600 text-sm">{finding.message}</p>
        {finding.details && (
          <p className="text-gray-400 text-xs mt-1">{finding.details}</p>
        )}
        {finding.remediation && (
          <p className="text-blue-600 text-xs mt-1">{finding.remediation}</p>
        )}
      </div>
    </div>
  );

  const renderPageResults = (pageResults: PageResult[]) => (
    <div className="space-y-2">
      {pageResults.map((page) => (
        <div
          key={page.pageUrl}
          className="border border-gray-200 rounded-lg overflow-hidden"
        >
          <button
            onClick={() => togglePage(page.pageUrl)}
            className="w-full flex items-center justify-between p-3 hover:bg-gray-50 transition-colors text-left"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={`w-8 h-8 rounded-full border-2 ${getScoreRingColor(page.accessibilityScore)} flex items-center justify-center shrink-0`}
              >
                <span
                  className={`text-xs font-bold ${getScoreColor(page.accessibilityScore)}`}
                >
                  {page.accessibilityScore}
                </span>
              </div>
              <div className="min-w-0">
                <p className="font-medium text-gray-900 text-sm truncate">
                  {page.pageTitle || "Page"}
                </p>
                <p className="text-gray-400 text-xs truncate">{page.pageUrl}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs text-gray-500">
                {page.findings.length} issue
                {page.findings.length !== 1 ? "s" : ""}
              </span>
              <svg
                className={`w-4 h-4 text-gray-400 transition-transform ${expandedPages.has(page.pageUrl) ? "rotate-180" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </div>
          </button>

          {expandedPages.has(page.pageUrl) && page.findings.length > 0 && (
            <div className="p-3 pt-0 space-y-2 border-t border-gray-100">
              {page.findings.map((finding, i) => renderFinding(finding, i))}
            </div>
          )}
        </div>
      ))}
    </div>
  );

  return (
    <section className="relative min-h-[85vh] flex items-center justify-center px-4 pt-20 pb-16">
      {/* Cloud gradients */}
      <div className="cloud-gradient-tl fixed inset-0 pointer-events-none z-0" />
      <div className="cloud-gradient-tr fixed inset-0 pointer-events-none z-0" />
      <div className="cloud-gradient-bl fixed inset-0 pointer-events-none z-0" />
      <div className="cloud-gradient-br fixed inset-0 pointer-events-none z-0" />

      <div className="max-w-3xl mx-auto text-center relative z-10">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/60 border border-border/50 mb-8 animate-fade-in">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <span className="text-sm text-muted-foreground font-medium">
            HHS Ruling: May 2026 Deadline
          </span>
        </div>

        {/* Headline */}
        <h1
          className="serif-headline text-[2.875rem] sm:text-[3.5rem] md:text-[4.25rem] leading-[1.1] mb-6 opacity-0 animate-fade-in-up"
          style={{ animationDelay: "0.1s" }}
        >
          Protect Your Practice from <br />
          <ShinyText
            text="Accessibility Lawsuits"
            className="italic-accent"
            color="#1C1C1C"
            shineColor="#d4c4a8"
            speed={3}
            yoyo={true}
          />
        </h1>

        {/* Subheadline */}
        <p
          className="text-lg sm:text-xl text-muted-foreground max-w-xl mx-auto mb-10 opacity-0 animate-fade-in-up font-sans"
          style={{ animationDelay: "0.2s" }}
        >
          New DOJ rules mandate full website accessibility for healthcare
          providers. Scan your site now to see if you're at risk.
        </p>

        {/* Scanner UI */}
        <div
          className="opacity-0 animate-fade-in-up w-full max-w-lg mx-auto mb-10"
          style={{ animationDelay: "0.3s" }}
        >
          {/* IDLE State - URL Input */}
          {state === "IDLE" && (
            <form onSubmit={handleScan} className="flex flex-col gap-3">
              <div className="relative flex items-center bg-white rounded-full border border-border/60 shadow-soft p-1.5 focus-within:border-black/20 focus-within:shadow-md transition-all">
                <input
                  type="text"
                  placeholder="Enter your practice website (e.g. drsmith.com)"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  className="flex-1 bg-transparent px-5 py-3 text-base font-sans outline-none placeholder:text-muted-foreground/60 min-w-0"
                />
                <button
                  type="submit"
                  className="bg-[#1C1C1C] hover:bg-[#2a2a2a] text-white font-sans font-medium px-6 py-2.5 rounded-full transition-all duration-300 whitespace-nowrap ml-2"
                >
                  Free Scan
                </button>
              </div>
              <p className="text-sm text-muted-foreground/70">
                No email required - see results instantly
              </p>
            </form>
          )}

          {/* SCANNING State - Loading */}
          {state === "SCANNING" && (
            <div className="bg-white rounded-2xl border border-border/60 shadow-soft p-8 text-center">
              <div className="w-16 h-16 mx-auto mb-4 relative">
                <div className="absolute inset-0 rounded-full border-4 border-gray-200" />
                <div className="absolute inset-0 rounded-full border-4 border-t-[#1C1C1C] animate-spin" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Scanning {websiteUrl}
              </h3>
              <p className="text-muted-foreground">
                Running Lighthouse accessibility audit across multiple pages...
              </p>
              <p className="text-sm text-gray-400 mt-2">
                This may take a moment as we analyze up to 5 pages
              </p>
            </div>
          )}

          {/* RESULTS_PREVIEW State - Teaser + Email Gate */}
          {state === "RESULTS_PREVIEW" && scanResult && (
            <div className="bg-white rounded-2xl border border-border/60 shadow-soft overflow-hidden">
              {/* Results Summary */}
              <div className="p-6 border-b border-border/40">
                {/* Accessibility Score */}
                {scanResult.teaser.accessibilityScore !== undefined && (
                  <div className="mb-4">
                    {renderAccessibilityScore(
                      scanResult.teaser.accessibilityScore
                    )}
                  </div>
                )}

                <h3 className="text-2xl font-semibold text-gray-900 mb-2">
                  {scanResult.summary.total > 0
                    ? `${scanResult.summary.total} Issue${scanResult.summary.total > 1 ? "s" : ""} Found`
                    : "No Issues Detected"}
                </h3>

                {scanResult.pagesScanned && scanResult.pagesScanned > 1 && (
                  <p className="text-sm text-gray-500 mb-2">
                    Scanned {scanResult.pagesScanned} page
                    {scanResult.pagesScanned > 1 ? "s" : ""}
                  </p>
                )}

                {scanResult.summary.total > 0 && (
                  <p className="text-muted-foreground mb-4">
                    {scanResult.teaser.topIssue}
                  </p>
                )}

                {/* Summary badges */}
                <div className="flex justify-center gap-2 flex-wrap">
                  {scanResult.summary.critical > 0 && (
                    <span className="px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                      {scanResult.summary.critical} Critical
                    </span>
                  )}
                  {scanResult.summary.high > 0 && (
                    <span className="px-3 py-1 rounded-full text-sm font-medium bg-orange-100 text-orange-800">
                      {scanResult.summary.high} High
                    </span>
                  )}
                  {scanResult.summary.medium > 0 && (
                    <span className="px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
                      {scanResult.summary.medium} Medium
                    </span>
                  )}
                  {scanResult.summary.low > 0 && (
                    <span className="px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                      {scanResult.summary.low} Low
                    </span>
                  )}
                </div>

                {/* PDF Warnings (teaser) */}
                {scanResult.pdfResults && scanResult.pdfResults.filter(p => !p.isAccessible && !p.error).length > 0 && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-left">
                    <p className="text-sm font-semibold text-red-800">
                      {scanResult.pdfResults.filter(p => !p.isAccessible && !p.error).length} PDF form{scanResult.pdfResults.filter(p => !p.isAccessible && !p.error).length > 1 ? "s" : ""} found that blind patients cannot read
                    </p>
                    <p className="text-xs text-red-600 mt-1">
                      Patient intake forms and consent documents must be accessible under Section 504.
                    </p>
                  </div>
                )}

                {/* Vendor Warnings (teaser) */}
                {scanResult.vendorWarnings && scanResult.vendorWarnings.length > 0 && (
                  <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-left">
                    <p className="text-sm font-semibold text-amber-800">
                      {scanResult.vendorWarnings.length} third-party tool{scanResult.vendorWarnings.length > 1 ? "s" : ""} detected
                    </p>
                    <p className="text-xs text-amber-700 mt-1">
                      Your practice is legally liable for the accessibility of: {scanResult.vendorWarnings.map(v => v.vendor).join(", ")}
                    </p>
                  </div>
                )}
              </div>

              {/* Email Gate */}
              <div className="p-6 bg-gray-50">
                {/* Scan Disclaimer */}
                <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-left">
                  <p className="text-xs text-amber-800">
                    <strong>Important:</strong> Automated scans detect ~30-40% of accessibility issues.
                    Full compliance requires manual testing. This is not legal advice.
                  </p>
                </div>

                <p className="text-sm text-gray-600 mb-4">
                  Enter your email to get the full report with WCAG criteria,
                  per-page breakdown, and remediation steps
                </p>
                <form onSubmit={handleUnlock} className="flex flex-col gap-3">
                  <div className="relative flex items-center bg-white rounded-full border border-border/60 p-1.5 focus-within:border-black/20 transition-all">
                    <input
                      type="email"
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="flex-1 bg-transparent px-5 py-3 text-base font-sans outline-none placeholder:text-muted-foreground/60 min-w-0"
                    />
                    <button
                      type="submit"
                      className="bg-[#1C1C1C] hover:bg-[#2a2a2a] text-white font-sans font-medium px-6 py-2.5 rounded-full transition-all duration-300 whitespace-nowrap ml-2"
                    >
                      Get Full Report
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* UNLOCKING State - Loading */}
          {state === "UNLOCKING" && (
            <div className="bg-white rounded-2xl border border-border/60 shadow-soft p-8 text-center">
              <div className="w-16 h-16 mx-auto mb-4 relative">
                <div className="absolute inset-0 rounded-full border-4 border-gray-200" />
                <div className="absolute inset-0 rounded-full border-4 border-t-[#1C1C1C] animate-spin" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Generating Your Report
              </h3>
              <p className="text-muted-foreground">
                Preparing detailed WCAG compliance report...
              </p>
            </div>
          )}

          {/* REPORT_SENT State - Full Results */}
          {state === "REPORT_SENT" && fullReport && (
            <div className="bg-white rounded-2xl border border-border/60 shadow-soft overflow-hidden">
              {/* Success Header */}
              <div className="p-6 bg-green-50 border-b border-green-100">
                <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-green-100 flex items-center justify-center">
                  <span className="text-green-600 text-2xl">✓</span>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-1">
                  Report Sent!
                </h3>
                <p className="text-sm text-gray-600">
                  Check your email for the full detailed report with WCAG
                  criteria and remediation steps
                </p>
              </div>

              {/* Page-by-Page Results */}
              {fullReport.pageResults && fullReport.pageResults.length > 0 ? (
                <div className="p-6">
                  <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-4">
                    Results by Page
                  </h4>
                  {renderPageResults(fullReport.pageResults)}
                </div>
              ) : (
                /* Flat Findings (fallback) */
                fullReport.findings &&
                fullReport.findings.length > 0 && (
                  <div className="p-6">
                    <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-4">
                      Issues Found
                    </h4>
                    <div className="space-y-3">
                      {fullReport.findings
                        .slice(0, 8)
                        .map((finding: Finding, index: number) =>
                          renderFinding(finding, index)
                        )}
                      {fullReport.findings.length > 8 && (
                        <p className="text-sm text-gray-500 text-center pt-2">
                          + {fullReport.findings.length - 8} more issues in your
                          email report
                        </p>
                      )}
                    </div>
                  </div>
                )
              )}

              {/* Vendor Warnings Section */}
              {fullReport.vendorWarnings && fullReport.vendorWarnings.length > 0 && (
                <div className="p-6 border-t border-border/40">
                  <h4 className="text-sm font-medium text-amber-700 uppercase tracking-wide mb-4">
                    Third-Party Vendor Risk
                  </h4>
                  <p className="text-sm text-gray-600 mb-4">
                    Under Section 504, your practice is legally liable for the accessibility of third-party tools.
                  </p>
                  <div className="space-y-3">
                    {fullReport.vendorWarnings.map((vw: VendorWarning) => (
                      <div
                        key={vw.vendor}
                        className="border border-amber-200 rounded-lg bg-amber-50 overflow-hidden"
                      >
                        <button
                          onClick={() => setExpandedVendor(expandedVendor === vw.vendor ? null : vw.vendor)}
                          className="w-full flex items-center justify-between p-3 text-left hover:bg-amber-100/50 transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded text-xs font-medium bg-amber-200 text-amber-800">
                              {vw.category}
                            </span>
                            <span className="font-medium text-gray-900 text-sm">
                              {vw.vendor}
                            </span>
                          </div>
                          <svg
                            className={`w-4 h-4 text-amber-600 transition-transform ${expandedVendor === vw.vendor ? "rotate-180" : ""}`}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                        {expandedVendor === vw.vendor && (
                          <div className="p-3 border-t border-amber-200 bg-white">
                            <p className="text-sm text-gray-700 mb-3">{vw.warning}</p>
                            <p className="text-sm text-blue-700 mb-3">
                              <strong>Action:</strong> {vw.action}
                            </p>
                            <div className="bg-gray-50 rounded p-3">
                              <p className="text-xs font-medium text-gray-500 mb-2">
                                Email template to request VPAT:
                              </p>
                              <pre className="text-xs text-gray-700 whitespace-pre-wrap font-sans">
                                {vw.vpatTemplateEmail}
                              </pre>
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(vw.vpatTemplateEmail);
                                  toast.success("Email template copied!");
                                }}
                                className="mt-2 text-xs text-blue-600 hover:text-blue-800 underline"
                              >
                                Copy email template
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* PDF Results Section */}
              {fullReport.pdfResults && fullReport.pdfResults.length > 0 && (
                <div className="p-6 border-t border-border/40">
                  <h4 className="text-sm font-medium text-red-700 uppercase tracking-wide mb-4">
                    PDF Accessibility ({fullReport.pdfResults.filter((p: PdfCheckResult) => !p.isAccessible && !p.error).length} issues)
                  </h4>
                  <div className="space-y-2">
                    {fullReport.pdfResults.map((pdf: PdfCheckResult) => (
                      <div
                        key={pdf.url}
                        className={`flex items-center justify-between p-2 rounded text-sm ${
                          pdf.error ? "bg-gray-100" :
                          pdf.isAccessible ? "bg-green-50" : "bg-red-50"
                        }`}
                      >
                        <span className="truncate flex-1 mr-2 text-gray-700">
                          {pdf.filename}
                        </span>
                        <span className={`shrink-0 font-medium ${
                          pdf.error ? "text-gray-500" :
                          pdf.isAccessible ? "text-green-600" : "text-red-600"
                        }`}>
                          {pdf.error ? "Unknown" : pdf.isAccessible ? "Accessible" : "Not Accessible"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Generate Accessibility Statement */}
              {showStatementGenerator ? (
                <div className="p-6 border-t border-border/40">
                  <AccessibilityStatement onClose={() => setShowStatementGenerator(false)} />
                </div>
              ) : (
                <div className="p-4 border-t border-border/40 bg-violet-50">
                  <button
                    onClick={() => setShowStatementGenerator(true)}
                    className="w-full text-left flex items-center gap-3 p-3 rounded-lg hover:bg-violet-100 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center shrink-0">
                      <svg className="w-5 h-5 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 text-sm">
                        Generate Accessibility Statement
                      </p>
                      <p className="text-xs text-gray-600">
                        Create a compliant statement to publish on your website
                      </p>
                    </div>
                  </button>
                </div>
              )}

              {/* Scan Another */}
              <div className="p-4 bg-gray-50 border-t border-border/40">
                <button
                  onClick={handleReset}
                  className="text-sm text-gray-600 hover:text-gray-900 underline"
                >
                  Scan another website
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Early access text */}
        {state === "IDLE" && (
          <div
            className="w-full max-w-md mx-auto"
            style={{ animationDelay: "0.4s" }}
          >
            <BlurText
              text="Free accessibility scan for healthcare practices"
              className="text-base text-[#7d6b9e] font-sans font-medium"
              delay={100}
              animateBy="words"
              direction="bottom"
            />
          </div>
        )}
      </div>
    </section>
  );
};

export default Hero;
