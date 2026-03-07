import { useMemo } from "react";
import { Trade } from "@/types/trade";
import { cn } from "@/lib/utils";
import {
  Trophy,
  Flame,
  Target,
  Shield,
  TrendingUp,
  Star,
  Zap,
  Crown,
  Medal,
  Gem,
  Heart,
  Rocket,
  Eye,
  Calendar,
  BarChart3,
  Brain,
  Lock,
} from "lucide-react";

// ─── Badge definitions ─────────────────────────────────────────────────

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  color: string;        // tailwind text color
  bgColor: string;      // tailwind bg color
  check: (ctx: BadgeContext) => boolean;
  tier?: "bronze" | "silver" | "gold" | "diamond";
}

interface BadgeContext {
  allTrades: Trade[];
  totalChallenges: number;
  totalNotes: number;
  totalJournals: number;
  totalChecklists: number;
}

function getStreaks(trades: Trade[]): { maxWin: number; maxLoss: number; current: number; currentType: "win" | "loss" | "none" } {
  const sorted = [...trades].sort((a, b) => a.date.localeCompare(b.date));
  let maxWin = 0, maxLoss = 0, curWin = 0, curLoss = 0;
  sorted.forEach((t) => {
    if (t.profit > 0) { curWin++; curLoss = 0; maxWin = Math.max(maxWin, curWin); }
    else if (t.profit < 0) { curLoss++; curWin = 0; maxLoss = Math.max(maxLoss, curLoss); }
    else { curWin = 0; curLoss = 0; }
  });
  return {
    maxWin,
    maxLoss,
    current: curWin > 0 ? curWin : curLoss,
    currentType: curWin > 0 ? "win" : curLoss > 0 ? "loss" : "none",
  };
}

function getWeeklyPnL(trades: Trade[]): Map<string, number> {
  const weekMap = new Map<string, number>();
  trades.forEach((t) => {
    const d = new Date(t.date);
    const year = d.getFullYear();
    const jan1 = new Date(year, 0, 1);
    const weekNum = Math.ceil(((d.getTime() - jan1.getTime()) / 86400000 + jan1.getDay() + 1) / 7);
    const key = `${year}-W${weekNum}`;
    weekMap.set(key, (weekMap.get(key) || 0) + t.profit);
  });
  return weekMap;
}

function getMonthlyPnL(trades: Trade[]): Map<string, number> {
  const monthMap = new Map<string, number>();
  trades.forEach((t) => {
    const key = t.date.slice(0, 7); // YYYY-MM
    monthMap.set(key, (monthMap.get(key) || 0) + t.profit);
  });
  return monthMap;
}

function getDailyPnL(trades: Trade[]): Map<string, number> {
  const dayMap = new Map<string, number>();
  trades.forEach((t) => {
    dayMap.set(t.date, (dayMap.get(t.date) || 0) + t.profit);
  });
  return dayMap;
}

function getUniquePairs(trades: Trade[]): Set<string> {
  return new Set(trades.map((t) => t.pair));
}

function getTradeDaysCount(trades: Trade[]): number {
  return new Set(trades.map((t) => t.date)).size;
}

function getCalmTradeCount(trades: Trade[]): number {
  return trades.filter((t) => t.emotion === "Calm" || t.emotion === "Confident" || t.emotion === "Neutral").length;
}

const BADGES: Badge[] = [
  // ─── Milestone badges ───────────────────────────────────
  {
    id: "first_trade",
    name: "First Blood",
    description: "Log your very first trade",
    icon: Zap,
    color: "text-amber-400",
    bgColor: "bg-amber-400/10",
    tier: "bronze",
    check: (ctx) => ctx.allTrades.length >= 1,
  },
  {
    id: "ten_trades",
    name: "Getting Started",
    description: "Log 10 trades",
    icon: Target,
    color: "text-blue-400",
    bgColor: "bg-blue-400/10",
    tier: "bronze",
    check: (ctx) => ctx.allTrades.length >= 10,
  },
  {
    id: "fifty_trades",
    name: "Committed",
    description: "Log 50 trades",
    icon: Medal,
    color: "text-violet-400",
    bgColor: "bg-violet-400/10",
    tier: "silver",
    check: (ctx) => ctx.allTrades.length >= 50,
  },
  {
    id: "hundred_trades",
    name: "Centurion",
    description: "Log 100 trades",
    icon: Crown,
    color: "text-amber-500",
    bgColor: "bg-amber-500/10",
    tier: "gold",
    check: (ctx) => ctx.allTrades.length >= 100,
  },
  {
    id: "five_hundred_trades",
    name: "Trading Machine",
    description: "Log 500 trades",
    icon: Gem,
    color: "text-cyan-300",
    bgColor: "bg-cyan-300/10",
    tier: "diamond",
    check: (ctx) => ctx.allTrades.length >= 500,
  },

  // ─── Streak badges ─────────────────────────────────────
  {
    id: "three_win_streak",
    name: "Hat Trick",
    description: "Achieve a 3 trade win streak",
    icon: Flame,
    color: "text-orange-400",
    bgColor: "bg-orange-400/10",
    tier: "bronze",
    check: (ctx) => getStreaks(ctx.allTrades).maxWin >= 3,
  },
  {
    id: "five_win_streak",
    name: "On Fire",
    description: "Achieve a 5 trade win streak",
    icon: Flame,
    color: "text-orange-500",
    bgColor: "bg-orange-500/10",
    tier: "silver",
    check: (ctx) => getStreaks(ctx.allTrades).maxWin >= 5,
  },
  {
    id: "ten_win_streak",
    name: "Unstoppable",
    description: "Achieve a 10 trade win streak",
    icon: Flame,
    color: "text-red-500",
    bgColor: "bg-red-500/10",
    tier: "gold",
    check: (ctx) => getStreaks(ctx.allTrades).maxWin >= 10,
  },

  // ─── Profit badges ────────────────────────────────────
  {
    id: "first_green_day",
    name: "Green Day",
    description: "Finish a trading day in profit",
    icon: TrendingUp,
    color: "text-emerald-400",
    bgColor: "bg-emerald-400/10",
    tier: "bronze",
    check: (ctx) => [...getDailyPnL(ctx.allTrades).values()].some((v) => v > 0),
  },
  {
    id: "first_green_week",
    name: "Green Week",
    description: "Finish a trading week in profit",
    icon: TrendingUp,
    color: "text-emerald-500",
    bgColor: "bg-emerald-500/10",
    tier: "silver",
    check: (ctx) => [...getWeeklyPnL(ctx.allTrades).values()].some((v) => v > 0),
  },
  {
    id: "first_green_month",
    name: "Green Month",
    description: "Finish a trading month in profit",
    icon: Star,
    color: "text-yellow-400",
    bgColor: "bg-yellow-400/10",
    tier: "gold",
    check: (ctx) => [...getMonthlyPnL(ctx.allTrades).values()].some((v) => v > 0),
  },
  {
    id: "three_green_months",
    name: "Consistency King",
    description: "Finish 3 months in profit",
    icon: Crown,
    color: "text-yellow-500",
    bgColor: "bg-yellow-500/10",
    tier: "diamond",
    check: (ctx) => [...getMonthlyPnL(ctx.allTrades).values()].filter((v) => v > 0).length >= 3,
  },

  // ─── Win rate badges ──────────────────────────────────
  {
    id: "sixty_pct_wr",
    name: "Sharp Shooter",
    description: "Achieve 60%+ win rate (min 20 trades)",
    icon: Target,
    color: "text-sky-400",
    bgColor: "bg-sky-400/10",
    tier: "silver",
    check: (ctx) => {
      if (ctx.allTrades.length < 20) return false;
      const wins = ctx.allTrades.filter((t) => t.profit > 0).length;
      return (wins / ctx.allTrades.length) >= 0.6;
    },
  },
  {
    id: "seventy_pct_wr",
    name: "Sniper",
    description: "Achieve 70%+ win rate (min 30 trades)",
    icon: Target,
    color: "text-indigo-400",
    bgColor: "bg-indigo-400/10",
    tier: "gold",
    check: (ctx) => {
      if (ctx.allTrades.length < 30) return false;
      const wins = ctx.allTrades.filter((t) => t.profit > 0).length;
      return (wins / ctx.allTrades.length) >= 0.7;
    },
  },

  // ─── Discipline & psychology badges ───────────────────
  {
    id: "calm_trader_10",
    name: "Zen Trader",
    description: "Log 10 trades with Calm/Confident/Neutral emotion",
    icon: Brain,
    color: "text-teal-400",
    bgColor: "bg-teal-400/10",
    tier: "bronze",
    check: (ctx) => getCalmTradeCount(ctx.allTrades) >= 10,
  },
  {
    id: "calm_trader_50",
    name: "Ice Cold",
    description: "Log 50 trades with Calm/Confident/Neutral emotion",
    icon: Brain,
    color: "text-teal-500",
    bgColor: "bg-teal-500/10",
    tier: "silver",
    check: (ctx) => getCalmTradeCount(ctx.allTrades) >= 50,
  },
  {
    id: "screenshot_master",
    name: "Chart Collector",
    description: "Attach screenshots to 20 trades",
    icon: Eye,
    color: "text-pink-400",
    bgColor: "bg-pink-400/10",
    tier: "silver",
    check: (ctx) => ctx.allTrades.filter((t) => t.screenshotUrl || t.screenshotFileId).length >= 20,
  },

  // ─── Diversity badges ─────────────────────────────────
  {
    id: "five_pairs",
    name: "Diversified",
    description: "Trade 5 different instruments",
    icon: BarChart3,
    color: "text-purple-400",
    bgColor: "bg-purple-400/10",
    tier: "bronze",
    check: (ctx) => getUniquePairs(ctx.allTrades).size >= 5,
  },
  {
    id: "ten_pairs",
    name: "Market Explorer",
    description: "Trade 10 different instruments",
    icon: Rocket,
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
    tier: "silver",
    check: (ctx) => getUniquePairs(ctx.allTrades).size >= 10,
  },

  // ─── Consistency badges ───────────────────────────────
  {
    id: "ten_trading_days",
    name: "Regular",
    description: "Trade on 10 different days",
    icon: Calendar,
    color: "text-lime-400",
    bgColor: "bg-lime-400/10",
    tier: "bronze",
    check: (ctx) => getTradeDaysCount(ctx.allTrades) >= 10,
  },
  {
    id: "fifty_trading_days",
    name: "Dedicated",
    description: "Trade on 50 different days",
    icon: Calendar,
    color: "text-lime-500",
    bgColor: "bg-lime-500/10",
    tier: "silver",
    check: (ctx) => getTradeDaysCount(ctx.allTrades) >= 50,
  },
  {
    id: "hundred_trading_days",
    name: "Veteran",
    description: "Trade on 100 different days",
    icon: Shield,
    color: "text-amber-500",
    bgColor: "bg-amber-500/10",
    tier: "gold",
    check: (ctx) => getTradeDaysCount(ctx.allTrades) >= 100,
  },

  // ─── App usage badges ─────────────────────────────────
  {
    id: "journaler",
    name: "Journaler",
    description: "Write 10 journal entries",
    icon: Heart,
    color: "text-rose-400",
    bgColor: "bg-rose-400/10",
    tier: "bronze",
    check: (ctx) => ctx.totalJournals >= 10,
  },
  {
    id: "note_taker",
    name: "Note Taker",
    description: "Create 10 notes",
    icon: Heart,
    color: "text-rose-500",
    bgColor: "bg-rose-500/10",
    tier: "bronze",
    check: (ctx) => ctx.totalNotes >= 10,
  },
  {
    id: "multi_account",
    name: "Multi Account",
    description: "Create 3 or more trading challenges",
    icon: Trophy,
    color: "text-amber-400",
    bgColor: "bg-amber-400/10",
    tier: "bronze",
    check: (ctx) => ctx.totalChallenges >= 3,
  },

  // ─── Recovery badge ───────────────────────────────────
  {
    id: "comeback_kid",
    name: "Comeback Kid",
    description: "Have a losing day followed by a bigger winning day",
    icon: Rocket,
    color: "text-emerald-400",
    bgColor: "bg-emerald-400/10",
    tier: "silver",
    check: (ctx) => {
      const dailyPnL = [...getDailyPnL(ctx.allTrades).entries()]
        .sort((a, b) => a[0].localeCompare(b[0]));
      for (let i = 1; i < dailyPnL.length; i++) {
        if (dailyPnL[i - 1][1] < 0 && dailyPnL[i][1] > Math.abs(dailyPnL[i - 1][1])) {
          return true;
        }
      }
      return false;
    },
  },
];

const TIER_ORDER = { diamond: 0, gold: 1, silver: 2, bronze: 3 };
const TIER_LABELS: Record<string, string> = { diamond: "💎", gold: "🥇", silver: "🥈", bronze: "🥉" };

// ─── Component ─────────────────────────────────────────────────────────

interface AchievementBadgesProps {
  allTrades: Trade[];
  totalChallenges: number;
  totalNotes: number;
  totalJournals: number;
  totalChecklists: number;
}

export const AchievementBadges = ({
  allTrades,
  totalChallenges,
  totalNotes,
  totalJournals,
  totalChecklists,
}: AchievementBadgesProps) => {
  const { earned, locked } = useMemo(() => {
    const ctx: BadgeContext = { allTrades, totalChallenges, totalNotes, totalJournals, totalChecklists };
    const earnedBadges: Badge[] = [];
    const lockedBadges: Badge[] = [];
    BADGES.forEach((b) => {
      if (b.check(ctx)) earnedBadges.push(b);
      else lockedBadges.push(b);
    });
    // Sort earned: diamond first, then gold, silver, bronze
    earnedBadges.sort((a, b) => (TIER_ORDER[a.tier || "bronze"] ?? 3) - (TIER_ORDER[b.tier || "bronze"] ?? 3));
    lockedBadges.sort((a, b) => (TIER_ORDER[a.tier || "bronze"] ?? 3) - (TIER_ORDER[b.tier || "bronze"] ?? 3));
    return { earned: earnedBadges, locked: lockedBadges };
  }, [allTrades, totalChallenges, totalNotes, totalJournals, totalChecklists]);

  return (
    <div className="space-y-4">
      {/* Progress summary */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          <span className="font-bold text-foreground">{earned.length}</span> / {BADGES.length} unlocked
        </p>
        <div className="flex gap-2 text-xs">
          {(["diamond", "gold", "silver", "bronze"] as const).map((tier) => {
            const count = earned.filter((b) => b.tier === tier).length;
            if (count === 0) return null;
            return (
              <span key={tier} className="flex items-center gap-0.5">
                {TIER_LABELS[tier]} {count}
              </span>
            );
          })}
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-amber-500 via-yellow-400 to-emerald-500 rounded-full transition-all duration-700"
          style={{ width: `${(earned.length / BADGES.length) * 100}%` }}
        />
      </div>

      {/* Earned badges */}
      {earned.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Earned</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {earned.map((badge) => {
              const Icon = badge.icon;
              return (
                <div
                  key={badge.id}
                  className={cn(
                    "group relative flex items-center gap-2.5 p-2.5 rounded-xl border transition-all duration-200",
                    "hover:scale-[1.02] hover:shadow-md cursor-default",
                    badge.bgColor,
                    "border-border/40"
                  )}
                >
                  <div className={cn("p-1.5 rounded-lg", badge.bgColor)}>
                    <Icon className={cn("h-4 w-4", badge.color)} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold truncate flex items-center gap-1">
                      {badge.name}
                      <span className="text-[10px]">{TIER_LABELS[badge.tier || "bronze"]}</span>
                    </p>
                    <p className="text-[10px] text-muted-foreground truncate">{badge.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Locked badges */}
      {locked.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Locked</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {locked.map((badge) => (
              <div
                key={badge.id}
                className="flex items-center gap-2.5 p-2.5 rounded-xl border border-border/20 bg-muted/30 opacity-50 cursor-default"
              >
                <div className="p-1.5 rounded-lg bg-muted/50">
                  <Lock className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold truncate text-muted-foreground flex items-center gap-1">
                    {badge.name}
                    <span className="text-[10px]">{TIER_LABELS[badge.tier || "bronze"]}</span>
                  </p>
                  <p className="text-[10px] text-muted-foreground/70 truncate">{badge.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
