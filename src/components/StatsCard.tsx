import { cn } from "@/lib/utils";
import { LucideIcon, TrendingUp, TrendingDown, Minus } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  percentage?: string;
  variant?: "default" | "profit" | "loss" | "neutral" | "breakeven";
  icon?: LucideIcon;
  trend?: "up" | "down" | "neutral";
  // Psychology support props
  encourageMessage?: string;
}

export const StatsCard = ({
  title,
  value,
  subtitle,
  percentage,
  variant = "default",
  icon: Icon,
  trend,
  encourageMessage
}: StatsCardProps) => {
  // Get appropriate trend icon
  const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;

  return (
    <div className={cn(
      "relative overflow-hidden rounded-2xl p-4 sm:p-6 border transition-all duration-300 ease-out group h-full flex flex-col",
      "bg-card/90 backdrop-blur-sm hover:bg-card",
      // Softer styling for psychology support
      variant === "profit" && "stat-profit",
      variant === "loss" && "stat-loss",
      variant === "breakeven" && "stat-neutral border-breakeven/20",
      variant === "neutral" && "stat-neutral",
      variant === "default" && "border-border/50 hover:border-primary/30 hover:shadow-lg"
    )}>
      {/* Subtle background glow - softer for losses */}
      <div className={cn(
        "absolute -top-12 -right-12 w-32 h-32 rounded-full blur-3xl transition-opacity duration-500",
        variant === "profit" && "bg-profit/15 group-hover:opacity-30",
        variant === "loss" && "bg-loss/8 group-hover:opacity-15", // Much softer for losses
        variant === "breakeven" && "bg-breakeven/12 group-hover:opacity-25",
        variant === "default" && "bg-primary/10 group-hover:opacity-25",
        variant === "neutral" && "bg-muted-foreground/8 group-hover:opacity-20"
      )} />

      <div className="relative z-10 flex flex-col flex-1">
        {/* Header */}
        <div className="flex items-start justify-between mb-3 sm:mb-4">
          <span className="text-[11px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wider">
            {title}
          </span>
          {Icon && (
            <div className={cn(
              "p-1.5 sm:p-2 rounded-xl transition-colors",
              variant === "profit" && "bg-profit/10 text-profit",
              variant === "loss" && "bg-loss/8 text-loss/80", // Softer loss icon
              variant === "breakeven" && "bg-breakeven/10 text-breakeven",
              variant === "default" && "bg-primary/10 text-primary",
              variant === "neutral" && "bg-muted text-muted-foreground"
            )}>
              <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
          )}
        </div>

        {/* Value */}
        <div className={cn(
          "text-2xl sm:text-3xl font-bold font-mono tracking-tight mb-1.5 sm:mb-2 transition-colors",
          variant === "profit" && "text-profit",
          variant === "loss" && "text-loss/90", // Slightly muted loss color
          variant === "breakeven" && "text-breakeven",
          variant === "neutral" && "text-muted-foreground",
          variant === "default" && "text-foreground"
        )}>
          {value}
        </div>

        {/* Subtitle and percentage */}
        {(subtitle || percentage) && (
          <div className="flex items-center gap-2 flex-wrap">
            {subtitle && (
              <span className="text-[11px] sm:text-sm text-muted-foreground">{subtitle}</span>
            )}
            {percentage && (
              <span className={cn(
                "inline-flex items-center gap-1 text-[10px] sm:text-xs font-medium px-2 py-0.5 rounded-lg",
                trend === "up" && "bg-profit/12 text-profit",
                trend === "down" && "bg-loss/8 text-loss/80", // Softer
                trend === "neutral" && "bg-breakeven/10 text-breakeven",
                !trend && "bg-muted text-muted-foreground"
              )}>
                {trend && <TrendIcon className="h-3 w-3" />}
                {percentage}
              </span>
            )}
          </div>
        )}

        {/* Encouragement message for psychology support */}
        {encourageMessage && (
          <p className="mt-3 pt-3 border-t border-border/30 text-[10px] sm:text-xs text-muted-foreground/80 italic">
            {encourageMessage}
          </p>
        )}
      </div>
    </div>
  );
};
