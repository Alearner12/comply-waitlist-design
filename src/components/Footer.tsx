const Footer = () => {
  return (
    <footer className="relative py-16 px-4 border-t border-border/50 overflow-hidden bg-gradient-to-t from-[#f0ebe3] to-transparent">
      {/* Aurora glow effect - more visible */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse 100% 80% at 50% 100%, rgba(212, 196, 168, 0.6) 0%, transparent 60%),
            radial-gradient(ellipse 80% 60% at 20% 100%, rgba(232, 220, 200, 0.5) 0%, transparent 50%),
            radial-gradient(ellipse 80% 60% at 80% 100%, rgba(201, 184, 150, 0.5) 0%, transparent 50%)
          `
        }}
      />

      {/* Animated aurora waves */}
      <div
        className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none"
        style={{
          background: 'linear-gradient(to top, rgba(212, 196, 168, 0.4), transparent)',
          animation: 'aurora-wave 6s ease-in-out infinite'
        }}
      />
      <div
        className="absolute bottom-0 left-0 right-0 h-24 pointer-events-none opacity-60"
        style={{
          background: 'linear-gradient(to top, rgba(201, 184, 150, 0.5), transparent)',
          animation: 'aurora-wave 8s ease-in-out infinite reverse'
        }}
      />

      <div className="max-w-5xl mx-auto relative z-10">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            {/* EarlyBird-style logo */}
            <img
              src="/earlybird-logo.svg"
              alt="Comply Logo"
              className="w-7 h-7"
            />
            <span className="font-serif text-xl tracking-tight">
              <span className="font-normal">Com</span><span className="italic font-normal">ply</span>
            </span>
          </div>

          <div className="flex items-center gap-8 text-sm text-muted-foreground font-sans tracking-earlybird">
            <a href="#" className="hover:text-foreground transition-colors">Privacy</a>
            <a href="#" className="hover:text-foreground transition-colors">Terms</a>
            <a href="#" className="hover:text-foreground transition-colors">Contact</a>
          </div>

          <p className="text-sm text-muted-foreground font-sans">
            © {new Date().getFullYear()} Comply. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
