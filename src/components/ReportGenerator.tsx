import { useState } from "react";
import { Trade } from "@/types/trade";
import { useAuth } from "@/hooks/useAuth";
import { sendTelegramNotification } from "@/lib/telegram";
import { format, parseISO, isWithinInterval, differenceInDays } from "date-fns";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CalendarIcon, Send, Loader2, CheckCircle2 } from "lucide-react";
import { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface ReportGeneratorProps {
  trades: Trade[];
  challengeName: string;
  openingBalance: number;
  currencySymbol: string;
}

// ─── Report generation ─────────────────────────────────────────────────

function generateReport(
  trades: Trade[],
  from: Date,
  to: Date,
  challengeName: string,
  openingBalance: number,
  currencySymbol: string
): string {
  // Filter trades in range
  const filtered = trades.filter((t) => {
    try {
      const d = parseISO(t.date);
      return isWithinInterval(d, { start: from, end: to });
    } catch {
      return false;
    }
  });

  const dateLabel = `${format(from, "dd MMM yyyy")} → ${format(to, "dd MMM yyyy")}`;
  const days = differenceInDays(to, from) + 1;

  if (filtered.length === 0) {
    return [
      `📊 <b>Trading Report</b>`,
      `📁 ${challengeName}`,
      `📅 ${dateLabel} (${days} days)`,
      ``,
      `No trades found in this period.`,
    ].join("\n");
  }

  const sym = currencySymbol;
  const fmtVal = (n: number) => `${sym}${Math.abs(n).toFixed(2)}`;
  const fmtSign = (n: number) => `${n >= 0 ? "+" : "-"}${fmtVal(n)}`;

  // Core stats
  const wins = filtered.filter((t) => t.profit > 0);
  const losses = filtered.filter((t) => t.profit < 0);
  const breakeven = filtered.filter((t) => t.profit === 0);
  const netPnL = filtered.reduce((s, t) => s + t.profit, 0);
  const grossProfit = wins.reduce((s, t) => s + t.profit, 0);
  const grossLoss = Math.abs(losses.reduce((s, t) => s + t.profit, 0));
  const totalFees = filtered.reduce((s, t) => s + (t.fees || 0), 0);
  const winRate = ((wins.length / filtered.length) * 100).toFixed(1);
  const profitFactor = grossLoss > 0
    ? (grossProfit / grossLoss).toFixed(2)
    : grossProfit > 0 ? "∞" : "0.00";
  const avgWin = wins.length > 0 ? grossProfit / wins.length : 0;
  const avgLoss = losses.length > 0 ? grossLoss / losses.length : 0;
  const avgTrade = netPnL / filtered.length;
  const expectancy = (wins.length / filtered.length) * avgWin - (losses.length / filtered.length) * avgLoss;

  // Account balance
  const endBalance = openingBalance + netPnL;
  const returnPct = openingBalance > 0 ? ((netPnL / openingBalance) * 100).toFixed(2) : "N/A";

  // Best/worst trade
  const bestTrade = wins.length > 0 ? wins.reduce((a, b) => (b.profit > a.profit ? b : a)) : null;
  const worstTrade = losses.length > 0 ? losses.reduce((a, b) => (b.profit < a.profit ? b : a)) : null;

  // Day aggregation
  const dayMap = new Map<string, number>();
  filtered.forEach((t) => dayMap.set(t.date, (dayMap.get(t.date) || 0) + t.profit));
  const tradingDays = dayMap.size;
  const profitableDays = [...dayMap.values()].filter((v) => v > 0).length;
  let bestDay: { date: string; profit: number } | null = null;
  let worstDay: { date: string; profit: number } | null = null;
  dayMap.forEach((profit, date) => {
    if (!bestDay || profit > bestDay.profit) bestDay = { date, profit };
    if (!worstDay || profit < worstDay.profit) worstDay = { date, profit };
  });

  // Pair breakdown
  const pairMap = new Map<string, { trades: number; pnl: number; wins: number }>();
  filtered.forEach((t) => {
    const cur = pairMap.get(t.pair) || { trades: 0, pnl: 0, wins: 0 };
    pairMap.set(t.pair, {
      trades: cur.trades + 1,
      pnl: cur.pnl + t.profit,
      wins: cur.wins + (t.profit > 0 ? 1 : 0),
    });
  });
  // Sort pairs by trade count
  const sortedPairs = [...pairMap.entries()]
    .sort((a, b) => b[1].trades - a[1].trades)
    .slice(0, 5);

  // Direction breakdown
  const buys = filtered.filter((t) => t.direction === "Buy");
  const sells = filtered.filter((t) => t.direction === "Sell");
  const buyPnL = buys.reduce((s, t) => s + t.profit, 0);
  const sellPnL = sells.reduce((s, t) => s + t.profit, 0);
  const buyWinRate = buys.length > 0
    ? ((buys.filter((t) => t.profit > 0).length / buys.length) * 100).toFixed(0)
    : "0";
  const sellWinRate = sells.length > 0
    ? ((sells.filter((t) => t.profit > 0).length / sells.length) * 100).toFixed(0)
    : "0";

  // Emotion breakdown
  const emotionMap = new Map<string, { count: number; pnl: number }>();
  filtered.forEach((t) => {
    const emo = t.emotion || "Unknown";
    const cur = emotionMap.get(emo) || { count: 0, pnl: 0 };
    emotionMap.set(emo, { count: cur.count + 1, pnl: cur.pnl + t.profit });
  });
  const topEmotions = [...emotionMap.entries()]
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 3);

  // Streak
  const sorted = [...filtered].sort((a, b) => a.date.localeCompare(b.date));
  let maxWinStreak = 0, maxLossStreak = 0, curWin = 0, curLoss = 0;
  sorted.forEach((t) => {
    if (t.profit > 0) { curWin++; curLoss = 0; maxWinStreak = Math.max(maxWinStreak, curWin); }
    else if (t.profit < 0) { curLoss++; curWin = 0; maxLossStreak = Math.max(maxLossStreak, curLoss); }
    else { curWin = 0; curLoss = 0; }
  });

  // Max drawdown
  let peak = 0, maxDD = 0, runningPnL = 0;
  sorted.forEach((t) => {
    runningPnL += t.profit;
    if (runningPnL > peak) peak = runningPnL;
    const dd = peak - runningPnL;
    if (dd > maxDD) maxDD = dd;
  });

  const pnlEmoji = netPnL >= 0 ? "🟢" : "🔴";

  // Build message
  const lines: string[] = [
    `📊 <b>TRADING REPORT</b>`,
    `━━━━━━━━━━━━━━━━━━━━`,
    `📁 ${challengeName}`,
    `📅 ${dateLabel}`,
    `📆 ${days} calendar days · ${tradingDays} trading days`,
    ``,
    `${pnlEmoji} <b>NET P&L: ${fmtSign(netPnL)}</b>`,
    `📈 Return: ${returnPct}%`,
    ``,
    `━━━ 📈 P&L BREAKDOWN ━━━`,
    `• Gross Profit: +${fmtVal(grossProfit)}`,
    `• Gross Loss: -${fmtVal(grossLoss)}`,
    `• Fees Paid: -${fmtVal(totalFees)}`,
    `• Net (after fees): ${fmtSign(netPnL - totalFees)}`,
    ``,
    `━━━ 🎯 PERFORMANCE ━━━`,
    `• Total Trades: ${filtered.length}`,
    `• Wins: ${wins.length} | Losses: ${losses.length} | BE: ${breakeven.length}`,
    `• Win Rate: ${winRate}%`,
    `• Profit Factor: ${profitFactor}`,
    `• Avg Win: +${fmtVal(avgWin)}`,
    `• Avg Loss: -${fmtVal(avgLoss)}`,
    `• Avg Trade: ${fmtSign(avgTrade)}`,
    `• Expectancy: ${fmtSign(expectancy)}`,
    ``,
    `━━━ 💰 ACCOUNT ━━━`,
    `• Opening Balance: ${fmtVal(openingBalance)}`,
    `• Closing Balance: ${fmtVal(endBalance)}`,
    `• Max Drawdown: -${fmtVal(maxDD)}`,
    ``,
    `━━━ 📅 DAILY STATS ━━━`,
    `• Trading Days: ${tradingDays}`,
    `• Profitable Days: ${profitableDays}/${tradingDays} (${tradingDays > 0 ? ((profitableDays / tradingDays) * 100).toFixed(0) : 0}%)`,
    `• Avg P&L/Day: ${fmtSign(netPnL / (tradingDays || 1))}`,
  ];

  if (bestDay) lines.push(`• Best Day: ${bestDay.date} → +${fmtVal(bestDay.profit)}`);
  if (worstDay && worstDay.profit < 0) lines.push(`• Worst Day: ${worstDay.date} → -${fmtVal(worstDay.profit)}`);

  lines.push(``);
  lines.push(`━━━ 🏆 HIGHLIGHTS ━━━`);
  if (bestTrade) lines.push(`• Best Trade: ${bestTrade.pair} ${bestTrade.direction} → +${fmtVal(bestTrade.profit)}`);
  if (worstTrade) lines.push(`• Worst Trade: ${worstTrade.pair} ${worstTrade.direction} → -${fmtVal(worstTrade.profit)}`);
  lines.push(`• Max Win Streak: ${maxWinStreak} 🔥`);
  lines.push(`• Max Loss Streak: ${maxLossStreak} ❄️`);

  lines.push(``);
  lines.push(`━━━ ↕️ DIRECTION ━━━`);
  lines.push(`• Buys: ${buys.length} trades (${buyWinRate}% WR) → ${fmtSign(buyPnL)}`);
  lines.push(`• Sells: ${sells.length} trades (${sellWinRate}% WR) → ${fmtSign(sellPnL)}`);

  if (sortedPairs.length > 0) {
    lines.push(``);
    lines.push(`━━━ 📊 TOP PAIRS ━━━`);
    sortedPairs.forEach(([pair, data]) => {
      const wr = ((data.wins / data.trades) * 100).toFixed(0);
      lines.push(`• ${pair}: ${data.trades} trades (${wr}% WR) → ${fmtSign(data.pnl)}`);
    });
  }

  if (topEmotions.length > 0 && !(topEmotions.length === 1 && topEmotions[0][0] === "Unknown")) {
    lines.push(``);
    lines.push(`━━━ 🧠 EMOTIONS ━━━`);
    topEmotions.forEach(([emo, data]) => {
      if (emo === "Unknown") return;
      lines.push(`• ${emo}: ${data.count} trades → ${fmtSign(data.pnl)}`);
    });
  }

  lines.push(``);
  lines.push(`— Tradeify 📋`);

  return lines.join("\n");
}

// ─── Component ─────────────────────────────────────────────────────────

export const ReportGenerator = ({
  trades,
  challengeName,
  openingBalance,
  currencySymbol,
}: ReportGeneratorProps) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  const canSend = dateRange?.from && dateRange?.to;

  const handleGenerate = () => {
    if (!dateRange?.from || !dateRange?.to) return;
    const report = generateReport(
      trades,
      dateRange.from,
      dateRange.to,
      challengeName,
      openingBalance,
      currencySymbol
    );
    setPreview(report);
    setSent(false);
  };

  const handleSend = async () => {
    if (!user || !preview) return;
    setSending(true);
    try {
      const ok = await sendTelegramNotification(user.uid, preview);
      if (ok) {
        toast.success("Report sent to Telegram!");
        setSent(true);
      } else {
        toast.error("Failed to send. Check your Telegram settings in Profile.");
      }
    } catch {
      toast.error("Failed to send report.");
    } finally {
      setSending(false);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setPreview(null);
    setSent(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); else setOpen(true); }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Send className="h-4 w-4" />
          Report
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Generate Report
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Date Range Picker */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Select Date Range</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !dateRange && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange?.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, "dd MMM yyyy")} — {format(dateRange.to, "dd MMM yyyy")}
                      </>
                    ) : (
                      format(dateRange.from, "dd MMM yyyy")
                    )
                  ) : (
                    "Pick a date range"
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={dateRange?.from}
                  selected={dateRange}
                  onSelect={(range) => {
                    setDateRange(range);
                    setPreview(null);
                    setSent(false);
                  }}
                  numberOfMonths={1}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Quick Presets */}
          <div className="flex flex-wrap gap-2">
            {[
              { label: "This Week", getDates: () => {
                const now = new Date();
                const day = now.getDay();
                const mon = new Date(now);
                mon.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
                mon.setHours(0,0,0,0);
                return { from: mon, to: now };
              }},
              { label: "Last Week", getDates: () => {
                const now = new Date();
                const day = now.getDay();
                const thisMon = new Date(now);
                thisMon.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
                const lastSun = new Date(thisMon);
                lastSun.setDate(thisMon.getDate() - 1);
                lastSun.setHours(23,59,59,999);
                const lastMon = new Date(lastSun);
                lastMon.setDate(lastSun.getDate() - 6);
                lastMon.setHours(0,0,0,0);
                return { from: lastMon, to: lastSun };
              }},
              { label: "This Month", getDates: () => {
                const now = new Date();
                const first = new Date(now.getFullYear(), now.getMonth(), 1);
                return { from: first, to: now };
              }},
              { label: "Last Month", getDates: () => {
                const now = new Date();
                const first = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                const last = new Date(now.getFullYear(), now.getMonth(), 0);
                return { from: first, to: last };
              }},
              { label: "All Time", getDates: () => {
                if (trades.length === 0) return { from: new Date(), to: new Date() };
                const sorted = [...trades].sort((a, b) => a.date.localeCompare(b.date));
                return { from: parseISO(sorted[0].date), to: parseISO(sorted[sorted.length - 1].date) };
              }},
            ].map((preset) => (
              <Button
                key={preset.label}
                variant="ghost"
                size="sm"
                className="text-xs h-7 px-2.5 rounded-full border border-border/50"
                onClick={() => {
                  const d = preset.getDates();
                  setDateRange(d);
                  setPreview(null);
                  setSent(false);
                }}
              >
                {preset.label}
              </Button>
            ))}
          </div>

          {/* Generate Button */}
          <Button
            onClick={handleGenerate}
            disabled={!canSend}
            className="w-full"
          >
            Generate Preview
          </Button>

          {/* Preview */}
          {preview && (
            <div className="space-y-3">
              <div className="bg-muted/50 rounded-xl border border-border/50 p-3 max-h-[300px] overflow-y-auto">
                <pre className="text-xs whitespace-pre-wrap font-mono leading-relaxed text-foreground/90">
                  {preview.replace(/<\/?b>/g, "").replace(/<\/?i>/g, "")}
                </pre>
              </div>

              <Button
                onClick={handleSend}
                disabled={sending || sent}
                className="w-full gap-2"
                variant={sent ? "outline" : "default"}
              >
                {sending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : sent ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-profit" />
                    Sent to Telegram!
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Send to Telegram
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
