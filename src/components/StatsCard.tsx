import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  percentage?: string;
  variant?: "default" | "profit" | "loss" | "neutral";
  icon?: LucideIcon;
  trend?: "up" | "down" | "neutral";
}

export const StatsCard = ({ 
  title, 
  value, 
  subtitle, 
  percentage, 
  variant = "default",
  icon: Icon,
  trend
}: StatsCardProps) => {
  return (
    <div className={cn(
      "relative overflow-hidden rounded-xl sm:rounded-2xl p-3 sm:p-6 border transition-all duration-300 hover-lift group",
      "bg-card/80 backdrop-blur-sm",
      variant === "profit" && "stat-profit",
      variant === "loss" && "stat-loss",
      variant === "default" && "border-border/50 hover:border-primary/30",
      variant === "neutral" && "border-border/50"
    )}>
      {/* Background glow effect */}
      <div className={cn(
        "absolute -top-8 sm:-top-12 -right-8 sm:-right-12 w-20 sm:w-32 h-20 sm:h-32 rounded-full blur-3xl opacity-20 transition-opacity duration-300 group-hover:opacity-40",
        variant === "profit" && "bg-profit",
        variant === "loss" && "bg-loss",
        variant === "default" && "bg-primary",
        variant === "neutral" && "bg-muted-foreground"
      )} />

      <div className="relative z-10">
        <div className="flex items-start justify-between mb-2 sm:mb-4">
          <span className="text-[10px] sm:text-sm font-medium text-muted-foreground uppercase tracking-wider">
            {title}
          </span>
          {Icon && (
            <div className={cn(
              "p-1.5 sm:p-2 rounded-lg sm:rounded-xl",
              variant === "profit" && "bg-profit/10 text-profit",
              variant === "loss" && "bg-loss/10 text-loss",
              variant === "default" && "bg-primary/10 text-primary",
              variant === "neutral" && "bg-muted text-muted-foreground"
            )}>
              <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
          )}
        </div>

        <div className={cn(
          "text-lg sm:text-3xl font-bold font-mono tracking-tight mb-1 sm:mb-2",
          variant === "profit" && "text-profit",
          variant === "loss" && "text-loss",
          variant === "neutral" && "text-muted-foreground",
          variant === "default" && "text-foreground"
        )}>
          {value}
        </div>

        {(subtitle || percentage) && (
          <div className="flex items-center gap-2">
            {subtitle && (
              <span className="text-[10px] sm:text-sm text-muted-foreground truncate">{subtitle}</span>
            )}
            {percentage && (
              <span className={cn(
                "text-[10px] sm:text-xs font-semibold px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md sm:rounded-lg",
                trend === "up" && "bg-profit/15 text-profit",
                trend === "down" && "bg-loss/15 text-loss",
                !trend && "bg-accent/15 text-accent-foreground"
              )}>
                {percentage}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
