import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Sparkles,
  BookOpen,
  MessageSquare,
  Briefcase,
  TrendingUp,
  ArrowRight,
  Plus,
  CheckCircle2,
  Circle,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/StatCard";
import { User, CareerProfile, InterviewSession, MockAttempt, JobApplication } from "@/lib/store";

interface DashboardPageProps {
  user: User;
  profile: CareerProfile | null;
  sessions: InterviewSession[];
  mocks: MockAttempt[];
  jobs: JobApplication[];
}

const ONBOARDING_DISMISSED_KEY = "prepiq_onboarding_dismissed";

export default function DashboardPage({ user, profile, sessions, mocks, jobs }: DashboardPageProps) {
  const navigate = useNavigate();

  const [isDismissed, setIsDismissed] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem(ONBOARDING_DISMISSED_KEY) === "true";
    }
    return false;
  });

  const dismissOnboarding = () => {
    setIsDismissed(true);
    if (typeof window !== "undefined") {
      localStorage.setItem(ONBOARDING_DISMISSED_KEY, "true");
    }
  };

  const completionPercent = profile?.onboardingComplete ? 100 : 0;
  const avgScore = mocks.length
    ? Math.round(mocks.reduce((s, m) => s + m.aiScore, 0) / mocks.length)
    : 0;

  const steps = [
    { id: 1, title: "Create your account", completed: true },
    { id: 2, title: "Complete Career DNA profile", completed: !!profile?.onboardingComplete },
    { id: 3, title: "Add your first job application", completed: jobs.length > 0 },
    { id: 4, title: "Create your first prep session", completed: sessions.length > 0 },
    { id: 5, title: "Complete your first mock interview", completed: mocks.length > 0 },
  ];

  const completedSteps = steps.filter((s) => s.completed).length;
  const onboardingProgress = (completedSteps / steps.length) * 100;
  const showOnboarding = !isDismissed && completedSteps < steps.length;

  const recentSessions = sessions.slice(-3).reverse();
  const recentJobs = jobs.slice(-3).reverse();

  const statusColor: Record<string, string> = {
    Applied: "bg-primary/20 text-primary",
    Screening: "bg-warning/20 text-warning",
    Interview: "bg-accent/20 text-accent-foreground",
    Offer: "bg-success/20 text-success",
    Rejected: "bg-destructive/20 text-destructive",
    Ghosted: "bg-muted text-muted-foreground",
  };

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Welcome Banner */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl gradient-primary p-6 shadow-glow"
      >
        <div className="flex items-center gap-3">
          <Sparkles className="w-8 h-8 text-primary-foreground" />
          <div>
            <h1 className="text-2xl font-bold text-primary-foreground">
              Welcome back, {user.name}!
            </h1>
            <p className="text-primary-foreground/80 text-sm">
              Ready to ace your next interview?
            </p>
          </div>
        </div>
      </motion.div>

      {/* Onboarding Checklist */}
      {showOnboarding && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl bg-card border border-border p-6 shadow-card relative"
        >
          <button
            onClick={dismissOnboarding}
            className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-secondary text-muted-foreground transition-colors"
            aria-label="Dismiss onboarding checklist"
          >
            <X className="w-4 h-4" />
          </button>
          
          <div className="mb-4 pr-8">
            <h2 className="text-lg font-bold text-foreground">Getting Started</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Complete these steps to get the most out of PrepIQ.
            </p>
          </div>

          <div className="flex items-center gap-3 mb-6">
            <div 
              className="flex-1 h-2 bg-secondary rounded-full overflow-hidden"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={onboardingProgress}
            >
              <div 
                className="h-full bg-primary transition-all duration-1000 ease-out"
                style={{ width: `${onboardingProgress}%` }}
              />
            </div>
            <span className="text-sm font-medium text-foreground min-w-[40px]">
              {completedSteps}/{steps.length}
            </span>
          </div>

          <div className="grid md:grid-cols-2 gap-3">
            {steps.map((step) => (
              <div 
                key={step.id} 
                className={`flex items-center gap-3 p-3 rounded-xl border ${step.completed ? 'bg-primary/5 border-primary/20' : 'bg-secondary/30 border-border'}`}
              >
                {step.completed ? (
                  <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
                ) : (
                  <Circle className="w-5 h-5 text-muted-foreground shrink-0" />
                )}
                <span className={`text-sm font-medium ${step.completed ? 'text-foreground' : 'text-muted-foreground'}`}>
                  {step.title}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Career DNA Card */}
      {completionPercent < 100 && (
        <div className="rounded-xl bg-card border border-warning/30 p-4 flex items-center justify-between">
          <div>
            <p className="font-medium text-foreground">Complete your Career DNA</p>
            <p className="text-sm text-muted-foreground">
              Your profile is {completionPercent}% complete
            </p>
          </div>
          <Button onClick={() => navigate("/onboarding")} variant="outline" className="border-warning text-warning hover:bg-warning/10">
            Finish Profile <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      )}

      {/*Stats*/}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={BookOpen}
          label="Prep Sessions"
          value={sessions.length}
          tooltip="Click to view your interview prep sessions"
          onClick={() => navigate("/interview-prep")}
        />

        <StatCard
          icon={MessageSquare}
          label="Mock Interviews"
          value={mocks.length}
          gradient="gradient-accent"
          tooltip="Click to view your mock interview history"
          onClick={() => navigate("/mock-interview")}
        />

        <StatCard
          icon={Briefcase}
          label="Jobs Applied"
          value={jobs.length}
          gradient="gradient-warm"
          tooltip="Click to view your job applications"
          onClick={() => navigate("/job-tracker")}
        />

        <StatCard
          icon={TrendingUp}
          label="Avg Mock Score"
          value={`${avgScore * 10}/100`}
          gradient="gradient-success"
          tooltip="Average score across all mock interviews"
        />
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3">
        <Button onClick={() => navigate("/interview-prep")} className="gradient-primary text-primary-foreground">
          <BookOpen className="w-4 h-4 mr-2" /> Prep for New Interview
        </Button>
        <Button onClick={() => navigate("/job-tracker")} variant="outline">
          <Plus className="w-4 h-4 mr-2" /> Add Job Application
        </Button>
      </div>

      {/* Recent Sessions */}
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-3">Recent Prep Sessions</h2>
          {recentSessions.length === 0 ? (
            <div className="rounded-xl bg-card border border-border p-6 text-center">
              <BookOpen className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground text-sm">No sessions yet</p>
              <Button variant="link" onClick={() => navigate("/interview-prep")} className="text-primary mt-1">
                Start your first prep →
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {recentSessions.map((s) => (
                <div
                  key={s.id}
                  className="rounded-xl bg-card border border-border p-4 flex items-center justify-between gap-3 overflow-hidden hover:border-primary/30 transition-colors"
                >
                  <div>
                    <p className="font-medium text-foreground text-sm">{s.company}</p>
                    <p className="text-xs text-muted-foreground">{s.jobTitle}</p>
                  </div>
                  <Badge className={s.readinessScore >= 70 ? "bg-success/20 text-success" : "bg-warning/20 text-warning"}>
                    {s.readinessScore}%
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <h2 className="text-lg font-semibold text-foreground mb-3">Recent Applications</h2>
          {recentJobs.length === 0 ? (
            <div className="rounded-xl bg-card border border-border p-6 text-center">
              <Briefcase className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground text-sm">No applications yet</p>
              <Button variant="link" onClick={() => navigate("/job-tracker")} className="text-primary mt-1">
                Track your first application →
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {recentJobs.map((j) => (
                <div
                  key={j.id}
                  className="rounded-xl bg-card border border-border p-4 flex items-center justify-between hover:border-primary/30 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-foreground text-sm truncate">
                      {j.companyName}
                    </p>

                    <p className="text-xs text-muted-foreground truncate">
                      {j.jobTitle}
                    </p>
                  </div>
                  <Badge className={statusColor[j.status] || ""}>
                    {j.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
