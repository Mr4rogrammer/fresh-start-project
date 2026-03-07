import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Trade, Journal, TRADE_EMOTIONS, JOURNAL_ENTRY_TYPES } from "@/types/trade";
import { Star } from "lucide-react";
import { Trash2, Edit, Expand, Plus, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useState } from "react";
import { ImageViewerModal } from "@/components/ImageViewerModal";
import { DriveImage } from "@/components/DriveImage";

interface TradeModalProps {
  open: boolean;
  onClose: () => void;
  trades: Trade[];
  journals?: Journal[];
  date: string;
  onDelete: (tradeId: string) => void;
  onEdit: (trade: Trade) => void;
  openAddTrade: () => void;
  openAddJournal?: () => void;
  onDeleteJournal?: (journalId: string) => void;
  onEditJournal?: (journal: Journal) => void;
  readOnly?: boolean;
  formatCurrency?: (amount: number, decimals?: number) => string;
}

export const TradeModal = ({ open, onClose, trades, journals = [], date, onDelete, onEdit, openAddTrade, openAddJournal, onDeleteJournal, onEditJournal, readOnly = false, formatCurrency }: TradeModalProps) => {
  const [viewingImage, setViewingImage] = useState<{ fileId?: string; url?: string; title?: string } | null>(null);
  const totalProfit = trades.reduce((sum, trade) => sum + trade.profit, 0);
  const isProfit = totalProfit > 0;

  const fmt = (amount: number) => {
    if (formatCurrency) return formatCurrency(amount);
    return `$${amount.toFixed(2)}`;
  };

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
            <div className={`text-xl font-bold ${trades.length > 0 ? (isProfit ? 'text-profit' : 'text-loss') : 'text-muted-foreground'}`}>
              {trades.length > 0 ? `Total: ${isProfit ? '+' : ''}${fmt(totalProfit)}` : 'No trades'}
            </div>
            {!readOnly && (
              <div className="flex gap-2">
                <Button
                  onClick={() => { openAddTrade(); }}
                  className="gap-2 transition-all hover:scale-105"
                  size="sm"
                >
                  <Plus className="h-4 w-4" />
                  Trade
                </Button>
                {openAddJournal && (
                  <Button
                    onClick={() => { openAddJournal(); }}
                    variant="outline"
                    className="gap-2 transition-all hover:scale-105 hover:bg-blue-500/10 hover:border-blue-500/50"
                    size="sm"
                  >
                    <BookOpen className="h-4 w-4" />
                    Journal
                  </Button>
                )}
              </div>
            )}
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

                  {!readOnly && (
                    <div className="flex gap-2">
                      <Button variant="ghost" size="icon" onClick={() => onEdit(trade)} className="h-8 w-8">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => trade.id && onDelete(trade.id)} className="h-8 w-8 text-loss hover:text-loss">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
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
                    <span className="ml-2 font-medium">{fmt(trade.fees)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Lot Size:</span>
                    <span className="ml-2 font-medium">{trade.lotSize}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Risk Reward:</span>
                    <span className="ml-2 font-medium">{calculateRiskReward(trade.entryPrice, trade.slPrice, trade.exitPrice)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Profit/Loss:</span>
                    <span className={`ml-2 font-bold ${trade.profit >= 0 ? 'text-profit' : 'text-loss'}`}>
                      {trade.profit >= 0 ? '+' : ''}{fmt(trade.profit)}
                    </span>
                  </div>
                  {trade.strategy && (
                    <div>
                      <span className="text-muted-foreground">Strategy:</span>
                      <span className="ml-2 font-medium">{trade.strategy}</span>
                    </div>
                  )}
                  {trade.rating && (
                    <div className="col-span-2 flex items-center gap-1">
                      <span className="text-muted-foreground mr-1">Rating:</span>
                      {[1,2,3,4,5].map(s => (
                        <Star key={s} className={`h-4 w-4 ${s <= trade.rating! ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground/30'}`} />
                      ))}
                      <span className="text-xs text-muted-foreground ml-1">
                        {['','Poor','Below avg','Average','Good','Excellent'][trade.rating]}
                      </span>
                    </div>
                  )}
                  {trade.emotion && (() => {
                    const em = TRADE_EMOTIONS.find(e => e.value === trade.emotion);
                    return (
                      <div className="col-span-2">
                        <span className="text-muted-foreground">Emotion:</span>
                        <span className="ml-2 font-medium">{em?.emoji} {em?.label ?? trade.emotion}</span>
                        {em && <p className="text-xs text-muted-foreground mt-0.5">{em.description}</p>}
                      </div>
                    );
                  })()}
                </div>

                {trade.notes && (
                  <div className="mt-3 pt-3 border-t border-border">
                    <p className="text-sm text-muted-foreground">{trade.notes}</p>
                  </div>
                )}

                {(trade.screenshotFileId || trade.screenshotUrl) && (
                  <div className="mt-3 pt-3 border-t border-border">
                    <div className="relative group cursor-pointer" onClick={() => setViewingImage({
                      fileId: trade.screenshotFileId,
                      url: trade.screenshotUrl,
                      title: `${trade.pair} - ${trade.date}`
                    })}>
                      <DriveImage
                        fileId={trade.screenshotFileId}
                        fallbackUrl={trade.screenshotUrl}
                        alt="Trade screenshot"
                        className="rounded-lg w-full h-48 object-cover hover:opacity-90 transition-opacity"
                      />
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="secondary"
                          size="icon"
                          className="h-8 w-8 bg-background/80 backdrop-blur-sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setViewingImage({
                              fileId: trade.screenshotFileId,
                              url: trade.screenshotUrl,
                              title: `${trade.pair} - ${trade.date}`
                            });
                          }}
                        >
                          <Expand className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Journal Entries */}
            {journals.length > 0 && (
              <>
                {trades.length > 0 && (
                  <div className="flex items-center gap-2 mt-6 mb-3">
                    <BookOpen className="h-4 w-4 text-blue-500" />
                    <span className="text-sm font-medium text-blue-500">Journal Entries</span>
                  </div>
                )}
                {journals.map((journal) => (
                  <div key={journal.id} className="bg-blue-500/5 rounded-xl p-4 border border-blue-500/20">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        <BookOpen className="h-4 w-4 text-blue-500" />
                        <span className="text-sm font-medium text-blue-500">Journal Entry</span>
                      </div>
                      {!readOnly && onDeleteJournal && onEditJournal && (
                        <div className="flex gap-2">
                          <Button variant="ghost" size="icon" onClick={() => onEditJournal(journal)} className="h-8 w-8">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => journal.id && onDeleteJournal(journal.id)} className="h-8 w-8 text-loss hover:text-loss">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>

                    {journal.entryType && (() => {
                      const et = JOURNAL_ENTRY_TYPES.find(t => t.value === journal.entryType);
                      return (
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 mb-2">
                          {et?.emoji} {et?.label ?? journal.entryType}
                        </span>
                      );
                    })()}
                    {journal.emotion && (() => {
                      const em = TRADE_EMOTIONS.find(e => e.value === journal.emotion);
                      return (
                        <div className="mb-2">
                          <span className="text-sm font-medium">{em?.emoji} {em?.label ?? journal.emotion}</span>
                          {em && <p className="text-xs text-muted-foreground mt-0.5">{em.description}</p>}
                        </div>
                      );
                    })()}

                    {journal.notes && (
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">{journal.notes}</p>
                    )}

                    {(journal.screenshotFileId || journal.screenshotUrl) && (
                      <div className="mt-3 pt-3 border-t border-blue-500/20">
                        <div className="relative group cursor-pointer" onClick={() => setViewingImage({
                          fileId: journal.screenshotFileId,
                          url: journal.screenshotUrl,
                          title: `Journal - ${journal.date}`
                        })}>
                          <DriveImage
                            fileId={journal.screenshotFileId}
                            fallbackUrl={journal.screenshotUrl}
                            alt="Journal screenshot"
                            className="rounded-lg w-full h-48 object-cover hover:opacity-90 transition-opacity"
                          />
                          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="secondary"
                              size="icon"
                              className="h-8 w-8 bg-background/80 backdrop-blur-sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setViewingImage({
                                  fileId: journal.screenshotFileId,
                                  url: journal.screenshotUrl,
                                  title: `Journal - ${journal.date}`
                                });
                              }}
                            >
                              <Expand className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </>
            )}
          </div>
        </ScrollArea>

        <ImageViewerModal
          open={!!viewingImage}
          onClose={() => setViewingImage(null)}
          fileId={viewingImage?.fileId}
          imageUrl={viewingImage?.url}
          title={viewingImage?.title}
        />
      </DialogContent>
    </Dialog>
  );
};
