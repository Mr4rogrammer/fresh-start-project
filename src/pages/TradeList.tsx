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

    setFilteredTrades(filtered);
  }, [trades, dateRange, directionFilter, profitFilter]);

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
      <div className="container mx-auto p-4 md:p-6 animate-fade-in">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-6">Trade List</h1>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 p-4 bg-card rounded-lg border">
            <div>
              <label className="text-sm font-medium mb-2 block">Date Range</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dateRange && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange?.from ? (
                      dateRange.to ? (
                        <>
                          {format(dateRange.from, "LLL dd, y")} -{" "}
                          {format(dateRange.to, "LLL dd, y")}
                        </>
                      ) : (
                        format(dateRange.from, "LLL dd, y")
                      )
                    ) : (
                      <span>Pick a date range</span>
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
                    numberOfMonths={2}
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Direction</label>
              <Select value={directionFilter} onValueChange={setDirectionFilter}>
                <SelectTrigger>
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
              <label className="text-sm font-medium mb-2 block">Result</label>
              <Select value={profitFilter} onValueChange={setProfitFilter}>
                <SelectTrigger>
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
              <Button onClick={clearFilters} variant="outline" className="w-full">
                Clear Filters
              </Button>
            </div>
          </div>

          {/* Trade Count */}
          <div className="mb-4">
            <p className="text-sm text-muted-foreground">
              Showing {filteredTrades.length} of {trades.length} trades
            </p>
          </div>

          {/* Table */}
          <div className="border rounded-lg overflow-hidden">
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
                  <TableHead>Risk Reward</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead>Link</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTrades.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                      No trades found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTrades.map((trade) => (
                    <TableRow key={trade.id} className="hover:bg-muted/50 transition-colors" >
                      <TableCell>{trade.date}</TableCell>
                      <TableCell className="font-medium">{trade.pair}</TableCell>
                      <TableCell>
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${trade.direction === "Buy"
                            ? "bg-green-500/10 text-green-500"
                            : "bg-red-500/10 text-red-500"
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
                            ? "text-green-500"
                            : trade.profit < 0
                              ? "text-red-500"
                              : "text-muted-foreground"
                            }`}
                        >
                          ${trade.profit}
                        </span>
                      </TableCell>


                      <TableCell>{calculateRiskReward(trade.entryPrice, trade.slPrice, trade.exitPrice)}</TableCell>
                      <TableCell className="max-w-xs truncate">{trade.notes || "-"}</TableCell>
                      <TableCell onClick={() => trade.link && trade.link.trim() !== "" && trade.link.includes("https") && window.open(trade.link, "_blank")}>
                        <span
                          className={`font-semibold ${trade.link && trade.link.trim() !== "" && trade.link.includes("https") ? "text-green-500" : "text-gray-500"}`}
                        >
                          {trade.link && trade.link.trim() !== "" && trade.link.includes("https") ? "Open" : "-"}

                        </span>
                      </TableCell>
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
