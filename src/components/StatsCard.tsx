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
      "relative overflow-hidden rounded-xl sm:rounded-2xl p-3 sm:p-6 border transition-all duration-300 group",
      "bg-card/80 backdrop-blur-sm hover-lift",
      variant === "profit" && "stat-profit",
      variant === "loss" && "stat-loss",
      variant === "default" && "border-border/50 hover:border-primary/40 shadow-elegant",
      variant === "neutral" && "border-border/50 shadow-elegant"
    )}>
      {/* Animated background gradient */}
      <div className={cn(
        "absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500",
        "bg-gradient-to-br from-transparent via-transparent",
        variant === "profit" && "to-profit/5",
        variant === "loss" && "to-loss/5",
        variant === "default" && "to-primary/5",
        variant === "neutral" && "to-muted/10"
      )} />

      {/* Background orb effect */}
      <div className={cn(
        "absolute -top-10 sm:-top-16 -right-10 sm:-right-16 w-24 sm:w-40 h-24 sm:h-40 rounded-full blur-3xl transition-all duration-500",
        "opacity-20 group-hover:opacity-40 group-hover:scale-110",
        variant === "profit" && "bg-profit",
        variant === "loss" && "bg-loss",
        variant === "default" && "bg-primary",
        variant === "neutral" && "bg-muted-foreground"
      )} />

      {/* Inner highlight line */}
      <div className={cn(
        "absolute top-0 left-0 right-0 h-px opacity-50",
        "bg-gradient-to-r from-transparent via-foreground/10 to-transparent"
      )} />

      <div className="relative z-10">
        <div className="flex items-start justify-between mb-2 sm:mb-4">
          <span className="text-[10px] sm:text-sm font-medium text-muted-foreground uppercase tracking-wider">
            {title}
          </span>
          {Icon && (
            <div className={cn(
              "p-1.5 sm:p-2.5 rounded-lg sm:rounded-xl transition-all duration-300",
              "group-hover:scale-110 group-hover:shadow-lg",
              variant === "profit" && "bg-profit/15 text-profit group-hover:bg-profit/25",
              variant === "loss" && "bg-loss/15 text-loss group-hover:bg-loss/25",
              variant === "default" && "bg-primary/15 text-primary group-hover:bg-primary/25",
              variant === "neutral" && "bg-muted text-muted-foreground"
            )}>
              <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
          )}
        </div>

        <div className={cn(
          "text-xl sm:text-3xl font-bold font-mono tracking-tight mb-1 sm:mb-2 transition-transform duration-300",
          "group-hover:scale-[1.02] origin-left",
          variant === "profit" && "text-profit",
          variant === "loss" && "text-loss",
          variant === "neutral" && "text-muted-foreground",
          variant === "default" && "text-foreground"
        )}>
          {value}
        </div>

        {(subtitle || percentage) && (
          <div className="flex items-center gap-2 flex-wrap">
            {subtitle && (
              <span className="text-[10px] sm:text-sm text-muted-foreground truncate">{subtitle}</span>
            )}
            {percentage && (
              <span className={cn(
                "text-[10px] sm:text-xs font-semibold px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-md sm:rounded-lg",
                "transition-all duration-300 group-hover:scale-105",
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
