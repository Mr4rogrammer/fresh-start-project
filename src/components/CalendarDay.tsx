import { DayData } from "@/types/trade";
import { cn } from "@/lib/utils";

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
        "group relative w-full h-full min-h-0 rounded-2xl p-2 md:p-4 transition-all duration-300",
        "flex flex-col items-center justify-center",
        "border-2 hover:scale-105 active:scale-95 cursor-pointer",

        // ✅ Profit (light green background)
        isProfit &&
        "bg-green-500/10 border-green-300 hover:border-green-400 hover:bg-green-500/15 hover:shadow-lg hover:shadow-green-200/40",

        // ✅ Loss (light red background)
        isLoss &&
        "bg-red-500/10 border-red-300 hover:border-red-400 hover:bg-red-500/15 hover:shadow-lg hover:shadow-red-200/40",

        // ✅ No data (neutral gray)
        !hasData &&
        "bg-card/30 border-border/50 hover:border-border hover:bg-card/50"
      )}

    >
      <div className={cn(
        "text-2xl md:text-3xl font-bold mb-1 md:mb-2 transition-colors",
        hasData ? "text-foreground" : "text-muted-foreground"
      )}>
        {dayNumber}
      </div>

      {hasData && (
        <>
          <div className={cn(
            "text-base md:text-xl font-bold mb-1",
            isProfit && "text-profit",
            isLoss && "text-loss"
          )}>
            ${isProfit ? '+' : ''}{dayData.totalProfit.toFixed(2)}
          </div>
          <div className="text-xs md:text-sm text-muted-foreground">
            {dayData.tradeCount} {dayData.tradeCount === 1 ? 'trade' : 'trades'}
          </div>
        </>
      )}
    </button>
  );
};
