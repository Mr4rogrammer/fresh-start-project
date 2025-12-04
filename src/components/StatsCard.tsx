import { cn } from "@/lib/utils";

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  percentage?: string;
  variant?: "default" | "profit" | "loss" | "neutral";
}

export const StatsCard = ({ title, value, subtitle, percentage, variant = "default" }: StatsCardProps) => {
  return (
    <div className="bg-card/50 backdrop-blur-sm rounded-2xl p-6 border border-border/50 hover:border-primary/50 transition-all duration-300 hover:shadow-xl hover:shadow-primary/10 hover:-translate-y-1 h-full flex flex-col">
      <h3 className="text-sm text-muted-foreground font-medium mb-3">{title}</h3>

      <div className={cn(
        "text-3xl font-bold mb-1",
        variant === "profit" && "text-profit",
        variant === "loss" && "text-loss",
        variant === "neutral" && "text-neutral",
        variant === "default" && "text-foreground"
      )}>
        {value}
      </div>

      <div className="flex items-center gap-2 mt-2 min-h-[20px]">
        {subtitle && (
          <span className="text-sm text-muted-foreground">{subtitle}</span>
        )}
        {percentage && (
          <span className="text-sm font-medium text-accent-foreground bg-accent/20 px-2 py-1 rounded-lg">
            {percentage}
          </span>
        )}
      </div>
    </div>
  );
};
