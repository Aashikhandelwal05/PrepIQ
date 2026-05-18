import { useState } from "react";
import { motion } from "framer-motion";
import {
  MessageSquare, Loader2, CheckCircle, XCircle,
  ChevronDown, ChevronUp, Activity, Sparkles, RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { CreateMockAttemptInput, MockAttempt, InterviewSession } from "@/lib/store";

// ── Types ──────────────────────────────────────────────────────────────────

interface MockInterviewPageProps {
  sessions: InterviewSession[];
  attempts: MockAttempt[];
  onAddAttempt: (input: CreateMockAttemptInput) => Promise<MockAttempt>;
  userId: string;
}

// ── Constants ──────────────────────────────────────────────────────────────

const ROLES = [
  "Frontend Developer",
  "Backend Developer",
  "Full Stack Developer",
  "Machine Learning Engineer",
  "Data Scientist",
] as const;

const DIFFICULTIES = ["Easy", "Medium", "Hard"] as const;

type Difficulty = (typeof DIFFICULTIES)[number];

// ── Helpers ────────────────────────────────────────────────────────────────

// Local fallback questions for when the backend is unavailable
const FALLBACK_QUESTIONS: Record<string, Record<string, string[]>> = {
  "Frontend Developer": {
    Easy: [
      "What is the difference between `null` and `undefined` in JavaScript?",
      "Explain the CSS box model and how padding, margin, and borders work together.",
      "What is the difference between `let`, `const`, and `var` in JavaScript?",
    ],
    Medium: [
      "Explain how React's reconciliation algorithm determines what to re-render.",
      "What are the trade-offs between server-side rendering and client-side rendering?",
      "How does the browser's event loop work, and what is the difference between microtasks and macrotasks?",
    ],
    Hard: [
      "Design a virtualized list component that renders 100,000 rows without performance degradation.",
      "How would you architect a micro-frontend system for a large-scale e-commerce application?",
      "Explain how you would implement an accessible drag-and-drop interface from scratch.",
    ],
  },
  "Backend Developer": {
    Easy: [
      "What is the difference between SQL and NoSQL databases?",
      "Explain what REST is and name its key constraints.",
      "What is the purpose of an index in a database?",
    ],
    Medium: [
      "How would you design a rate-limiting middleware for a REST API?",
      "Explain the differences between optimistic and pessimistic locking in databases.",
      "What strategies would you use to handle database migrations in a production environment?",
    ],
    Hard: [
      "Describe how you would implement distributed transactions across two microservices without two-phase commit.",
      "How would you design a system that handles 100K concurrent WebSocket connections?",
      "Explain the CAP theorem and how it influences your choice of database for a globally distributed system.",
    ],
  },
  "Full Stack Developer": {
    Easy: [
      "What happens between a user typing a URL and the page loading in the browser?",
      "What is CORS and why does it exist?",
      "Explain the difference between authentication and authorization.",
    ],
    Medium: [
      "How would you handle authentication state across a React SPA and a Node.js API?",
      "Describe how you would implement real-time notifications in a web application.",
      "How do you decide when to use server-side rendering vs. a single-page application?",
    ],
    Hard: [
      "Design a real-time collaborative document editor — describe both the frontend state model and the backend sync strategy.",
      "How would you architect a multi-tenant SaaS application with per-tenant data isolation?",
      "Design a deployment pipeline that supports blue-green deployments with zero downtime.",
    ],
  },
  "Machine Learning Engineer": {
    Easy: [
      "What is the difference between supervised and unsupervised learning?",
      "Explain what overfitting is and how you can prevent it.",
      "What is the purpose of a validation set versus a test set?",
    ],
    Medium: [
      "How would you handle class imbalance in a binary classification problem?",
      "Explain the difference between bagging and boosting ensemble methods.",
      "What are word embeddings and how do models like Word2Vec work?",
    ],
    Hard: [
      "Describe how you would architect an end-to-end MLOps pipeline for a model serving 10M predictions per day.",
      "How would you implement A/B testing for a recommendation model in production?",
      "Explain the transformer architecture and why self-attention is more effective than RNNs for sequence tasks.",
    ],
  },
  "Data Scientist": {
    Easy: [
      "What is the purpose of cross-validation in model evaluation?",
      "Explain the difference between precision and recall.",
      "What is a p-value and how do you interpret it?",
    ],
    Medium: [
      "Explain the bias-variance tradeoff and how it guides your choice of model complexity.",
      "How would you approach feature selection for a dataset with 500 features?",
      "Describe the assumptions behind linear regression and how you'd check them.",
    ],
    Hard: [
      "You suspect multicollinearity in your regression model. Walk through how you'd detect it and what you'd do.",
      "Design an experimentation framework for a product team that runs 50 A/B tests per month.",
      "How would you build a causal inference model to measure the impact of a marketing campaign?",
    ],
  },
};

function getLocalFallbackQuestion(role: string, difficulty: string): string {
  const pool = FALLBACK_QUESTIONS[role]?.[difficulty] ?? [];
  if (pool.length === 0) {
    return "Tell me about a challenging technical problem you solved and how you approached it.";
  }
  return pool[Math.floor(Math.random() * pool.length)];
}

async function fetchGeneratedQuestion(role: string, difficulty: string): Promise<string> {
  try {
    const res = await fetch("/api/mock/generate-question", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role, difficulty }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.detail ?? "Failed to generate question");
    }
    const data = await res.json();
    return data.question as string;
  } catch {
    // Backend unavailable — use local fallback questions
    return getLocalFallbackQuestion(role, difficulty);
  }
}

// ── Component ──────────────────────────────────────────────────────────────

export default function MockInterviewPage({
  sessions,
  attempts,
  onAddAttempt,
}: MockInterviewPageProps) {
  // Existing state
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<MockAttempt | null>(null);
  const [showModel, setShowModel] = useState(false);
  const [selectedSession, setSelectedSession] = useState<string>("custom");
  const { toast } = useToast();

  // ── NEW: AI question generation state ──────────────────────────────────
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty>("Medium");
  const [generating, setGenerating] = useState(false);
  // ───────────────────────────────────────────────────────────────────────

  const handleSelectQuestion = (q: string) => setQuestion(q);

  // ── NEW: Generate question handler ─────────────────────────────────────
  const handleGenerateQuestion = async () => {
    if (!selectedRole) {
      toast({
        title: "Select a role first",
        description: "Choose a target role before generating a question.",
        variant: "destructive",
      });
      return;
    }
    setGenerating(true);
    try {
      const q = await fetchGeneratedQuestion(selectedRole, selectedDifficulty);
      setQuestion(q);
      setResult(null); // clear previous result when a new question is loaded
      toast({ title: "Question generated!", description: `${selectedDifficulty} · ${selectedRole}` });
    } catch (error) {
      toast({
        title: "Could not generate question",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };
  // ───────────────────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || !answer.trim()) return;
    setLoading(true);
    try {
      const attempt = await onAddAttempt({
        sessionId: selectedSession !== "custom" ? selectedSession : "",
        question,
        userAnswer: answer,
      });
      setResult(attempt);
      toast({ title: "Feedback ready!", description: `You scored ${attempt.aiScore}/10` });
    } catch (error) {
      toast({
        title: "Unable to evaluate answer",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const scoreColor = (s: number) =>
    s >= 8
      ? "bg-success/20 text-success border-success/30"
      : s >= 5
      ? "bg-warning/20 text-warning border-warning/30"
      : "bg-destructive/20 text-destructive border-destructive/30";

  const selectedSessionQuestions =
    sessions.find((s) => s.id === selectedSession)?.questionBank || [];

  return (
    <div className="space-y-6 animate-slide-up">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Mock Interview</h1>
        <p className="text-sm text-muted-foreground">Practice answers and get AI feedback</p>
      </div>

      <div className="bg-card border border-border rounded-2xl p-6 shadow-card space-y-4">

        {/* ── NEW: AI Question Generator ─────────────────────────────── */}
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">AI Question Generator</span>
            <Badge variant="outline" className="text-xs border-primary/40 text-primary">
              OpenRouter
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Select a role and difficulty to auto-generate a realistic interview question.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Role dropdown */}
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Target Role</Label>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger className="bg-secondary/50">
                  <SelectValue placeholder="Select a role…" />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Difficulty dropdown */}
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Difficulty</Label>
              <Select
                value={selectedDifficulty}
                onValueChange={(v) => setSelectedDifficulty(v as Difficulty)}
              >
                <SelectTrigger className="bg-secondary/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DIFFICULTIES.map((d) => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            className="border-primary/40 text-primary hover:bg-primary/10"
            disabled={generating || !selectedRole}
            onClick={handleGenerateQuestion}
          >
            {generating ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : question ? (
              <RefreshCw className="w-4 h-4 mr-2" />
            ) : (
              <Sparkles className="w-4 h-4 mr-2" />
            )}
            {generating
              ? "Generating…"
              : question
              ? "Regenerate Question"
              : "Generate Question"}
          </Button>
        </div>
        {/* ── END: AI Question Generator ─────────────────────────────── */}

        {/* Existing: prep session selector */}
        {sessions.length > 0 && (
          <div>
            <Label>Select from a prep session (optional)</Label>
            <Select value={selectedSession} onValueChange={setSelectedSession}>
              <SelectTrigger className="mt-1 bg-secondary/50">
                <SelectValue placeholder="Custom question" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="custom">Custom question</SelectItem>
                {sessions.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.company} — {s.jobTitle}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Existing: session question picker */}
        {selectedSession !== "custom" && selectedSessionQuestions.length > 0 && (
          <div className="space-y-2">
            <Label>Pick a question</Label>
            <div className="max-h-48 overflow-y-auto space-y-1.5">
              {selectedSessionQuestions.map((q, i) => (
                <button
                  key={i}
                  onClick={() => handleSelectQuestion(q.question)}
                  className={`w-full text-left p-3 rounded-lg text-sm transition-colors border ${
                    question === q.question
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border bg-secondary/30 text-muted-foreground hover:border-primary/30"
                  }`}
                >
                  {q.question}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Existing: answer form — UNCHANGED */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Question</Label>
            <Textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Enter or paste an interview question, or generate one above…"
              rows={2}
              className="mt-1 bg-secondary/50"
              required
            />
          </div>
          <div>
            <Label>Your Answer</Label>
            <Textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Type your answer here..."
              rows={6}
              className="mt-1 bg-secondary/50"
              required
            />
          </div>
          <Button
            type="submit"
            disabled={loading}
            className="gradient-primary text-primary-foreground"
          >
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {loading ? "Evaluating..." : "Submit Answer"}
          </Button>
        </form>
      </div>

      {/* Existing: result cards — COMPLETELY UNCHANGED */}
      {result && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <div className="bg-card border border-border rounded-2xl p-6 shadow-card">
            <div className="flex items-center gap-4 mb-4">
              <div className={`px-4 py-2 rounded-xl text-2xl font-bold border ${scoreColor(result.aiScore)}`}>
                {result.aiScore}/10
              </div>
              <p className="text-foreground font-medium">{result.aiFeedback.oneLineVerdict}</p>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-success flex items-center gap-1">
                  <CheckCircle className="w-4 h-4" /> Strengths
                </h4>
                {result.aiFeedback.strengths.map((s, i) => (
                  <p key={i} className="text-sm text-muted-foreground flex items-center gap-2">
                    <CheckCircle className="w-3 h-3 text-success shrink-0" /> {s}
                  </p>
                ))}
              </div>
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-destructive flex items-center gap-1">
                  <XCircle className="w-4 h-4" /> Areas to Improve
                </h4>
                {result.aiFeedback.missing.map((m, i) => (
                  <p key={i} className="text-sm text-muted-foreground flex items-center gap-2">
                    <XCircle className="w-3 h-3 text-destructive shrink-0" /> {m}
                  </p>
                ))}
              </div>
            </div>
            <button
              onClick={() => setShowModel(!showModel)}
              className="flex items-center gap-1 text-sm text-primary mt-4 hover:underline"
            >
              {showModel ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              {showModel ? "Hide" : "Show"} Model Answer
            </button>
            {showModel && (
              <div className="mt-3 p-4 rounded-xl bg-secondary/30 border border-border text-sm text-muted-foreground">
                {result.aiFeedback.modelAnswer}
              </div>
            )}
          </div>

          {result.aiFeedback.confidenceAnalysis && (
            <div className="bg-card border border-border rounded-2xl p-6 shadow-card">
              <div className="flex items-center gap-2 mb-4">
                <Activity className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">Confidence Analysis</h3>
                <Badge variant="outline" className="text-xs border-primary/40 text-primary">
                  TextBlob · Sentiment NLP
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mb-4">
                Analyzed using sentiment polarity, answer length, and specificity metrics.
              </p>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>Confidence Score</span>
                      <span className="font-medium text-foreground">
                        {result.aiFeedback.confidenceAnalysis.confidenceScore}/100
                      </span>
                    </div>
                    <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-1000"
                        style={{
                          width: `${result.aiFeedback.confidenceAnalysis.confidenceScore}%`,
                          background:
                            result.aiFeedback.confidenceAnalysis.confidenceScore >= 70
                              ? "hsl(var(--success))"
                              : result.aiFeedback.confidenceAnalysis.confidenceScore >= 40
                              ? "hsl(var(--warning))"
                              : "hsl(var(--destructive))",
                        }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>Specificity (metrics & numbers)</span>
                      <span className="font-medium text-foreground">
                        {result.aiFeedback.confidenceAnalysis.specificity}/100
                      </span>
                    </div>
                    <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all duration-1000"
                        style={{ width: `${result.aiFeedback.confidenceAnalysis.specificity}%` }}
                      />
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-24 shrink-0">Sentiment</span>
                    <span
                      className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
                        result.aiFeedback.confidenceAnalysis.sentiment === "positive"
                          ? "bg-success/10 text-success border-success/30"
                          : result.aiFeedback.confidenceAnalysis.sentiment === "negative"
                          ? "bg-destructive/10 text-destructive border-destructive/30"
                          : "bg-secondary text-muted-foreground border-border"
                      }`}
                    >
                      {result.aiFeedback.confidenceAnalysis.sentiment.charAt(0).toUpperCase() +
                        result.aiFeedback.confidenceAnalysis.sentiment.slice(1)}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-24 shrink-0">Word Count</span>
                    <span className="text-xs font-medium text-foreground">
                      {result.aiFeedback.confidenceAnalysis.wordCount} words
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-24 shrink-0">Tip</span>
                    <span className="text-xs text-muted-foreground">
                      {result.aiFeedback.confidenceAnalysis.wordCount < 80
                        ? "Add more detail — aim for 100+ words"
                        : result.aiFeedback.confidenceAnalysis.specificity < 20
                        ? "Include numbers or metrics for impact"
                        : "Great response depth! 🎉"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* Existing: past attempts — COMPLETELY UNCHANGED */}
      {attempts.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-3">Past Attempts</h2>
          <div className="space-y-2">
            {[...attempts].reverse().slice(0, 10).map((a) => (
              <div
                key={a.id}
                className="rounded-xl bg-card border border-border p-4 flex items-center justify-between hover:border-primary/30 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate">{a.question}</p>
                  <p className="text-xs text-muted-foreground">{new Date(a.createdAt).toLocaleDateString()}</p>
                </div>
                <Badge className={scoreColor(a.aiScore)}>{a.aiScore}/10</Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {attempts.length === 0 && !result && (
        <div className="bg-card border border-border rounded-2xl p-12 text-center shadow-card">
          <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-1">No mock interviews yet</h3>
          <p className="text-sm text-muted-foreground">Answer a question above to get AI feedback</p>
        </div>
      )}
    </div>
  );
}
