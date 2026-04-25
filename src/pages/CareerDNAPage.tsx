import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { UserCircle, CheckCircle, AlertCircle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CareerProfile, User } from "@/lib/store";

interface CareerDNAPageProps {
  user: User;
  profile: CareerProfile | null;
}

export default function CareerDNAPage({ user, profile }: CareerDNAPageProps) {
  const navigate = useNavigate();

  if (!profile || !profile.onboardingComplete) {
    return (
      <div className="space-y-6 animate-slide-up">
        <h1 className="text-2xl font-bold text-foreground">Career DNA</h1>
        <div className="bg-card border border-border rounded-2xl p-12 text-center shadow-card">
          <AlertCircle className="w-12 h-12 text-warning mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-1">Profile Incomplete</h3>
          <p className="text-sm text-muted-foreground mb-4">Complete your Career DNA to unlock personalized prep</p>
          <Button onClick={() => navigate("/onboarding")} className="gradient-primary text-primary-foreground">
            Complete Profile <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </div>
    );
  }

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="bg-card border border-border rounded-2xl p-6 shadow-card">
      <h3 className="text-sm font-semibold text-foreground mb-3">{title}</h3>
      {children}
    </div>
  );

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Career DNA</h1>
          <p className="text-sm text-muted-foreground">Your personalized career profile</p>
        </div>
        <Badge className="bg-success/20 text-success border-success/30">
          <CheckCircle className="w-3 h-3 mr-1" /> Complete
        </Badge>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Section title="Personal Info">
          <div className="space-y-2 text-sm">
            <p><span className="text-muted-foreground">Name:</span> <span className="text-foreground">{profile.fullName}</span></p>
            <p><span className="text-muted-foreground">Email:</span> <span className="text-foreground">{profile.email}</span></p>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {profile.targetRoles.map((r) => <Badge key={r} variant="outline" className="text-xs">{r}</Badge>)}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {profile.dreamCompanies.map((c) => <Badge key={c} className="bg-primary/20 text-primary text-xs">{c}</Badge>)}
            </div>
          </div>
        </Section>

        <Section title="Education">
          <div className="space-y-1 text-sm">
            <p className="text-foreground font-medium">{profile.degree}</p>
            <p className="text-muted-foreground">{profile.institution} — {profile.graduationYear}</p>
            {profile.coursework && <p className="text-muted-foreground mt-2">{profile.coursework}</p>}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {profile.certifications.map((c) => <Badge key={c} variant="outline" className="text-xs">{c}</Badge>)}
            </div>
          </div>
        </Section>

        <Section title="Work History">
          <div className="space-y-3">
            {profile.workHistory.filter((w) => w.jobTitle).map((w) => (
              <div key={w.id} className="p-3 rounded-lg bg-secondary/30">
                <p className="text-sm font-medium text-foreground">{w.jobTitle} at {w.company}</p>
                <p className="text-xs text-muted-foreground">{w.from} — {w.to}</p>
                {w.responsibilities && <p className="text-xs text-muted-foreground mt-1">{w.responsibilities}</p>}
              </div>
            ))}
          </div>
        </Section>

        <Section title="Skills">
          <div className="space-y-3">
            <div>
              <p className="text-xs text-muted-foreground mb-1.5">Technical</p>
              <div className="flex flex-wrap gap-1.5">
                {profile.technicalSkills.map((s) => (
                  <Badge key={s.name} variant="outline" className="text-xs">
                    {s.name} <span className="ml-1 text-muted-foreground">({s.proficiency})</span>
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1.5">Soft Skills</p>
              <div className="flex flex-wrap gap-1.5">
                {profile.softSkills.map((s) => <Badge key={s} className="bg-accent/20 text-accent-foreground text-xs">{s}</Badge>)}
              </div>
            </div>
          </div>
        </Section>
      </div>

      <Button onClick={() => navigate("/onboarding")} variant="outline">
        Edit Profile <ArrowRight className="w-4 h-4 ml-1" />
      </Button>
    </div>
  );
}
