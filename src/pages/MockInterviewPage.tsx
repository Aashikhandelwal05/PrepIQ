import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  MessageSquare, Loader2, CheckCircle, XCircle,
  ChevronDown, ChevronUp, Activity, Sparkles, RefreshCw, Timer, AlertTriangle,
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
import { apiRequest } from "@/lib/api";

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
const TIMER_OPTIONS = [
  { value: "60", label: "1 min" },
  { value: "120", label: "2 min" },
  { value: "180", label: "3 min" },
  { value: "none", label: "No limit" },
] as const;
const DEFAULT_TIMER_OPTION: TimerOption = "120";
const TIMER_WARNING_THRESHOLD_SECONDS = 30;

type Difficulty = (typeof DIFFICULTIES)[number];
type TimerOption = (typeof TIMER_OPTIONS)[number]["value"];

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

function formatCountdown(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

async function fetchGeneratedQuestion(userId: string, role: string, difficulty: string): Promise<string> {
  try {
    const data = await apiRequest<{ question: string }>(`/api/users/${userId}/mock/generate-question`, {
      method: "POST",
      body: JSON.stringify({ role, difficulty }),
    });
    return data.question;
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
  userId,
}: MockInterviewPageProps) {
  // Existing state
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<MockAttempt | null>(null);
  const [showModel, setShowModel] = useState(false);
  const [expandedAttemptId, setExpandedAttemptId] = useState<string | null>(null);
  const [selectedSession, setSelectedSession] = useState<string>("custom");
  const { toast } = useToast();

  // ── NEW: AI question generation state ──────────────────────────────────
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty>("Medium");
  const [generating, setGenerating] = useState(false);
  const [timerOption, setTimerOption] = useState<TimerOption>(DEFAULT_TIMER_OPTION);
  const [remainingSeconds, setRemainingSeconds] = useState(120);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [autoSubmitted, setAutoSubmitted] = useState(false);
  // ───────────────────────────────────────────────────────────────────────

  const timerLimitSeconds = timerOption === "none" ? null : Number(timerOption);
  const hasActiveQuestion = question.trim().length > 0 && !result;
  const isNoLimitTimer = timerLimitSeconds == null;
  const isTimerWarning = !isNoLimitTimer && remainingSeconds <= TIMER_WARNING_THRESHOLD_SECONDS;
  const timerProgressPercent =
    timerLimitSeconds && timerLimitSeconds > 0
      ? Math.max(0, Math.min(100, (remainingSeconds / timerLimitSeconds) * 100))
      : 0;

  const applyTimerOption = (nextOption: TimerOption) => {
    setTimerOption(nextOption);

    const nextLimit = nextOption === "none" ? null : Number(nextOption);
    if (nextLimit == null) {
      setRemainingSeconds(0);
      setIsTimerRunning(false);
    } else {
      setRemainingSeconds(nextLimit);
      setIsTimerRunning(hasActiveQuestion && !loading);
    }
    setAutoSubmitted(false);
  };

  const resetTimerForQuestion = () => {
    if (timerLimitSeconds == null) {
      setRemainingSeconds(0);
      setIsTimerRunning(false);
    } else {
      setRemainingSeconds(timerLimitSeconds);
      setIsTimerRunning(true);
    }
    setAutoSubmitted(false);
  };

  const beginQuestion = (nextQuestion: string) => {
    setQuestion(nextQuestion);
    setAnswer("");
    setResult(null);
    setShowModel(false);
    resetTimerForQuestion();
  };

  const handleSelectQuestion = (q: string) => beginQuestion(q);

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
      const q = await fetchGeneratedQuestion(userId, selectedRole, selectedDifficulty);
      beginQuestion(q);
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

  const submitAnswer = useCallback(async (isTimeout = false) => {
    if (!question.trim()) return;
    if (!isTimeout && !answer.trim()) return;
    setLoading(true);
    setIsTimerRunning(false);
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
  }, [answer, onAddAttempt, question, selectedSession, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await submitAnswer(false);
  };

  useEffect(() => {
    if (timerLimitSeconds == null) return;
    if (!isTimerRunning || loading || !!result) return;
    if (remainingSeconds <= 0) return;

    const intervalId = window.setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          window.clearInterval(intervalId);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [isTimerRunning, loading, remainingSeconds, result, timerLimitSeconds]);

  useEffect(() => {
    if (timerLimitSeconds == null) return;
    if (!isTimerRunning || loading || !!result) return;
    if (remainingSeconds > 0 || autoSubmitted) return;

    setAutoSubmitted(true);
    setIsTimerRunning(false);
    toast({
      title: "Time is up",
      description: "Your answer was auto-submitted.",
    });
    void submitAnswer(true);
  }, [
    autoSubmitted,
    isTimerRunning,
    loading,
    remainingSeconds,
    result,
    timerLimitSeconds,
    toast,
    submitAnswer,
  ]);

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
                  className={`w-full text-left p-3 rounded-lg text-sm transition-colors border ${question === q.question
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
              onChange={(e) => {
                const nextQuestion = e.target.value;
                const hadQuestion = question.trim().length > 0;
                const hasQuestionNow = nextQuestion.trim().length > 0;

                setQuestion(nextQuestion);
                if (!hadQuestion && hasQuestionNow) {
                  resetTimerForQuestion();
                }
                if (hadQuestion && !hasQuestionNow) {
                  setIsTimerRunning(false);
                  setAutoSubmitted(false);
                  if (timerLimitSeconds != null) {
                    setRemainingSeconds(timerLimitSeconds);
                  }
                }
              }}
              placeholder="Enter or paste an interview question, or generate one above…"
              rows={2}
              className="mt-1 bg-secondary/50"
              required
            />
          </div>
          <div>
            <div className="space-y-2 mb-2">
              <div className="flex items-center justify-between gap-3">
                <Label>Your Answer</Label>
                <Select value={timerOption} onValueChange={(v) => applyTimerOption(v as TimerOption)}>
                  <SelectTrigger className="h-8 w-[140px] bg-secondary/50 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIMER_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div
                className={`rounded-xl border p-3 transition-colors ${isNoLimitTimer
                  ? "border-border bg-secondary/20"
                  : isTimerWarning
                    ? "border-destructive/40 bg-destructive/10"
                    : "border-primary/30 bg-primary/5"
                  }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    {isTimerWarning ? (
                      <AlertTriangle className="w-4 h-4 text-destructive" />
                    ) : (
                      <Timer className="w-4 h-4 text-primary" />
                    )}
                    <span className="text-xs font-medium text-muted-foreground">Answer Timer</span>
                  </div>

                  {isNoLimitTimer ? (
                    <Badge variant="outline" className="border-border text-muted-foreground">
                      No limit
                    </Badge>
                  ) : (
                    <span
                      className={`font-mono text-2xl font-bold tabular-nums ${isTimerWarning ? "text-destructive" : "text-foreground"
                        }`}
                    >
                      {formatCountdown(remainingSeconds)}
                    </span>
                  )}
                </div>

                {!isNoLimitTimer && (
                  <>
                    <div className="mt-3 h-2 w-full rounded-full bg-secondary/50 overflow-hidden">
                      <div
                        className={`h-full transition-all duration-700 ${isTimerWarning ? "bg-destructive" : "bg-primary"
                          }`}
                        style={{ width: `${timerProgressPercent}%` }}
                      />
                    </div>
                    <p className={`mt-2 text-xs ${isTimerWarning ? "text-destructive" : "text-muted-foreground"}`}>
                      {!hasActiveQuestion
                        ? "Timer starts when a question is set."
                        : loading
                          ? "Submitting answer..."
                          : isTimerWarning
                            ? `Hurry up: less than ${TIMER_WARNING_THRESHOLD_SECONDS} seconds left.`
                            : "Timer is running."}
                    </p>
                  </>
                )}
              </div>
            </div>
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
                      className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${result.aiFeedback.confidenceAnalysis.sentiment === "positive"
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

      {/* Past attempts */}
      {attempts.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-3">Past Attempts</h2>
          <div className="space-y-3">
            {[...attempts].reverse().slice(0, 10).map((a) => {
              const isExpanded = expandedAttemptId === a.id;
              return (
                <div
                  key={a.id}
                  className="rounded-xl bg-card border border-border p-4 hover:border-primary/30 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate">{a.question}</p>
                      <p className="text-xs text-muted-foreground">{new Date(a.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={scoreColor(a.aiScore)}>{a.aiScore}/10</Badge>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setExpandedAttemptId(isExpanded ? null : a.id)}
                      > {isExpanded ? (
                        <>
                          <ChevronUp className="w-4 h-4 mr-1" />
                          Hide
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-4 h-4 mr-1" />
                          Review
                        </>
                      )}
                      </Button>
                    </div>
                  </div>
                  {isExpanded && (
                      <div className="mt-4 space-y-4 border-t border-border pt-4">
                        <div>
                          <h4 className="text-sm font-semibold text-foreground mb-2">Your Answer</h4>
                          <div className="rounded-lg bg-secondary/30 border border-border p-3">
                            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                              {a.userAnswer || "No answer recorded."}
                            </p>
                          </div>
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold text-foreground mb-2">AI Feedback</h4>
                          <div className="grid md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <h5 className="text-sm font-semibold text-success flex items-center gap-1">
                                <CheckCircle className="w-4 h-4" /> Strengths
                              </h5>
                              {a.aiFeedback.strengths.map((s, i) => (
                                <p key={i} className="text-sm text-muted-foreground flex items-center gap-2">
                                  <CheckCircle className="w-3 h-3 text-success shrink-0" /> {s}
                                </p>
                              ))}
                            </div>
                            <div className="space-y-2">
                              <h5 className="text-sm font-semibold text-destructive flex items-center gap-1">
                                <XCircle className="w-4 h-4" /> Areas to Improve
                              </h5>
                              {a.aiFeedback.missing.map((m, i) => (
                                <p key={i} className="text-sm text-muted-foreground flex items-center gap-2">
                                  <XCircle className="w-3 h-3 text-destructive shrink-0" /> {m}
                                </p>
                              ))}
                            </div>
                          </div>
                          <div className="mt-4 rounded-lg bg-secondary/30 border border-border p-3">
                            <h5 className="text-sm font-semibold text-foreground mb-1">One-line Verdict</h5>
                            <p className="text-sm text-muted-foreground">
                              {a.aiFeedback.oneLineVerdict}
                            </p>
                          </div>
                          <div className="mt-4 rounded-lg bg-secondary/30 border border-border p-3">
                            <h5 className="text-sm font-semibold text-foreground mb-1">Model Answer</h5>
                            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                              {a.aiFeedback.modelAnswer}
                            </p>
                          </div>
                        </div>
                        {a.aiFeedback.confidenceAnalysis && (
                          <div>
                            <h4 className="text-sm font-semibold text-foreground mb-2">
                              Confidence Score Breakdown
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                              <div className="rounded-lg bg-secondary/30 border border-border p-3">
                                <p className="text-xs text-muted-foreground">Confidence Score</p>
                                <p className="text-sm font-semibold text-foreground">
                                  {a.aiFeedback.confidenceAnalysis.confidenceScore}/100
                                </p>
                              </div>

                              <div className="rounded-lg bg-secondary/30 border border-border p-3">
                                <p className="text-xs text-muted-foreground">Specificity</p>
                                <p className="text-sm font-semibold text-foreground">
                                  {a.aiFeedback.confidenceAnalysis.specificity}/100
                                </p>
                              </div>
                              <div className="rounded-lg bg-secondary/30 border border-border p-3">
                                <p className="text-xs text-muted-foreground">Sentiment</p>
                                <p className="text-sm font-semibold text-foreground capitalize">
                                  {a.aiFeedback.confidenceAnalysis.sentiment}
                                </p>
                              </div>

                              <div className="rounded-lg bg-secondary/30 border border-border p-3">
                                <p className="text-xs text-muted-foreground">Word Count</p>
                                <p className="text-sm font-semibold text-foreground">
                                  {a.aiFeedback.confidenceAnalysis.wordCount} words
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {
        attempts.length === 0 && !result && (
          <div className="bg-card border border-border rounded-2xl p-12 text-center shadow-card">
            <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-1">No mock interviews yet</h3>
            <p className="text-sm text-muted-foreground">Answer a question above to get AI feedback</p>
          </div>
        )
      }
    </div >
  );
}
