import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Sparkles, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

interface AuthPageProps {
  mode: "login" | "signup";
  onLogin: (
    email: string,
    password: string,
  ) => Promise<{ success: boolean; error?: string }>;
  onSignup: (
    name: string,
    email: string,
    password: string,
  ) => Promise<{ success: boolean; error?: string }>;
}

export default function AuthPage({ mode, onLogin, onSignup }: AuthPageProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const isFormInvalid =
    !email.trim() || !password.trim() || (mode === "signup" && !name.trim());

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    setIsLoading(true);
    try {
      if (mode === "login") {
        const res = await onLogin(email, password);
        if (res.success) {
          toast({
            title: "Welcome back!",
            description: "Logged in successfully.",
          });
          navigate("/dashboard");
        } else {
          toast({
            title: "Error",
            description: res.error,
            variant: "destructive",
          });
        }
      } else {
        const res = await onSignup(name, email, password);
        if (res.success) {
          toast({
            title: "Account created!",
            description: "Let's set up your profile.",
          });
          navigate("/onboarding");
        } else {
          toast({
            title: "Error",
            description: res.error,
            variant: "destructive",
          });
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-120px] left-[-120px] w-[300px] h-[300px] bg-primary/10 blur-3xl rounded-full" />

        <div className="absolute bottom-[-120px] right-[-120px] w-[300px] h-[300px] bg-primary/10 blur-3xl rounded-full" />
      </div>

      <div className="relative z-10 min-h-screen px-4 py-4 lg:py-8">
        <div className="max-w-6xl mx-auto min-h-[calc(100vh-3rem)] flex items-center">
          <div className="grid lg:grid-cols-2 gap-12 items-center w-full">
            {/* LEFT */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
              className="hidden lg:flex flex-col justify-center"
            >
              <div className="max-w-xl">
                <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/40 px-4 py-2 text-sm text-muted-foreground mb-6 backdrop-blur">
                  <Sparkles className="w-4 h-4 text-primary" />
                  Smart interview preparation platform
                </div>

                <h1 className="text-5xl font-bold leading-tight tracking-tight">
                  Prepare smarter with{" "}
                  <span className="gradient-text">PrepIQ</span>
                </h1>

                <p className="text-muted-foreground text-lg mt-5 leading-relaxed">
                  PrepIQ combines AI-powered interview preparation, career
                  profiling, mock interviews, application tracking, and progress
                  analytics into one modern workspace for students and job
                  seekers.
                </p>

                {/*Features - desktop*/}
                <div className="flex flex-wrap gap-3 mt-8">
                  <div className="px-4 py-2 rounded-full border border-border bg-card/50 text-sm text-muted-foreground">
                    AI Mock Interviews
                  </div>

                  <div className="px-4 py-2 rounded-full border border-border bg-card/50 text-sm text-muted-foreground">
                    Career DNA Profiling
                  </div>

                  <div className="px-4 py-2 rounded-full border border-border bg-card/50 text-sm text-muted-foreground">
                    Smart Prep Plans
                  </div>

                  <div className="px-4 py-2 rounded-full border border-border bg-card/50 text-sm text-muted-foreground">
                    Job Application Tracker
                  </div>

                  <div className="px-4 py-2 rounded-full border border-border bg-card/50 text-sm text-muted-foreground">
                    Progress Analytics
                  </div>

                  <div className="px-4 py-2 rounded-full border border-border bg-card/50 text-sm text-muted-foreground">
                    Resume–JD Matching
                  </div>
                </div>
              </div>
            </motion.div>

            {/* RIGHT*/}
            <motion.div
              key={mode}
              initial={{
                opacity: 0,
                y: 20,
                scale: 0.97,
              }}
              animate={{
                opacity: 1,
                y: 0,
                scale: 1,
              }}
              transition={{
                duration: 0.35,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="w-full max-w-md mx-auto"
            >
              <div className="text-center mb-6 lg:mb-8">
                <motion.div
                  key={mode + "-icon"}
                  initial={{ rotate: -10, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  transition={{ duration: 0.4 }}
                  className="w-14 h-14 rounded-2xl gradient-primary flex items-center justify-center mx-auto mb-4 shadow-glow"
                >
                  <Sparkles className="w-7 h-7 text-primary-foreground" />
                </motion.div>

                <motion.h1
                  key={mode + "-title"}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="text-3xl font-bold gradient-text"
                >
                  PrepIQ
                </motion.h1>

                <motion.p
                  key={mode + "-subtitle"}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.35 }}
                  className="text-muted-foreground mt-1"
                >
                  {mode === "login" ? "Welcome back" : "Start your journey"}
                </motion.p>
              </div>

              {/* AUTH */}
              <div className="bg-card border border-border rounded-2xl p-6 shadow-card backdrop-blur">
                <form onSubmit={handleSubmit} className="space-y-4">
                  {mode === "signup" && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.25 }}
                    >
                      <Label htmlFor="name">Full Name</Label>

                      <Input
                        id="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="John Doe"
                        required
                        className="mt-1 bg-secondary/50"
                      />
                    </motion.div>
                  )}

                  <div>
                    <Label htmlFor="email">Email</Label>

                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      required
                      className="mt-1 bg-secondary/50"
                    />
                  </div>

                  <div>
                    <Label htmlFor="password">Password</Label>

                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      className="mt-1 bg-secondary/50"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={isLoading || isFormInvalid}
                    className="w-full gradient-primary text-primary-foreground hover:opacity-90 transition-all duration-300"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        {mode === "login"
                          ? "Signing In..."
                          : "Creating Account..."}
                      </>
                    ) : (
                      <>
                        {mode === "login" ? "Sign In" : "Create Account"}
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </>
                    )}
                  </Button>
                </form>

                <p className="text-center text-sm text-muted-foreground mt-5">
                  {mode === "login" ? (
                    <>
                      Don't have an account?{" "}
                      <Link
                        to="/signup"
                        className="text-primary hover:underline transition-colors"
                      >
                        Sign up
                      </Link>
                    </>
                  ) : (
                    <>
                      Already have an account?{" "}
                      <Link
                        to="/login"
                        className="text-primary hover:underline transition-colors"
                      >
                        Sign in
                      </Link>
                    </>
                  )}
                </p>
              </div>
            </motion.div>

            {/* mobile */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="lg:hidden text-center mt-6"
            >
              <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto">
                Full-stack AI interview preparation platform with mock
                interviews, prep roadmaps, job tracking, and progress analytics.
              </p>

              {/* Feature - mobile */}
              <div className="flex flex-wrap justify-center gap-2 mt-4">
                <div className="px-3 py-1.5 rounded-full border border-border bg-card/50 text-[11px] text-muted-foreground">
                  AI Mock Interviews
                </div>

                <div className="px-3 py-1.5 rounded-full border border-border bg-card/50 text-[11px] text-muted-foreground">
                  Career DNA Profiling
                </div>

                <div className="px-3 py-1.5 rounded-full border border-border bg-card/50 text-[11px] text-muted-foreground">
                  Job Tracker
                </div>

                <div className="px-3 py-1.5 rounded-full border border-border bg-card/50 text-[11px] text-muted-foreground">
                  Resume Matching
                </div>

                <div className="px-3 py-1.5 rounded-full border border-border bg-card/50 text-[11px] text-muted-foreground">
                  Progress Analytics
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
