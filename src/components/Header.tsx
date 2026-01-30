import { toast } from "sonner";
import { Link } from "react-router-dom";
import Magnet from "./Magnet";
import StarBorder from "./StarBorder";
import { useAuth } from "@/lib/auth";

const Header = () => {
  const { user, loading } = useAuth();

  const handleRequestDemo = () => {
    toast.info("Coming Soon!");
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 px-4 py-4">
      <div className="max-w-5xl mx-auto">
        <nav className="flex items-center justify-between px-6 py-3 rounded-full bg-background/80 backdrop-blur-md border border-border/50 shadow-soft">
          <Link to="/" className="flex items-center gap-2">
            {/* EarlyBird-style logo icon */}
            <img
              src="/earlybird-logo.svg"
              alt="Comply Logo"
              className="w-8 h-8"
            />
            <span className="font-serif text-xl tracking-tight">
              <span className="font-medium">Com</span><span className="italic font-light">ply</span>
            </span>
          </Link>

          <div className="hidden sm:flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">Features</a>
            <a href="#about" className="hover:text-foreground transition-colors">About</a>
            <a href="#faq" className="hover:text-foreground transition-colors">FAQ</a>
          </div>

          {!loading && (
            user ? (
              <Link
                to="/dashboard"
                className="text-sm font-medium px-4 py-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                Dashboard
              </Link>
            ) : (
              <div className="flex items-center gap-3">
                <Link
                  to="/login"
                  className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  Sign in
                </Link>
                <Magnet padding={50} magnetStrength={3}>
                  <StarBorder
                    as="button"
                    onClick={handleRequestDemo}
                    className="text-sm font-medium"
                    color="rgba(212, 196, 168, 0.9)"
                    speed="4s"
                  >
                    Request Demo
                  </StarBorder>
                </Magnet>
              </div>
            )
          )}
        </nav>
      </div>
    </header>
  );
};

export default Header;
