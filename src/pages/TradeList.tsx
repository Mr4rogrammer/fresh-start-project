import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { useChallenge } from "@/contexts/ChallengeContext";
import { useData } from "@/contexts/DataContext";
import { Trade } from "@/types/trade";
import { Navbar } from "@/components/Navbar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Share2 } from "lucide-react";
import { format } from "date-fns";
import { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";
import { ShareCard } from "@/components/ShareCard";
import { toast } from "sonner";
import { useTotpVerification } from "@/hooks/useTotpVerification";
import { TotpVerificationModal } from "@/components/TotpVerificationModal";

const TradeList = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { selectedChallenge } = useChallenge();
  const { getTrades } = useData();
  const [filteredTrades, setFilteredTrades] = useState<Trade[]>([]);
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [directionFilter, setDirectionFilter] = useState<string>("all");
  const [profitFilter, setProfitFilter] = useState<string>("all");

  const {
    isVerificationRequired,
    requireVerification,
    handleVerificationSuccess,
    cancelVerification,
  } = useTotpVerification();

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

  useEffect(() => {
    if (!loading && !user) {
      navigate("/");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!selectedChallenge) {
      navigate("/home");
    }
  }, [selectedChallenge, navigate]);

  // Get trades from context instead of fetching
  const trades = selectedChallenge ? getTrades(selectedChallenge.id) : [];

  useEffect(() => {
    setFilteredTrades(trades);
  }, [trades]);

  useEffect(() => {
    let filtered = [...trades];

    // Date range filter
    if (dateRange?.from) {
      const from = dateRange.from;
      const to = dateRange.to || dateRange.from;
      filtered = filtered.filter((trade) => {
        const tradeDate = new Date(trade.date);
        return tradeDate >= from && tradeDate <= to;
      });
    }

    // Direction filter
    if (directionFilter !== "all") {
      filtered = filtered.filter((trade) => trade.direction === directionFilter);
    }

    // Profit/Loss filter
    if (profitFilter === "profit") {
      filtered = filtered.filter((trade) => trade.profit > 0);
    } else if (profitFilter === "loss") {
      filtered = filtered.filter((trade) => trade.profit < 0);
    } else if (profitFilter === "breakeven") {
      filtered = filtered.filter((trade) => trade.profit === 0);
    }

    // Sort by date (newest first), then by createdAt (newest first) for same-day trades
    filtered.sort((a, b) => {
      const dateCompare = new Date(b.date).getTime() - new Date(a.date).getTime();
      if (dateCompare !== 0) return dateCompare;
      // For same date, sort by createdAt
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    setFilteredTrades(filtered);
  }, [trades, dateRange, directionFilter, profitFilter]);

  // Calculate running totals from bottom (oldest) to top (newest)
  const tradesWithRunningTotal = filteredTrades.map((trade, index) => {
    const runningTotal = filteredTrades
      .slice(index) // from current row to the end (bottom)
      .reduce((sum, t) => sum + t.profit, 0);
    return { ...trade, runningTotal };
  });

  const clearFilters = () => {
    setDateRange(undefined);
    setDirectionFilter("all");
    setProfitFilter("all");
  };


  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto p-2 sm:p-4 md:p-6 animate-fade-in">
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6">Trade List</h1>

          {/* Filters */}
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4 mb-4 sm:mb-6 p-3 sm:p-4 bg-card rounded-lg border">
            <div className="col-span-2 sm:col-span-1">
              <label className="text-xs sm:text-sm font-medium mb-1 sm:mb-2 block">Date Range</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal text-xs sm:text-sm h-9 sm:h-10",
                      !dateRange && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                    {dateRange?.from ? (
                      dateRange.to ? (
                        <span className="truncate">
                          {format(dateRange.from, "MMM dd")} - {format(dateRange.to, "MMM dd")}
                        </span>
                      ) : (
                        format(dateRange.from, "LLL dd, y")
                      )
                    ) : (
                      <span>Pick dates</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={dateRange?.from}
                    selected={dateRange}
                    onSelect={setDateRange}
                    numberOfMonths={1}
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <label className="text-xs sm:text-sm font-medium mb-1 sm:mb-2 block">Direction</label>
              <Select value={directionFilter} onValueChange={setDirectionFilter}>
                <SelectTrigger className="h-9 sm:h-10 text-xs sm:text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="Buy">Buy</SelectItem>
                  <SelectItem value="Sell">Sell</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs sm:text-sm font-medium mb-1 sm:mb-2 block">Result</label>
              <Select value={profitFilter} onValueChange={setProfitFilter}>
                <SelectTrigger className="h-9 sm:h-10 text-xs sm:text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="profit">Profit</SelectItem>
                  <SelectItem value="loss">Loss</SelectItem>
                  <SelectItem value="breakeven">Breakeven</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button onClick={clearFilters} variant="outline" className="w-full h-9 sm:h-10 text-xs sm:text-sm">
                Clear
              </Button>
            </div>
          </div>

          {/* Trade Count */}
          <div className="mb-3 sm:mb-4">
            <p className="text-xs sm:text-sm text-muted-foreground">
              Showing {filteredTrades.length} of {trades.length} trades
            </p>
          </div>

          {/* Mobile Trade Cards */}
          <div className="md:hidden space-y-3">
            {tradesWithRunningTotal.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground bg-card rounded-lg border">
                No trades found
              </div>
            ) : (
              tradesWithRunningTotal.map((trade) => (
                <div key={trade.id} className="bg-card rounded-lg border p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">{trade.pair}</span>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                          trade.direction === "Buy"
                            ? "bg-profit/10 text-profit"
                            : "bg-loss/10 text-loss"
                        }`}
                      >
                        {trade.direction}
                      </span>
                    </div>
                    <div className="flex flex-col items-end">
                      <span
                        className={`font-bold text-sm ${
                          trade.profit > 0
                            ? "text-profit"
                            : trade.profit < 0
                              ? "text-loss"
                              : "text-muted-foreground"
                        }`}
                      >
                        {trade.profit > 0 ? '+' : ''}${trade.profit.toFixed(2)}
                      </span>
                      <span
                        className={`text-xs ${
                          trade.runningTotal > 0
                            ? "text-profit"
                            : trade.runningTotal < 0
                              ? "text-loss"
                              : "text-muted-foreground"
                        }`}
                      >
                        Total: {trade.runningTotal > 0 ? '+' : ''}${trade.runningTotal.toFixed(2)}
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                    <div>
                      <span className="block text-[10px] uppercase tracking-wide">Date</span>
                      <span className="text-foreground">{trade.date}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] uppercase tracking-wide">Entry</span>
                      <span className="text-foreground font-mono">{trade.entryPrice}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] uppercase tracking-wide">Exit</span>
                      <span className="text-foreground font-mono">{trade.exitPrice}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                    <div>
                      <span className="block text-[10px] uppercase tracking-wide">SL</span>
                      <span className="text-foreground font-mono">{trade.slPrice || '-'}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] uppercase tracking-wide">Lot</span>
                      <span className="text-foreground">{trade.lotSize}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] uppercase tracking-wide">R:R</span>
                      <span className="text-foreground">{calculateRiskReward(trade.entryPrice, trade.slPrice, trade.exitPrice)}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block border rounded-lg overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Pair</TableHead>
                  <TableHead>Direction</TableHead>
                  <TableHead>Entry</TableHead>
                  <TableHead>Exit</TableHead>
                  <TableHead>SL</TableHead>
                  <TableHead>Lot Size</TableHead>
                  <TableHead>Fees</TableHead>
                  <TableHead>Profit/Loss</TableHead>
                  <TableHead>Running Total</TableHead>
                  <TableHead>Risk Reward</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tradesWithRunningTotal.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                      No trades found
                    </TableCell>
                  </TableRow>
                ) : (
                  tradesWithRunningTotal.map((trade) => (
                    <TableRow key={trade.id} className="hover:bg-muted/50 transition-colors" >
                      <TableCell>{trade.date}</TableCell>
                      <TableCell className="font-medium">{trade.pair}</TableCell>
                      <TableCell>
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${trade.direction === "Buy"
                            ? "bg-profit/10 text-profit"
                            : "bg-loss/10 text-loss"
                            }`}
                        >
                          {trade.direction}
                        </span>
                      </TableCell>
                      <TableCell>{trade.entryPrice}</TableCell>
                      <TableCell>{trade.exitPrice}</TableCell>
                      <TableCell>{trade.slPrice}</TableCell>
                      <TableCell>{trade.lotSize}</TableCell>
                      <TableCell>${trade.fees}</TableCell>

                      <TableCell>
                        <span
                          className={`font-semibold ${trade.profit > 0
                            ? "text-profit"
                            : trade.profit < 0
                              ? "text-loss"
                              : "text-muted-foreground"
                            }`}
                        >
                          ${trade.profit}
                        </span>
                      </TableCell>

                      <TableCell>
                        <span
                          className={`font-semibold ${trade.runningTotal > 0
                            ? "text-profit"
                            : trade.runningTotal < 0
                              ? "text-loss"
                              : "text-muted-foreground"
                            }`}
                        >
                          ${trade.runningTotal.toFixed(2)}
                        </span>
                      </TableCell>

                      <TableCell>{calculateRiskReward(trade.entryPrice, trade.slPrice, trade.exitPrice)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        <TotpVerificationModal
          open={isVerificationRequired}
          onClose={cancelVerification}
          onVerify={handleVerificationSuccess}
          title="Verify to Continue"
          description="Enter your 6-digit code to confirm this action"
        />
      </div>
    </div>
  );
};

export default TradeList;
