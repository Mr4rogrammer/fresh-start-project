export type JournalEntryType = 'Pre-market' | 'Post-market' | 'Weekly Review' | 'Lesson' | 'General';

export const JOURNAL_ENTRY_TYPES: { value: JournalEntryType; emoji: string; label: string }[] = [
  { value: 'Pre-market', emoji: '🌅', label: 'Pre-market' },
  { value: 'Post-market', emoji: '🌆', label: 'Post-market' },
  { value: 'Weekly Review', emoji: '📋', label: 'Weekly Review' },
  { value: 'Lesson', emoji: '💡', label: 'Lesson' },
  { value: 'General', emoji: '📝', label: 'General' },
];

export type TradeEmotion =
  | 'Calm'
  | 'Confident'
  | 'Anxious'
  | 'Fearful'
  | 'Greedy'
  | 'Frustrated'
  | 'Excited'
  | 'Neutral'
  | 'FOMO'
  | 'Overconfident';

export const TRADE_EMOTIONS: { value: TradeEmotion; emoji: string; label: string; description: string }[] = [
  { value: 'Calm', emoji: '😌', label: 'Calm', description: 'Relaxed and in full control — not forcing trades, just following the plan.' },
  { value: 'Confident', emoji: '💪', label: 'Confident', description: 'Trusting your edge and executing without hesitation or second-guessing.' },
  { value: 'Neutral', emoji: '😐', label: 'Neutral', description: 'No strong feelings either way — objective, mechanical, just executing setups.' },
  { value: 'Excited', emoji: '🤩', label: 'Excited', description: 'High energy after a win or big move — risk of overtrading or sizing up too early.' },
  { value: 'Anxious', emoji: '😰', label: 'Anxious', description: 'Worried about the outcome — hesitant to pull the trigger or cutting winners short.' },
  { value: 'Fearful', emoji: '😨', label: 'Fearful', description: 'Fear of loss is dominating — likely to skip valid setups or exit too early.' },
  { value: 'Greedy', emoji: '🤑', label: 'Greedy', description: 'Chasing bigger profits and ignoring your risk rules — dangerous state to trade in.' },
  { value: 'Frustrated', emoji: '😤', label: 'Frustrated', description: 'Upset from recent losses or missed trades — high risk of revenge trading.' },
  { value: 'FOMO', emoji: '😱', label: 'FOMO', description: 'Fear of missing out — entering trades late, impulsively, or without a proper setup.' },
  { value: 'Overconfident', emoji: '😎', label: 'Overconfident', description: 'Feeling invincible after a winning streak — ignoring risk and skipping your checklist.' },
];

export interface Trade {
  id?: string;
  date: string;
  pair: string;
  entryPrice: number;
  exitPrice: number;
  slPrice: number;
  lotSize: number;
  fees: number;
  direction: 'Buy' | 'Sell';
  profit: number;
  emotion?: TradeEmotion;
  strategy?: string;
  rating?: number;
  notes?: string;
  screenshotUrl?: string;
  screenshotFileId?: string; // Google Drive file ID
  mfe?: number; // Max Favorable Excursion
  mae?: number; // Max Adverse Excursion
  createdAt: string;
  link?: string; // Deprecated - kept for backward compatibility
}

export interface Journal {
  id?: string;
  date: string;
  notes: string;
  emotion?: TradeEmotion;
  entryType?: JournalEntryType;
  screenshotUrl?: string;
  screenshotFileId?: string;
  createdAt: string;
}

export interface DayData {
  date: string;
  trades: Trade[];
  journals: Journal[];
  totalProfit: number;
  tradeCount: number;
}
