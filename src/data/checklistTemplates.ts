import { ChecklistItem } from "@/types/checklist";

const id = () => Math.random().toString(36).substring(2, 11);

export interface ChecklistTemplate {
  name: string;
  description: string;
  icon: string;
  items: ChecklistItem[];
}

export const checklistTemplates: ChecklistTemplate[] = [
  {
    name: "CRT Daily Checklist",
    description: "Complete CRT trading checklist with pre-market prep, setup identification, trade execution, closing routine, and trading rules.",
    icon: "📈",
    items: [
      // ── PRE-MARKET PREP ──
      {
        id: id(),
        text: "🕐 PRE-MARKET PREP (5:15 - 5:30 AM IST)",
        completed: false,
        type: "checkbox",
        children: [
          { id: id(), text: "Check ForexFactory for high-impact Japan/US news", completed: false, children: [] },
          { id: id(), text: "HIGH IMPACT news today? → DO NOT TRADE", completed: false, children: [] },
          { id: id(), text: "Open TradingView → USD/JPY → 15-min chart", completed: false, children: [] },
          { id: id(), text: "Draw yesterday's HIGH and LOW lines", completed: false, children: [] },
          { id: id(), text: "Check 1H chart trend direction", completed: false, children: [] },
        ],
      },
      // 1H Trend Direction
      {
        id: id(),
        text: "1H Trend Direction",
        completed: false,
        type: "radio",
        options: ["📈 Bullish", "📉 Bearish", "➡️ Sideways"],
        value: "",
        children: [],
      },
      // ── FIND CRT SETUP ──
      {
        id: id(),
        text: "🔍 FIND CRT SETUP (5:30 - 7:30 AM IST)",
        completed: false,
        type: "checkbox",
        children: [
          { id: id(), text: "CANDLE 1: Identify range candle. Mark HIGH and LOW", completed: false, children: [] },
          { id: id(), text: "CANDLE 2: Does it sweep above HIGH or below LOW?", completed: false, children: [] },
          { id: id(), text: "Candle 2 closes BACK INSIDE Candle 1 range?", completed: false, children: [] },
          { id: id(), text: "Drop to 5-min: CHoCH or FVG confirmation found?", completed: false, children: [] },
          { id: id(), text: "All confirmations = YES? Ready to trade!", completed: false, children: [] },
        ],
      },
      // Sweep Direction
      {
        id: id(),
        text: "Sweep Direction",
        completed: false,
        type: "radio",
        options: ["Above High → SELL", "Below Low → BUY"],
        value: "",
        children: [],
      },
      // ── EXECUTE TRADE ──
      {
        id: id(),
        text: "⚡ EXECUTE TRADE (Only if ALL above ✓)",
        completed: false,
        type: "checkbox",
        children: [
          { id: id(), text: "Entry price noted", completed: false, children: [] },
          { id: id(), text: "Stop Loss set (beyond Candle 2 wick)", completed: false, children: [] },
          { id: id(), text: "TP1 set (50% of Candle 1 range)", completed: false, children: [] },
          { id: id(), text: "TP2 set (opposite end of Candle 1)", completed: false, children: [] },
          { id: id(), text: "Risk-Reward is minimum 1:2", completed: false, children: [] },
          { id: id(), text: "Lot size = max 1-2% account risk", completed: false, children: [] },
        ],
      },
      // Trade Direction
      {
        id: id(),
        text: "Trade Direction",
        completed: false,
        type: "radio",
        options: ["BUY 🟢", "SELL 🔴"],
        value: "",
        children: [],
      },
      // ── CLOSE & LEAVE ──
      {
        id: id(),
        text: "🏁 CLOSE & LEAVE (8:00 - 8:30 AM IST)",
        completed: false,
        type: "checkbox",
        children: [
          { id: id(), text: "Move SL to breakeven if in profit", completed: false, children: [] },
          { id: id(), text: "Close remaining trades before 8:30 AM", completed: false, children: [] },
          { id: id(), text: "DONE. Close charts. Go to work.", completed: false, children: [] },
        ],
      }
    ],
  },
];
