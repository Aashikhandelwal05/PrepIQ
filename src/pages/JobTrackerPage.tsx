import { useEffect, useState, useRef } from "react";
import {
  Briefcase,
  Plus,
  LayoutGrid,
  Table as TableIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

import { useToast } from "@/hooks/use-toast";

import {
  CreateJobApplicationInput,
  JobApplication,
  InterviewSession,
} from "@/lib/store";

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

const STATUSES = [
  "Applied",
  "Screening",
  "Interview",
  "Offer",
  "Rejected",
  "Ghosted",
] as const;

type Status = (typeof STATUSES)[number];

const statusColor: Record<string, string> = {
  Applied: "bg-primary/20 text-primary border-primary/30",
  Screening: "bg-warning/20 text-warning border-warning/30",
  Interview:
    "bg-accent/20 text-accent-foreground border-accent/30",
  Offer: "bg-success/20 text-success border-success/30",
  Rejected:
    "bg-destructive/20 text-destructive border-destructive/30",
  Ghosted: "bg-muted text-muted-foreground border-border",
};

function SortableColumn({
  id,
  children,
}: {
  id: string;
  children: React.ReactNode;
}) {
  const { setNodeRef } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className="min-w-[260px] flex-shrink-0 flex flex-col max-h-full"
    >
      {children}
    </div>
  );
}

function SortableCard({
  job,
  onClick,
  isOverdue,
}: {
  job: JobApplication;
  onClick: () => void;
  isOverdue: boolean;
}) {
  const {
    setNodeRef,
    attributes,
    listeners,
    transform,
    transition,
    isDragging,
  } = useSortable({
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
      className={`rounded-xl bg-card border p-3 cursor-pointer hover:border-primary/30 transition-all ${
        isOverdue
          ? "border-destructive/50 shadow-[0_0_10px_-3px_hsl(var(--destructive)/0.4)]"
          : "border-border"
      } ${
        isDragging
          ? "opacity-50 scale-105 shadow-2xl z-50 relative"
          : ""
      }`}
    >
      <div className="flex items-center gap-2 mb-1">
        <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center text-xs font-bold text-muted-foreground">
          {job.companyName.charAt(0)}
        </div>

        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground truncate">
            {job.companyName}
          </p>

          <p className="text-xs text-muted-foreground truncate">
            {job.jobTitle}
          </p>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        {job.dateApplied}
      </p>
    </div>
  );
}

interface JobTrackerPageProps {
  jobs: JobApplication[];
  sessions: InterviewSession[];
  onAddJob: (
    input: CreateJobApplicationInput
  ) => Promise<JobApplication>;
  onUpdateJob: (
    id: string,
    updates: Partial<JobApplication>
  ) => Promise<JobApplication>;
  userId: string;
}

export default function JobTrackerPage({
  jobs,
  onAddJob,
  onUpdateJob,
}: JobTrackerPageProps) {
  const [view, setView] = useState<"kanban" | "table">(
    "kanban"
  );

  const [showAdd, setShowAdd] = useState(false);

  const [selectedJob, setSelectedJob] =
    useState<JobApplication | null>(null);

  const [draftJob, setDraftJob] =
    useState<JobApplication | null>(null);

  const [savingDraft, setSavingDraft] = useState(false);

  const [form, setForm] = useState({
    companyName: "",
    jobTitle: "",
    jobUrl: "",
    status: "Applied" as Status,
  });

  const { toast } = useToast();

  const [localJobs, setLocalJobs] =
    useState<JobApplication[]>(jobs);

  const localJobsRef = useRef(jobs);

  const [activeJob, setActiveJob] =
    useState<JobApplication | null>(null);

  useEffect(() => {
    setLocalJobs(jobs);
    localJobsRef.current = jobs;
  }, [jobs]);

  useEffect(() => {
    setDraftJob(selectedJob);
  }, [selectedJob]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),

    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    }),

    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
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

      setForm({
        companyName: "",
        jobTitle: "",
        jobUrl: "",
        status: "Applied",
      });

      toast({
        title: "Application added!",
        description: `${job.companyName} — ${job.jobTitle}`,
      });
    } catch (error) {
      toast({
        title: "Unable to add application",
        description:
          error instanceof Error
            ? error.message
            : "Please try again.",
        variant: "destructive",
      });
    }
  };

  const active = localJobs.filter(
    (j) => !["Rejected", "Ghosted"].includes(j.status)
  );

  const interviews = localJobs.filter(
    (j) => j.status === "Interview"
  );

  const offers = localJobs.filter(
    (j) => j.status === "Offer"
  );

  const kanbanColumns: Status[] = [
    "Applied",
    "Screening",
    "Interview",
    "Offer",
    "Rejected",
    "Ghosted",
  ];

  const isOverdue = (j: JobApplication) => {
    if (!j.nextActionDate) return false;

    return new Date(j.nextActionDate) < new Date();
  };

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border/40 pb-4 pt-2 space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Job Tracker
            </h1>

            <p className="text-sm text-muted-foreground">
              Track and manage your applications
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex bg-secondary rounded-lg p-0.5">
              <button
                onClick={() => setView("kanban")}
                className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                  view === "kanban"
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground"
                }`}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>

              <button
                onClick={() => setView("table")}
                className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                  view === "table"
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground"
                }`}
              >
                <TableIcon className="w-4 h-4" />
              </button>
            </div>

            <Dialog open={showAdd} onOpenChange={setShowAdd}>
              <DialogTrigger asChild>
                <Button className="gradient-primary text-primary-foreground">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Application
                </Button>
              </DialogTrigger>

              <DialogContent className="bg-card border-border">
                <DialogHeader>
                  <DialogTitle>
                    Add Job Application
                  </DialogTitle>
                </DialogHeader>

                <div className="space-y-4 mt-2">
                  <div>
                    <Label>Company</Label>

                    <Input
                      value={form.companyName}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          companyName: e.target.value,
                        })
                      }
                      className="mt-1 bg-secondary/50"
                    />
                  </div>

                  <div>
                    <Label>Job Title</Label>

                    <Input
                      value={form.jobTitle}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          jobTitle: e.target.value,
                        })
                      }
                      className="mt-1 bg-secondary/50"
                    />
                  </div>

                  <Button
                    onClick={handleAdd}
                    className="w-full gradient-primary text-primary-foreground"
                  >
                    Add Application
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {localJobs.length === 0 && (
        <div className="bg-card border border-border rounded-2xl p-8 shadow-card text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10 pointer-events-none" />

          <div className="relative z-10">
            <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center mx-auto mb-6 shadow-glow">
              <Briefcase className="w-8 h-8 text-white" />
            </div>

            <h2 className="text-2xl font-bold text-foreground mb-3">
              Stay Organized During Placements
            </h2>

            <p className="text-muted-foreground max-w-lg mx-auto mb-6 leading-relaxed">
              Track internship and job applications,
              monitor interview stages, and manage
              opportunities in one organized workspace.
            </p>

            <Button
              onClick={() => setShowAdd(true)}
              className="gradient-primary text-primary-foreground px-6"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Application
            </Button>

            <div className="grid md:grid-cols-2 gap-3 mt-8">
              <div className="bg-secondary/30 border border-border rounded-xl p-4 text-sm text-muted-foreground text-left">
                ✨ Track every application in one place
              </div>

              <div className="bg-secondary/30 border border-border rounded-xl p-4 text-sm text-muted-foreground text-left">
                ✨ Monitor interview and offer progress
              </div>

              <div className="bg-secondary/30 border border-border rounded-xl p-4 text-sm text-muted-foreground text-left">
                ✨ Stay organized during placements
              </div>

              <div className="bg-secondary/30 border border-border rounded-xl p-4 text-sm text-muted-foreground text-left">
                ✨ Improve your application strategy
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}