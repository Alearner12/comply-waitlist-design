import { useState } from "react";
import { toast } from "sonner";
import { generateAccessibilityStatement } from "../lib/scanner";

interface Props {
  onClose: () => void;
}

const AccessibilityStatement = ({ onClose }: Props) => {
  const [practiceName, setPracticeName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [generating, setGenerating] = useState(false);
  const [statement, setStatement] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!practiceName.trim() || !contactEmail.trim()) {
      toast.error("Practice name and contact email are required");
      return;
    }

    setGenerating(true);
    try {
      const result = await generateAccessibilityStatement(
        practiceName,
        contactEmail,
        contactPhone || undefined,
      );

      if (!result.success || !result.statement) {
        toast.error(result.error || "Failed to generate statement");
        return;
      }

      setStatement(result.statement);
    } catch {
      toast.error("Something went wrong");
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = async () => {
    if (!statement) return;
    try {
      await navigator.clipboard.writeText(statement);
      setCopied(true);
      toast.success("Copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy. Please select and copy manually.");
    }
  };

  if (statement) {
    return (
      <div className="bg-white rounded-2xl border border-border/60 shadow-soft overflow-hidden">
        <div className="p-4 bg-green-50 border-b border-green-100 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">
            Your Accessibility Statement
          </h3>
          <div className="flex gap-2">
            <button
              onClick={handleCopy}
              className="bg-[#1C1C1C] hover:bg-[#2a2a2a] text-white font-sans font-medium px-4 py-2 rounded-full text-sm transition-all"
            >
              {copied ? "Copied!" : "Copy to Clipboard"}
            </button>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 px-3 py-2 text-sm"
            >
              Close
            </button>
          </div>
        </div>
        <div className="p-6 max-h-96 overflow-y-auto">
          <pre className="whitespace-pre-wrap font-sans text-sm text-gray-700 leading-relaxed">
            {statement}
          </pre>
        </div>
        <div className="p-4 bg-gray-50 border-t border-border/40">
          <p className="text-xs text-gray-500">
            Add this statement to your website's footer or as a dedicated
            accessibility page. Update it whenever your compliance status
            changes.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-border/60 shadow-soft overflow-hidden">
      <div className="p-4 border-b border-border/40 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">
          Generate Accessibility Statement
        </h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className="p-6">
        <p className="text-sm text-gray-600 mb-4">
          Every compliant healthcare website needs a public accessibility
          statement. We'll generate one based on your scan results.
        </p>
        <form onSubmit={handleGenerate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Practice Name *
            </label>
            <input
              type="text"
              value={practiceName}
              onChange={(e) => setPracticeName(e.target.value)}
              placeholder="e.g., Smith Family Dental"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-gray-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contact Email for Accessibility Feedback *
            </label>
            <input
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              placeholder="e.g., accessibility@yourpractice.com"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-gray-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contact Phone (optional)
            </label>
            <input
              type="tel"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              placeholder="e.g., (555) 123-4567"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-gray-500"
            />
          </div>
          <button
            type="submit"
            disabled={generating}
            className="w-full bg-[#1C1C1C] hover:bg-[#2a2a2a] disabled:bg-gray-400 text-white font-sans font-medium px-6 py-2.5 rounded-full transition-all duration-300"
          >
            {generating ? "Generating..." : "Generate Statement"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AccessibilityStatement;
