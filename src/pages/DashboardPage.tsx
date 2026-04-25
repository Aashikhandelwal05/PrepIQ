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

export default function DashboardPage({ user, profile, sessions, mocks, jobs }: DashboardPageProps) {
  const navigate = useNavigate();

  const completionPercent = profile?.onboardingComplete ? 100 : 0;
  const avgScore = mocks.length
    ? Math.round(mocks.reduce((s, m) => s + m.aiScore, 0) / mocks.length * 10)
    : 0;

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

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={BookOpen} label="Prep Sessions" value={sessions.length} />
        <StatCard icon={MessageSquare} label="Mock Interviews" value={mocks.length} gradient="gradient-accent" />
        <StatCard icon={Briefcase} label="Jobs Applied" value={jobs.length} gradient="gradient-warm" />
        <StatCard icon={TrendingUp} label="Avg Mock Score" value={`${avgScore}%`} gradient="gradient-success" />
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
                  className="rounded-xl bg-card border border-border p-4 flex items-center justify-between hover:border-primary/30 transition-colors"
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
                  <div>
                    <p className="font-medium text-foreground text-sm">{j.companyName}</p>
                    <p className="text-xs text-muted-foreground">{j.jobTitle}</p>
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
