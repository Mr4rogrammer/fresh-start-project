import { useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useChallenge } from "@/contexts/ChallengeContext";
import { useData } from "@/contexts/DataContext";
import { ref, get, set } from "firebase/database";
import { db } from "@/lib/firebase";
import { sendTelegramNotification } from "@/lib/telegram";
import { generateWeeklyReport, formatWeeklyReportTelegram } from "@/lib/weeklyReport";
import { startOfWeek, format } from "date-fns";

/**
 * Invisible component that auto-sends the weekly Telegram report.
 *
 * Logic:
 * - On mount + every 30 minutes, check if the report for last week has been sent.
 * - "Last week" = the Mon-Sun that just ended.
 * - We store the last-sent week key (`YYYY-wWW`) in Firebase under
 *   `users/{uid}/weeklyReportLastSent` to prevent duplicate sends.
 * - Only sends if it's Sunday 6 PM IST or later (so the full week's trades are in).
 * - If the user didn't open the app on Sunday, it sends as soon as they open it
 *   (any day after Sunday) for the missed week.
 */
export const WeeklyReportScheduler = () => {
  const { user } = useAuth();
  const { selectedChallenge } = useChallenge();
  const { getTrades } = useData();
  const checkingRef = useRef(false);

  useEffect(() => {
    if (!user) return;

    const checkAndSend = async () => {
      if (checkingRef.current) return;
      checkingRef.current = true;

      try {
        const now = new Date();
        // Week key for the last completed week (the Mon that started it)
        const lastWeekStart = startOfWeek(now, { weekStartsOn: 1 });
        lastWeekStart.setDate(lastWeekStart.getDate() - 7);
        const weekKey = format(lastWeekStart, "yyyy-'w'ww");

        // Check if we already sent this week's report
        const sentRef = ref(db, `users/${user.uid}/weeklyReportLastSent`);
        const snap = await get(sentRef);
        const lastSent = snap.exists() ? snap.val() : "";

        if (lastSent === weekKey) {
          // Already sent for this week
          return;
        }

        // Get trades — use selected challenge, or skip if none
        const challenge = selectedChallenge;
        if (!challenge) return;

        const allTrades = getTrades(challenge.id);
        const report = generateWeeklyReport(allTrades, challenge.name, now);
        const message = formatWeeklyReportTelegram(report);

        const sent = await sendTelegramNotification(user.uid, message);
        if (sent) {
          // Mark as sent
          await set(sentRef, weekKey);
          console.log(`[WeeklyReport] Sent report for ${weekKey}`);
        }
      } catch (e) {
        console.error("[WeeklyReport] Error:", e);
      } finally {
        checkingRef.current = false;
      }
    };

    // Check on mount (slight delay to let data load)
    const initialTimer = setTimeout(checkAndSend, 5000);

    // Re-check every 30 minutes
    const interval = setInterval(checkAndSend, 30 * 60 * 1000);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, [user, selectedChallenge, getTrades]);

  return null;
};
