import { DayData } from "@/types/trade";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, BookOpen } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface CalendarDayProps {
  dayData: DayData | null;
  dayNumber: number | null;
  onClick: () => void;
  isToday?: boolean;
  formatCurrency?: (amount: number, decimals?: number) => string;
}

export const CalendarDay = ({ dayData, dayNumber, onClick, isToday = false, formatCurrency }: CalendarDayProps) => {
  const fmtAmt = (amount: number) => {
    if (formatCurrency) return formatCurrency(Math.abs(amount));
    return `$${Math.abs(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };
  if (!dayNumber) {
    return <div className="aspect-square min-h-0" />;
  }

  const hasTrades = dayData && dayData.tradeCount > 0;
  const hasJournals = dayData && dayData.journals && dayData.journals.length > 0;
  const hasData = hasTrades || hasJournals;
  const isJournalOnly = hasJournals && !hasTrades;
  const hasBoth = hasTrades && hasJournals;
  const isProfit = hasTrades && dayData.totalProfit > 0;
  const isLoss = hasTrades && dayData.totalProfit < 0;

  const winCount = hasTrades ? dayData.trades.filter(t => t.profit > 0).length : 0;
  const lossCount = hasTrades ? dayData.trades.filter(t => t.profit < 0).length : 0;
  const pairs = hasTrades ? [...new Set(dayData.trades.map(t => t.pair))].slice(0, 3) : [];

  const dayButton = (
    <button
      onClick={onClick}
      className={cn(
        "group relative w-full h-full min-h-0 rounded-xl sm:rounded-2xl p-1.5 sm:p-3 md:p-4 transition-all duration-300",
        "flex flex-col items-center justify-center gap-0.5 sm:gap-1",
        "cursor-pointer active:scale-[0.97]",
        isToday && "ring-2 ring-primary/70 ring-offset-2 ring-offset-background",
        isProfit && "calendar-day-profit",
        isLoss && "calendar-day-loss",
        isJournalOnly && "bg-blue-500/10 border border-blue-500/20 hover:bg-blue-500/15 hover:border-blue-500/30",
        !hasData && "bg-card/40 border border-border/30 hover:bg-card/60 hover:border-border/50"
      )}
    >
      <span className={cn(
        "text-sm sm:text-xl md:text-2xl font-bold transition-colors",
        hasData ? "text-foreground" : "text-muted-foreground/60"
      )}>
        {dayNumber}
      </span>

      {/* Journal indicator badge when day has both trades and journals */}
      {hasBoth && (
        <div className="absolute top-2 right-2 sm:top-2.5 sm:right-2.5">
          <div className="bg-blue-500 rounded-full p-0.5 sm:p-1 shadow-sm">
            <BookOpen className="h-2 w-2 sm:h-2.5 sm:w-2.5 text-white" />
          </div>
        </div>
      )}

      {hasTrades && (
        <>
          <div className="flex items-center gap-0.5 sm:gap-1">
            {isProfit ? (
              <TrendingUp className="h-2.5 w-2.5 sm:h-3 sm:w-3 md:h-4 md:w-4 text-profit" />
            ) : isLoss ? (
              <TrendingDown className="h-2.5 w-2.5 sm:h-3 sm:w-3 md:h-4 md:w-4 text-loss" />
            ) : null}
            <span className={cn(
              "text-[10px] sm:text-sm md:text-base font-bold font-mono",
              isProfit && "text-profit",
              isLoss && "text-loss"
            )}>
              {isProfit ? '+' : '-'}{fmtAmt(dayData.totalProfit)}
            </span>
          </div>

          <div className="flex items-center gap-1 text-[8px] sm:text-xs text-muted-foreground font-medium hidden xs:block">
            <span>{dayData.tradeCount} {dayData.tradeCount === 1 ? 'trade' : 'trades'}</span>
          </div>
        </>
      )}

      {isJournalOnly && (
        <>
          <BookOpen className="h-3 w-3 sm:h-4 sm:w-4 text-blue-500" />
          <span className="text-[8px] sm:text-xs text-blue-500/80 font-medium">
            {dayData.journals.length} {dayData.journals.length === 1 ? 'note' : 'notes'}
          </span>
        </>
      )}
    </button>
  );

  if (!hasData) {
    return dayButton;
  }

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          {dayButton}
        </TooltipTrigger>
        <TooltipContent 
          side="top" 
          className="glass-strong border-border/50 p-3 max-w-[200px]"
        >
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-4">
              <span className="text-xs text-muted-foreground">Total P/L</span>
              <span className={cn(
                "font-mono font-bold text-sm",
                isProfit ? "text-profit" : "text-loss"
              )}>
                {isProfit ? '+' : '-'}{fmtAmt(dayData.totalProfit)}
              </span>
            </div>
            
            <div className="flex items-center justify-between gap-4">
              <span className="text-xs text-muted-foreground">Win / Loss</span>
              <span className="text-sm font-medium">
                <span className="text-profit">{winCount}W</span>
                {' / '}
                <span className="text-loss">{lossCount}L</span>
              </span>
            </div>

            {pairs.length > 0 && (
              <div className="pt-1 border-t border-border/30">
                <span className="text-xs text-muted-foreground">Pairs: </span>
                <span className="text-xs font-medium">{pairs.join(', ')}</span>
              </div>
            )}

            {hasBoth && (
              <div className="flex items-center gap-1.5 pt-1 border-t border-border/30">
                <BookOpen className="h-3 w-3 text-blue-500" />
                <span className="text-xs text-blue-500">
                  {dayData.journals.length} {dayData.journals.length === 1 ? 'journal' : 'journals'}
                </span>
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
