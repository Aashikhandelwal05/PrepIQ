import { useEffect, useState, useRef } from "react";
import {
  startOfWeek,
  addWeeks,
  subWeeks,
  format,
  isSameDay,
} from "date-fns";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Briefcase,
  Plus,
  LayoutGrid,
  Table as TableIcon,
  ChevronLeft,
  ChevronRight,
  Search,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
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
import { useToast } from "@/hooks/use-toast";
import { CreateJobApplicationInput, JobApplication, InterviewSession } from "@/lib/store";

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
const JOB_ROLES = [
  "Software Engineer",
  "Software Developer",
  "Frontend Developer",
  "Backend Developer",
  "Full Stack Developer",
  "Web Developer",
  "Mobile App Developer",
  "Android Developer",
  "iOS Developer",
  "React Developer",
  "Next.js Developer",
  "Node.js Developer",
  "Java Developer",
  "Python Developer",
  "C++ Developer",
  "PHP Developer",
  "Ruby Developer",
  "Go Developer",
  "Rust Developer",
  "Scala Developer",

  "Data Analyst",
  "Business Analyst",
  "Data Scientist",
  "Data Engineer",
  "Machine Learning Engineer",
  "AI Engineer",
  "Deep Learning Engineer",
  "NLP Engineer",
  "Computer Vision Engineer",
  "Research Engineer",

  "DevOps Engineer",
  "Cloud Engineer",
  "Site Reliability Engineer",
  "Platform Engineer",
  "Infrastructure Engineer",
  "Systems Engineer",

  "Cybersecurity Analyst",
  "Security Engineer",
  "Security Consultant",
  "Ethical Hacker",
  "SOC Analyst",
  "Network Security Engineer",

  "QA Engineer",
  "Test Engineer",
  "Automation Test Engineer",
  "Manual Tester",
  "Performance Tester",

  "UI Designer",
  "UX Designer",
  "UI/UX Designer",
  "Product Designer",
  "Graphic Designer",
  "Interaction Designer",

  "Product Manager",
  "Project Manager",
  "Program Manager",
  "Technical Product Manager",
  "Scrum Master",

  "Database Administrator",
  "Database Engineer",
  "SQL Developer",

  "Cloud Architect",
  "Solutions Architect",
  "Enterprise Architect",

  "Network Engineer",
  "System Administrator",
  "IT Support Engineer",
  "Help Desk Engineer",

  "Blockchain Developer",
  "Game Developer",
  "AR/VR Developer",
  "Embedded Engineer",
  "Firmware Engineer",
  "IoT Engineer",

  "Technical Writer",
  "Consultant",
  "Technology Analyst",

  "Intern",
  "Software Engineering Intern",
  "Data Analyst Intern",
  "Machine Learning Intern",
  "Frontend Intern",
  "Backend Intern",
];

const statusColor: Record<string, string> = {
  Applied: "bg-primary/20 text-primary border-primary/30",
  Screening: "bg-warning/20 text-warning border-warning/30",
  Interview: "bg-accent/20 text-accent-foreground border-accent/30",
  Offer: "bg-success/20 text-success border-success/30",
  Rejected: "bg-destructive/20 text-destructive border-destructive/30",
  Ghosted: "bg-muted text-muted-foreground border-border",
};
const isValidCompany = (name: string) => {
  const trimmed = name.trim();

  if (trimmed.length < 2) return false;

  if (/^[^a-zA-Z]+$/.test(trimmed)) return false;

  if (/^(.)\1{4,}$/.test(trimmed)) return false;

  return true;
};

const isValidUrl = (url: string) => {
  try {
    const parsed = new URL(url.trim());

    return (
      parsed.protocol === "http:" ||
      parsed.protocol === "https:"
    );
  } catch {
    return false;
  }
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


function SortableCard({ job, onClick, isOverdue, prepScore }: { job: JobApplication; onClick: () => void; isOverdue: boolean; prepScore?: number }) {
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
          <div className="flex items-center gap-2">
            <p className="text-xs text-muted-foreground overflow-hidden text-ellipsis whitespace-nowrap max-w-full">{job.jobTitle}</p>
            {prepScore !== undefined && (
              <Badge variant="outline" className="text-[9px] px-1.5 py-0 shrink-0 h-4">{prepScore}% Prep</Badge>
            )}
          </div>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">{job.dateApplied}</p>
    </div>
  );
}
// ------------------------------
function UpcomingActionsTimeline({
  jobs,
  onDateClick,
}: {
  jobs: JobApplication[];
  onDateClick: (date: string) => void;
}) {
  const [weekStart, setWeekStart] = useState(
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );

  const days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(weekStart);
    date.setDate(date.getDate() + i);
    return date;
  });

  const hasAction = (date: Date) => {
    return jobs.some((job) => {
      if (!job.nextActionDate) return false;

      const actionDate = new Date(job.nextActionDate);

      return isSameDay(actionDate, date);
    });
  };

  return (
    <div className="rounded-xl bg-card border border-border p-4 h-full flex flex-col justify-center">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">
          Upcoming Actions
        </h3>

        <div className="flex gap-2">
          <button
            onClick={() =>
              setWeekStart(subWeeks(weekStart, 1))
            }
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <button
            onClick={() =>
              setWeekStart(addWeeks(weekStart, 1))
            }
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <h4 className="text-center font-semibold mb-4">
        {format(days[0], "d MMM")} - {format(days[6], "d MMM yyyy")}
      </h4>

      <div className="grid grid-cols-7 gap-2 text-center">
        {days.map((date) => (
          <div key={date.toISOString()}>
            <p className="text-xs text-muted-foreground mb-2">
              {format(date, "EEE")}
            </p>

            <button
              onClick={() =>
                onDateClick(format(date, "yyyy-MM-dd"))
              }
              className={`
                w-10 h-10 rounded-full
                flex items-center justify-center
                mx-auto transition-all
                ${hasAction(date)
                  ? "border-2 border-red-500 text-red-500"
                  : "hover:bg-secondary"
                }
              `}
            >
              {format(date, "d")}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

interface JobTrackerPageProps {
  jobs: JobApplication[];
  sessions: InterviewSession[];
  onAddJob: (input: CreateJobApplicationInput) => Promise<JobApplication>;
  onUpdateJob: (id: string, updates: Partial<JobApplication>) => Promise<JobApplication>;
  onDeleteJob: (id: string) => void;
  userId: string;
}

export default function JobTrackerPage({ jobs, sessions, onAddJob, onUpdateJob, onDeleteJob, userId }: JobTrackerPageProps) {
  const [view, setView] = useState<"kanban" | "table">("kanban");
  const [showAdd, setShowAdd] = useState(false);
  const [selectedJob, setSelectedJob] = useState<JobApplication | null>(null);
  const [draftJob, setDraftJob] = useState<JobApplication | null>(null);
  const [savingDraft, setSavingDraft] = useState(false);
  const [deletingJob, setDeletingJob] = useState(false);
  const [jobToDelete, setJobToDelete] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [form, setForm] = useState({ companyName: "", jobTitle: "", jobUrl: "", status: "Applied" as Status });
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  // Handle route state for auto-selection
  useEffect(() => {
    if (location.state?.jobId && jobs.length > 0) {
      const j = jobs.find(j => j.id === location.state.jobId);
      if (j) {
        setSelectedJob(j);
        window.history.replaceState({}, document.title);
      }
    }
  }, [location.state, jobs]);

  const validateJobDetails = (companyName: string, jobTitle: string, jobUrl: string) => {
    if (!isValidCompany(companyName)) {
      toast({
        title: "Invalid company name",
        description: "Please enter a valid company name.",
        variant: "destructive",
      });
      return false;
    }
    if (!jobTitle.trim()) {
      toast({
        title: "Invalid job title",
        description: "Job title cannot be empty.",
        variant: "destructive",
      });
      return false;
    }
    if (!isValidUrl(jobUrl)) {
      toast({
        title: "Invalid job URL",
        description: "Please enter a valid application URL.",
        variant: "destructive",
      });
      return false;
    }
    return true;
  };

  // Optimistic jobs state for DnD
  const [jobRoleOpen, setJobRoleOpen] = useState(false);
  const [localJobs, setLocalJobs] = useState<JobApplication[]>(jobs);
  const localJobsRef = useRef(jobs);
  const [activeJob, setActiveJob] = useState<JobApplication | null>(null);

  // Search & filter state (issue #188)
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<Status | "All">("All");

  const filteredJobs = localJobs.filter((j) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      !term ||
      j.companyName.toLowerCase().includes(term) ||
      j.jobTitle.toLowerCase().includes(term);
    const matchesStatus = statusFilter === "All" || j.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const hasActiveFilter = searchTerm !== "" || statusFilter !== "All";

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
    if (!validateJobDetails(form.companyName, form.jobTitle, form.jobUrl)) return;
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
    if (!validateJobDetails(draftJob.companyName, draftJob.jobTitle, draftJob.jobUrl)) return;
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

  const handleDeleteJob = async (jobId: string) => {
    setDeletingJob(true);
    try {
      await onDeleteJob(jobId);

      setLocalJobs((prev) => prev.filter((j) => j.id !== jobId));
      if (selectedJob?.id === jobId) {
        setSelectedJob(null);
        setDraftJob(null);
      }
      toast({ title: "Deleted", description: "Job application has been removed." });
    } catch (error) {
      toast({
        title: "Unable to delete application",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setDeletingJob(false);
      setJobToDelete(null);
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
          const lastInColumn = newJobs.reduce((last, j, i) =>
            j.status === overId ? i : last, -1);
          const targetIndex = lastInColumn >= 0 ? lastInColumn : activeIndex;
          return arrayMove(newJobs, activeIndex, targetIndex);
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
      <div className="bg-background border-b border-border/40 pb-4 pt-2 space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Job Tracker</h1>
            <p className="text-sm text-muted-foreground">
              Track and manage your applications
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Search bar (issue #188) */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
              <Input
                id="job-tracker-search"
                placeholder="Search company or role…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 h-8 w-44 text-xs bg-secondary border-border"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label="Clear search"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
            {/* Status filter */}
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as Status | "All")}>
              <SelectTrigger id="job-tracker-status-filter" className="h-8 w-32 text-xs bg-secondary border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All statuses</SelectItem>
                {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            {hasActiveFilter && (
              <button
                onClick={() => { setSearchTerm(""); setStatusFilter("All"); }}
                className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
                aria-label="Clear all filters"
              >
                Clear
              </button>
            )}
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

                    <Popover open={jobRoleOpen} onOpenChange={setJobRoleOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={jobRoleOpen}
                          className="w-full mt-1 justify-between bg-secondary/50"
                        >
                          {form.jobTitle || "Select a job title"}
                        </Button>
                      </PopoverTrigger>

                      <PopoverContent
                        align="start"
                        side="bottom"
                        sideOffset={4}
                        className="w-[var(--radix-popover-trigger-width)] p-0"
                        onWheel={(e) => {
                          e.stopPropagation();
                        }}
                      >
                        <Command>
                          <CommandInput placeholder="Search job title..." />

                          <CommandEmpty>
                            No job title found.
                          </CommandEmpty>

                          <CommandGroup className="max-h-64 overflow-y-auto">
                            {JOB_ROLES.map((role) => (
                              <CommandItem
                                key={role}
                                value={role}
                                onSelect={() => {
                                  setForm({
                                    ...form,
                                    jobTitle: role,
                                  });

                                  setJobRoleOpen(false);
                                }}
                              >
                                {role}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div>
                    <Label>Job URL</Label>
                    <Input
                      type="url"
                      placeholder="https://company.com/job"
                      value={form.jobUrl}
                      onChange={(e) =>
                        setForm({ ...form, jobUrl: e.target.value })
                      }
                      className="mt-1 bg-secondary/50"
                    />
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

      <div className="grid grid-cols-1 lg:grid-cols-[2fr_360px] gap-4 items-stretch">

        {/* Stats */}
        <div>
          <div className="grid grid-cols-2 gap-3">

            <div className="rounded-xl bg-card border border-border py-5 px-4 text-center">
              <p className="text-2xl font-bold text-foreground">
                {localJobs.length}
              </p>
              <p className="text-xs text-muted-foreground">
                Total
              </p>
            </div>

            <div className="rounded-xl bg-card border border-border py-5 px-4 text-center">
              <p className="text-2xl font-bold text-foreground">
                {active.length}
              </p>
              <p className="text-xs text-muted-foreground">
                Active
              </p>
            </div>

            <div className="rounded-xl bg-card border border-border py-5 px-4 text-center">
              <p className="text-2xl font-bold text-foreground">
                {localJobs.length
                  ? Math.round(
                    (interviews.length / localJobs.length) * 100
                  )
                  : 0}
                %
              </p>
              <p className="text-xs text-muted-foreground">
                Interview Rate
              </p>
            </div>

            <div className="rounded-xl bg-card border border-border py-5 px-4 text-center">
              <p className="text-2xl font-bold text-foreground">
                {localJobs.length
                  ? Math.round(
                    (offers.length / localJobs.length) * 100
                  )
                  : 0}
                %
              </p>
              <p className="text-xs text-muted-foreground">
                Offer Rate
              </p>
            </div>

          </div>
        </div>

        {/* Calendar */}
        <div className="h-full">
          <UpcomingActionsTimeline
            jobs={localJobs}
            onDateClick={(date) => {
              setSelectedDate(date);
              setShowCalendarModal(true);
            }}
          />
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
                <div className="flex items-center gap-2">
                  <Select
                    value={draftJob.linkedPrepSessionId || "none"}
                    onValueChange={(v) => setDraftJob({ ...draftJob, linkedPrepSessionId: v === "none" ? null : v })}
                  >
                    <SelectTrigger className="mt-1 bg-secondary/50 flex-1">
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
                  {draftJob.linkedPrepSessionId && (
                    <Button
                      type="button"
                      variant="secondary"
                      className="mt-1 shrink-0 h-9"
                      onClick={() => navigate('/interview-prep', { state: { sessionId: draftJob.linkedPrepSessionId } })}
                    >
                      Go to Prep Plan
                    </Button>
                  )}
                </div>
              </div>
              <div>
                <Label>Notes</Label>
                <Textarea value={draftJob.notes} onChange={(e) => setDraftJob({ ...draftJob, notes: e.target.value })} className="mt-1 bg-secondary/50" rows={4} />
              </div>
              <div className="flex gap-3 mt-4">
                <Button onClick={saveDraftJob} disabled={savingDraft || deletingJob} className="gradient-primary text-primary-foreground">
                  {savingDraft ? "Saving..." : "Save Changes"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setDraftJob(selectedJob)} disabled={savingDraft || deletingJob}>
                  Reset
                </Button>
                <Button type="button" variant="destructive" onClick={() => setJobToDelete(draftJob.id)} disabled={savingDraft || deletingJob}>
                  {deletingJob ? "Deleting..." : "Delete"}
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
              const colJobs = filteredJobs.filter((j) => j.status === status);
              return (
                <SortableColumn key={status} id={status}>
                  <div className="flex items-center gap-2 mb-3">
                    <Badge className={statusColor[status]}>{status}</Badge>
                    <span className="text-xs text-muted-foreground">{colJobs.length}</span>
                  </div>
                  <div className="space-y-2 overflow-y-auto pr-1 max-h-[calc(100vh-320px)] [scrollbar-width:thin] [scrollbar-color:hsl(var(--primary))_transparent] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-secondary/30 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-thumb]:bg-primary/70 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-primary flex-grow min-h-[100px]">
                    <SortableContext items={colJobs.map((j) => j.id)} strategy={verticalListSortingStrategy}>
                      {colJobs.map((job) => {
                        const session = sessions.find(s => s.id === job.linkedPrepSessionId);
                        return (
                          <SortableCard key={job.id} job={job} onClick={() => setSelectedJob(job)} isOverdue={isOverdue(job)} prepScore={session?.readinessScore} />
                        )
                      })}
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
                {filteredJobs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-muted-foreground">
                      {hasActiveFilter ? "No applications match your filters" : "No applications yet"}
                    </td>
                  </tr>
                ) : (
                  filteredJobs.map((job) => (
                    <tr key={job.id} className="border-b border-border/50 hover:bg-secondary/20 cursor-pointer" onClick={() => setSelectedJob(job)}>
                      <td className="py-3 px-4 font-medium text-foreground max-w-[220px] truncate">
                        <div className="flex items-center gap-2">
                          <span className="truncate">{job.companyName}</span>
                          {job.linkedPrepSessionId && (
                            <Badge variant="outline" className="text-[10px] py-0 h-5 shrink-0">
                              {sessions.find(s => s.id === job.linkedPrepSessionId)?.readinessScore}% Prep
                            </Badge>
                          )}
                        </div>
                      </td>
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

      <Dialog
        open={showCalendarModal}
        onOpenChange={setShowCalendarModal}
      >
        <DialogContent
          className="
    w-[92vw]
    max-w-md
    max-h-[80vh]
    p-4
    rounded-2xl
  "
        >
          <DialogHeader>
            <DialogTitle>
              Scheduled Actions
            </DialogTitle>
          </DialogHeader>

          {localJobs.filter(
            (j) => j.nextActionDate === selectedDate
          ).length === 0 ? (
            <p>No scheduled actions for this date.</p>
          ) : (
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2
                [scrollbar-width:thin]
                [scrollbar-color:hsl(var(--primary))_transparent]
                [&::-webkit-scrollbar]:w-2
                [&::-webkit-scrollbar-track]:bg-secondary/30
                [&::-webkit-scrollbar-track]:rounded-full
                [&::-webkit-scrollbar-thumb]:bg-primary/70
                [&::-webkit-scrollbar-thumb]:rounded-full
                hover:[&::-webkit-scrollbar-thumb]:bg-primary">
              {localJobs
                .filter(
                  (j) =>
                    j.nextActionDate === selectedDate
                )
                .map((job) => (
                  <div
                    key={job.id}
                    className="border rounded-lg p-3"
                  >
                    <p className="font-medium">
                      {job.companyName}
                    </p>

                    <p className="text-sm">
                      {job.jobTitle}
                    </p>

                    <p className="text-sm text-primary">
                      {job.nextAction}
                    </p>
                  </div>
                ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!jobToDelete} onOpenChange={(open) => !open && setJobToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the job application.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingJob}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                if (jobToDelete) {
                  handleDeleteJob(jobToDelete);
                }
              }}
              disabled={deletingJob}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletingJob ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
