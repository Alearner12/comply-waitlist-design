import { useState } from "react";
import { toast } from "sonner";
import BlurText from "./BlurText";
import ShinyText from "./ShinyText";
import {
  startScan,
  unlockReport,
  type ScanResult,
  type UnlockResult,
  type Finding,
  getSeverityBgColor,
} from "../lib/scanner";

type ScannerState =
  | "IDLE"
  | "SCANNING"
  | "RESULTS_PREVIEW"
  | "UNLOCKING"
  | "REPORT_SENT";

const Hero = () => {
  const [state, setState] = useState<ScannerState>("IDLE");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [email, setEmail] = useState("");
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [fullReport, setFullReport] = useState<UnlockResult | null>(null);

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

    try {
      const result = await startScan(websiteUrl);

      if (!result.success) {
        toast.error(result.error || "Failed to scan website");
        setState("IDLE");
        return;
      }

      setScanResult(result);
      setState("RESULTS_PREVIEW");

      if (result.cached) {
        toast.info("Using cached scan results (scanned within the last hour)");
      }
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Something went wrong";
      toast.error(message);
      setState("IDLE");
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
  };

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
                Checking for accessibility issues...
              </p>
            </div>
          )}

          {/* RESULTS_PREVIEW State - Teaser + Email Gate */}
          {state === "RESULTS_PREVIEW" && scanResult && (
            <div className="bg-white rounded-2xl border border-border/60 shadow-soft overflow-hidden">
              {/* Results Summary */}
              <div className="p-6 border-b border-border/40">
                <div className="flex items-center justify-center gap-2 mb-4">
                  {scanResult.summary.total > 0 ? (
                    <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                      <span className="text-red-600 text-xl">!</span>
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                      <span className="text-green-600 text-xl">✓</span>
                    </div>
                  )}
                </div>

                <h3 className="text-2xl font-semibold text-gray-900 mb-2">
                  {scanResult.summary.total > 0
                    ? `${scanResult.summary.total} Issue${scanResult.summary.total > 1 ? "s" : ""} Found`
                    : "No Issues Detected"}
                </h3>

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
              </div>

              {/* Email Gate */}
              <div className="p-6 bg-gray-50">
                <p className="text-sm text-gray-600 mb-4">
                  Enter your email to get the full report with detailed
                  recommendations
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
                Preparing detailed recommendations...
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
                  Check your email for the full detailed report
                </p>
              </div>

              {/* Findings Preview */}
              {fullReport.findings && fullReport.findings.length > 0 && (
                <div className="p-6">
                  <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-4">
                    Issues Found
                  </h4>
                  <div className="space-y-3">
                    {fullReport.findings
                      .slice(0, 5)
                      .map((finding: Finding, index: number) => (
                        <div
                          key={finding.id || index}
                          className="flex items-start gap-3 p-3 rounded-lg bg-gray-50"
                        >
                          <span
                            className={`px-2 py-0.5 rounded text-xs font-medium ${getSeverityBgColor(finding.severity)}`}
                          >
                            {finding.severity.charAt(0).toUpperCase() +
                              finding.severity.slice(1)}
                          </span>
                          <div className="flex-1 text-left">
                            <p className="font-medium text-gray-900 text-sm">
                              {finding.check}
                            </p>
                            <p className="text-gray-600 text-sm">
                              {finding.message}
                            </p>
                          </div>
                        </div>
                      ))}
                    {fullReport.findings.length > 5 && (
                      <p className="text-sm text-gray-500 text-center pt-2">
                        + {fullReport.findings.length - 5} more issues in your
                        email report
                      </p>
                    )}
                  </div>
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
