import { useState } from "react";
import { toast } from "sonner";
import { ChevronDown } from "lucide-react";

const platforms = ["Shopify", "WordPress", "SaaS", "Other"];

const Hero = () => {
  const [email, setEmail] = useState("");
  const [platform, setPlatform] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error("Please enter your email address");
      return;
    }
    if (!platform) {
      toast.error("Please select your platform");
      return;
    }
    
    setIsLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsLoading(false);
    toast.success("You're on the list! We'll be in touch soon.");
    setEmail("");
    setPlatform("");
  };

  return (
    <section className="relative min-h-[85vh] flex items-center justify-center px-4 pt-20 pb-16">
      {/* Cloud gradients */}
      <div className="cloud-gradient-tl fixed inset-0 pointer-events-none" />
      <div className="cloud-gradient-tr fixed inset-0 pointer-events-none" />
      <div className="cloud-gradient-br fixed inset-0 pointer-events-none" />
      
      <div className="max-w-3xl mx-auto text-center relative z-10">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/60 border border-border/50 mb-8 animate-fade-in">
          <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
          <span className="text-sm text-muted-foreground font-medium">Coming Soon</span>
        </div>

        {/* Headline */}
        <h1 
          className="serif-headline text-5xl sm:text-6xl md:text-7xl leading-[1.1] mb-6 opacity-0 animate-fade-in-up"
          style={{ animationDelay: "0.1s" }}
        >
          Scan Your Website for{" "}
          <span className="italic-accent">ADA Compliance</span>
        </h1>

        {/* Subheadline */}
        <p 
          className="text-lg sm:text-xl text-muted-foreground max-w-xl mx-auto mb-10 opacity-0 animate-fade-in-up font-sans"
          style={{ animationDelay: "0.2s" }}
        >
          Comply helps agencies and businesses identify accessibility issues before they become costly legal problems.
        </p>

        {/* Email signup form */}
        <form 
          onSubmit={handleSubmit}
          className="flex flex-col items-center justify-center gap-3 mb-4 opacity-0 animate-fade-in-up"
          style={{ animationDelay: "0.3s" }}
        >
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full">
            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-pill w-full sm:w-64 text-base shadow-soft"
            />
            
            {/* Platform Dropdown */}
            <div className="relative w-full sm:w-44">
              <button
                type="button"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="input-pill w-full text-base shadow-soft flex items-center justify-between text-left"
              >
                <span className={platform ? "text-foreground" : "text-muted-foreground"}>
                  {platform || "Platform"}
                </span>
                <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              
              {isDropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-xl shadow-card z-50 overflow-hidden">
                  {platforms.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => {
                        setPlatform(p);
                        setIsDropdownOpen(false);
                      }}
                      className="w-full px-4 py-2.5 text-left text-sm hover:bg-secondary transition-colors first:rounded-t-xl last:rounded-b-xl"
                    >
                      {p}
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            <button
              type="submit"
              disabled={isLoading}
              className="btn-pill btn-primary w-full sm:w-auto whitespace-nowrap disabled:opacity-70"
            >
              {isLoading ? "Joining..." : "Join Waitlist"}
            </button>
          </div>
        </form>

        {/* Scare tactic link */}
        <p 
          className="text-sm text-muted-foreground mb-8 opacity-0 animate-fade-in-up"
          style={{ animationDelay: "0.35s" }}
        >
          <a 
            href="/why-businesses-are-sued" 
            className="underline underline-offset-2 hover:text-foreground transition-colors"
          >
            See why businesses are being sued for "Invisible Errors"
          </a>
        </p>

        {/* Social proof */}
        <div 
          className="flex flex-col items-center justify-center gap-2 opacity-0 animate-fade-in-up"
          style={{ animationDelay: "0.4s" }}
        >
          <p className="text-sm text-muted-foreground max-w-md">
            <span className="font-semibold text-foreground">Be the first to secure your site</span>{" "}
            before the April 2026 Government surge.
          </p>
        </div>
      </div>
    </section>
  );
};

export default Hero;
