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
  createdAt: string;
  link:string;
}

export interface DayData {
  date: string;
  trades: Trade[];
  totalProfit: number;
  tradeCount: number;
}
