import { useState, useEffect, useCallback, useRef } from "react";
import { ref, get, set } from "firebase/database";
import { db } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { sendTelegramNotification } from "@/lib/telegram";

// ─── Browser Notification helpers ──────────────────────────────────────
function requestNotificationPermission() {
  if (!("Notification" in window)) return;
  if (Notification.permission === "default") {
    Notification.requestPermission();
  }
}

function sendBrowserNotification(title: string, body: string) {
  if (!("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  try {
    const n = new Notification(title, {
      body,
      icon: "/favicon.ico",
      badge: "/favicon.ico",
      tag: `killzone-${title}`, // prevents duplicates with same tag
      requireInteraction: true,
    });
    // Auto-close after 10s
    setTimeout(() => n.close(), 10000);
  } catch {
    // Silent fail (e.g. mobile browsers that don't support Notification constructor)
  }
}

export interface KillZone {
  id: string;
  name: string;
  startTime: string; // HH:mm in IST
  endTime: string;   // HH:mm in IST
  message: string;
  enabled: boolean;
}

// Default kill zones in IST
const DEFAULT_KILL_ZONES: KillZone[] = [
  {
    id: "asia",
    name: "Asia Kill Zone",
    startTime: "06:30",
    endTime: "10:30",
    message: "Asian session is active — watch JPY & AUD pairs",
    enabled: true,
  },
  {
    id: "london",
    name: "London Kill Zone",
    startTime: "12:30",
    endTime: "15:30",
    message: "London session is active — high volatility on GBP & EUR",
    enabled: true,
  },
  {
    id: "newyork",
    name: "New York Kill Zone",
    startTime: "17:30",
    endTime: "20:30",
    message: "New York session is active — watch USD pairs",
    enabled: true,
  },
  {
    id: "london_close",
    name: "London Close",
    startTime: "20:30",
    endTime: "22:30",
    message: "London close — potential reversals and position squaring",
    enabled: true,
  },
];

function getISTTime(): { hours: number; minutes: number; timeStr: string } {
  const now = new Date();
  const istStr = now.toLocaleTimeString("en-GB", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const [h, m] = istStr.split(":").map(Number);
  return { hours: h, minutes: m, timeStr: istStr };
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function isInZone(currentTimeStr: string, startTime: string, endTime: string): boolean {
  const current = timeToMinutes(currentTimeStr);
  const start = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);

  // Handle overnight zones (e.g., 22:00 - 02:00)
  if (start > end) {
    return current >= start || current < end;
  }
  return current >= start && current < end;
}

export function useKillZones() {
  const { user } = useAuth();
  const [killZones, setKillZones] = useState<KillZone[]>([]);
  const [activeZones, setActiveZones] = useState<KillZone[]>([]);
  const [loading, setLoading] = useState(true);
  const alertedZonesRef = useRef<Set<string>>(new Set());
  const killZonesRef = useRef<KillZone[]>([]);

  // Request browser notification permission on mount
  useEffect(() => {
    requestNotificationPermission();
  }, []);

  // Keep ref in sync
  useEffect(() => {
    killZonesRef.current = killZones;
  }, [killZones]);

  // Load kill zones from Firebase
  useEffect(() => {
    const loadKillZones = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      try {
        const kzRef = ref(db, `users/${user.uid}/killZones`);
        const snapshot = await get(kzRef);
        if (snapshot.exists()) {
          const data = snapshot.val();
          const zones: KillZone[] = Object.values(data);
          setKillZones(zones);
        } else {
          // Save defaults on first use
          const data: Record<string, KillZone> = {};
          DEFAULT_KILL_ZONES.forEach((z) => { data[z.id] = z; });
          await set(kzRef, data);
          setKillZones(DEFAULT_KILL_ZONES);
        }
      } catch (error) {
        console.error("Failed to load kill zones:", error);
        setKillZones(DEFAULT_KILL_ZONES);
      } finally {
        setLoading(false);
      }
    };
    loadKillZones();
  }, [user]);

  // Save kill zones to Firebase
  const saveKillZones = async (zones: KillZone[]) => {
    if (!user) return;
    try {
      const kzRef = ref(db, `users/${user.uid}/killZones`);
      const data: Record<string, KillZone> = {};
      zones.forEach((z) => {
        data[z.id] = z;
      });
      await set(kzRef, data);
      setKillZones(zones);
    } catch (error) {
      console.error("Failed to save kill zones:", error);
      throw error;
    }
  };

  // Check active zones
  const checkActiveZones = useCallback(() => {
    const zones = killZonesRef.current;
    if (zones.length === 0) return;
    const { timeStr } = getISTTime();
    const enabledZones = zones.filter((z) => z.enabled);
    const currentlyActive = enabledZones.filter((z) =>
      isInZone(timeStr, z.startTime, z.endTime)
    );

    setActiveZones(currentlyActive);

    // Alert for newly entered zones
    currentlyActive.forEach((zone) => {
      if (!alertedZonesRef.current.has(zone.id)) {
        alertedZonesRef.current.add(zone.id);
        toast.info(`🔴 ${zone.name}`, {
          description: zone.message,
          duration: 8000,
        });
        // Browser push notification (works even when tab is in background)
        sendBrowserNotification(`🔴 ${zone.name}`, zone.message);
        // Telegram notification
        if (user?.uid) {
          sendTelegramNotification(
            user.uid,
            `🔴 <b>${zone.name}</b>\n${zone.message}`
          );
        }
      }
    });

    // Clear alerts for zones we've left
    const activeIds = new Set(currentlyActive.map((z) => z.id));
    alertedZonesRef.current.forEach((id) => {
      if (!activeIds.has(id)) {
        alertedZonesRef.current.delete(id);
      }
    });
  }, []);

  // Re-check whenever killZones change
  useEffect(() => {
    checkActiveZones();
  }, [killZones, checkActiveZones]);

  // Run check every minute
  useEffect(() => {
    const interval = setInterval(checkActiveZones, 60 * 1000);
    return () => clearInterval(interval);
  }, [checkActiveZones]);

  const addKillZone = async (zone: Omit<KillZone, "id">) => {
    const newZone: KillZone = {
      ...zone,
      id: `kz_${Date.now()}`,
    };
    const updated = [...killZones, newZone];
    await saveKillZones(updated);
    return newZone;
  };

  const updateKillZone = async (id: string, updates: Partial<KillZone>) => {
    const updated = killZones.map((z) =>
      z.id === id ? { ...z, ...updates } : z
    );
    await saveKillZones(updated);
  };

  const deleteKillZone = async (id: string) => {
    const updated = killZones.filter((z) => z.id !== id);
    await saveKillZones(updated);
  };

  const toggleKillZone = async (id: string) => {
    const zone = killZones.find((z) => z.id === id);
    if (zone) {
      await updateKillZone(id, { enabled: !zone.enabled });
    }
  };

  return {
    killZones,
    activeZones,
    loading,
    addKillZone,
    updateKillZone,
    deleteKillZone,
    toggleKillZone,
    saveKillZones,
    getISTTime,
  };
}

// Standalone function to get current active zone name (for components that don't need full hook)
export function getCurrentActiveZoneName(zones: KillZone[]): string | null {
  const { timeStr } = getISTTime();
  const active = zones.find(
    (z) => z.enabled && isInZone(timeStr, z.startTime, z.endTime)
  );
  return active?.name || null;
}

export { getISTTime as getISTTimeStatic };
