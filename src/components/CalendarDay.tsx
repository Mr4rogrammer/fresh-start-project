import { DayData } from "@/types/trade";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown } from "lucide-react";

interface CalendarDayProps {
  dayData: DayData | null;
  dayNumber: number | null;
  onClick: () => void;
}

export const CalendarDay = ({ dayData, dayNumber, onClick }: CalendarDayProps) => {
  if (!dayNumber) {
    return <div className="aspect-square min-h-0" />;
  }

  const hasData = dayData && dayData.tradeCount > 0;
  const isProfit = hasData && dayData.totalProfit > 0;
  const isLoss = hasData && dayData.totalProfit < 0;

  return (
    <button
      onClick={onClick}
      className={cn(
        "group relative w-full h-full min-h-0 rounded-2xl p-3 md:p-4 transition-all duration-300",
        "flex flex-col items-center justify-center gap-1",
        "cursor-pointer active:scale-[0.97]",
        
        // Profit styling
        isProfit && "calendar-day-profit",
        
        // Loss styling
        isLoss && "calendar-day-loss",
        
        // No data styling
        !hasData && "bg-card/40 border border-border/30 hover:bg-card/60 hover:border-border/50"
      )}
    >
      {/* Day number */}
      <span className={cn(
        "text-xl md:text-2xl font-bold transition-colors",
        hasData ? "text-foreground" : "text-muted-foreground/60"
      )}>
        {dayNumber}
      </span>

      {hasData && (
        <>
          {/* Profit/Loss indicator */}
          <div className="flex items-center gap-1">
            {isProfit ? (
              <TrendingUp className="h-3 w-3 md:h-4 md:w-4 text-profit" />
            ) : isLoss ? (
              <TrendingDown className="h-3 w-3 md:h-4 md:w-4 text-loss" />
            ) : null}
            <span className={cn(
              "text-sm md:text-base font-bold font-mono",
              isProfit && "text-profit",
              isLoss && "text-loss"
            )}>
              {isProfit ? '+' : ''}${Math.abs(dayData.totalProfit).toFixed(0)}
            </span>
          </div>
          
          {/* Trade count */}
          <span className="text-xs text-muted-foreground font-medium">
            {dayData.tradeCount} {dayData.tradeCount === 1 ? 'trade' : 'trades'}
          </span>
        </>
      )}
    </button>
  );
};
