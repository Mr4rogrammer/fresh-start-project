import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Trade } from "@/types/trade";
import { Trash2, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, ChevronLeft, ChevronRight } from "lucide-react";

interface TradeModalProps {
  open: boolean;
  onClose: () => void;
  trades: Trade[];
  date: string;
  onDelete: (tradeId: string) => void;
  onEdit: (trade: Trade) => void;
  openAddTrade: () => void;
}

export const TradeModal = ({ open, onClose, trades, date, onDelete, onEdit, openAddTrade }: TradeModalProps) => {
  const totalProfit = trades.reduce((sum, trade) => sum + trade.profit, 0);
  const isProfit = totalProfit > 0;

  function calculateRiskReward(
    entryPrice?: number | null,
    stopLoss?: number | null,
    takeProfit?: number | null
  ): string {
    const entry = entryPrice || 0;
    const stop = stopLoss || 0;
    const profit = takeProfit || 0;


    if (stop === 0) return "-";

    const risk = Math.abs(entry - stop);
    const reward = Math.abs(profit - entry);

    // Avoid divide by zero
    if (risk === 0) return "-";

    return "1 : " + (reward / risk).toFixed(3);
  }


  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            Trades for {new Date(date).toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </DialogTitle>
          <div className="flex items-center justify-between gap-4">
            <div className={`text-xl font-bold ${isProfit ? 'text-profit' : 'text-loss'}`}>
              Total: ${isProfit ? '+' : ''}{totalProfit.toFixed(2)}
            </div>
            <Button
              onClick={() => {
                openAddTrade();
              }}
              className="gap-2 transition-all hover:scale-105"
            >
              <Plus className="h-5 w-5" />
              Add Trade
            </Button>
          </div>

        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-4 pr-4">
            {trades.map((trade) => (
              <div key={trade.id} className="bg-card rounded-xl p-4 border border-border">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-lg font-semibold">{trade.pair}</h3>
                    <span
                      className={`inline-block px-2 py-1 rounded-md text-xs font-medium ${trade.direction === 'Buy'
                        ? 'bg-profit/20 text-profit'
                        : 'bg-loss/20 text-loss'
                        }`}
                    >
                      {trade.direction}
                    </span>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onEdit(trade)}
                      className="h-8 w-8"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => trade.id && onDelete(trade.id)}
                      className="h-8 w-8 text-loss hover:text-loss"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">Entry:</span>
                    <span className="ml-2 font-medium">{trade.entryPrice}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Exit:</span>
                    <span className="ml-2 font-medium">{trade.exitPrice}</span>
                  </div>


                  <div>
                    <span className="text-muted-foreground">Stop Loss:</span>
                    <span className="ml-2 font-medium">{trade.slPrice}</span>
                  </div>

                  <div>
                    <span className="text-muted-foreground">Fees:</span>
                    <span className="ml-2 font-medium">{trade.fees}</span>
                  </div>

                  <div>
                    <span className="text-muted-foreground">Lot Size:</span>
                    <span className="ml-2 font-medium">{trade.lotSize}</span>
                  </div>

                  <div>
                    <span className="text-muted-foreground">Risk Reward:</span>
                    <span className="ml-2 font-medium"> 1 : {calculateRiskReward(trade.entryPrice, trade.slPrice, trade.exitPrice)}</span>
                  </div>

                  <div>
                    <span className="text-muted-foreground">Profit/Loss:</span>
                    <span className={`ml-2 font-bold ${trade.profit >= 0 ? 'text-profit' : 'text-loss'
                      }`}>
                      ${trade.profit >= 0 ? '+' : ''}{trade.profit.toFixed(2)}
                    </span>
                  </div>

                  {trade.link?.trim() && (
  <div>
    <span className="text-muted-foreground">Link:</span>
    <a
      href={trade.link}
      target="_blank"
      rel="noopener noreferrer"
      className="ml-2 font-medium text-profit underline"
    >
      "Open Link In New Tab"
    </a>
  </div>
)}


                </div>

                {trade.notes && (
                  <div className="mt-3 pt-3 border-t border-border">
                    <p className="text-sm text-muted-foreground">{trade.notes}</p>
                  </div>
                )}

                {trade.screenshotUrl && (
                  <div className="mt-3">
                    <img
                      src={trade.screenshotUrl}
                      alt="Trade screenshot"
                      className="rounded-lg w-full"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
