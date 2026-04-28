import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, ChevronLeft, Check, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TagInput } from "@/components/TagInput";
import { useToast } from "@/hooks/use-toast";
import { CareerProfile, WorkEntry, SkillEntry, User } from "@/lib/store";

const STEPS = ["Personal Info", "Education", "Work History", "Skills", "Interview Fears"];
const FEAR_OPTIONS = [
  "Technical rounds",
  "Data structures & algorithms",
  "System design",
  "HR & behavioral",
  "Case studies",
  "Salary negotiation",
  "Group discussions",
];

interface OnboardingPageProps {
  user: User;
  profile: CareerProfile | null;
  onSave: (profile: CareerProfile) => Promise<CareerProfile>;
}

const emptyWorkEntry = (): WorkEntry => ({
  id: crypto.randomUUID(),
  jobTitle: "",
  company: "",
  from: "",
  to: "",
  responsibilities: "",
});

export default function OnboardingPage({ user, profile, onSave }: OnboardingPageProps) {
  const [step, setStep] = useState(0);
  const navigate = useNavigate();
  const { toast } = useToast();

  const [targetRoles, setTargetRoles] = useState<string[]>([]);
  const [dreamCompanies, setDreamCompanies] = useState<string[]>([]);
  const [degree, setDegree] = useState("");
  const [institution, setInstitution] = useState("");
  const [graduationYear, setGraduationYear] = useState("");
  const [coursework, setCoursework] = useState("");
  const [certifications, setCertifications] = useState<string[]>([]);
  const [workHistory, setWorkHistory] = useState<WorkEntry[]>([emptyWorkEntry()]);
  const [technicalSkills, setTechnicalSkills] = useState<SkillEntry[]>([]);
  const [skillInput, setSkillInput] = useState("");
  const [softSkills, setSoftSkills] = useState<string[]>([]);
  const [fears, setFears] = useState<string[]>([]);
  const [fearNotes, setFearNotes] = useState("");

  useEffect(() => {
    if (!profile) {
      return;
    }

    setTargetRoles(profile.targetRoles);
    setDreamCompanies(profile.dreamCompanies);
    setDegree(profile.degree);
    setInstitution(profile.institution);
    setGraduationYear(profile.graduationYear);
    setCoursework(profile.coursework);
    setCertifications(profile.certifications);
    setWorkHistory(profile.workHistory.length > 0 ? profile.workHistory : [emptyWorkEntry()]);
    setTechnicalSkills(profile.technicalSkills);
    setSoftSkills(profile.softSkills);
    setFears(profile.interviewFears);
    setFearNotes(profile.fearNotes);
  }, [profile]);

  const addWorkEntry = () => {
    setWorkHistory([
      ...workHistory,
      emptyWorkEntry(),
    ]);
  };

  const removeWorkEntry = (id: string) => {
    if (workHistory.length > 1) setWorkHistory(workHistory.filter((w) => w.id !== id));
  };

  const updateWork = (id: string, field: keyof WorkEntry, value: string) => {
    setWorkHistory(workHistory.map((w) => (w.id === id ? { ...w, [field]: value } : w)));
  };

  const addSkill = () => {
    if (skillInput.trim() && !technicalSkills.find((s) => s.name === skillInput.trim())) {
      setTechnicalSkills([...technicalSkills, { name: skillInput.trim(), proficiency: "Intermediate" }]);
      setSkillInput("");
    }
  };

  /**
   * Per-step validation. Returns an error message when the current
   * step has missing/empty required fields, or null when the step is
   * complete and the user should be allowed to advance. See
   * https://github.com/Aashikhandelwan05/PrepIQ/issues/5.
   *
   * Step 4 (Interview Fears) is intentionally optional — the
   * checkboxes + notes are signal, not a gate.
   */
  const validateStep = (currentStep: number): string | null => {
    switch (currentStep) {
      case 0:
        if (targetRoles.length === 0)
          return "Add at least one target job role to continue.";
        if (dreamCompanies.length === 0)
          return "Add at least one dream company to continue.";
        return null;
      case 1:
        if (!degree.trim())
          return "Please enter your degree.";
        if (!institution.trim())
          return "Please enter your institution.";
        if (!graduationYear.trim())
          return "Please enter your graduation year.";
        return null;
      case 2: {
        const hasFilledEntry = workHistory.some(
          (entry) => entry.jobTitle.trim() !== "" && entry.company.trim() !== "",
        );
        if (!hasFilledEntry)
          return "Add at least one work entry with both job title and company.";
        return null;
      }
      case 3:
        if (technicalSkills.length === 0 && softSkills.length === 0)
          return "Add at least one technical or soft skill to continue.";
        return null;
      default:
        return null;
    }
  };

  const handleNext = () => {
    const error = validateStep(step);
    if (error) {
      toast({
        title: "Step incomplete",
        description: error,
        variant: "destructive",
      });
      return;
    }
    setStep(step + 1);
  };

  const stepError = validateStep(step);

  const handleComplete = async () => {
    const finalStepError = validateStep(step);
    if (finalStepError) {
      toast({
        title: "Step incomplete",
        description: finalStepError,
        variant: "destructive",
      });
      return;
    }

    const profile: CareerProfile = {
      userId: user.id,
      fullName: user.name,
      email: user.email,
      targetRoles,
      dreamCompanies,
      degree,
      institution,
      graduationYear,
      coursework,
      certifications,
      workHistory,
      technicalSkills,
      softSkills,
      interviewFears: fears,
      fearNotes,
      onboardingComplete: true,
    };
    try {
      await onSave(profile);
      toast({ title: "Profile saved!", description: "Your Career DNA is ready." });
      navigate("/dashboard");
    } catch (error) {
      toast({
        title: "Unable to save profile",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="mb-8">
          <h1 className="text-2xl font-bold gradient-text mb-2">Build Your Career DNA</h1>
          <p className="text-muted-foreground text-sm">Step {step + 1} of {STEPS.length}: {STEPS[step]}</p>
          <div className="w-full bg-secondary rounded-full h-2 mt-3">
            <div
              className="h-2 rounded-full gradient-primary transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6 shadow-card min-h-[400px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              {step === 0 && (
                <>
                  <div>
                    <Label>Full Name</Label>
                    <Input value={user.name} disabled className="mt-1 bg-secondary/50" />
                  </div>
                  <div>
                    <Label>Email</Label>
                    <Input value={user.email} disabled className="mt-1 bg-secondary/50" />
                  </div>
                  <div>
                    <Label>Target Job Roles</Label>
                    <TagInput tags={targetRoles} onChange={setTargetRoles} placeholder="e.g. Frontend Developer" />
                  </div>
                  <div>
                    <Label>Dream Companies</Label>
                    <TagInput tags={dreamCompanies} onChange={setDreamCompanies} placeholder="e.g. Google" />
                  </div>
                </>
              )}

              {step === 1 && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Degree</Label>
                      <Input value={degree} onChange={(e) => setDegree(e.target.value)} className="mt-1 bg-secondary/50" />
                    </div>
                    <div>
                      <Label>Institution</Label>
                      <Input value={institution} onChange={(e) => setInstitution(e.target.value)} className="mt-1 bg-secondary/50" />
                    </div>
                  </div>
                  <div>
                    <Label>Graduation Year</Label>
                    <Input value={graduationYear} onChange={(e) => setGraduationYear(e.target.value)} className="mt-1 bg-secondary/50" />
                  </div>
                  <div>
                    <Label>Relevant Coursework</Label>
                    <Textarea value={coursework} onChange={(e) => setCoursework(e.target.value)} className="mt-1 bg-secondary/50" />
                  </div>
                  <div>
                    <Label>Certifications</Label>
                    <TagInput tags={certifications} onChange={setCertifications} placeholder="e.g. AWS Certified" />
                  </div>
                </>
              )}

              {step === 2 && (
                <>
                  {workHistory.map((entry, idx) => (
                    <div key={entry.id} className="p-4 rounded-xl bg-secondary/30 border border-border space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-muted-foreground">Experience {idx + 1}</span>
                        {workHistory.length > 1 && (
                          <Button variant="ghost" size="sm" onClick={() => removeWorkEntry(entry.id)}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <Input placeholder="Job Title" value={entry.jobTitle} onChange={(e) => updateWork(entry.id, "jobTitle", e.target.value)} className="bg-secondary/50" />
                        <Input placeholder="Company" value={entry.company} onChange={(e) => updateWork(entry.id, "company", e.target.value)} className="bg-secondary/50" />
                        <Input placeholder="From (e.g. Jan 2020)" value={entry.from} onChange={(e) => updateWork(entry.id, "from", e.target.value)} className="bg-secondary/50" />
                        <Input placeholder="To (e.g. Dec 2023)" value={entry.to} onChange={(e) => updateWork(entry.id, "to", e.target.value)} className="bg-secondary/50" />
                      </div>
                      <Textarea placeholder="Key responsibilities..." value={entry.responsibilities} onChange={(e) => updateWork(entry.id, "responsibilities", e.target.value)} className="bg-secondary/50" />
                    </div>
                  ))}
                  <Button variant="outline" onClick={addWorkEntry} className="w-full border-dashed">
                    <Plus className="w-4 h-4 mr-2" /> Add Experience
                  </Button>
                </>
              )}

              {step === 3 && (
                <>
                  <div>
                    <Label>Technical Skills</Label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        value={skillInput}
                        onChange={(e) => setSkillInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSkill())}
                        placeholder="Add a skill..."
                        className="bg-secondary/50"
                      />
                      <Button onClick={addSkill} variant="outline" size="icon">
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="space-y-2 mt-3">
                      {technicalSkills.map((skill, idx) => (
                        <div key={skill.name} className="flex items-center gap-3 p-2 rounded-lg bg-secondary/30">
                          <span className="flex-1 text-sm">{skill.name}</span>
                          <Select
                            value={skill.proficiency}
                            onValueChange={(v) => {
                              const updated = [...technicalSkills];
                              updated[idx].proficiency = v as SkillEntry["proficiency"];
                              setTechnicalSkills(updated);
                            }}
                          >
                            <SelectTrigger className="w-[140px] bg-secondary/50">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Beginner">Beginner</SelectItem>
                              <SelectItem value="Intermediate">Intermediate</SelectItem>
                              <SelectItem value="Expert">Expert</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button variant="ghost" size="sm" onClick={() => setTechnicalSkills(technicalSkills.filter((_, i) => i !== idx))}>
                            <Trash2 className="w-3 h-3 text-destructive" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <Label>Soft Skills</Label>
                    <TagInput tags={softSkills} onChange={setSoftSkills} placeholder="e.g. Leadership" />
                  </div>
                </>
              )}

              {step === 4 && (
                <>
                  <Label>What interview areas concern you most?</Label>
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    {FEAR_OPTIONS.map((option) => (
                      <label
                        key={option}
                        className="flex items-center gap-2 p-3 rounded-lg bg-secondary/30 border border-border hover:border-primary/50 transition-colors cursor-pointer"
                      >
                        <Checkbox
                          checked={fears.includes(option)}
                          onCheckedChange={(checked) => {
                            setFears(checked ? [...fears, option] : fears.filter((f) => f !== option));
                          }}
                        />
                        <span className="text-sm">{option}</span>
                      </label>
                    ))}
                  </div>
                  <div className="mt-4">
                    <Label>Anything else you want us to know?</Label>
                    <Textarea value={fearNotes} onChange={(e) => setFearNotes(e.target.value)} placeholder="Tell us more..." className="mt-1 bg-secondary/50" />
                  </div>
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {stepError && (
          <p
            role="alert"
            aria-live="polite"
            className="text-destructive text-sm mt-3"
          >
            {stepError}
          </p>
        )}

        <div className="flex justify-between mt-6">
          <Button
            variant="outline"
            onClick={() => setStep(Math.max(0, step - 1))}
            disabled={step === 0}
          >
            <ChevronLeft className="w-4 h-4 mr-1" /> Back
          </Button>

          {step < STEPS.length - 1 ? (
            <Button
              onClick={handleNext}
              disabled={stepError !== null}
              title={stepError ?? undefined}
              className="gradient-primary text-primary-foreground"
            >
              Next <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button
              onClick={handleComplete}
              disabled={stepError !== null}
              title={stepError ?? undefined}
              className="gradient-primary text-primary-foreground"
            >
              <Check className="w-4 h-4 mr-1" /> Complete
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
