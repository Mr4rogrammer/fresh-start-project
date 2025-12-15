import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface WeeklySummaryProps {
  totalProfit: number;
  tradeCount: number;
  winCount: number;
  lossCount: number;
}

export const WeeklySummary = ({ totalProfit, tradeCount, winCount, lossCount }: WeeklySummaryProps) => {
  const isProfit = totalProfit > 0;
  const isLoss = totalProfit < 0;
  const hasData = tradeCount > 0;

  return (
    <div className={cn(
      "col-span-7 flex items-center justify-between px-4 py-2 rounded-xl transition-all",
      "border backdrop-blur-sm",
      hasData && isProfit && "bg-profit/5 border-profit/20",
      hasData && isLoss && "bg-loss/5 border-loss/20",
      !hasData && "bg-muted/20 border-border/30"
    )}>
      <div className="flex items-center gap-3">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Week Total
        </span>
        {hasData && (
          <span className="text-xs text-muted-foreground">
            {tradeCount} {tradeCount === 1 ? 'trade' : 'trades'}
            <span className="mx-1.5">•</span>
            <span className="text-profit">{winCount}W</span>
            {' / '}
            <span className="text-loss">{lossCount}L</span>
          </span>
        )}
      </div>
      
      <div className="flex items-center gap-2">
        {hasData ? (
          <>
            {isProfit ? (
              <TrendingUp className="h-4 w-4 text-profit" />
            ) : isLoss ? (
              <TrendingDown className="h-4 w-4 text-loss" />
            ) : (
              <Minus className="h-4 w-4 text-muted-foreground" />
            )}
            <span className={cn(
              "font-mono font-bold text-sm",
              isProfit && "text-profit",
              isLoss && "text-loss",
              !isProfit && !isLoss && "text-muted-foreground"
            )}>
              {isProfit ? '+' : ''}${totalProfit.toFixed(2)}
            </span>
          </>
        ) : (
          <span className="text-xs text-muted-foreground">No trades</span>
        )}
      </div>
    </div>
  );
};
