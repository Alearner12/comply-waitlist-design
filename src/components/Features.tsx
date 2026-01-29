import { Search, Shield, Zap } from "lucide-react";
import SpotlightCard from "./SpotlightCard";
import DecryptedText from "./DecryptedText";

const features = [
  {
    icon: Search,
    title: "Deep Scanning",
    description: "Comprehensive analysis of every page for WCAG compliance",
  },
  {
    icon: Shield,
    title: "Legal Protection",
    description: "Stay ahead of ADA lawsuits with proactive monitoring",
  },
  {
    icon: Zap,
    title: "Instant Results",
    description: "Get actionable insights within minutes, not days",
  },
];

const Features = () => {
  return (
    <section id="features" className="py-20 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <SpotlightCard
              key={feature.title}
              className="opacity-0 animate-fade-in-up text-center"
              spotlightColor="rgba(212, 196, 168, 0.4)"
            >
              <div
                className="relative"
                style={{ animationDelay: `${0.1 * (index + 1)}s` }}
              >
                {/* Icon badge */}
                <div className="w-12 h-12 bg-[#1C1C1C] rounded-full flex items-center justify-center mx-auto mb-5 shadow-lg">
                  <feature.icon className="w-5 h-5 text-white" strokeWidth={1.5} />
                </div>

                {/* Content */}
                <h3 className="font-serif text-lg font-medium mb-2 tracking-tight">
                  <DecryptedText
                    text={feature.title}
                    animateOn="view"
                    sequential={true}
                    speed={40}
                    maxIterations={15}
                    revealDirection="center"
                    className="text-foreground"
                    encryptedClassName="text-muted-foreground/50"
                  />
                </h3>
                <p className="text-sm text-muted-foreground font-sans leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </SpotlightCard>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
