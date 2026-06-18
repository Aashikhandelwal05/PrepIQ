import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Lock, ArrowLeft } from "lucide-react";
import { Input } from "@/components/ui/input";
import { apiRequest } from "@/lib/api";
import type { SharedPrepResponse } from "@/lib/store";

export default function SharedPrepPage() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<SharedPrepResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [needsPassword, setNeedsPassword] = useState(false);
  const [password, setPassword] = useState("");

  const fetchShared = async (pw?: string) => {
    setLoading(true);
    setError(null);
    try {
      const params = pw ? `?password=${encodeURIComponent(pw)}` : "";
      const res = await apiRequest<SharedPrepResponse>(`/api/shared/prep/${token}${params}`, { method: "GET" });
      setData(res);
      setNeedsPassword(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load shared report";
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

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Interview Prep Report</h1>
            <p className="text-muted-foreground">
              {data.session.job_title} @ {data.session.company}
            </p>
          </div>
          <p className="text-sm text-muted-foreground">
            Shared on {new Date(data.shared_at).toLocaleDateString()}
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Readiness Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-primary">{data.session.readiness_score}/100</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Gap Analysis</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.session.gap_analysis.map((gap, i) => (
              <div key={i} className="border rounded-lg p-4">
                <h3 className="font-semibold">{gap.skill_name}</h3>
                <p className="text-sm text-muted-foreground mt-1">{gap.description}</p>
                <div className="flex gap-4 mt-2 text-sm">
                  <span>Current: {gap.current_level}</span>
                  <span>Required: {gap.required_level}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
