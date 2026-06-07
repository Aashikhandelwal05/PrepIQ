import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { apiRequest } from "@/lib/api";
import type { SharedReportPublic } from "@/lib/store";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const statusColor: Record<string, string> = {
  Low: "bg-warning/20 text-warning border-warning/30",
  Medium: "bg-accent/20 text-accent-foreground border-accent/30",
  High: "bg-destructive/20 text-destructive border-destructive/30",
};

const typeColor: Record<string, string> = {
  behavioral: "bg-primary/20 text-primary",
  technical: "bg-accent/20 text-accent-foreground",
  situational: "bg-warning/20 text-warning",
};

const diffColor: Record<string, string> = {
  easy: "bg-success/20 text-success",
  medium: "bg-warning/20 text-warning",
  hard: "bg-destructive/20 text-destructive",
};

export default function SharedPrepPage() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<SharedReportPublic | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [needsPassword, setNeedsPassword] = useState(false);
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    apiRequest<SharedReportPublic>(`/shared/prep/${token}`)
      .then((d) => { setData(d); setLoading(false); })
      .catch((err) => {
        if (err instanceof Response && err.status === 401) {
          setNeedsPassword(true);
          setLoading(false);
        } else {
          setError("Report not found or has expired.");
          setLoading(false);
        }
      });
  }, [token]);

  const handlePasswordSubmit = async () => {
    setLoading(true);
    try {
      const d = await apiRequest<SharedReportPublic>(`/shared/prep/${token}/verify`, {
        method: "POST",
        body: JSON.stringify({ password }),
      });
      setData(d);
      setNeedsPassword(false);
    } catch {
      setError("Incorrect password.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-foreground">PrepIQ</h1>
          <p className="text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  if (needsPassword) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle>Password Required</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">This report is password-protected.</p>
            <Input type="password" placeholder="Enter password" value={password} onChange={(e) => setPassword(e.target.value)} />
            <Button onClick={handlePasswordSubmit} className="w-full gradient-primary text-primary-foreground">View Report</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-foreground">PrepIQ</h1>
          <span className="text-xs text-muted-foreground">Shared Report</span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {data.reportType === "prep" && data.prepSession && (
          <>
            <div>
              <h2 className="text-2xl font-bold text-foreground">{data.prepSession.company} — {data.prepSession.jobTitle}</h2>
              <p className="text-sm text-muted-foreground">Created {new Date(data.createdAt).toLocaleDateString()}</p>
            </div>

            <div className="flex items-center gap-4">
              <div className="relative w-24 h-24">
                <svg className="w-24 h-24 -rotate-90" viewBox="0 0 36 36">
                  <circle cx="18" cy="18" r="15.5" fill="none" stroke="hsl(var(--secondary))" strokeWidth="3" />
                  <circle cx="18" cy="18" r="15.5" fill="none" stroke={data.prepSession.readinessScore >= 70 ? "hsl(var(--success))" : data.prepSession.readinessScore >= 40 ? "hsl(var(--warning))" : "hsl(var(--destructive))"} strokeWidth="3" strokeDasharray={`${data.prepSession.readinessScore}, 100`} strokeLinecap="round" />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-lg font-bold">{data.prepSession.readinessScore}%</span>
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Readiness Score</p>
                {data.prepSession.mlMatchScore > 0 && <p className="text-xs text-muted-foreground">ML Match: {data.prepSession.mlMatchScore}%</p>}
              </div>
            </div>

            {data.prepSession.gapAnalysis.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="text-lg">Gap Analysis</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {data.prepSession.gapAnalysis.map((g, i) => (
                      <div key={i} className="flex items-center gap-3 text-sm py-1.5 border-b border-border/50 last:border-0">
                        <span className="w-28 font-medium text-foreground shrink-0">{g.skill}</span>
                        <span className="flex-1 text-muted-foreground truncate">{g.have}</span>
                        <span className="flex-1 text-muted-foreground truncate">{g.need}</span>
                        <Badge className={`${statusColor[g.gapLevel] || ""} text-[10px] px-1.5 py-0 h-5 shrink-0`}>{g.gapLevel}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {data.prepSession.questionBank.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="text-lg">Practice Questions</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {data.prepSession.questionBank.slice(0, 5).map((q, i) => (
                    <div key={i} className="rounded-lg bg-secondary/30 p-3 text-sm space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground">Q{i + 1}.</span>
                        <Badge className={`${typeColor[q.type] || ""} text-[10px] px-1.5 py-0 h-5`}>{q.type}</Badge>
                        <Badge className={`${diffColor[q.difficulty] || ""} text-[10px] px-1.5 py-0 h-5`}>{q.difficulty}</Badge>
                      </div>
                      <p className="text-muted-foreground pl-5">{q.question}</p>
                      <p className="text-xs text-muted-foreground/60 pl-5">Tip: {q.tip}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {data.prepSession.roadmap.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="text-lg">Study Plan</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {data.prepSession.roadmap.map((day) => (
                    <div key={day.day} className="rounded-lg border border-border p-3">
                      <p className="text-sm font-medium text-foreground mb-1">Day {day.day} — {day.focusArea}</p>
                      <ul className="list-disc list-inside space-y-0.5">
                        {day.tasks.map((task, i) => (
                          <li key={i} className="text-xs text-muted-foreground">{task}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </>
        )}

        {data.reportType === "mock" && data.mockAttempt && (
          <>
            <div>
              <h2 className="text-2xl font-bold text-foreground">Mock Interview Result</h2>
              <p className="text-sm text-muted-foreground">{new Date(data.createdAt).toLocaleDateString()}</p>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-3xl font-bold" style={{ color: data.mockAttempt.aiScore >= 7 ? "hsl(var(--success))" : data.mockAttempt.aiScore >= 4 ? "hsl(var(--warning))" : "hsl(var(--destructive))" }}>{data.mockAttempt.aiScore}/10</span>
              <Badge className={data.mockAttempt.aiScore >= 7 ? "bg-success/20 text-success" : data.mockAttempt.aiScore >= 4 ? "bg-warning/20 text-warning" : "bg-destructive/20 text-destructive"}>{data.mockAttempt.aiFeedback.oneLineVerdict}</Badge>
            </div>

            <Card>
              <CardHeader><CardTitle className="text-lg">Question</CardTitle></CardHeader>
              <CardContent><p className="text-sm text-muted-foreground">{data.mockAttempt.question}</p></CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-lg">Your Answer</CardTitle></CardHeader>
              <CardContent><p className="text-sm text-muted-foreground whitespace-pre-wrap">{data.mockAttempt.userAnswer}</p></CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-lg">Feedback</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {data.mockAttempt.aiFeedback.strengths.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-success mb-1">Strengths</p>
                    <ul className="list-disc list-inside text-xs text-muted-foreground space-y-0.5">
                      {data.mockAttempt.aiFeedback.strengths.map((s, i) => <li key={i}>{s}</li>)}
                    </ul>
                  </div>
                )}
                {data.mockAttempt.aiFeedback.missing.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-destructive mb-1">Areas to Improve</p>
                    <ul className="list-disc list-inside text-xs text-muted-foreground space-y-0.5">
                      {data.mockAttempt.aiFeedback.missing.map((m, i) => <li key={i}>{m}</li>)}
                    </ul>
                  </div>
                )}
                {data.mockAttempt.aiFeedback.modelAnswer && (
                  <div>
                    <p className="text-sm font-medium text-foreground mb-1">Model Answer</p>
                    <p className="text-xs text-muted-foreground whitespace-pre-wrap">{data.mockAttempt.aiFeedback.modelAnswer}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
  );
}
