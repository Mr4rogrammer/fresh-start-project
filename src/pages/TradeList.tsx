import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { useChallenge } from "@/contexts/ChallengeContext";
import { useData } from "@/contexts/DataContext";
import { Trade, Journal, TRADE_EMOTIONS } from "@/types/trade";
import { Navbar } from "@/components/Navbar";
import { AddTradeModal } from "@/components/AddTradeModal";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, RefreshCw, ImageIcon, Edit, Trash2, Star, List } from "lucide-react";
import { format } from "date-fns";
import { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";
import { useTotpVerification } from "@/hooks/useTotpVerification";
import { TotpVerificationModal } from "@/components/TotpVerificationModal";
import { useCurrency, SUPPORTED_CURRENCIES } from "@/hooks/useCurrency";
import { ImageViewerModal } from "@/components/ImageViewerModal";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Info } from "lucide-react";
import { ref, update, remove, push } from "firebase/database";
import { db } from "@/lib/firebase";
import { toast } from "sonner";
import { deleteFromGoogleDrive } from "@/lib/googleDrive";

const TradeList = () => {
  const { user, loading, getAccessToken } = useAuth();
  const navigate = useNavigate();
  const { selectedChallenge } = useChallenge();
  const { getTrades, updateLocalTrades } = useData();
  const [filteredTrades, setFilteredTrades] = useState<Trade[]>([]);
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [directionFilter, setDirectionFilter] = useState<string>("all");
  const [profitFilter, setProfitFilter] = useState<string>("all");
  const [viewingImage, setViewingImage] = useState<{ fileId?: string; url?: string; title?: string } | null>(null);
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Trade | null>(null);

  const {
    currency, setCurrency, refreshingRate, fetchExchangeRates,
    currentCurrencyInfo, currentRate, fmt,
  } = useCurrency();

  const { isVerificationRequired, requireVerification, handleVerificationSuccess, cancelVerification } = useTotpVerification();

  function calculateRiskReward(entry?: number | null, stop?: number | null, tp?: number | null): string {
    const e = entry || 0, s = stop || 0, p = tp || 0;
    if (s === 0) return "-";
    const risk = Math.abs(e - s), reward = Math.abs(p - e);
    if (risk === 0) return "-";
    return "1 : " + (reward / risk).toFixed(2);
  }

  useEffect(() => { if (!loading && !user) navigate("/"); }, [user, loading, navigate]);
  useEffect(() => { if (!selectedChallenge) navigate("/home"); }, [selectedChallenge, navigate]);

  const trades = selectedChallenge ? getTrades(selectedChallenge.id) : [];

  useEffect(() => { setFilteredTrades(trades); }, [trades]);

  useEffect(() => {
    let filtered = [...trades];
    if (dateRange?.from) {
      const from = dateRange.from, to = dateRange.to || dateRange.from;
      filtered = filtered.filter(t => { const d = new Date(t.date); return d >= from && d <= to; });
    }
    if (directionFilter !== "all") filtered = filtered.filter(t => t.direction === directionFilter);
    if (profitFilter === "profit") filtered = filtered.filter(t => t.profit > 0);
    else if (profitFilter === "loss") filtered = filtered.filter(t => t.profit < 0);
    else if (profitFilter === "breakeven") filtered = filtered.filter(t => t.profit === 0);
    setFilteredTrades(filtered);
  }, [trades, dateRange, directionFilter, profitFilter]);

  const clearFilters = () => { setDateRange(undefined); setDirectionFilter("all"); setProfitFilter("all"); };

  const handleSaveTrade = async (trade: Omit<Trade, 'id' | 'createdAt'>) => {
    if (!user || !selectedChallenge || !editingTrade?.id) return;
    const performSave = async () => {
      try {
        const updated = { ...trade, createdAt: editingTrade.createdAt };
        const tradeRef = ref(db, `users/${user.uid}/challenges/${selectedChallenge.id}/trades/${editingTrade.id}`);
        await update(tradeRef, updated);
        const updatedTrades = trades.map(t => t.id === editingTrade.id ? { ...updated, id: editingTrade.id } as Trade : t);
        updateLocalTrades(selectedChallenge.id, updatedTrades);
        toast.success("Trade updated");
        setEditingTrade(null);
      } catch { toast.error("Failed to update trade"); }
    };
    requireVerification(performSave);
  };

  const handleDeleteTrade = async (trade: Trade) => {
    if (!user || !selectedChallenge || !trade.id) return;
    try {
      const tradeRef = ref(db, `users/${user.uid}/challenges/${selectedChallenge.id}/trades/${trade.id}`);
      await remove(tradeRef);
      if (trade.screenshotFileId) {
        try { const tok = await getAccessToken(); if (tok) await deleteFromGoogleDrive(tok, trade.screenshotFileId); } catch {}
      }
      updateLocalTrades(selectedChallenge.id, trades.filter(t => t.id !== trade.id));
      toast.success("Trade deleted");
    } catch { toast.error("Failed to delete trade"); }
  };

  const sym = currentCurrencyInfo.symbol;

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>
  );
  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-mesh">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Trade List</h1>
            <p className="text-muted-foreground text-sm mt-1">Review and manage your trading history</p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger className="w-[110px] h-9 text-sm border-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-card/95 backdrop-blur-xl border-border/50">
                {SUPPORTED_CURRENCIES.map(c => (
                  <SelectItem key={c.code} value={c.code}>
                    <span className="font-mono">{c.symbol}</span> {c.code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {currency !== "USD" && (
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground whitespace-nowrap">1 USD = {sym}{currentRate.toFixed(2)}</span>
                <button onClick={() => fetchExchangeRates(true)} disabled={refreshingRate} className="text-muted-foreground hover:text-primary p-1">
                  <RefreshCw className={cn("h-3.5 w-3.5", refreshingRate && "animate-spin")} />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6 p-4 bg-card/80 backdrop-blur-sm rounded-2xl border border-border/50">
          <div className="col-span-2 sm:col-span-1">
            <label className="text-xs font-medium mb-1 block">Date Range</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-full justify-start text-left font-normal text-xs h-9", !dateRange && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-3 w-3" />
                  {dateRange?.from ? (dateRange.to ? `${format(dateRange.from, "MMM dd")} - ${format(dateRange.to, "MMM dd")}` : format(dateRange.from, "LLL dd, y")) : "Pick dates"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar initialFocus mode="range" defaultMonth={dateRange?.from} selected={dateRange} onSelect={setDateRange} numberOfMonths={1} className="pointer-events-auto" />
              </PopoverContent>
            </Popover>
          </div>
          <div>
            <label className="text-xs font-medium mb-1 block">Direction</label>
            <Select value={directionFilter} onValueChange={setDirectionFilter}>
              <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="Buy">Buy</SelectItem>
                <SelectItem value="Sell">Sell</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs font-medium mb-1 block">Result</label>
            <Select value={profitFilter} onValueChange={setProfitFilter}>
              <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="profit">Profit</SelectItem>
                <SelectItem value="loss">Loss</SelectItem>
                <SelectItem value="breakeven">Breakeven</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button onClick={clearFilters} variant="outline" className="w-full h-9 text-xs">Clear</Button>
          </div>
        </div>

        <div className="mb-3">
          <p className="text-xs text-muted-foreground">Showing {filteredTrades.length} of {trades.length} trades</p>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden space-y-3">
          {filteredTrades.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground bg-card rounded-xl border border-dashed border-border/50 flex flex-col items-center gap-3">
              <List className="h-10 w-10 opacity-30" />
              <p>No trades found</p>
            </div>
          ) : filteredTrades.map((trade) => {
            const em = TRADE_EMOTIONS.find(e => e.value === trade.emotion);
            return (
              <div key={trade.id} className="bg-card rounded-lg border p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">{trade.pair}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${trade.direction === "Buy" ? "bg-profit/10 text-profit" : "bg-loss/10 text-loss"}`}>{trade.direction}</span>
                    {trade.strategy && <span className="text-[10px] text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded">{trade.strategy}</span>}
                  </div>
                  <span className={cn("font-bold text-sm font-mono", trade.profit > 0 && "text-profit", trade.profit < 0 && "text-loss/80", trade.profit === 0 && "text-breakeven")}>
                    {trade.profit > 0 ? '+' : ''}{fmt(trade.profit)}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                  <div><span className="block text-[10px] uppercase tracking-wide">Date</span><span className="text-foreground">{trade.date}</span></div>
                  <div><span className="block text-[10px] uppercase tracking-wide">Entry</span><span className="text-foreground font-mono">{trade.entryPrice}</span></div>
                  <div><span className="block text-[10px] uppercase tracking-wide">Exit</span><span className="text-foreground font-mono">{trade.exitPrice}</span></div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                  <div><span className="block text-[10px] uppercase tracking-wide">R:R</span><span className="text-foreground">{calculateRiskReward(trade.entryPrice, trade.slPrice, trade.exitPrice)}</span></div>
                  <div><span className="block text-[10px] uppercase tracking-wide">Emotion</span><span className="text-foreground">{em ? `${em.emoji} ${em.label}` : '-'}</span></div>
                </div>
                {trade.rating && (
                  <div className="flex items-center gap-0.5">
                    {[1,2,3,4,5].map(s => <Star key={s} className={`h-3 w-3 ${s <= trade.rating! ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground/30'}`} />)}
                  </div>
                )}
                {trade.notes && <p className="text-xs text-muted-foreground pt-1 border-t border-border/50 truncate">{trade.notes}</p>}
                <div className="flex items-center gap-2 pt-1 border-t border-border/30">
                  <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => { setEditingTrade(trade); setIsEditModalOpen(true); }}>
                    <Edit className="h-3 w-3" /> Edit
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-loss hover:text-loss" onClick={() => setConfirmDelete(trade)}>
                    <Trash2 className="h-3 w-3" /> Delete
                  </Button>
                  {(trade.screenshotFileId || trade.screenshotUrl) && (
                    <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-profit ml-auto" onClick={() => setViewingImage({ fileId: trade.screenshotFileId, url: trade.screenshotUrl, title: `${trade.pair} - ${trade.date}` })}>
                      <ImageIcon className="h-3 w-3" /> Image
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Desktop Table */}
        <div className="hidden md:block border rounded-xl overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Pair</TableHead>
                <TableHead>Direction</TableHead>
                <TableHead>Entry</TableHead>
                <TableHead>Exit</TableHead>
                <TableHead>Fees</TableHead>
                <TableHead>Profit/Loss</TableHead>
                <TableHead>R:R</TableHead>
                <TableHead>Emotion</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead className="w-16 text-center">Img</TableHead>
                <TableHead className="w-20 text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTrades.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={12} className="text-center py-16 text-muted-foreground">
                    <div className="flex flex-col items-center gap-3">
                      <List className="h-10 w-10 opacity-30" />
                      <p>No trades found. Adjust your filters or add trades from the calendar.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredTrades.map((trade) => {
                const em = TRADE_EMOTIONS.find(e => e.value === trade.emotion);
                return (
                  <TableRow key={trade.id} className="hover:bg-muted/50 transition-colors">
                    <TableCell className="text-sm">{trade.date}</TableCell>
                    <TableCell className="font-medium">{trade.pair}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${trade.direction === "Buy" ? "bg-profit/10 text-profit" : "bg-loss/10 text-loss"}`}>{trade.direction}</span>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{trade.entryPrice}</TableCell>
                    <TableCell className="font-mono text-sm">{trade.exitPrice}</TableCell>
                    <TableCell className="font-mono text-sm">{fmt(trade.fees)}</TableCell>
                    <TableCell>
                      <span className={cn("font-semibold font-mono text-sm", trade.profit > 0 && "text-profit", trade.profit < 0 && "text-loss/80", trade.profit === 0 && "text-breakeven")}>
                        {trade.profit > 0 ? '+' : ''}{fmt(trade.profit)}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm">{calculateRiskReward(trade.entryPrice, trade.slPrice, trade.exitPrice)}</TableCell>
                    <TableCell>
                      {em ? (
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm">{em.emoji} {em.label}</span>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-3.5 w-3.5 text-muted-foreground cursor-pointer flex-shrink-0" />
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-xs text-xs">{em.description}</TooltipContent>
                          </Tooltip>
                        </div>
                      ) : <span className="text-muted-foreground">-</span>}
                    </TableCell>
                    <TableCell className="max-w-[180px] truncate text-sm text-muted-foreground">{trade.notes || "-"}</TableCell>
                    <TableCell className="text-center">
                      {(trade.screenshotFileId || trade.screenshotUrl) ? (
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-profit hover:text-profit hover:bg-profit/10" onClick={() => setViewingImage({ fileId: trade.screenshotFileId, url: trade.screenshotUrl, title: `${trade.pair} - ${trade.date}` })}>
                          <ImageIcon className="h-4 w-4" />
                        </Button>
                      ) : <span className="text-muted-foreground">-</span>}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 justify-center">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditingTrade(trade); setIsEditModalOpen(true); }}>
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-loss/70 hover:text-loss" onClick={() => setConfirmDelete(trade)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      <AddTradeModal
        open={isEditModalOpen}
        onClose={() => { setIsEditModalOpen(false); setEditingTrade(null); }}
        onSave={handleSaveTrade}
        editingTrade={editingTrade}
      />

      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => confirmDelete && handleDeleteTrade(confirmDelete)}
        title="Delete Trade"
        description={`Are you sure you want to delete the ${confirmDelete?.pair} ${confirmDelete?.direction} trade on ${confirmDelete?.date}? This cannot be undone.`}
        confirmLabel="Delete Trade"
      />

      <TotpVerificationModal
        open={isVerificationRequired}
        onClose={cancelVerification}
        onVerify={handleVerificationSuccess}
        title="Verify to Update"
        description="Enter your 6-digit code to confirm"
      />

      <ImageViewerModal
        open={!!viewingImage}
        onClose={() => setViewingImage(null)}
        fileId={viewingImage?.fileId}
        imageUrl={viewingImage?.url}
        title={viewingImage?.title}
      />
    </div>
  );
};

export default TradeList;
