import { useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Sparkles, ArrowLeft, Home } from "lucide-react";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-6">

      {/* Background Glow */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-1/3 h-[450px] w-[450px] -translate-x-1/2 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-[350px] w-[350px] rounded-full bg-primary/10 blur-3xl" />
      </div>

      {/* Content */}
      <div className="relative z-10 w-full max-w-xl">

        <div className="rounded-3xl border border-border/50 bg-card/60 p-8 backdrop-blur-xl shadow-2xl text-center">

          {/* Brand */}
          <div className="mb-8 flex items-center justify-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl gradient-primary shadow-glow">
              <Sparkles className="h-6 w-6 text-white" />
            </div>

            <span className="text-3xl font-bold text-primary">
              PrepIQ
            </span>
          </div>

          {/* 404 */}
          <h1 className="mb-2 text-7xl md:text-8xl font-extrabold bg-gradient-to-r from-primary via-primary/90 to-accent bg-clip-text text-transparent">
            404
          </h1>

          <h2 className="mb-4 text-2xl font-semibold text-foreground">
            Looks like you're lost
          </h2>

          <p className="mb-8 text-muted-foreground">
            The page you're looking for doesn't exist, may have been moved,
            or the URL might be incorrect.
          </p>

          {/* Route */}
          <div className="mb-8 rounded-xl border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
            Requested route:
            <span className="ml-2 font-mono text-foreground">
              {location.pathname}
            </span>
          </div>

          {/* Buttons */}
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">

            <Link
              to="/dashboard"
              className="inline-flex items-center justify-center gap-2 rounded-xl gradient-primary px-5 py-3 font-medium text-primary-foreground shadow-glow transition-all hover:scale-[1.02]"
            >
              <Home className="h-4 w-4" />
              Go to Dashboard
            </Link>

            <button
              onClick={() => navigate(-1)}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-background/60 px-5 py-3 font-medium transition-colors hover:bg-muted"
            >
              <ArrowLeft className="h-4 w-4" />
              Go Back
            </button>

          </div>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
