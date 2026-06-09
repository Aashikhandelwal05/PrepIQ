import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Lock, ArrowLeft } from "lucide-react";
import { Input } from "@/components/ui/input";
import { apiRequest } from "@/lib/api";
import type { SharedMockResponse } from "@/lib/store";

export default function SharedMockPage() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<SharedMockResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [needsPassword, setNeedsPassword] = useState(false);
  const [password, setPassword] = useState("");

  const fetchShared = async (pw?: string) => {
    setLoading(true);
    setError(null);
    try {
      const params = pw ? `?password=${encodeURIComponent(pw)}` : "";
      const res = await apiRequest<SharedMockResponse>(`/api/shared/mock/${token}${params}`, { method: "GET" });
      setData(res);
      setNeedsPassword(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load shared mock report";
      if (msg.toLowerCase().includes("password")) {
        setNeedsPassword(true);
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShared();
  }, [token]);

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchShared(password);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6 max-w-4xl mx-auto space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64" />
        <Skeleton className="h-32" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background p-6 max-w-4xl mx-auto">
        <Alert variant="destructive">
          <AlertCircle className="w-4 h-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button variant="ghost" className="mt-4" onClick={() => window.location.reload()}>
          Try Again
        </Button>
      </div>
    );
  }

  if (needsPassword) {
    return (
      <div className="min-h-screen bg-background p-6 flex items-center justify-center">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5" />
              Password Required
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordSubmit} className="space-y-3">
              <Input
                type="password"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
              />
              <Button type="submit" className="w-full" disabled={!password}>
                View Report
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data) return null;

  const questions = data.attempts;

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Mock Interview Report</h1>
            <p className="text-muted-foreground">
              {questions.length} {questions.length === 1 ? "question" : "questions"}
            </p>
          </div>
          <p className="text-sm text-muted-foreground">
            Shared on {new Date(data.shared_at).toLocaleDateString()}
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Average Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-primary">
              {Math.round(questions.reduce((sum, q) => sum + q.ai_score, 0) / questions.length)}/100
            </div>
          </CardContent>
        </Card>

        {questions.map((q, i) => (
          <Card key={i}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-base">
                <span>Question {i + 1}</span>
                <span className="text-sm font-mono">{q.ai_score}/100</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Question:</p>
                <p className="text-sm">{q.question}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Your Answer:</p>
                <p className="text-sm whitespace-pre-wrap">{q.user_answer}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Feedback:</p>
                <p className="text-sm whitespace-pre-wrap">
                  {q.ai_feedback?.strengths?.join(", ")}
                  {q.ai_feedback?.areas_for_improvement && (
                    <>
                      <br />
                      <span className="text-muted-foreground">Improve: </span>
                      {q.ai_feedback.areas_for_improvement.join(", ")}
                    </>
                  )}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
