import { Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  buttonText: string;
  onClick?: () => void;
  tips?: string[];
}

export default function EmptyState({
  icon,
  title,
  description,
  buttonText,
  onClick,
  tips = [],
}: EmptyStateProps) {
  return (
    <div className="bg-card border border-border rounded-2xl p-7 shadow-card text-center relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10 pointer-events-none" />

      <div className="relative z-10">
        <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center mx-auto mb-6 shadow-glow">
          {icon}
        </div>

        <h2 className="text-2xl font-bold text-foreground mb-3">
          {title}
        </h2>

        <p className="text-muted-foreground max-w-lg mx-auto mb-6 leading-relaxed">
          {description}
        </p>

        <Button
          onClick={onClick}
          className="gradient-primary text-primary-foreground px-6"
        >
          <Sparkles className="w-4 h-4 mr-2" />
          {buttonText}
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>

        {tips.length > 0 && (
          <div className="grid md:grid-cols-2 gap-3 mt-8">
            {tips.map((tip, index) => (
              <div
                key={index}
                className="bg-secondary/30 border border-border rounded-xl p-4 text-sm text-muted-foreground text-left"
              >
                ✨ {tip}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}