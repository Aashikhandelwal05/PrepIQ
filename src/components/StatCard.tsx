import { LucideIcon } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  gradient?: string;
  onClick?: () => void;
  tooltip?: string;
}

export function StatCard({
  icon: Icon,
  label,
  value,
  gradient = "gradient-primary",
  onClick,
  tooltip,
}: StatCardProps) {
  const card = (
    <div
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => {
        if (onClick && (e.key === "Enter" || e.key === " ")) {
          onClick();
        }
      }}
      className={`
        rounded-xl bg-card border border-border p-5 shadow-card
        transition-all duration-200
        ${onClick ? "cursor-pointer hover:shadow-elevated hover:border-primary/30" : ""}
      `}
    >
      <div className="flex items-center gap-3">
        <div
          className={`w-10 h-10 rounded-lg ${gradient} flex items-center justify-center shrink-0`}
        >
          <Icon className="w-5 h-5 text-primary-foreground" />
        </div>

        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold text-foreground">{value}</p>
        </div>
      </div>
    </div>
  );

  if (!tooltip) return card;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {card}
      </TooltipTrigger>
      <TooltipContent>
        {tooltip}
      </TooltipContent>
    </Tooltip>
  );
}