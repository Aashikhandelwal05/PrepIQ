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

const PREDEFINED_ROLES = [
  "Software Engineer", "Frontend Developer", "Backend Developer", "Full Stack Developer", "Web Developer",
  "Mobile App Developer", "Android Developer", "iOS Developer", "React Developer", "Node.js Developer",
  "Java Developer", "Python Developer", "C++ Developer", "DevOps Engineer", "Cloud Engineer",
  "Site Reliability Engineer", "Data Analyst", "Data Scientist", "Machine Learning Engineer",
  "AI Engineer", "Deep Learning Engineer", "NLP Engineer", "Computer Vision Engineer",
  "Cybersecurity Analyst", "Security Engineer", "QA Engineer", "Test Engineer",
  "Automation Engineer", "Business Analyst", "Product Manager", "UI/UX Designer",
  "Graphic Designer", "Game Developer", "Embedded Systems Engineer", "Blockchain Developer",
  "AR/VR Developer", "Database Administrator", "System Administrator", "Network Engineer",
  "Technical Support Engineer", "Solutions Architect"
].sort();

const PREDEFINED_COMPANIES = [
  "Google", "Microsoft", "Amazon", "Meta", "Apple", "Netflix", "Adobe", "Oracle", "IBM", "Intel",
  "NVIDIA", "Tesla", "Salesforce", "Cisco", "SAP", "Uber", "Airbnb", "Spotify", "LinkedIn", "PayPal",
  "Atlassian", "Dropbox", "Stripe", "OpenAI", "Infosys", "TCS", "Wipro", "Accenture", "Cognizant",
  "Capgemini", "Tech Mahindra", "HCL", "Zoho", "Freshworks", "Flipkart", "Paytm", "PhonePe", "Swiggy",
  "Zomato", "Ola", "Razorpay", "Meesho", "Myntra", "Juspay"
].sort();

const PREDEFINED_SOFT_SKILLS = [
  "Communication", "Leadership", "Problem Solving", "Critical Thinking", "Analytical Thinking",
  "Teamwork", "Collaboration", "Adaptability", "Time Management", "Creativity", "Decision Making",
  "Conflict Resolution", "Public Speaking", "Negotiation", "Emotional Intelligence",
  "Project Management", "Mentorship", "Attention to Detail", "Customer Handling",
  "Presentation Skills", "Research Skills", "Strategic Thinking", "Innovation", "Self Learning"
].sort();

const PREDEFINED_TECH_SKILLS = [
  "Java", "C", "C++", "Python", "JavaScript", "TypeScript", "Go", "Rust", "Kotlin", "Swift", "PHP", "Ruby", "Scala", "R", "Dart", "Perl",
  "HTML", "CSS", "SASS", "Bootstrap", "Tailwind CSS", "React", "Next.js", "Vue.js", "Nuxt.js", "Angular", "Redux", "jQuery",
  "Node.js", "Express.js", "Spring Boot", "Django", "Flask", "FastAPI", "Laravel", "ASP.NET", "NestJS", "Ruby on Rails",
  "MySQL", "PostgreSQL", "MongoDB", "Firebase", "SQLite", "Redis", "Oracle DB", "MariaDB", "Cassandra",
  "AWS", "Azure", "Google Cloud", "Docker", "Kubernetes", "Jenkins", "Terraform", "Git", "GitHub", "GitLab", "CI/CD", "Linux", "Nginx",
  "Machine Learning", "Deep Learning", "TensorFlow", "PyTorch", "Scikit-learn", "Pandas", "NumPy", "OpenCV", "NLP", "Computer Vision", "Data Structures", "Algorithms", "Data Analysis", "Power BI", "Tableau",
  "Flutter", "React Native", "Android Development", "iOS Development",
  "Cybersecurity", "Ethical Hacking", "Network Security", "Penetration Testing"
].sort();

const SearchableMultiSelect = ({ options, selected, onChange, placeholder }: { options: string[], selected: string[], onChange: (val: string[]) => void, placeholder: string }) => {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const filteredOptions = options.filter(opt =>
    opt.toLowerCase().includes(query.toLowerCase()) &&
    !selected.some(s => s.toLowerCase() === opt.toLowerCase())
  );

  return (
    <div className="space-y-2 relative">
      <Input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        onBlur={() => setTimeout(() => setIsOpen(false), 200)}
        placeholder={placeholder}
        className="bg-secondary/50 mt-1"
      />
      <AnimatePresence>
        {isOpen && filteredOptions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 w-full mt-1 max-h-60 overflow-auto rounded-md border border-border bg-popover text-popover-foreground shadow-md outline-none"
          >
            {filteredOptions.map(opt => (
              <div
                key={opt}
                className="relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 pl-2 pr-8 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
                onMouseDown={(e) => {
                  e.preventDefault();
                  if (!selected.some(s => s.toLowerCase() === opt.toLowerCase())) {
                    onChange([...selected, opt]);
                  }
                  setQuery("");
                  setIsOpen(false);
                }}
              >
                {opt}
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {selected.map(item => (
            <div key={item} className="flex items-center gap-1 bg-secondary px-3 py-1 rounded-full text-sm">
              {item}
              <button onClick={() => onChange(selected.filter(i => i !== item))} className="text-muted-foreground hover:text-foreground">
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const SearchableInput = ({ value, onChange, options, placeholder, className }: { value: string, onChange: (val: string) => void, options: string[], placeholder?: string, className?: string }) => {
  const [isOpen, setIsOpen] = useState(false);
  const filteredOptions = value ? options.filter(opt => opt.toLowerCase().includes(value.toLowerCase()) && opt !== value).slice(0, 10) : [];
  return (
    <div className="relative w-full">
      <Input value={value} onChange={(e) => { onChange(e.target.value); setIsOpen(true); }} onFocus={() => setIsOpen(true)} onBlur={() => setTimeout(() => setIsOpen(false), 200)} placeholder={placeholder} className={className} />
      <AnimatePresence>
        {isOpen && filteredOptions.length > 0 && (
          <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} transition={{ duration: 0.15 }} className="absolute z-50 w-full mt-1 max-h-60 overflow-auto rounded-md border border-border bg-popover text-popover-foreground shadow-md outline-none">
            {filteredOptions.map(opt => (
              <div key={opt} className="relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 pl-2 pr-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground" onMouseDown={(e) => { e.preventDefault(); onChange(opt); setIsOpen(false); }}>{opt}</div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

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
  const [techQuery, setTechQuery] = useState("");
  const [isTechOpen, setIsTechOpen] = useState(false);
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

  const validateStep = (currentStep: number): string | null => {
    switch (currentStep) {
      case 0:
        if (targetRoles.length === 0)
          return "Add at least one target job role to continue.";
        if (dreamCompanies.length === 0)
          return "Add at least one dream company to continue.";
        return null;
      case 1: {
        if (!degree.trim())
          return "Please enter your degree.";
        if (!institution.trim())
          return "Please enter your institution.";
        if (!graduationYear.trim())
          return "Please enter your graduation year.";
        const year = parseInt(graduationYear, 10);
        if (isNaN(year) || year < 1950 || year > 2030)
          return "Please enter a valid graduation year between 1950 and 2030.";

        return null;
      }
      case 2: {
        let filledCount = 0;
        const currentYear = new Date().getFullYear();

        for (const entry of workHistory) {
          const isFilled = entry.jobTitle.trim() || entry.company.trim() || entry.from.trim() || entry.to.trim();
          if (!isFilled) continue;

          filledCount++;

          if (!entry.jobTitle.trim() || !entry.company.trim()) {
            return "Please provide both job title and company for all work entries.";
          }

          if (entry.from.trim()) {
            const startYearMatch = entry.from.match(/\b(19|20)\d{2}\b/);
            if (!startYearMatch) return "Please include a valid year (e.g., 2020) in the 'From' field.";

            const startYear = parseInt(startYearMatch[0], 10);
            if (startYear > currentYear) return `Start year (${startYear}) cannot be in the future.`;
            if (startYear < 1950) return `Start year (${startYear}) is unrealistic.`;

            if (entry.to.trim()) {
              const isPresent = entry.to.toLowerCase() === "present" || entry.to.toLowerCase() === "current";
              const endYearMatch = entry.to.match(/\b(19|20)\d{2}\b/);

              if (!endYearMatch && !isPresent) return "Please include a valid year or 'Present' in the 'To' field.";

              const endYear = endYearMatch ? parseInt(endYearMatch[0], 10) : currentYear;

              if (!isPresent && endYear > currentYear) return `End year (${endYear}) cannot be in the future.`;
              if (endYear < startYear) return `End year (${endYear}) must be greater than or equal to start year (${startYear}).`;
            }
          }
        }

        if (filledCount === 0) {
          return "Add at least one work entry with job title and company.";
        }

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

  const filteredTechOptions = PREDEFINED_TECH_SKILLS.filter(opt =>
    opt.toLowerCase().includes(techQuery.toLowerCase()) &&
    !technicalSkills.some(s => s.name.toLowerCase() === opt.toLowerCase())
  );

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
                    <SearchableMultiSelect options={PREDEFINED_ROLES} selected={targetRoles} onChange={setTargetRoles} placeholder="Search for a role..." />
                  </div>
                  <div>
                    <Label>Dream Companies</Label>
                    <SearchableMultiSelect options={PREDEFINED_COMPANIES} selected={dreamCompanies} onChange={setDreamCompanies} placeholder="Search for a company..." />
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
                    <Input type="number" min="1950" max="2030" value={graduationYear} onChange={(e) => setGraduationYear(e.target.value)} className="mt-1 bg-secondary/50" />
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
                        <SearchableInput options={PREDEFINED_ROLES} placeholder="Job Title" value={entry.jobTitle} onChange={(v) => updateWork(entry.id, "jobTitle", v)} className="bg-secondary/50" />
                        <SearchableInput options={PREDEFINED_COMPANIES} placeholder="Company" value={entry.company} onChange={(v) => updateWork(entry.id, "company", v)} className="bg-secondary/50" />
                        <Input placeholder="From (e.g. 2020)" value={entry.from} onChange={(e) => updateWork(entry.id, "from", e.target.value)} className="bg-secondary/50" />
                        <Input placeholder="To (e.g. 2023 or Present)" value={entry.to} onChange={(e) => updateWork(entry.id, "to", e.target.value)} className="bg-secondary/50" />
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
                    <div className="mt-1 relative">
                      <Input
                        value={techQuery}
                        onChange={(e) => {
                          setTechQuery(e.target.value);
                          setIsTechOpen(true);
                        }}
                        onFocus={() => setIsTechOpen(true)}
                        onBlur={() => setTimeout(() => setIsTechOpen(false), 200)}
                        placeholder="Search for a technical skill..."
                        className="bg-secondary/50"
                      />
                      <AnimatePresence>
                        {isTechOpen && filteredTechOptions.length > 0 && (
                          <motion.div
                            initial={{ opacity: 0, y: -5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -5 }}
                            transition={{ duration: 0.15 }}
                            className="absolute z-50 w-full mt-1 max-h-60 overflow-auto rounded-md border border-border bg-popover text-popover-foreground shadow-md outline-none"
                          >
                            {filteredTechOptions.map(opt => (
                              <div
                                key={opt}
                                className="relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 pl-2 pr-8 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  if (!technicalSkills.some(s => s.name.toLowerCase() === opt.toLowerCase())) {
                                    setTechnicalSkills([...technicalSkills, { name: opt, proficiency: "Intermediate" }]);
                                  }
                                  setTechQuery("");
                                  setIsTechOpen(false);
                                }}
                              >
                                {opt}
                              </div>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
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
                    <SearchableMultiSelect options={PREDEFINED_SOFT_SKILLS} selected={softSkills} onChange={setSoftSkills} placeholder="Search for a soft skill..." />
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
