import {
  TrendingUp,
  BarChart3,
  Target,
  Calendar,
} from "lucide-react";

import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

import { MockAttempt, InterviewSession } from "@/lib/store";
import EmptyState from "@/components/EmptyState";

interface ProgressPageProps {
  mocks: MockAttempt[];
  sessions: InterviewSession[];
}

export default function ProgressPage({
  mocks,
  sessions,
}: ProgressPageProps) {
  const scoreData = mocks.map((m, i) => ({
    attempt: i + 1,
    score: m.aiScore * 10,
    date: new Date(m.createdAt).toLocaleDateString(),
  }));

  const typeCount = {
    behavioral: 0,
    technical: 0,
    situational: 0,
  };

  mocks.forEach((m) => {
    sessions.forEach((s) => {
      const q = s.questionBank.find(
        (qb) => qb.question === m.question
      );

      if (q) typeCount[q.type]++;
    });
  });

  const typeData = [
    { type: "Behavioral", count: typeCount.behavioral },
    { type: "Technical", count: typeCount.technical },
    { type: "Situational", count: typeCount.situational },
  ];

  const hasQuestionTypeData = typeData.some(
    (item) => item.count > 0
  );

  const weakAreas = [...typeData]
    .filter((area) => area.count > 0)
    .sort((a, b) => a.count - b.count)
    .slice(0, 3);

  const readinessData = sessions.map((s, i) => ({
    session: i + 1,
    score: s.readinessScore,
  }));

  const today = new Date();

  const activeDays = new Set(
    [
      ...mocks.map((m) => m.createdAt),
      ...sessions.map((s) => s.createdAt),
    ].map((d) => new Date(d).toDateString())
  );

  const streakDays = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(today);

    d.setDate(d.getDate() - (29 - i));

    return {
      date: d.toDateString(),
      day: d.getDate(),
      active: activeDays.has(d.toDateString()),
    };
  });

  const isEmpty =
    mocks.length === 0 && sessions.length === 0;

  return (
    <div className="space-y-6 animate-slide-up">
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Progress
        </h1>

        <p className="text-sm text-muted-foreground">
          Track your interview preparation journey
        </p>
      </div>

      {isEmpty ? (
        <EmptyState
          icon={<TrendingUp className="w-8 h-8 text-white" />}
          title="Track Your Interview Growth"
          description="Your preparation analytics, mock interview trends, and readiness insights will appear here as you complete sessions."
          buttonText="Start Your First Mock"
          tips={[
            "Monitor improvement across interview sessions",
            "Visualize readiness and consistency over time",
            "Identify weak areas and improve strategically",
            "Build momentum with regular preparation",
          ]}
        />
      ) : (
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="bg-card border border-border rounded-2xl p-6 shadow-card">
            <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              Mock Scores Over Time
            </h3>

            {scoreData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={scoreData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="hsl(var(--border))"
                  />

                  <XAxis
                    dataKey="attempt"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                  />

                  <YAxis
                    domain={[0, 100]}
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                  />

                  <Tooltip />

                  <Line
                    type="monotone"
                    dataKey="score"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                No mock interviews yet
              </p>
            )}
          </div>

          <div className="bg-card border border-border rounded-2xl p-6 shadow-card">
            <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" />
              Questions by Type
            </h3>

            {hasQuestionTypeData ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={typeData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="hsl(var(--border))"
                  />

                  <XAxis
                    dataKey="type"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                  />

                  <YAxis
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                  />

                  <Tooltip />

                  <Bar
                    dataKey="count"
                    fill="hsl(var(--primary))"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                No question type data yet
              </p>
            )}
          </div>

          <div className="bg-card border border-border rounded-2xl p-6 shadow-card">
            <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" />
              Activity (Last 30 Days)
            </h3>

            <div className="grid grid-cols-10 gap-1.5">
              {streakDays.map((d, i) => (
                <div
                  key={i}
                  className={`w-full aspect-square rounded-sm text-[10px] flex items-center justify-center ${
                    d.active
                      ? "gradient-primary text-primary-foreground"
                      : "bg-secondary text-muted-foreground"
                  }`}
                >
                  {d.day}
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-card border border-border rounded-2xl p-6 shadow-card">
              <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <Target className="w-4 h-4 text-warning" />
                Areas to Focus
              </h3>

              <div className="space-y-2">
                {weakAreas.length > 0 ? (
                  weakAreas.map((area) => (
                    <div
                      key={area.type}
                      className="flex items-center justify-between p-3 rounded-lg bg-secondary/30"
                    >
                      <span className="text-sm text-foreground">
                        {area.type}
                      </span>

                      <span className="text-xs text-muted-foreground">
                        {area.count} attempted
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Focus areas will appear after mock interviews
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}