import { Trade } from "@/types/trade";
import { startOfWeek, endOfWeek, format, parseISO, isWithinInterval } from "date-fns";

export interface WeeklyReportData {
  weekLabel: string; // "Feb 24 – Mar 2, 2026"
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  breakevenTrades: number;
  winRate: string;
  netPnL: number;
  grossProfit: number;
  grossLoss: number;
  avgWin: number;
  avgLoss: number;
  profitFactor: string;
  bestTrade: { pair: string; profit: number } | null;
  worstTrade: { pair: string; profit: number } | null;
  bestDay: { date: string; profit: number } | null;
  worstDay: { date: string; profit: number } | null;
  topPair: { pair: string; trades: number; pnl: number } | null;
  totalFees: number;
  currentStreak: { count: number; type: "win" | "loss" | "none" };
  challengeName: string;
}

/**
 * Get trades from the last full week (Mon–Sun) relative to the given date.
 */
export function getLastWeekTrades(trades: Trade[], referenceDate: Date = new Date()): Trade[] {
  // Last week = the full Mon-Sun before the current week
  const lastWeekEnd = startOfWeek(referenceDate, { weekStartsOn: 1 });
  lastWeekEnd.setDate(lastWeekEnd.getDate() - 1); // Sunday of last week
  lastWeekEnd.setHours(23, 59, 59, 999);

  const lastWeekStart = startOfWeek(lastWeekEnd, { weekStartsOn: 1 });
  lastWeekStart.setHours(0, 0, 0, 0);

  return trades.filter((t) => {
    try {
      const d = parseISO(t.date);
      return isWithinInterval(d, { start: lastWeekStart, end: lastWeekEnd });
    } catch {
      return false;
    }
  });
}

/**
 * Generate full weekly report data from trades.
 */
export function generateWeeklyReport(
  allTrades: Trade[],
  challengeName: string,
  referenceDate: Date = new Date()
): WeeklyReportData {
  const trades = getLastWeekTrades(allTrades, referenceDate);

  // Week label
  const lastWeekEnd = startOfWeek(referenceDate, { weekStartsOn: 1 });
  lastWeekEnd.setDate(lastWeekEnd.getDate() - 1);
  const lastWeekStart = startOfWeek(lastWeekEnd, { weekStartsOn: 1 });
  const weekLabel = `${format(lastWeekStart, "MMM d")} – ${format(lastWeekEnd, "MMM d, yyyy")}`;

  const wins = trades.filter((t) => t.profit > 0);
  const losses = trades.filter((t) => t.profit < 0);
  const breakeven = trades.filter((t) => t.profit === 0);
  const netPnL = trades.reduce((s, t) => s + t.profit, 0);
  const grossProfit = wins.reduce((s, t) => s + t.profit, 0);
  const grossLoss = Math.abs(losses.reduce((s, t) => s + t.profit, 0));
  const totalFees = trades.reduce((s, t) => s + (t.fees || 0), 0);

  // Best/worst trade
  const bestTrade = wins.length > 0 ? wins.reduce((a, b) => (b.profit > a.profit ? b : a)) : null;
  const worstTrade = losses.length > 0 ? losses.reduce((a, b) => (b.profit < a.profit ? b : a)) : null;

  // Day aggregation
  const dayMap = new Map<string, number>();
  trades.forEach((t) => dayMap.set(t.date, (dayMap.get(t.date) || 0) + t.profit));
  let bestDay: { date: string; profit: number } | null = null;
  let worstDay: { date: string; profit: number } | null = null;
  dayMap.forEach((profit, date) => {
    if (!bestDay || profit > bestDay.profit) bestDay = { date, profit };
    if (!worstDay || profit < worstDay.profit) worstDay = { date, profit };
  });

  // Top pair
  const pairMap = new Map<string, { trades: number; pnl: number }>();
  trades.forEach((t) => {
    const cur = pairMap.get(t.pair) || { trades: 0, pnl: 0 };
    pairMap.set(t.pair, { trades: cur.trades + 1, pnl: cur.pnl + t.profit });
  });
  let topPair: { pair: string; trades: number; pnl: number } | null = null;
  pairMap.forEach((val, pair) => {
    if (!topPair || val.trades > topPair.trades) topPair = { pair, ...val };
  });

  // Current streak (end of week)
  const sorted = [...trades].sort((a, b) => a.date.localeCompare(b.date));
  let streakCount = 0;
  let streakType: "win" | "loss" | "none" = "none";
  for (let i = sorted.length - 1; i >= 0; i--) {
    const r = sorted[i].profit > 0 ? "win" : sorted[i].profit < 0 ? "loss" : "none";
    if (r === "none") continue;
    if (streakType === "none") {
      streakType = r;
      streakCount = 1;
    } else if (r === streakType) {
      streakCount++;
    } else {
      break;
    }
  }

  return {
    weekLabel,
    totalTrades: trades.length,
    winningTrades: wins.length,
    losingTrades: losses.length,
    breakevenTrades: breakeven.length,
    winRate: trades.length > 0 ? ((wins.length / trades.length) * 100).toFixed(0) : "0",
    netPnL,
    grossProfit,
    grossLoss,
    avgWin: wins.length > 0 ? grossProfit / wins.length : 0,
    avgLoss: losses.length > 0 ? grossLoss / losses.length : 0,
    profitFactor: grossLoss > 0 ? (grossProfit / grossLoss).toFixed(2) : grossProfit > 0 ? "∞" : "0",
    bestTrade: bestTrade ? { pair: bestTrade.pair, profit: bestTrade.profit } : null,
    worstTrade: worstTrade ? { pair: worstTrade.pair, profit: worstTrade.profit } : null,
    bestDay,
    worstDay,
    topPair,
    totalFees,
    currentStreak: { count: streakCount, type: streakType },
    challengeName,
  };
}

/**
 * Format the weekly report as an HTML Telegram message.
 */
export function formatWeeklyReportTelegram(r: WeeklyReportData): string {
  if (r.totalTrades === 0) {
    return [
      `📊 <b>Weekly Report — ${r.weekLabel}</b>`,
      `Challenge: ${r.challengeName}`,
      ``,
      `No trades taken this week.`,
      `Take some rest and come back stronger! 💪`,
    ].join("\n");
  }

  const pnlEmoji = r.netPnL >= 0 ? "🟢" : "🔴";
  const pnlSign = r.netPnL >= 0 ? "+" : "";
  const fmtUsd = (n: number) => `$${Math.abs(n).toFixed(2)}`;

  const lines = [
    `📊 <b>Weekly Report — ${r.weekLabel}</b>`,
    `📁 ${r.challengeName}`,
    ``,
    `${pnlEmoji} <b>Net P&L: ${pnlSign}${fmtUsd(r.netPnL)}</b>`,
    `📈 Gross Profit: +${fmtUsd(r.grossProfit)}`,
    `📉 Gross Loss: -${fmtUsd(r.grossLoss)}`,
    `💰 Fees: -${fmtUsd(r.totalFees)}`,
    ``,
    `🎯 <b>Stats</b>`,
    `• Trades: ${r.totalTrades} (${r.winningTrades}W / ${r.losingTrades}L / ${r.breakevenTrades}BE)`,
    `• Win Rate: ${r.winRate}%`,
    `• Profit Factor: ${r.profitFactor}`,
    `• Avg Win: +${fmtUsd(r.avgWin)} | Avg Loss: -${fmtUsd(r.avgLoss)}`,
  ];

  if (r.bestTrade) lines.push(`• Best Trade: ${r.bestTrade.pair} +${fmtUsd(r.bestTrade.profit)}`);
  if (r.worstTrade) lines.push(`• Worst Trade: ${r.worstTrade.pair} -${fmtUsd(r.worstTrade.profit)}`);

  if (r.bestDay) {
    lines.push(``);
    lines.push(`📅 <b>Days</b>`);
    lines.push(`• Best: ${r.bestDay.date} → +${fmtUsd(r.bestDay.profit)}`);
    if (r.worstDay && r.worstDay.profit < 0) {
      lines.push(`• Worst: ${r.worstDay.date} → -${fmtUsd(r.worstDay.profit)}`);
    }
  }

  if (r.topPair) {
    lines.push(``);
    lines.push(`🏆 Most traded: <b>${r.topPair.pair}</b> (${r.topPair.trades} trades, ${r.topPair.pnl >= 0 ? "+" : ""}${fmtUsd(r.topPair.pnl)})`);
  }

  if (r.currentStreak.count > 0) {
    const emoji = r.currentStreak.type === "win" ? "🔥" : "❄️";
    lines.push(`${emoji} Streak: ${r.currentStreak.count}${r.currentStreak.type === "win" ? "W" : "L"}`);
  }

  lines.push(``);
  lines.push(`— Tradeify 📋`);

  return lines.join("\n");
}
