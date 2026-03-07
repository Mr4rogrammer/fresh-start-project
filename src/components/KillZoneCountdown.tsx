import { useState, useEffect, useCallback } from "react";
import { ref, get } from "firebase/database";
import { db } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import { KillZone } from "@/hooks/useKillZones";
import { Timer, Radio } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocation } from "react-router-dom";

// ─── IST helpers (same logic as useKillZones) ──────────────────────
function getISTNow(): { hours: number; minutes: number; seconds: number } {
  const now = new Date();
  const istStr = now.toLocaleTimeString("en-GB", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const [h, m, s] = istStr.split(":").map(Number);
  return { hours: h, minutes: m, seconds: s };
}

function timeToSeconds(time: string): number {
  const parts = time.split(":").map(Number);
  return parts[0] * 3600 + parts[1] * 60 + (parts[2] || 0);
}

function isInZone(currentSec: number, startSec: number, endSec: number): boolean {
  if (startSec > endSec) {
    return currentSec >= startSec || currentSec < endSec;
  }
  return currentSec >= startSec && currentSec < endSec;
}

function formatCountdown(totalSeconds: number): string {
  if (totalSeconds <= 0) return "now";
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}h ${m.toString().padStart(2, "0")}m`;
  if (m > 0) return `${m}m ${s.toString().padStart(2, "0")}s`;
  return `${s}s`;
}

interface NextZoneInfo {
  zone: KillZone;
  secondsUntil: number;
  isActive: boolean;
}

function getNextZone(zones: KillZone[]): NextZoneInfo | null {
  const enabled = zones.filter((z) => z.enabled);
  if (enabled.length === 0) return null;

  const { hours, minutes, seconds } = getISTNow();
  const nowSec = hours * 3600 + minutes * 60 + seconds;

  // Check if we're currently inside any zone
  for (const zone of enabled) {
    const startSec = timeToSeconds(zone.startTime);
    const endSec = timeToSeconds(zone.endTime);
    if (isInZone(nowSec, startSec, endSec)) {
      // Calculate time until this zone ends
      let secsUntilEnd: number;
      if (startSec > endSec) {
        // overnight zone
        secsUntilEnd = nowSec >= startSec
          ? (86400 - nowSec) + endSec
          : endSec - nowSec;
      } else {
        secsUntilEnd = endSec - nowSec;
      }
      return { zone, secondsUntil: secsUntilEnd, isActive: true };
    }
  }

  // Find the next upcoming zone
  let bestZone: KillZone | null = null;
  let bestDiff = Infinity;

  for (const zone of enabled) {
    const startSec = timeToSeconds(zone.startTime);
    let diff = startSec - nowSec;
    if (diff <= 0) diff += 86400; // wrap to next day
    if (diff < bestDiff) {
      bestDiff = diff;
      bestZone = zone;
    }
  }

  if (!bestZone) return null;
  return { zone: bestZone, secondsUntil: bestDiff, isActive: false };
}

export const KillZoneCountdown = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [zones, setZones] = useState<KillZone[]>([]);
  const [nextInfo, setNextInfo] = useState<NextZoneInfo | null>(null);
  const [loaded, setLoaded] = useState(false);

  // Don't show on auth page
  const isAuthPage = location.pathname === "/";

  // Load kill zones from Firebase
  useEffect(() => {
    if (!user) return;
    const load = async () => {
      try {
        const kzRef = ref(db, `users/${user.uid}/killZones`);
        const snapshot = await get(kzRef);
        if (snapshot.exists()) {
          const data = snapshot.val();
          setZones(Object.values(data));
        }
      } catch (e) {
        console.error("KillZoneCountdown: Failed to load zones", e);
      } finally {
        setLoaded(true);
      }
    };
    load();
  }, [user]);

  // Tick every second
  const tick = useCallback(() => {
    if (zones.length === 0) return;
    setNextInfo(getNextZone(zones));
  }, [zones]);

  useEffect(() => {
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [tick]);

  if (isAuthPage || !loaded || !nextInfo || !user) return null;

  const { zone, secondsUntil, isActive } = nextInfo;

  return (
    <div
      className={cn(
        "fixed bottom-4 right-4 z-[100]",
        "flex items-center gap-2 px-3 py-1.5 rounded-full",
        "shadow-lg backdrop-blur-md border",
        "text-xs font-medium transition-all duration-300",
        "animate-fade-in select-none",
        isActive
          ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
          : "bg-card/80 border-border/50 text-muted-foreground"
      )}
    >
      {isActive ? (
        <Radio className="h-3 w-3 animate-pulse text-emerald-400" />
      ) : (
        <Timer className="h-3 w-3" />
      )}

      <span className="max-w-[160px] truncate">{zone.name}</span>

      <span className="font-mono font-bold tabular-nums text-foreground">
        {isActive ? (
          <>
            <span className="text-emerald-400">LIVE</span>
            <span className="ml-1 text-muted-foreground font-normal">
              · {formatCountdown(secondsUntil)} left
            </span>
          </>
        ) : (
          <>in {formatCountdown(secondsUntil)}</>
        )}
      </span>

    </div>
  );
};
