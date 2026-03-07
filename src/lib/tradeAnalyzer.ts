import { Trade, TRADE_EMOTIONS } from "@/types/trade";

export interface TradeInsight {
  id: string;
  type: 'warning' | 'positive' | 'tip';
  title: string;
  body: string;
  priority: number;
}

export function analyzeTrades(trades: Trade[]): TradeInsight[] {
  if (trades.length < 5) return [];

  const insights: TradeInsight[] = [];

  const winners = trades.filter(t => t.profit > 0);
  const losers = trades.filter(t => t.profit < 0);
  const winRate = winners.length / trades.length;
  const avgWin = winners.length > 0 ? winners.reduce((s, t) => s + t.profit, 0) / winners.length : 0;
  const avgLoss = losers.length > 0 ? Math.abs(losers.reduce((s, t) => s + t.profit, 0) / losers.length) : 0;
  const totalFees = trades.reduce((s, t) => s + (t.fees || 0), 0);
  const grossProfit = winners.reduce((s, t) => s + t.profit, 0);

  // --- Win rate ---
  if (winRate < 0.4) {
    insights.push({
      id: 'low-win-rate',
      type: 'warning',
      title: 'Low win rate',
      body: `Your win rate is ${(winRate * 100).toFixed(0)}% across ${trades.length} trades. Review your entry criteria — you may be entering too early, chasing setups, or trading against the trend.`,
      priority: 90,
    });
  } else if (winRate >= 0.65) {
    insights.push({
      id: 'high-win-rate',
      type: 'positive',
      title: 'Strong win rate',
      body: `You're winning ${(winRate * 100).toFixed(0)}% of your trades across ${trades.length} setups. Your entry criteria appear well-defined and consistent.`,
      priority: 30,
    });
  }

  // --- Risk/Reward ---
  if (avgLoss > 0 && avgWin > 0) {
    const rrRatio = avgWin / avgLoss;
    if (rrRatio < 0.8) {
      insights.push({
        id: 'bad-rr',
        type: 'warning',
        title: 'Losses bigger than wins',
        body: `Your average win ($${avgWin.toFixed(2)}) is smaller than your average loss ($${avgLoss.toFixed(2)}). Even a decent win rate won't save you long-term. Let winners run further or tighten your stops.`,
        priority: 95,
      });
    } else if (rrRatio >= 2) {
      insights.push({
        id: 'great-rr',
        type: 'positive',
        title: 'Excellent risk/reward',
        body: `Your average win ($${avgWin.toFixed(2)}) is ${rrRatio.toFixed(1)}x your average loss ($${avgLoss.toFixed(2)}). You're letting winners run while keeping losses controlled.`,
        priority: 25,
      });
    } else if (rrRatio >= 1.0 && rrRatio < 1.5) {
      insights.push({
        id: 'mediocre-rr',
        type: 'tip',
        title: 'Risk/reward could be stronger',
        body: `Your wins average $${avgWin.toFixed(2)} vs losses at $${avgLoss.toFixed(2)} — a ratio of ${rrRatio.toFixed(1)}x. Aim for 1.5x or higher by holding winning trades longer before exiting.`,
        priority: 50,
      });
    }
  }

  // --- Fee drag ---
  if (totalFees > 0 && grossProfit > 0) {
    const feePct = (totalFees / grossProfit) * 100;
    if (feePct > 25) {
      insights.push({
        id: 'high-fees',
        type: 'warning',
        title: `Fees consuming ${feePct.toFixed(0)}% of gross profit`,
        body: `Total fees of $${totalFees.toFixed(2)} represent ${feePct.toFixed(0)}% of your gross profit ($${grossProfit.toFixed(2)}). Reduce trade frequency or switch to lower-cost instruments.`,
        priority: 70,
      });
    } else if (feePct > 10) {
      insights.push({
        id: 'moderate-fees',
        type: 'tip',
        title: `Fees at ${feePct.toFixed(0)}% of gross profit`,
        body: `$${totalFees.toFixed(2)} in total fees. Not critical yet, but worth watching — especially on losing months where fees amplify the damage.`,
        priority: 45,
      });
    }
  }

  // --- Emotion analysis ---
  const emotionMap = new Map<string, { wins: number; losses: number; pnl: number; count: number }>();
  trades.forEach(t => {
    if (!t.emotion) return;
    const cur = emotionMap.get(t.emotion) || { wins: 0, losses: 0, pnl: 0, count: 0 };
    emotionMap.set(t.emotion, {
      wins: cur.wins + (t.profit > 0 ? 1 : 0),
      losses: cur.losses + (t.profit < 0 ? 1 : 0),
      pnl: cur.pnl + t.profit,
      count: cur.count + 1,
    });
  });

  let worstEmotion: string | null = null;
  let worstEmotionPnl = 0;
  emotionMap.forEach((stats, emotion) => {
    if (stats.count >= 3 && stats.pnl < worstEmotionPnl) {
      worstEmotionPnl = stats.pnl;
      worstEmotion = emotion;
    }
  });

  if (worstEmotion) {
    const stats = emotionMap.get(worstEmotion)!;
    const em = TRADE_EMOTIONS.find(e => e.value === worstEmotion);
    const winPct = ((stats.wins / stats.count) * 100).toFixed(0);
    insights.push({
      id: 'worst-emotion',
      type: 'warning',
      title: `${em?.emoji} ${worstEmotion} trades are hurting you`,
      body: `When ${worstEmotion.toLowerCase()}, you win only ${winPct}% of the time and have lost a net $${Math.abs(worstEmotionPnl).toFixed(2)} across ${stats.count} trades. Consider stepping away from the screen when you feel this way.`,
      priority: 80,
    });
  }

  let bestEmotion: string | null = null;
  let bestEmotionPnl = 0;
  emotionMap.forEach((stats, emotion) => {
    if (stats.count >= 3 && stats.pnl > bestEmotionPnl) {
      bestEmotionPnl = stats.pnl;
      bestEmotion = emotion;
    }
  });

  if (bestEmotion) {
    const stats = emotionMap.get(bestEmotion)!;
    const em = TRADE_EMOTIONS.find(e => e.value === bestEmotion);
    const winPct = ((stats.wins / stats.count) * 100).toFixed(0);
    insights.push({
      id: 'best-emotion',
      type: 'positive',
      title: `${em?.emoji} ${bestEmotion} is your peak state`,
      body: `Your ${bestEmotion.toLowerCase()} trades win ${winPct}% of the time, generating +$${bestEmotionPnl.toFixed(2)} across ${stats.count} trades. This is your optimal trading mindset — recognise it and trade more when you feel this way.`,
      priority: 40,
    });
  }

  // Danger emotions with negative P&L
  const dangerEmotions = ['FOMO', 'Frustrated', 'Greedy', 'Overconfident'];
  dangerEmotions.forEach(emotion => {
    if (emotion === worstEmotion) return; // already covered above
    const stats = emotionMap.get(emotion);
    if (stats && stats.count >= 2 && stats.pnl < 0) {
      const em = TRADE_EMOTIONS.find(e => e.value === emotion);
      insights.push({
        id: `danger-emotion-${emotion}`,
        type: 'warning',
        title: `${em?.emoji} Stop trading when ${emotion}`,
        body: `${stats.count} trades placed while ${emotion.toLowerCase()} have cost you $${Math.abs(stats.pnl).toFixed(2)}. ${em?.description}`,
        priority: 75,
      });
    }
  });

  // --- Pair analysis ---
  const pairMap = new Map<string, { wins: number; count: number; pnl: number }>();
  trades.forEach(t => {
    const cur = pairMap.get(t.pair) || { wins: 0, count: 0, pnl: 0 };
    pairMap.set(t.pair, { wins: cur.wins + (t.profit > 0 ? 1 : 0), count: cur.count + 1, pnl: cur.pnl + t.profit });
  });

  let worstPair: string | null = null;
  let worstPairPnl = 0;
  pairMap.forEach((stats, pair) => {
    if (stats.count >= 3 && stats.pnl < worstPairPnl) {
      worstPairPnl = stats.pnl;
      worstPair = pair;
    }
  });

  if (worstPair) {
    const stats = pairMap.get(worstPair)!;
    const winPct = ((stats.wins / stats.count) * 100).toFixed(0);
    insights.push({
      id: 'worst-pair',
      type: 'warning',
      title: `${worstPair} is your worst instrument`,
      body: `You've lost $${Math.abs(worstPairPnl).toFixed(2)} on ${worstPair} across ${stats.count} trades (${winPct}% win rate). Consider pausing this pair and reviewing your setup criteria for it.`,
      priority: 65,
    });
  }

  let bestPair: string | null = null;
  let bestPairPnl = 0;
  pairMap.forEach((stats, pair) => {
    if (stats.count >= 3 && stats.pnl > bestPairPnl) {
      bestPairPnl = stats.pnl;
      bestPair = pair;
    }
  });

  if (bestPair) {
    const stats = pairMap.get(bestPair)!;
    const winPct = ((stats.wins / stats.count) * 100).toFixed(0);
    insights.push({
      id: 'best-pair',
      type: 'positive',
      title: `${bestPair} is your strongest instrument`,
      body: `You've made +$${bestPairPnl.toFixed(2)} on ${bestPair} with a ${winPct}% win rate across ${stats.count} trades. Allocate more focus here.`,
      priority: 35,
    });
  }

  // --- Direction bias ---
  const buyTrades = trades.filter(t => t.direction === 'Buy');
  const sellTrades = trades.filter(t => t.direction === 'Sell');
  if (buyTrades.length >= 5 && sellTrades.length >= 5) {
    const buyWinRate = buyTrades.filter(t => t.profit > 0).length / buyTrades.length;
    const sellWinRate = sellTrades.filter(t => t.profit > 0).length / sellTrades.length;
    if (Math.abs(buyWinRate - sellWinRate) > 0.25) {
      const weakDir = buyWinRate < sellWinRate ? 'Buy' : 'Sell';
      const weakRate = (Math.min(buyWinRate, sellWinRate) * 100).toFixed(0);
      const strongRate = (Math.max(buyWinRate, sellWinRate) * 100).toFixed(0);
      insights.push({
        id: 'direction-bias',
        type: 'warning',
        title: `Weak ${weakDir} performance`,
        body: `Your ${weakDir} trades win only ${weakRate}% of the time vs ${strongRate}% for the other direction. You may be fighting the trend or have a structural blind spot on ${weakDir}s.`,
        priority: 60,
      });
    }
  }

  // --- Overtrading ---
  const dayMap = new Map<string, { count: number; pnl: number }>();
  trades.forEach(t => {
    const cur = dayMap.get(t.date) || { count: 0, pnl: 0 };
    dayMap.set(t.date, { count: cur.count + 1, pnl: cur.pnl + t.profit });
  });

  let highVolumeDays = 0;
  let highVolumeNegativeDays = 0;
  dayMap.forEach(({ count, pnl }) => {
    if (count >= 5) {
      highVolumeDays++;
      if (pnl < 0) highVolumeNegativeDays++;
    }
  });

  if (highVolumeDays >= 3 && highVolumeNegativeDays / highVolumeDays > 0.5) {
    insights.push({
      id: 'overtrading',
      type: 'warning',
      title: 'Overtrading pattern detected',
      body: `On ${highVolumeDays} days with 5+ trades, ${highVolumeNegativeDays} ended negative. Heavy trading days tend to hurt your account — set a hard cap of 3–4 trades per day.`,
      priority: 72,
    });
  }

  // --- Daily consistency ---
  const tradingDays = dayMap.size;
  const profitableDays = Array.from(dayMap.values()).filter(d => d.pnl > 0).length;
  const dayWinRate = tradingDays > 0 ? profitableDays / tradingDays : 0;

  if (tradingDays >= 5 && dayWinRate >= 0.65) {
    insights.push({
      id: 'consistent',
      type: 'positive',
      title: 'Consistent daily profitability',
      body: `${profitableDays} of ${tradingDays} trading days were profitable (${(dayWinRate * 100).toFixed(0)}%). Your day-to-day consistency is a real edge — protect it.`,
      priority: 28,
    });
  } else if (tradingDays >= 5 && dayWinRate < 0.4) {
    insights.push({
      id: 'inconsistent',
      type: 'warning',
      title: 'More losing days than winning days',
      body: `Only ${profitableDays} of ${tradingDays} trading days (${(dayWinRate * 100).toFixed(0)}%) ended positive. Focus on having fewer, higher-quality setups each day rather than trading volume.`,
      priority: 68,
    });
  }

  // Sort by priority descending, return top 6
  return insights.sort((a, b) => b.priority - a.priority).slice(0, 6);
}
