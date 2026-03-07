import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { Trade } from "@/types/trade";
import {
  startOfMonth,
  eachDayOfInterval,
  format,
  getDay,
  isToday,
  parseISO,
  startOfWeek,
} from "date-fns";

interface TradingHeatmapProps {
  trades: Trade[];
}

// Weekday indices: 0=Sun,1=Mon … 6=Sat
const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri"];
const WEEKDAY_INDICES = [1, 2, 3, 4, 5]; // Mon-Fri

export const TradingHeatmap = ({ trades }: TradingHeatmapProps) => {
  const { dailyPnL, weeks, monthLabels, maxAbsPnL, rangeLabel } = useMemo(() => {
    if (trades.length === 0)
      return { dailyPnL: new Map(), weeks: [] as (Date | null)[][], monthLabels: [] as { label: string; col: number }[], maxAbsPnL: 1, rangeLabel: "" };

    // Group trades by date
    const pnlMap = new Map<string, number>();
    trades.forEach((t) => {
      pnlMap.set(t.date, (pnlMap.get(t.date) || 0) + t.profit);
    });

    // Date range: start of earliest trade's month → today
    const sortedDates = [...pnlMap.keys()].sort();
    const firstDate = parseISO(sortedDates[0]);
    const end = new Date();
    const start = startOfMonth(firstDate);

    const allDays = eachDayOfInterval({ start, end });

    // Build week columns (Mon-Fri only)
    // First, find the Sunday that starts the week containing `start`
    const weekStart = startOfWeek(start, { weekStartsOn: 0 }); // Sunday

    // Group all days by their week (Sun-based) then pick Mon-Fri
    const weekMap = new Map<string, (Date | null)[]>(); // weekKey → [Mon,Tue,Wed,Thu,Fri]
    allDays.forEach((d) => {
      const ws = startOfWeek(d, { weekStartsOn: 0 });
      const key = format(ws, "yyyy-MM-dd");
      if (!weekMap.has(key)) weekMap.set(key, [null, null, null, null, null]);
      const dow = getDay(d); // 0=Sun
      const idx = dow - 1; // Mon=0, Tue=1... Fri=4
      if (idx >= 0 && idx <= 4) {
        weekMap.get(key)![idx] = d;
      }
    });

    // Sort weeks chronologically
    const sortedWeeks = [...weekMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, days]) => days);

    // Max absolute PnL for color scaling
    let maxAbs = 0;
    pnlMap.forEach((v) => {
      if (Math.abs(v) > maxAbs) maxAbs = Math.abs(v);
    });

    // Month labels — find first occurrence of each month in the grid
    const labels: { label: string; col: number }[] = [];
    let lastMonth = -1;
    sortedWeeks.forEach((week, colIdx) => {
      for (const d of week) {
        if (!d) continue;
        const month = d.getMonth();
        if (month !== lastMonth) {
          labels.push({ label: format(d, "MMM"), col: colIdx });
          lastMonth = month;
          break;
        }
      }
    });

    const label = format(start, "MMM") === format(end, "MMM")
      ? format(start, "MMM yyyy")
      : `${format(start, "MMM")} — ${format(end, "MMM yyyy")}`;

    return {
      dailyPnL: pnlMap,
      weeks: sortedWeeks,
      monthLabels: labels,
      maxAbsPnL: maxAbs || 1,
      rangeLabel: label,
    };
  }, [trades]);

  const getCellColor = (date: Date | null) => {
    if (!date) return "bg-transparent";
    const key = format(date, "yyyy-MM-dd");
    const pnl = dailyPnL.get(key);
    if (pnl === undefined) return "bg-muted/8";

    const intensity = Math.min(Math.abs(pnl) / maxAbsPnL, 1);

    if (pnl > 0) {
      if (intensity > 0.7) return "bg-profit/70";
      if (intensity > 0.4) return "bg-profit/45";
      if (intensity > 0.15) return "bg-profit/25";
      return "bg-profit/12";
    }
    if (pnl < 0) {
      if (intensity > 0.7) return "bg-loss/70";
      if (intensity > 0.4) return "bg-loss/45";
      if (intensity > 0.15) return "bg-loss/25";
      return "bg-loss/12";
    }
    return "bg-breakeven/20";
  };

  const getTooltip = (date: Date | null) => {
    if (!date) return "";
    const key = format(date, "yyyy-MM-dd");
    const pnl = dailyPnL.get(key);
    if (pnl === undefined) return `${format(date, "EEE, MMM d")} — No trades`;
    return `${format(date, "EEE, MMM d")} — ${pnl >= 0 ? "+" : ""}$${pnl.toFixed(2)}`;
  };

  // Summary stats
  const tradingDays = Array.from(dailyPnL.entries());
  const profitDays = tradingDays.filter(([, v]) => v > 0).length;
  const lossDays = tradingDays.filter(([, v]) => v < 0).length;
  const breakEvenDays = tradingDays.filter(([, v]) => v === 0).length;

  const CELL = 11; // px — GitHub size
  const GAP = 3;   // px

  return (
    <div className="bg-card/80 backdrop-blur-sm rounded-2xl p-4 sm:p-6 border border-border/50 shadow-lg animate-fade-in mb-6 sm:mb-8">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm sm:text-base font-semibold text-foreground/80">
          Trading Activity — {rangeLabel}
        </h3>
        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-sm bg-profit/50" /> {profitDays} profit
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-sm bg-loss/50" /> {lossDays} loss
          </span>
          {breakEvenDays > 0 && (
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-sm bg-breakeven/30" /> {breakEvenDays} BE
            </span>
          )}
        </div>
      </div>

      <div className="overflow-x-auto pb-1">
        <div style={{ minWidth: Math.max(300, weeks.length * (CELL + GAP) + 32) }}>
          {/* Month labels */}
          <div className="flex mb-1" style={{ paddingLeft: 32 }}>
            <div className="flex-1 relative" style={{ height: 14 }}>
              {monthLabels.map((m, i) => (
                <span
                  key={i}
                  className="absolute text-[10px] font-medium text-muted-foreground"
                  style={{ left: m.col * (CELL + GAP) }}
                >
                  {m.label}
                </span>
              ))}
            </div>
          </div>

          {/* Grid */}
          <div className="flex" style={{ gap: GAP }}>
            {/* Day labels — show Mon, Wed, Fri like GitHub */}
            <div className="flex flex-col shrink-0" style={{ width: 28, gap: GAP }}>
              {WEEKDAY_LABELS.map((d, i) => (
                <div
                  key={d}
                  className="flex items-center justify-end pr-1 text-[9px] font-medium text-muted-foreground"
                  style={{ height: CELL }}
                >
                  {i % 2 === 0 ? d : ""}
                </div>
              ))}
            </div>

            {/* Week columns */}
            {weeks.map((week, wi) => (
              <div key={wi} className="flex flex-col" style={{ gap: GAP }}>
                {week.map((day, di) => (
                  <div
                    key={di}
                    className={cn(
                      "rounded-[2px] transition-colors cursor-default",
                      getCellColor(day),
                      day && isToday(day) && "ring-1 ring-primary ring-offset-1 ring-offset-background"
                    )}
                    style={{ width: CELL, height: CELL }}
                    title={getTooltip(day)}
                  />
                ))}
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="flex items-center justify-end gap-1 mt-3 text-[9px] text-muted-foreground">
            <span>Loss</span>
            {["bg-loss/70", "bg-loss/35", "bg-muted/15", "bg-profit/35", "bg-profit/70"].map((c, i) => (
              <div key={i} className={cn("rounded-[2px]", c)} style={{ width: CELL, height: CELL }} />
            ))}
            <span>Profit</span>
          </div>
        </div>
      </div>
    </div>
  );
};
