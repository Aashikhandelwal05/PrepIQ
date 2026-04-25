import { LucideIcon } from "lucide-react";

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  gradient?: string;
}

export function StatCard({ icon: Icon, label, value, gradient = "gradient-primary" }: StatCardProps) {
  return (
    <div className="rounded-xl bg-card border border-border p-5 shadow-card hover:shadow-elevated transition-shadow">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg ${gradient} flex items-center justify-center shrink-0`}>
          <Icon className="w-5 h-5 text-primary-foreground" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold text-foreground">{value}</p>
        </div>
      </div>
    </div>
  );
}
