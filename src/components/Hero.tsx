import { useState } from "react";
import { toast } from "sonner";
import BlurText from "./BlurText";

const Hero = () => {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error("Please enter your email address");
      return;
    }

    setIsLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsLoading(false);
    toast.success("You're on the list! We'll be in touch soon.");
    setEmail("");
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
          <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
          <span className="text-sm text-muted-foreground font-medium">Coming Soon</span>
        </div>

        {/* Headline */}
        <h1
          className="serif-headline text-[2.875rem] sm:text-[3.5rem] md:text-[4.25rem] leading-[1.1] mb-6 opacity-0 animate-fade-in-up"
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

        {/* Email signup form - EarlyBird style */}
        <form
          onSubmit={handleSubmit}
          className="opacity-0 animate-fade-in-up w-full max-w-md mx-auto mb-10"
          style={{ animationDelay: "0.3s" }}
        >
          <div className="relative flex items-center bg-white rounded-full border border-border/60 shadow-soft p-2">
            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1 bg-transparent px-5 py-3 text-base font-sans outline-none placeholder:text-muted-foreground/60"
            />
            <button
              type="submit"
              disabled={isLoading}
              className="bg-[#1C1C1C] text-white font-sans font-medium px-6 py-3 rounded-full hover:bg-[#2a2a2a] transition-colors disabled:opacity-70 whitespace-nowrap"
            >
              {isLoading ? "Joining..." : "Join Waitlist"}
            </button>
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
