import { useState } from "react";
import { motion } from "framer-motion";
import { MessageSquare, Loader2, CheckCircle, XCircle, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { CreateMockAttemptInput, MockAttempt, InterviewSession } from "@/lib/store";

interface MockInterviewPageProps {
  sessions: InterviewSession[];
  attempts: MockAttempt[];
  onAddAttempt: (input: CreateMockAttemptInput) => Promise<MockAttempt>;
  userId: string;
}

export default function MockInterviewPage({ sessions, attempts, onAddAttempt }: MockInterviewPageProps) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<MockAttempt | null>(null);
  const [showModel, setShowModel] = useState(false);
  const [selectedSession, setSelectedSession] = useState<string>("custom");
  const { toast } = useToast();

  const handleSelectQuestion = (q: string) => {
    setQuestion(q);
  };

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
    s >= 8 ? "bg-success/20 text-success border-success/30" : s >= 5 ? "bg-warning/20 text-warning border-warning/30" : "bg-destructive/20 text-destructive border-destructive/30";

  const selectedSessionQuestions = sessions.find((s) => s.id === selectedSession)?.questionBank || [];

  return (
    <div className="space-y-6 animate-slide-up">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Mock Interview</h1>
        <p className="text-sm text-muted-foreground">Practice answers and get AI feedback</p>
      </div>

      <div className="bg-card border border-border rounded-2xl p-6 shadow-card space-y-4">
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

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Question</Label>
            <Textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Enter or paste an interview question..."
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
          <Button type="submit" disabled={loading} className="gradient-primary text-primary-foreground">
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {loading ? "Evaluating..." : "Submit Answer"}
          </Button>
        </form>
      </div>

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
        </motion.div>
      )}

      {attempts.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-3">Past Attempts</h2>
          <div className="space-y-2">
            {[...attempts].reverse().slice(0, 10).map((a) => (
              <div key={a.id} className="rounded-xl bg-card border border-border p-4 flex items-center justify-between hover:border-primary/30 transition-colors">
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
