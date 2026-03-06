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
  notes?: string;
  screenshotUrl?: string;
  screenshotFileId?: string; // Google Drive file ID
  createdAt: string;
  link?: string; // Deprecated - kept for backward compatibility
}

export interface Journal {
  id?: string;
  date: string;
  notes: string;
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
