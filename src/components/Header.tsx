const Header = () => {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 px-4 py-4">
      <div className="max-w-5xl mx-auto">
        <nav className="flex items-center justify-between px-6 py-3 rounded-full bg-background/80 backdrop-blur-md border border-border/50 shadow-soft">
          <div className="flex items-center gap-2">
            {/* EarlyBird-style logo icon */}
            <img
              src="/earlybird-logo.svg"
              alt="Comply Logo"
              className="w-8 h-8"
            />
            <span className="font-serif text-xl tracking-tight">
              <span className="font-medium">Com</span><span className="italic font-light">ply</span>
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">Features</a>
            <a href="#about" className="hover:text-foreground transition-colors">About</a>
            <a href="#faq" className="hover:text-foreground transition-colors">FAQ</a>
          </div>

          <button className="btn-pill btn-primary text-sm py-2">
            Request Demo
          </button>
        </nav>
      </div>
    </header>
  );
};

export default Header;
