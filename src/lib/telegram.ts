import { ref, get, set } from "firebase/database";
import { db } from "@/lib/firebase";

// ─── Types ─────────────────────────────────────────────────────────────
export interface TelegramConfig {
  botToken: string;
  chatId: string;
  enabled: boolean;
}

// ─── Load / Save config from Firebase ──────────────────────────────────
export async function loadTelegramConfig(uid: string): Promise<TelegramConfig | null> {
  try {
    const snap = await get(ref(db, `users/${uid}/telegram`));
    if (snap.exists()) return snap.val() as TelegramConfig;
    return null;
  } catch {
    return null;
  }
}

export async function saveTelegramConfig(uid: string, config: TelegramConfig): Promise<void> {
  await set(ref(db, `users/${uid}/telegram`), config);
}

// ─── Send Telegram message ─────────────────────────────────────────────
export async function sendTelegramMessage(
  botToken: string,
  chatId: string,
  message: string
): Promise<boolean> {
  try {
    const res = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: "HTML",
        }),
      }
    );
    const data = await res.json();
    return data.ok === true;
  } catch (e) {
    console.error("Telegram send failed:", e);
    return false;
  }
}

// ─── High-level: send if configured & enabled ──────────────────────────
export async function sendTelegramNotification(
  uid: string,
  message: string
): Promise<boolean> {
  const config = await loadTelegramConfig(uid);
  if (!config || !config.enabled || !config.botToken || !config.chatId) return false;
  return sendTelegramMessage(config.botToken, config.chatId, message);
}

// ─── Test connection ───────────────────────────────────────────────────
export async function testTelegramConnection(
  botToken: string,
  chatId: string
): Promise<boolean> {
  return sendTelegramMessage(
    botToken,
    chatId,
    "✅ <b>Tradeify Connected!</b>\n\nYou will now receive kill zone alerts and goal notifications here."
  );
}
