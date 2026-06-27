import { useState, useRef, useEffect, Fragment } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { BookOpen, Loader2, Search, Brain, Cpu, Upload, Trash2, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import { apiUpload } from "@/lib/api";
import {
  CreateInterviewSessionInput,
  InterviewSession,
  JobApplication,
} from "@/lib/store";

interface InterviewPrepPageProps {
  sessions: InterviewSession[];
  jobs: JobApplication[];
  onAddSession: (input: CreateInterviewSessionInput) => Promise<InterviewSession>;
  onDeleteSession: (sessionId: string) => Promise<void>;
  userId: string;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

export default function InterviewPrepPage({
  sessions,
  jobs,
  onAddSession,
  onDeleteSession,
}: InterviewPrepPageProps) {
  const [showForm, setShowForm] = useState(false);
  const [jobTitle, setJobTitle] = useState("");
  const [company, setCompany] = useState("");
  const [jd, setJd] = useState("");
  const [resume, setResume] = useState("");
  const [interviewDate, setInterviewDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeSession, setActiveSession] = useState<InterviewSession | null>(null);
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [diffFilter, setDiffFilter] = useState<string>("all");
  const [selectedJobId, setSelectedJobId] = useState("");
  const [uploadingJd, setUploadingJd] = useState(false);
  const [uploadingResume, setUploadingResume] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const jdFileRef = useRef<HTMLInputElement>(null);
  const resumeFileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (location.state?.sessionId && sessions.length > 0) {
      const s = sessions.find(s => s.id === location.state.sessionId);
      if (s) {
        setActiveSession(s);
        window.history.replaceState({}, document.title);
      }
    }
  }, [location.state, sessions]);

  const linkedJob = activeSession ? jobs.find(j => j.linkedPrepSessionId === activeSession.id) : null;

  const handleImportJob = (jobId: string) => {
    setSelectedJobId(jobId);

    const selectedJob = jobs.find((job) => job.id === jobId);

    if (!selectedJob) return;

    setJobTitle(selectedJob.jobTitle);
    setCompany(selectedJob.companyName);
    setJd(selectedJob.notes || "");
  };

  const handleFileUpload = async (
    file: File,
    setFieldValue: (value: string) => void,
    setUploading: (value: boolean) => void,
  ) => {
    if (file.size > MAX_FILE_SIZE) {
      toast({
        title: "File too large",
        description: `"${file.name}" is ${(file.size / (1024 * 1024)).toFixed(1)} MB. Maximum allowed size is 5 MB.`,
        variant: "destructive",
      });
      return;
    }

    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext !== "pdf" && ext !== "docx") {
      toast({
        title: "Unsupported file type",
        description: "Only .pdf and .docx files are accepted.",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const result = await apiUpload<{ text: string; filename: string; pages: number }>(
        "/api/extract-document-text",
        formData,
      );
      setFieldValue(result.text);
      toast({
        title: "Text extracted successfully",
        description: `Extracted from "${result.filename}" (${result.pages} page${result.pages !== 1 ? "s" : ""}).`,
      });
    } catch (error) {
      toast({
        title: "Extraction failed",
        description: error instanceof Error ? error.message : "Could not extract text from the file.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const session = await onAddSession({
        jobTitle,
        company,
        jdText: jd,
        resumeText: resume,
        interviewDate: interviewDate || undefined,
      });
      setActiveSession(session);
      setShowForm(false);
      toast({ title: "Prep session ready!", description: `Analysis complete for ${company}` });
    } catch (error) {
      toast({
        title: "Unable to generate prep plan",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSession = async () => {
    if (!sessionToDelete) return;
    setDeleting(true);
    try {
      await onDeleteSession(sessionToDelete);
      toast({ title: "Session deleted", description: "Prep session removed successfully." });
      setSessionToDelete(null);
    } catch (error) {
      toast({
        title: "Delete failed",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  const gapColor: Record<string, string> = {
    Low: "text-success",
    Medium: "text-warning",
    High: "text-destructive",
  };

  const RESOURCE_MAPPING: Record<string, { label: string; url: string }> = {
    React: { label: "React Docs", url: "https://react.dev/" },
    "React.js": { label: "React Docs", url: "https://react.dev/" },
    Python: { label: "Python Docs", url: "https://docs.python.org/3/" },
    "Python Docs": { label: "Python Docs", url: "https://docs.python.org/3/" },
    SQL: { label: "SQL MDN", url: "https://developer.mozilla.org/en-US/docs/Glossary/SQL" },
    JavaScript: { label: "MDN JS", url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript" },
    MDN: { label: "MDN Web Docs", url: "https://developer.mozilla.org/en-US/" },
    "System Design": { label: "System Design Primer", url: "https://github.com/donnemartin/system-design-primer" },
    TypeScript: { label: "TypeScript Docs", url: "https://www.typescriptlang.org/docs/" },
    Docker: { label: "Docker Docs", url: "https://docs.docker.com/" },
    Kubernetes: { label: "Kubernetes Docs", url: "https://kubernetes.io/docs/home/" },
    AWS: { label: "AWS Docs", url: "https://docs.aws.amazon.com/" },
    "Node.js": { label: "Node.js Docs", url: "https://nodejs.org/docs/" },
    FastAPI: { label: "FastAPI Docs", url: "https://fastapi.tiangolo.com/" },
    Go: { label: "Go Docs", url: "https://go.dev/doc/" },
    Java: { label: "Java Docs", url: "https://docs.oracle.com/en/java/" },
    "C++": { label: "C++ Reference", url: "https://en.cppreference.com/w/" },
    "C#": { label: "C# Docs", url: "https://learn.microsoft.com/en-us/dotnet/csharp/" },
    Spring: { label: "Spring Docs", url: "https://spring.io/projects/spring-framework" },
    Django: { label: "Django Docs", url: "https://docs.djangoproject.com/" },
    Flask: { label: "Flask Docs", url: "https://flask.palletsprojects.com/" },
    Redux: { label: "Redux Docs", url: "https://redux.js.org/" },
    GraphQL: { label: "GraphQL Docs", url: "https://graphql.org/learn/" },
    Tailwind: { label: "Tailwind Docs", url: "https://tailwindcss.com/docs" },
    CSS: { label: "MDN CSS", url: "https://developer.mozilla.org/en-US/docs/Web/CSS" },
    HTML: { label: "MDN HTML", url: "https://developer.mozilla.org/en-US/docs/Web/HTML" },
    Testing: { label: "Testing Library", url: "https://testing-library.com/docs/" },
    "CI/CD": { label: "CI/CD Guide", url: "https://resources.github.com/ci-cd/" },
    Git: { label: "Git Docs", url: "https://git-scm.com/doc" },
    PostgreSQL: { label: "PostgreSQL Docs", url: "https://www.postgresql.org/docs/" },
    MongoDB: { label: "MongoDB Docs", url: "https://www.mongodb.com/docs/" },
    Redis: { label: "Redis Docs", url: "https://redis.io/docs/" },
  };

  const [expandedGaps, setExpandedGaps] = useState<Record<number, boolean>>({});

  const toggleGap = (idx: number) => {
    setExpandedGaps((prev) => ({
      ...prev,
      [idx]: !prev[idx],
    }));
  };

  const filteredQuestions = activeSession?.questionBank.filter((q) => {
    if (typeFilter !== "all" && q.type !== typeFilter) return false;
    if (diffFilter !== "all" && q.difficulty !== diffFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Interview Prep</h1>
          <p className="text-sm text-muted-foreground">AI-powered preparation for your dream role</p>
        </div>
        <Button onClick={() => { setShowForm(true); setActiveSession(null); }} className="gradient-primary text-primary-foreground">
          <BookOpen className="w-4 h-4 mr-2" /> New Prep Session
        </Button>
      </div>

      {showForm && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <form onSubmit={handleSubmit} className="bg-card border border-border rounded-2xl p-6 shadow-card space-y-4">
            {jobs.length > 0 && (
              <div>
                <Label>Import from Job Tracker</Label>

                <select
                  value={selectedJobId}
                  onChange={(e) => handleImportJob(e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-md bg-secondary/50 border border-border text-sm"
                >
                  <option value="">Select a job application</option>

                  {jobs.map((job) => (
                    <option key={job.id} value={job.id}>
                      {job.companyName} — {job.jobTitle}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <Label>Job Title</Label>
                <Input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} required className="mt-1 bg-secondary/50" placeholder="e.g. Senior Frontend Developer" />
              </div>
              <div>
                <Label>Company Name</Label>
                <Input value={company} onChange={(e) => setCompany(e.target.value)} required className="mt-1 bg-secondary/50" placeholder="e.g. Google" />
              </div>
              <div>
                <Label>Interview Date (Optional)</Label>
                <Input
                  type="date"
                  value={interviewDate}
                  min={new Date().toISOString().split("T")[0]}
                  onChange={(e) => setInterviewDate(e.target.value)}
                  className="mt-1 bg-secondary/50"
                />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <Label>Job Description</Label>
                <div>
                  <input
                    ref={jdFileRef}
                    type="file"
                    accept=".pdf,.docx"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file, setJd, setUploadingJd);
                      e.target.value = "";
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={uploadingJd}
                    onClick={() => jdFileRef.current?.click()}
                    className="h-7 text-xs gap-1.5"
                  >
                    {uploadingJd ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Upload className="w-3 h-3" />
                    )}
                    {uploadingJd ? "Extracting..." : "Upload PDF/DOCX"}
                  </Button>
                </div>
              </div>
              <Textarea
                value={jd}
                onChange={(e) => setJd(e.target.value)}
                rows={4}
                disabled={uploadingJd}
                className={`bg-secondary/50 transition-opacity duration-200 ${uploadingJd ? "opacity-50" : ""}`}
                placeholder={uploadingJd ? "Extracting text..." : "Paste the job description or upload a file..."}
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <Label>Your Resume</Label>
                <div>
                  <input
                    ref={resumeFileRef}
                    type="file"
                    accept=".pdf,.docx"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file, setResume, setUploadingResume);
                      e.target.value = "";
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={uploadingResume}
                    onClick={() => resumeFileRef.current?.click()}
                    className="h-7 text-xs gap-1.5"
                  >
                    {uploadingResume ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Upload className="w-3 h-3" />
                    )}
                    {uploadingResume ? "Extracting..." : "Upload PDF/DOCX"}
                  </Button>
                </div>
              </div>
              <Textarea
                value={resume}
                onChange={(e) => setResume(e.target.value)}
                rows={4}
                disabled={uploadingResume}
                className={`bg-secondary/50 transition-opacity duration-200 ${uploadingResume ? "opacity-50" : ""}`}
                placeholder={uploadingResume ? "Extracting text..." : "Paste your resume content or upload a file..."}
              />
            </div>
            <div className="flex gap-3">
              <Button type="submit" disabled={loading} className="gradient-primary text-primary-foreground">
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {loading ? "Analyzing..." : "Generate Prep Plan"}
              </Button>
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </form>
        </motion.div>
      )}

      {loading && (
        <div className="bg-card border border-border rounded-2xl p-12 text-center shadow-card">
          <Loader2 className="w-12 h-12 text-primary mx-auto animate-spin mb-4" />
          <p className="text-foreground font-medium">Analyzing your profile...</p>
          <p className="text-sm text-muted-foreground">This usually takes a few seconds</p>
        </div>
      )}

      {activeSession && !loading && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h2 className="text-xl font-bold text-foreground">{activeSession.company} — {activeSession.jobTitle}</h2>
              <p className="text-sm text-muted-foreground">Generated on {new Date(activeSession.createdAt).toLocaleDateString()}</p>
            </div>
            <div className="flex items-center gap-2">
              {linkedJob && (
                <Button variant="outline" onClick={() => navigate('/job-tracker', { state: { jobId: linkedJob.id } })}>
                  View Tracked Job
                </Button>
              )}
              <Button variant="ghost" onClick={() => setActiveSession(null)}>Back to Sessions</Button>
            </div>
          </div>
          <Tabs defaultValue="gap" className="space-y-4">
            <TabsList className="bg-secondary">
            <TabsTrigger value="gap">Gap Analysis</TabsTrigger>
            <TabsTrigger value="readiness">Readiness</TabsTrigger>
            <TabsTrigger value="questions">Questions</TabsTrigger>
            <TabsTrigger value="roadmap">Study Plan</TabsTrigger>
          </TabsList>

          <TabsContent value="gap">
            <div className="space-y-4">
              <div className="bg-card border border-border rounded-2xl p-6 shadow-card">
                <h3 className="text-lg font-semibold mb-4">Skill Gap Analysis</h3>
                {activeSession.isEstimated && (
                  <div className="mb-4 rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4 text-sm text-yellow-200">
                    Analysis is AI-inferred from role/company name only — add your resume and JD for personalized results.
                  </div>
                )}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-3 text-muted-foreground font-medium pl-4">Skill</th>
                        <th className="text-left py-3 text-muted-foreground font-medium">
                          {activeSession.isEstimated && !activeSession.resumeText && !activeSession.jdText
                            ? "You Have (Estimated)"
                            : "You Have"}
                        </th>
                        <th className="text-left py-3 text-muted-foreground font-medium">They Need</th>
                        <th className="text-left py-3 text-muted-foreground font-medium">Gap Level</th>
                        <th className="w-10"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeSession.gapAnalysis.map((g, idx) => {
                        const isExpanded = !!expandedGaps[idx];
                        return (
                          <Fragment key={idx}>
                            <tr
                              onClick={() => toggleGap(idx)}
                              className="border-b border-border/50 hover:bg-secondary/20 transition-colors group cursor-pointer"
                            >
                              <td className="py-4 pl-4 font-medium text-foreground">
                                <div className="flex items-center gap-2">
                                  <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} />
                                  {g.skill}
                                </div>
                              </td>
                              <td className="py-4 text-muted-foreground">{g.have}</td>
                              <td className="py-4 text-muted-foreground">{g.need}</td>
                              <td className={`py-4 font-medium ${gapColor[g.gapLevel]}`}>{g.gapLevel}</td>
                              <td className="py-4 pr-4"></td>
                            </tr>
                            {isExpanded && (
                              <tr>
                                <td colSpan={5} className="p-0">
                                  <div className="bg-secondary/30 p-4 rounded-b-xl border-x border-b border-border/50 mx-2 mb-2">
                                    <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-3">Recommended Learning Resources</h4>
                                    <div className="flex flex-wrap gap-3">
                                      {g.resources && g.resources.length > 0 ? (
                                        g.resources.map((resKey, rIdx) => {
                                          const resource = RESOURCE_MAPPING[resKey];
                                          if (resource) {
                                            return (
                                              <a
                                                key={rIdx}
                                                href={resource.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-background border border-border hover:border-primary/50 text-sm text-primary transition-all shadow-sm"
                                              >
                                                <BookOpen className="w-3.5 h-3.5" />
                                                {resource.label}
                                              </a>
                                            );
                                          }
                                          return (
                                            <a
                                              key={rIdx}
                                              href={`https://www.google.com/search?q=${encodeURIComponent(resKey + " documentation")}`}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-background border border-border hover:border-primary/50 text-sm text-primary transition-all shadow-sm"
                                            >
                                              <Search className="w-3.5 h-3.5" />
                                              {resKey}
                                            </a>
                                          );
                                        })
                                      ) : (
                                        <p className="text-xs text-muted-foreground italic">No specific resources found. Try searching for "{g.skill} docs".</p>
                                      )}
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {activeSession.extractedSkills && activeSession.extractedSkills.length > 0 && (
                <div className="bg-card border border-border rounded-2xl p-6 shadow-card">
                  <div className="flex items-center gap-2 mb-3">
                    <Brain className="w-4 h-4 text-primary" />
                    <h3 className="text-sm font-semibold text-foreground">ML-Extracted Resume Skills</h3>
                    <Badge variant="outline" className="text-xs border-primary/40 text-primary">
                      spaCy NER
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">
                    Skills automatically detected from your resume using NLP Named Entity Recognition.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {activeSession.extractedSkills.map((skill) => (
                      <span
                        key={skill}
                        className="px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="readiness">
            <div className="space-y-4">
              <div className="bg-card border border-border rounded-2xl p-6 shadow-card flex flex-col items-center">
                <div className="relative w-40 h-40 mb-4">
                  <svg width="160" height="160" className="transform -rotate-90">
                    <circle cx="80" cy="80" r="68" stroke="hsl(var(--border))" strokeWidth="8" fill="none" />
                    <circle
                      cx="80" cy="80" r="68"
                      stroke={activeSession.readinessScore >= 70 ? "hsl(var(--success))" : "hsl(var(--warning))"}
                      strokeWidth="8" fill="none" strokeLinecap="round"
                      strokeDasharray={2 * Math.PI * 68}
                      strokeDashoffset={2 * Math.PI * 68 * (1 - activeSession.readinessScore / 100)}
                      className="transition-all duration-1000"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-4xl font-bold text-foreground">{activeSession.readinessScore}</span>
                    <span className="text-xs text-muted-foreground">Readiness</span>
                  </div>
                </div>
                <p className="text-center text-muted-foreground max-w-md">
                  You're {activeSession.readinessScore >= 70 ? "well prepared" : "getting there"}! Focus on the high-gap areas in your study plan.
                </p>
              </div>

              <div className="bg-card border border-border rounded-2xl p-6 shadow-card">
                <div className="flex items-center gap-2 mb-4">
                  <Cpu className="w-4 h-4 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground">ML Resume–JD Match Score</h3>
                  <Badge variant="outline" className="text-xs border-primary/40 text-primary">
                    TF-IDF · Cosine Similarity
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mb-4">
                  How closely your resume text matches the job description, computed using TF-IDF vectorization and cosine similarity.
                </p>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>Match Score</span>
                      <span className="font-medium text-foreground">{activeSession.mlMatchScore}%</span>
                    </div>
                    <div className="w-full h-2.5 bg-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-1000"
                        style={{
                          width: `${activeSession.mlMatchScore}%`,
                          background: activeSession.mlMatchScore >= 70
                            ? "hsl(var(--success))"
                            : activeSession.mlMatchScore >= 50
                              ? "hsl(var(--warning))"
                              : "hsl(var(--destructive))",
                        }}
                      />
                    </div>
                  </div>
                  <span
                    className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${activeSession.mlMatchScore >= 70
                      ? "bg-success/10 text-success border-success/30"
                      : activeSession.mlMatchScore >= 50
                        ? "bg-warning/10 text-warning border-warning/30"
                        : "bg-destructive/10 text-destructive border-destructive/30"
                      }`}
                  >
                    {activeSession.mlMatchScore >= 70 ? "Strong" : activeSession.mlMatchScore >= 50 ? "Moderate" : "Weak"}
                  </span>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="questions">
            <div className="bg-card border border-border rounded-2xl p-6 shadow-card space-y-4">
              <div className="flex flex-wrap gap-2">
                <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="px-3 py-1.5 rounded-lg bg-secondary border border-border text-sm text-foreground">
                  <option value="all">All Types</option>
                  <option value="behavioral">Behavioral</option>
                  <option value="technical">Technical</option>
                  <option value="situational">Situational</option>
                </select>
                <select value={diffFilter} onChange={(e) => setDiffFilter(e.target.value)} className="px-3 py-1.5 rounded-lg bg-secondary border border-border text-sm text-foreground">
                  <option value="all">All Difficulty</option>
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>
              <div className="space-y-3">
                {filteredQuestions?.map((q, idx) => (
                  <div key={idx} className="p-4 rounded-xl bg-secondary/30 border border-border">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium text-foreground">{q.question}</p>
                      <div className="flex gap-1 shrink-0">
                        <Badge variant="outline" className="text-xs">{q.type}</Badge>
                        <Badge variant="outline" className={`text-xs ${q.difficulty === "hard" ? "border-destructive text-destructive" : q.difficulty === "medium" ? "border-warning text-warning" : "border-success text-success"}`}>
                          {q.difficulty}
                        </Badge>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">💡 {q.tip}</p>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="roadmap">
            <div className="bg-card border border-border rounded-2xl p-6 shadow-card">
              <Accordion type="single" collapsible className="space-y-2">
                {activeSession.roadmap.map((day) => (
                  <AccordionItem key={day.day} value={`day-${day.day}`} className="border border-border rounded-xl px-4">
                    <AccordionTrigger className="text-sm font-medium">
                      Day {day.day}: {day.focusArea}
                    </AccordionTrigger>
                    <AccordionContent>
                      <ul className="space-y-1.5">
                        {day.tasks.map((task, i) => (
                          <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                            <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                            {task}
                          </li>
                        ))}
                      </ul>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </TabsContent>
        </Tabs>
        </div>
      )}

      {sessions.length > 0 && !activeSession && !showForm && (
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-3">Past Sessions</h2>
          <div className="space-y-2">
            {[...sessions].reverse().map((s) => (
              <div
                key={s.id}
                className="rounded-xl bg-card border border-border p-4 flex items-center justify-between hover:border-primary/30 transition-colors"
              >
                <div className="flex-1 cursor-pointer" onClick={() => setActiveSession(s)}>
                  <p className="font-medium text-foreground text-sm">{s.company} — {s.jobTitle}</p>
                  {s.interviewDate && (
                    <p className="text-xs text-primary">
                      Interview: {new Date(s.interviewDate).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={s.readinessScore >= 70 ? "bg-success/20 text-success" : "bg-warning/20 text-warning"}>
                    {s.readinessScore}%
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    onClick={(e) => { e.stopPropagation(); setSessionToDelete(s.id); }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {sessions.length === 0 && !showForm && !activeSession && (
        <div className="bg-card border border-border rounded-2xl p-12 text-center shadow-card">
          <Search className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-1">No prep sessions yet</h3>
          <p className="text-sm text-muted-foreground mb-4">Start your first AI-powered prep session</p>
          <Button onClick={() => setShowForm(true)} className="gradient-primary text-primary-foreground">
            <BookOpen className="w-4 h-4 mr-2" /> Start Prepping
          </Button>
        </div>
      )}

      <AlertDialog open={!!sessionToDelete} onOpenChange={(open) => { if (!open) setSessionToDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Prep Session?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this prep session and cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              onClick={handleDeleteSession}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
