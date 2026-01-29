import { useState } from "react";
import { Plus, Minus } from "lucide-react";
import GradientText from "./GradientText";

const faqs = [
  {
    question: "What is ADA compliance?",
    answer: "ADA compliance refers to meeting the accessibility standards set by the Americans with Disabilities Act. For websites, this means ensuring your digital content is accessible to people with disabilities, including those who use screen readers, keyboard navigation, or other assistive technologies.",
  },
  {
    question: "How does Comply scan my website?",
    answer: "Comply uses advanced AI algorithms to crawl your entire website, testing each page against WCAG 2.1 guidelines. We check for issues like missing alt text, poor color contrast, keyboard accessibility, and much more.",
  },
  {
    question: "How often should I scan my site?",
    answer: "We recommend scanning after any major update and at least monthly for ongoing compliance. Content changes, new features, and third-party integrations can all introduce accessibility issues.",
  },
  {
    question: "What's included in the report?",
    answer: "You'll receive a comprehensive report detailing all identified issues, their severity, WCAG success criteria violated, and step-by-step remediation instructions prioritized by impact.",
  },
  {
    question: "Do you offer remediation services?",
    answer: "While Comply focuses on scanning and reporting, we partner with accessibility specialists who can help implement fixes. Our reports are designed to be actionable for your development team.",
  },
  {
    question: "Is Comply suitable for agencies?",
    answer: "Absolutely! Comply is built with agencies in mind. Manage multiple client sites from a single dashboard, generate white-label reports, and demonstrate value with compliance tracking over time.",
  },
];

const FAQ = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const leftColumn = faqs.filter((_, i) => i % 2 === 0);
  const rightColumn = faqs.filter((_, i) => i % 2 === 1);

  const renderFAQItem = (faq: typeof faqs[0], index: number) => {
    const actualIndex = faqs.indexOf(faq);
    const isOpen = openIndex === actualIndex;

    return (
      <div
        key={actualIndex}
        className="border-b border-border/60 last:border-0"
      >
        <button
          onClick={() => setOpenIndex(isOpen ? null : actualIndex)}
          className="w-full flex items-center justify-between py-5 text-left group"
        >
          <span className="serif-headline text-lg pr-4">{faq.question}</span>
          <div className={`flex-shrink-0 w-8 h-8 rounded-full border border-border flex items-center justify-center transition-colors duration-200 ${isOpen ? 'bg-primary border-primary' : 'bg-transparent group-hover:bg-secondary'}`}>
            {isOpen ? (
              <Minus className={`w-4 h-4 transition-colors ${isOpen ? 'text-primary-foreground' : 'text-foreground'}`} />
            ) : (
              <Plus className="w-4 h-4 text-foreground" />
            )}
          </div>
        </button>
        <div
          className={`overflow-hidden transition-all duration-300 ease-out ${
            isOpen ? 'max-h-48 pb-5' : 'max-h-0'
          }`}
        >
          <p className="text-muted-foreground leading-relaxed pr-12">
            {faq.answer}
          </p>
        </div>
      </div>
    );
  };

  return (
    <section className="py-20 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="serif-headline text-4xl sm:text-5xl mb-4">
            Frequently Asked{" "}
            <GradientText
              colors={["#1C1C1C", "#7d6b9e", "#d4c4a8", "#1C1C1C"]}
              animationSpeed={5}
              className="italic-accent"
            >
              Questions
            </GradientText>
          </h2>
          <p className="text-muted-foreground text-lg">
            Everything you need to know about Comply
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12">
          <div>
            {leftColumn.map((faq, i) => renderFAQItem(faq, i))}
          </div>
          <div>
            {rightColumn.map((faq, i) => renderFAQItem(faq, i))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default FAQ;
