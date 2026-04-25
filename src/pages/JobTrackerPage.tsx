import { useEffect, useState } from "react";
import { Briefcase, Plus, LayoutGrid, Table as TableIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import { CreateJobApplicationInput, JobApplication, InterviewSession } from "@/lib/store";

const STATUSES = ["Applied", "Screening", "Interview", "Offer", "Rejected", "Ghosted"] as const;
type Status = (typeof STATUSES)[number];

const statusColor: Record<string, string> = {
  Applied: "bg-primary/20 text-primary border-primary/30",
  Screening: "bg-warning/20 text-warning border-warning/30",
  Interview: "bg-accent/20 text-accent-foreground border-accent/30",
  Offer: "bg-success/20 text-success border-success/30",
  Rejected: "bg-destructive/20 text-destructive border-destructive/30",
  Ghosted: "bg-muted text-muted-foreground border-border",
};

interface JobTrackerPageProps {
  jobs: JobApplication[];
  sessions: InterviewSession[];
  onAddJob: (input: CreateJobApplicationInput) => Promise<JobApplication>;
  onUpdateJob: (id: string, updates: Partial<JobApplication>) => Promise<JobApplication>;
  userId: string;
}

export default function JobTrackerPage({ jobs, onAddJob, onUpdateJob }: JobTrackerPageProps) {
  const [view, setView] = useState<"kanban" | "table">("kanban");
  const [showAdd, setShowAdd] = useState(false);
  const [selectedJob, setSelectedJob] = useState<JobApplication | null>(null);
  const [draftJob, setDraftJob] = useState<JobApplication | null>(null);
  const [savingDraft, setSavingDraft] = useState(false);
  const [form, setForm] = useState({ companyName: "", jobTitle: "", jobUrl: "", status: "Applied" as Status });
  const { toast } = useToast();

  useEffect(() => {
    setDraftJob(selectedJob);
  }, [selectedJob]);

  const handleAdd = async () => {
    try {
      const job = await onAddJob({
        companyName: form.companyName,
        jobTitle: form.jobTitle,
        jobUrl: form.jobUrl,
        status: form.status,
      });
      setShowAdd(false);
      setForm({ companyName: "", jobTitle: "", jobUrl: "", status: "Applied" });
      toast({ title: "Application added!", description: `${job.companyName} — ${job.jobTitle}` });
    } catch (error) {
      toast({
        title: "Unable to add application",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  const active = jobs.filter((j) => !["Rejected", "Ghosted"].includes(j.status));
  const interviews = jobs.filter((j) => j.status === "Interview");
  const offers = jobs.filter((j) => j.status === "Offer");

  const kanbanColumns: Status[] = ["Applied", "Screening", "Interview", "Offer", "Rejected", "Ghosted"];

  const isOverdue = (j: JobApplication) => {
    if (!j.nextActionDate) return false;
    return new Date(j.nextActionDate) < new Date();
  };

  const updateSelectedJobStatus = async (job: JobApplication, status: Status) => {
    try {
      const updated = await onUpdateJob(job.id, { status });
      if (selectedJob?.id === job.id) {
        setSelectedJob(updated);
        setDraftJob(updated);
      }
      toast({ title: "Status updated", description: `${updated.companyName} is now ${updated.status}.` });
    } catch (error) {
      toast({
        title: "Unable to update status",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  const saveDraftJob = async () => {
    if (!draftJob) return;
    setSavingDraft(true);
    try {
      // Persist the whole detail sheet at once so contributors are not fighting one request per keystroke.
      const updated = await onUpdateJob(draftJob.id, {
        status: draftJob.status,
        location: draftJob.location,
        salaryRange: draftJob.salaryRange,
        notes: draftJob.notes,
        resumeUsed: draftJob.resumeUsed,
        contactPerson: draftJob.contactPerson,
        nextAction: draftJob.nextAction,
        nextActionDate: draftJob.nextActionDate,
        linkedPrepSessionId: draftJob.linkedPrepSessionId,
      });
      setSelectedJob(updated);
      setDraftJob(updated);
      toast({ title: "Application saved", description: `${updated.companyName} details are up to date.` });
    } catch (error) {
      toast({
        title: "Unable to save changes",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSavingDraft(false);
    }
  };

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Job Tracker</h1>
          <p className="text-sm text-muted-foreground">Track and manage your applications</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-secondary rounded-lg p-0.5">
            <button onClick={() => setView("kanban")} className={`px-3 py-1.5 rounded-md text-sm transition-colors ${view === "kanban" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}>
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button onClick={() => setView("table")} className={`px-3 py-1.5 rounded-md text-sm transition-colors ${view === "table" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}>
              <TableIcon className="w-4 h-4" />
            </button>
          </div>
          <Dialog open={showAdd} onOpenChange={setShowAdd}>
            <DialogTrigger asChild>
              <Button className="gradient-primary text-primary-foreground">
                <Plus className="w-4 h-4 mr-2" /> Add Application
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border">
              <DialogHeader>
                <DialogTitle>Add Job Application</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-2">
                <div>
                  <Label>Company</Label>
                  <Input value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} className="mt-1 bg-secondary/50" />
                </div>
                <div>
                  <Label>Job Title</Label>
                  <Input value={form.jobTitle} onChange={(e) => setForm({ ...form, jobTitle: e.target.value })} className="mt-1 bg-secondary/50" />
                </div>
                <div>
                  <Label>Job URL</Label>
                  <Input value={form.jobUrl} onChange={(e) => setForm({ ...form, jobUrl: e.target.value })} className="mt-1 bg-secondary/50" />
                </div>
                <div>
                  <Label>Status</Label>
                  <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as Status })}>
                    <SelectTrigger className="mt-1 bg-secondary/50"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleAdd} className="w-full gradient-primary text-primary-foreground">Add Application</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-xl bg-card border border-border p-3 text-center">
          <p className="text-2xl font-bold text-foreground">{jobs.length}</p>
          <p className="text-xs text-muted-foreground">Total</p>
        </div>
        <div className="rounded-xl bg-card border border-border p-3 text-center">
          <p className="text-2xl font-bold text-foreground">{active.length}</p>
          <p className="text-xs text-muted-foreground">Active</p>
        </div>
        <div className="rounded-xl bg-card border border-border p-3 text-center">
          <p className="text-2xl font-bold text-foreground">{jobs.length ? Math.round((interviews.length / jobs.length) * 100) : 0}%</p>
          <p className="text-xs text-muted-foreground">Interview Rate</p>
        </div>
        <div className="rounded-xl bg-card border border-border p-3 text-center">
          <p className="text-2xl font-bold text-foreground">{jobs.length ? Math.round((offers.length / jobs.length) * 100) : 0}%</p>
          <p className="text-xs text-muted-foreground">Offer Rate</p>
        </div>
      </div>

      <Sheet open={!!selectedJob} onOpenChange={(open) => !open && setSelectedJob(null)}>
        <SheetContent className="bg-card border-border w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{selectedJob?.companyName} — {selectedJob?.jobTitle}</SheetTitle>
          </SheetHeader>
          {draftJob && (
            <div className="space-y-4 mt-4">
              <div>
                <Label>Status</Label>
                <Select value={draftJob.status} onValueChange={(v) => setDraftJob({ ...draftJob, status: v as Status })}>
                  <SelectTrigger className="mt-1 bg-secondary/50"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Location</Label>
                <Input value={draftJob.location} onChange={(e) => setDraftJob({ ...draftJob, location: e.target.value })} className="mt-1 bg-secondary/50" />
              </div>
              <div>
                <Label>Salary Range</Label>
                <Input value={draftJob.salaryRange} onChange={(e) => setDraftJob({ ...draftJob, salaryRange: e.target.value })} className="mt-1 bg-secondary/50" />
              </div>
              <div>
                <Label>Contact Person</Label>
                <Input value={draftJob.contactPerson} onChange={(e) => setDraftJob({ ...draftJob, contactPerson: e.target.value })} className="mt-1 bg-secondary/50" />
              </div>
              <div>
                <Label>Next Action</Label>
                <Input value={draftJob.nextAction} onChange={(e) => setDraftJob({ ...draftJob, nextAction: e.target.value })} className="mt-1 bg-secondary/50" />
              </div>
              <div>
                <Label>Next Action Date</Label>
                <Input type="date" value={draftJob.nextActionDate} onChange={(e) => setDraftJob({ ...draftJob, nextActionDate: e.target.value })} className="mt-1 bg-secondary/50" />
              </div>
              <div>
                <Label>Notes</Label>
                <Textarea value={draftJob.notes} onChange={(e) => setDraftJob({ ...draftJob, notes: e.target.value })} className="mt-1 bg-secondary/50" rows={4} />
              </div>
              <div className="flex gap-3">
                <Button onClick={saveDraftJob} disabled={savingDraft} className="gradient-primary text-primary-foreground">
                  {savingDraft ? "Saving..." : "Save Changes"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setDraftJob(selectedJob)}>
                  Reset
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {view === "kanban" && (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {kanbanColumns.map((status) => {
            const colJobs = jobs.filter((j) => j.status === status);
            return (
              <div key={status} className="min-w-[260px] flex-shrink-0">
                <div className="flex items-center gap-2 mb-3">
                  <Badge className={statusColor[status]}>{status}</Badge>
                  <span className="text-xs text-muted-foreground">{colJobs.length}</span>
                </div>
                <div className="space-y-2">
                  {colJobs.map((job) => (
                    <div
                      key={job.id}
                      onClick={() => setSelectedJob(job)}
                      className={`rounded-xl bg-card border p-3 cursor-pointer hover:border-primary/30 transition-all ${
                        isOverdue(job) ? "border-destructive/50 shadow-[0_0_10px_-3px_hsl(var(--destructive)/0.4)]" : "border-border"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center text-xs font-bold text-muted-foreground">
                          {job.companyName.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{job.companyName}</p>
                          <p className="text-xs text-muted-foreground truncate">{job.jobTitle}</p>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">{job.dateApplied}</p>
                    </div>
                  ))}
                  {colJobs.length === 0 && (
                    <div className="rounded-xl border border-dashed border-border p-4 text-center">
                      <p className="text-xs text-muted-foreground">No applications</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {view === "table" && (
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-card">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/30">
                  <th className="text-left py-3 px-4 text-muted-foreground font-medium">Company</th>
                  <th className="text-left py-3 px-4 text-muted-foreground font-medium">Role</th>
                  <th className="text-left py-3 px-4 text-muted-foreground font-medium">Date</th>
                  <th className="text-left py-3 px-4 text-muted-foreground font-medium">Status</th>
                  <th className="text-left py-3 px-4 text-muted-foreground font-medium">Location</th>
                </tr>
              </thead>
              <tbody>
                {jobs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-muted-foreground">No applications yet</td>
                  </tr>
                ) : (
                  jobs.map((job) => (
                    <tr key={job.id} className="border-b border-border/50 hover:bg-secondary/20 cursor-pointer" onClick={() => setSelectedJob(job)}>
                      <td className="py-3 px-4 font-medium text-foreground">{job.companyName}</td>
                      <td className="py-3 px-4 text-muted-foreground">{job.jobTitle}</td>
                      <td className="py-3 px-4 text-muted-foreground">{job.dateApplied}</td>
                      <td className="py-3 px-4">
                        <Select
                          value={job.status}
                          onValueChange={(v) => {
                            void updateSelectedJobStatus(job, v as Status);
                          }}
                        >
                          <SelectTrigger className="w-[130px] h-8 bg-secondary/50 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">{job.location || "—"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {jobs.length === 0 && (
        <div className="bg-card border border-border rounded-2xl p-12 text-center shadow-card">
          <Briefcase className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-1">No applications tracked</h3>
          <p className="text-sm text-muted-foreground mb-4">Start tracking your job applications</p>
          <Button onClick={() => setShowAdd(true)} className="gradient-primary text-primary-foreground">
            <Plus className="w-4 h-4 mr-2" /> Add Your First Application
          </Button>
        </div>
      )}
    </div>
  );
}
