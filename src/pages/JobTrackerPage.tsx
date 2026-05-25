import { useEffect, useState, useRef } from "react";
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
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragOverEvent,
  DragEndEvent,
  useDroppable,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

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

// --- Drag and Drop Wrappers ---
function SortableColumn({ id, children }: { id: string; children: React.ReactNode }) {
  const { setNodeRef } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className="min-w-[260px] w-[260px] flex-shrink-0 flex flex-col max-h-full overflow-hidden"
    >
      {children}
    </div>
  );
}

function SortableCard({ job, onClick, isOverdue }: { job: JobApplication; onClick: () => void; isOverdue: boolean }) {
  const { setNodeRef, attributes, listeners, transform, transition, isDragging } = useSortable({
    id: job.id,
    data: { type: "Job", job },
  });

  const style = {
    transition,
    transform: CSS.Transform.toString(transform),
    touchAction: "none",
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={`rounded-xl bg-card border p-3 cursor-pointer hover:border-primary/30 transition-all overflow-hidden min-w-0 ${isOverdue ? "border-destructive/50 shadow-[0_0_10px_-3px_hsl(var(--destructive)/0.4)]" : "border-border"
        } ${isDragging ? "opacity-50 scale-105 shadow-2xl z-50 relative" : ""}`}
    >
      <div className="flex items-center gap-2 mb-1 min-w-0">
        <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center text-xs font-bold text-muted-foreground">
          {job.companyName.charAt(0)}
        </div>
        <div className="min-w-0 flex-1 overflow-hidden">
          <p className="text-sm font-medium text-foreground overflow-hidden text-ellipsis whitespace-nowrap max-w-full">
            {job.companyName}
          </p>
          <p className="text-xs text-muted-foreground overflow-hidden text-ellipsis whitespace-nowrap max-w-full">{job.jobTitle}</p>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">{job.dateApplied}</p>
    </div>
  );
}
// ------------------------------

interface JobTrackerPageProps {
  jobs: JobApplication[];
  sessions: InterviewSession[];
  onAddJob: (input: CreateJobApplicationInput) => Promise<JobApplication>;
  onUpdateJob: (id: string, updates: Partial<JobApplication>) => Promise<JobApplication>;
  userId: string;
}

export default function JobTrackerPage({ jobs, sessions, onAddJob, onUpdateJob }: JobTrackerPageProps) {
  const [view, setView] = useState<"kanban" | "table">("kanban");
  const [showAdd, setShowAdd] = useState(false);
  const [selectedJob, setSelectedJob] = useState<JobApplication | null>(null);
  const [draftJob, setDraftJob] = useState<JobApplication | null>(null);
  const [savingDraft, setSavingDraft] = useState(false);
  const [form, setForm] = useState({ companyName: "", jobTitle: "", jobUrl: "", status: "Applied" as Status });
  const { toast } = useToast();

  // Optimistic jobs state for DnD
  const [localJobs, setLocalJobs] = useState<JobApplication[]>(jobs);
  const localJobsRef = useRef(jobs);
  const [activeJob, setActiveJob] = useState<JobApplication | null>(null);

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();

    window.addEventListener("resize", checkMobile);

    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    setLocalJobs(jobs);
    localJobsRef.current = jobs;
  }, [jobs]);

  useEffect(() => {
    setDraftJob(selectedJob);
  }, [selectedJob]);

  // Touch and pointer sensors configured to allow clicking
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

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

  const active = localJobs.filter((j) => !["Rejected", "Ghosted"].includes(j.status));
  const interviews = localJobs.filter((j) => j.status === "Interview");
  const offers = localJobs.filter((j) => j.status === "Offer");

  const kanbanColumns: Status[] = ["Applied", "Screening", "Interview", "Offer", "Rejected", "Ghosted"];

  const isOverdue = (j: JobApplication) => {
    if (!j.nextActionDate) return false;
    return new Date(j.nextActionDate) < new Date();
  };

  const updateSelectedJobStatus = async (job: JobApplication, status: Status) => {
    try {
      // Optimistic override for non-drag actions (like table view or detail sheet)
      setLocalJobs((prev) => prev.map((j) => (j.id === job.id ? { ...j, status } : j)));
      const updated = await onUpdateJob(job.id, { status });
      if (selectedJob?.id === job.id) {
        setSelectedJob(updated);
        setDraftJob(updated);
      }
      toast({ title: "Status updated", description: `${updated.companyName} is now ${updated.status}.` });
    } catch (error) {
      // Revert if failed
      setLocalJobs(jobs);
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

  // --- Drag and Drop Handlers ---
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const job = localJobs.find((j) => j.id === active.id);
    if (job) setActiveJob(job);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    const isActiveJob = active.data.current?.type === "Job";
    const isOverJob = over.data.current?.type === "Job";
    const isOverColumn = STATUSES.includes(overId as Status);

    if (!isActiveJob) return;

    setLocalJobs((prev) => {
      const activeIndex = prev.findIndex((j) => j.id === activeId);
      if (activeIndex === -1) return prev;

      const newJobs = [...prev];
      const activeJobObj = { ...newJobs[activeIndex] };
      newJobs[activeIndex] = activeJobObj;

      if (isOverJob) {
        const overIndex = prev.findIndex((j) => j.id === overId);
        if (overIndex !== -1 && activeJobObj.status !== prev[overIndex].status) {
          activeJobObj.status = prev[overIndex].status;
          return arrayMove(newJobs, activeIndex, overIndex);
        } else if (overIndex !== -1) {
          return arrayMove(newJobs, activeIndex, overIndex);
        }
      } else if (isOverColumn) {
        if (activeJobObj.status !== overId) {
          activeJobObj.status = overId as Status;
          return arrayMove(newJobs, activeIndex, newJobs.length - 1);
        }
      }
      localJobsRef.current = newJobs;
      return newJobs;
    });
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveJob(null);

    if (!over) {
      setLocalJobs(jobs);
      return;
    }

    const originalJob = jobs.find((j) => j.id === active.id);
    if (!originalJob) return;

    let finalStatus = originalJob.status;
    const isOverColumn = STATUSES.includes(over.id as Status);

    if (isOverColumn) {
      finalStatus = over.id as Status;
    } else if (over.data.current?.type === "Job") {
      finalStatus = over.data.current.job.status;
    }

    // If status changed due to drag, trigger API sync
    if (finalStatus !== originalJob.status) {
      void updateSelectedJobStatus(originalJob, finalStatus);
    }
  };

  const handleDragCancel = () => {
    setActiveJob(null);
    setLocalJobs(jobs);
  };
  // ------------------------------

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60 border-b border-border/40 pb-4 pt-2 space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Job Tracker</h1>
            <p className="text-sm text-muted-foreground">
              Track and manage your applications
            </p>
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
              <DialogContent
                className={
                  isMobile
                    ? `
                      fixed
                      inset-x-0
                      bottom-0
                      top-auto
                      z-50
                      w-full
                      max-w-none
                      rounded-t-3xl
                      rounded-b-none
                      border-border
                      bg-card
                      p-6
                      max-h-[90vh]
                      overflow-y-auto

                      data-[state=open]:animate-in
                      data-[state=closed]:animate-out
                      data-[state=open]:slide-in-from-bottom
                      data-[state=closed]:slide-out-to-bottom
                      data-[state=open]:duration-300
                      data-[state=closed]:duration-200
                      !left-0 !top-auto !translate-x-0 !translate-y-0

                      translate-x-0
                      translate-y-0
                    `
                    : "bg-card border-border sm:max-w-lg rounded-2xl"
                }
              >
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
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-xl bg-card border border-border p-3 text-center">
          <p className="text-2xl font-bold text-foreground">{localJobs.length}</p>
          <p className="text-xs text-muted-foreground">Total</p>
        </div>
        <div className="rounded-xl bg-card border border-border p-3 text-center">
          <p className="text-2xl font-bold text-foreground">{active.length}</p>
          <p className="text-xs text-muted-foreground">Active</p>
        </div>
        <div className="rounded-xl bg-card border border-border p-3 text-center">
          <p className="text-2xl font-bold text-foreground">{localJobs.length ? Math.round((interviews.length / localJobs.length) * 100) : 0}%</p>
          <p className="text-xs text-muted-foreground">Interview Rate</p>
        </div>
        <div className="rounded-xl bg-card border border-border p-3 text-center">
          <p className="text-2xl font-bold text-foreground">{localJobs.length ? Math.round((offers.length / localJobs.length) * 100) : 0}%</p>
          <p className="text-xs text-muted-foreground">Offer Rate</p>
        </div>
      </div>

      <Sheet open={!!selectedJob} onOpenChange={(open) => !open && setSelectedJob(null)}>
        {/* ... Sheet Content ... */}
        <SheetContent
          side={isMobile ? "bottom" : "right"}
          className={`
    bg-card border-border overflow-y-auto
    ${isMobile
              ? "h-[90vh] rounded-t-3xl border-t"
              : "w-full sm:max-w-lg"}
  `}
        >
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
                <Label>Linked Prep Session</Label>
                <Select
                  value={draftJob.linkedPrepSessionId || "none"}
                  onValueChange={(v) => setDraftJob({ ...draftJob, linkedPrepSessionId: v === "none" ? null : v })}
                >
                  <SelectTrigger className="mt-1 bg-secondary/50">
                    <SelectValue placeholder="Select a prep session" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None / No Prep Session</SelectItem>
                    {sessions?.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.company} — {s.jobTitle}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <div className="flex gap-4 overflow-x-auto pb-4 max-h-[calc(100vh-320px)] [scrollbar-width:thin] [scrollbar-color:hsl(var(--primary))_transparent] [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-secondary/30 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-thumb]:bg-primary/70 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-primary">
            {kanbanColumns.map((status) => {
              const colJobs = localJobs.filter((j) => j.status === status);
              return (
                <SortableColumn key={status} id={status}>
                  <div className="flex items-center gap-2 mb-3">
                    <Badge className={statusColor[status]}>{status}</Badge>
                    <span className="text-xs text-muted-foreground">{colJobs.length}</span>
                  </div>
                  <div className="space-y-2 overflow-y-auto pr-1 max-h-[calc(100vh-320px)] [scrollbar-width:thin] [scrollbar-color:hsl(var(--primary))_transparent] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-secondary/30 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-thumb]:bg-primary/70 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-primary flex-grow min-h-[100px]">
                    <SortableContext items={colJobs.map((j) => j.id)} strategy={verticalListSortingStrategy}>
                      {colJobs.map((job) => (
                        <SortableCard key={job.id} job={job} onClick={() => setSelectedJob(job)} isOverdue={isOverdue(job)} />
                      ))}
                    </SortableContext>
                    {colJobs.length === 0 && (
                      <div className="rounded-xl border border-dashed border-border p-4 text-center h-20 flex items-center justify-center">
                        <p className="text-xs text-muted-foreground">Drop here</p>
                      </div>
                    )}
                  </div>
                </SortableColumn>
              );
            })}
          </div>

          <DragOverlay>
            {activeJob ? (
              <div className="rounded-xl bg-card border border-primary/50 p-3 shadow-2xl scale-105 opacity-90 cursor-grabbing">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center text-xs font-bold text-muted-foreground">
                    {activeJob.companyName.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{activeJob.companyName}</p>
                    <p className="text-xs text-muted-foreground truncate">{activeJob.jobTitle}</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">{activeJob.dateApplied}</p>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      {view === "table" && (
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-card">
          <div className="overflow-auto max-h-[calc(100vh-320px)] [scrollbar-width:thin] [scrollbar-color:hsl(var(--primary))_transparent] [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-secondary/30 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-thumb]:bg-primary/70 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-primary">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-card">
                <tr className="border-b border-border bg-secondary/30">
                  <th className="text-left py-3 px-4 text-muted-foreground font-medium">Company</th>
                  <th className="text-left py-3 px-4 text-muted-foreground font-medium">Role</th>
                  <th className="text-left py-3 px-4 text-muted-foreground font-medium">Date</th>
                  <th className="text-left py-3 px-4 text-muted-foreground font-medium">Status</th>
                  <th className="text-left py-3 px-4 text-muted-foreground font-medium">Location</th>
                </tr>
              </thead>
              <tbody>
                {localJobs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-muted-foreground">No applications yet</td>
                  </tr>
                ) : (
                  localJobs.map((job) => (
                    <tr key={job.id} className="border-b border-border/50 hover:bg-secondary/20 cursor-pointer" onClick={() => setSelectedJob(job)}>
                      <td className="py-3 px-4 font-medium text-foreground max-w-[220px] truncate">{job.companyName}</td>
                      <td className="py-3 px-4 text-muted-foreground">{job.jobTitle}</td>
                      <td className="py-3 px-4 text-muted-foreground">{job.dateApplied}</td>
                      <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                        <Select
                          value={job.status}
                          onValueChange={(v) => {
                            void updateSelectedJobStatus(job, v as Status);
                          }}
                        >
                          <SelectTrigger
                            className={`w-[130px] h-8 text-xs border ${statusColor[job.status]}`}
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground max-w-[220px] truncate">{job.location || "—"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {localJobs.length === 0 && (
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
