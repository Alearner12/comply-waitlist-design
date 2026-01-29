import { useState } from "react";
import { toast } from "sonner";
import BlurText from "./BlurText";
import { addToWaitlist } from "../lib/supabase";

const Hero = () => {
  const [email, setEmail] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim() || !websiteUrl.trim()) {
      toast.error("Please enter both your email and website URL");
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error("Please enter a valid email address");
      return;
    }

    // Basic URL validation
    const urlRegex = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/;
    if (!urlRegex.test(websiteUrl)) {
      toast.error("Please enter a valid website URL");
      return;
    }

    setIsLoading(true);
    try {
      await addToWaitlist(email, websiteUrl);
      setIsSuccess(true);
      toast.success("Spot reserved! We'll start your scan shortly.");
      setEmail("");
      setWebsiteUrl("");

      // Reset success state after 3 seconds
      setTimeout(() => setIsSuccess(false), 3000);
    } catch (error: any) {
      toast.error(error.message || "Something went wrong. Please try again.");
      setIsSuccess(false);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="relative min-h-[85vh] flex items-center justify-center px-4 pt-20 pb-16">
      {/* Cloud gradients - EarlyBird style */}
      <div className="cloud-gradient-tl fixed inset-0 pointer-events-none z-0" />
      <div className="cloud-gradient-tr fixed inset-0 pointer-events-none z-0" />
      <div className="cloud-gradient-bl fixed inset-0 pointer-events-none z-0" />
      <div className="cloud-gradient-br fixed inset-0 pointer-events-none z-0" />

      <div className="max-w-3xl mx-auto text-center relative z-10">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/60 border border-border/50 mb-8 animate-fade-in">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <span className="text-sm text-muted-foreground font-medium">HHS Ruling: May 2026 Deadline</span>
        </div>

        {/* Headline */}
        <h1
          className="serif-headline text-[2.875rem] sm:text-[3.5rem] md:text-[4.25rem] leading-[1.1] mb-6 opacity-0 animate-fade-in-up"
          style={{ animationDelay: "0.1s" }}
        >
          Protect Your Practice from <br />
          <span className="italic-accent">Accessibility Lawsuits</span>
        </h1>

        {/* Subheadline */}
        <p
          className="text-lg sm:text-xl text-muted-foreground max-w-xl mx-auto mb-10 opacity-0 animate-fade-in-up font-sans"
          style={{ animationDelay: "0.2s" }}
        >
          New DOJ rules mandate full website accessibility for healthcare providers.
          Don't let a PDF form or outdated site put you at risk.
        </p>

        {/* Email signup form - EarlyBird style */}
        <form
          onSubmit={handleSubmit}
          className="opacity-0 animate-fade-in-up w-full max-w-lg mx-auto mb-10"
          style={{ animationDelay: "0.3s" }}
        >
          <div className="flex flex-col gap-3">
            <div className="relative flex items-center bg-white rounded-full border border-border/60 shadow-soft p-1.5 focus-within:border-black/20 focus-within:shadow-md transition-all">
              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="flex-1 bg-transparent px-5 py-3 text-base font-sans outline-none placeholder:text-muted-foreground/60 min-w-0"
              />
            </div>

            <div className="relative flex items-center bg-white rounded-full border border-border/60 shadow-soft p-1.5 focus-within:border-black/20 focus-within:shadow-md transition-all">
              <input
                type="text"
                placeholder="Your Practice Website (e.g. drsmith.com)"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                className="flex-1 bg-transparent px-5 py-3 text-base font-sans outline-none placeholder:text-muted-foreground/60 min-w-0"
              />
              <button
                type="submit"
                disabled={isLoading}
                className={`
                    ${isSuccess ? "bg-green-600 hover:bg-green-700" : "bg-[#1C1C1C] hover:bg-[#2a2a2a]"} 
                    text-white font-sans font-medium px-6 py-2.5 rounded-full transition-all duration-300 disabled:opacity-70 whitespace-nowrap ml-2
                `}
              >
                {isLoading ? "Scanning..." : isSuccess ? "You're In!" : "Get Free Scan"}
              </button>
            </div>
          </div>
        </form>

        {/* Early access text with blur animation */}
        <div
          className="w-full max-w-md mx-auto"
          style={{ animationDelay: "0.4s" }}
        >
          <BlurText
            text="Be among the first to get early access"
            className="text-base text-[#7d6b9e] font-sans font-medium"
            delay={100}
            animateBy="words"
            direction="bottom"
          />
        </div>
      </div>
    </section>
  );
};

export default Hero;
