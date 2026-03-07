import { useState, useEffect, useCallback } from "react";
import { ref, get, set } from "firebase/database";
import { db } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import { Trade } from "@/types/trade";

export interface TradingRules {
  maxTradesPerDay: number; // 0 = unlimited
  maxLossPerDay: number; // 0 = unlimited (dollar amount)
  stopAfterConsecutiveLosses: number; // 0 = disabled
  enabled: boolean;
}

export const DEFAULT_RULES: TradingRules = {
  maxTradesPerDay: 1,
  maxLossPerDay: 0,
  stopAfterConsecutiveLosses: 0,
  enabled: true,
};

export interface RuleViolation {
  rule: string;
  message: string;
}

/**
 * Check trading rules against today's trades
 */
export const checkRules = (
  rules: TradingRules,
  todayTrades: Trade[],
  tradeDate: string // "YYYY-MM-DD"
): RuleViolation[] => {
  if (!rules.enabled) return [];

  const violations: RuleViolation[] = [];
  const dateTrades = todayTrades.filter((t) => t.date === tradeDate);

  // Max trades per day
  if (rules.maxTradesPerDay > 0 && dateTrades.length >= rules.maxTradesPerDay) {
    violations.push({
      rule: "Max Trades/Day",
      message: `You've already taken ${dateTrades.length} trade${dateTrades.length !== 1 ? "s" : ""} today (limit: ${rules.maxTradesPerDay})`,
    });
  }

  // Max loss per day
  if (rules.maxLossPerDay > 0) {
    const dayLoss = dateTrades.reduce((sum, t) => sum + t.profit, 0);
    if (dayLoss <= -rules.maxLossPerDay) {
      violations.push({
        rule: "Max Loss/Day",
        message: `Daily loss is $${Math.abs(dayLoss).toFixed(2)} (limit: $${rules.maxLossPerDay})`,
      });
    }
  }

  // Stop after consecutive losses
  if (rules.stopAfterConsecutiveLosses > 0 && dateTrades.length > 0) {
    // Count consecutive losses from the end
    let consecutiveLosses = 0;
    for (let i = dateTrades.length - 1; i >= 0; i--) {
      if (dateTrades[i].profit < 0) consecutiveLosses++;
      else break;
    }
    if (consecutiveLosses >= rules.stopAfterConsecutiveLosses) {
      violations.push({
        rule: "Consecutive Losses",
        message: `You've lost ${consecutiveLosses} trade${consecutiveLosses !== 1 ? "s" : ""} in a row (limit: ${rules.stopAfterConsecutiveLosses})`,
      });
    }
  }

  return violations;
};

export const useTradingRules = () => {
  const { user } = useAuth();
  const [rules, setRules] = useState<TradingRules>(DEFAULT_RULES);
  const [loaded, setLoaded] = useState(false);

  // Load rules from Firebase
  useEffect(() => {
    if (!user) return;
    const load = async () => {
      try {
        const snap = await get(ref(db, `users/${user.uid}/tradingRules`));
        if (snap.exists()) {
          setRules({ ...DEFAULT_RULES, ...snap.val() });
        }
      } catch {
        // Use defaults
      } finally {
        setLoaded(true);
      }
    };
    load();
  }, [user]);

  const saveRules = useCallback(
    async (newRules: TradingRules) => {
      if (!user) return;
      try {
        await set(ref(db, `users/${user.uid}/tradingRules`), newRules);
        setRules(newRules);
      } catch {
        throw new Error("Failed to save rules");
      }
    },
    [user]
  );

  return { rules, saveRules, loaded };
};
