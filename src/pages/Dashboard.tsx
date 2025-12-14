import { useState, useEffect, useRef } from "react";
import { db } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import { useChallenge } from "@/contexts/ChallengeContext";
import { useData } from "@/contexts/DataContext";
import { useNavigate } from "react-router-dom";
import { Trade } from "@/types/trade";
import { Navbar } from "@/components/Navbar";
import { StatsCard } from "@/components/StatsCard";
import { ShareCard } from "@/components/ShareCard";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CalendarIcon, Share2, Download, X, List, FileDown, FileJson } from "lucide-react";
import { format } from "date-fns";
import { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";
import html2canvas from "html2canvas";
import { toast } from "sonner";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

const Dashboard = () => {
  const { user } = useAuth();
  const { selectedChallenge } = useChallenge();
  const { getTrades } = useData();
  const navigate = useNavigate();
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [directionFilter, setDirectionFilter] = useState<string>("all");
  const [profitFilter, setProfitFilter] = useState<string>("all");
  const [isCapturing, setIsCapturing] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewImage, setPreviewImage] = useState<string>("");
  const shareCardRef = useRef<HTMLDivElement>(null);


  useEffect(() => {
    if (!selectedChallenge) {
      navigate("/home");
    }
  }, [selectedChallenge, navigate]);

  // Get trades from context instead of fetching
  const trades = selectedChallenge ? getTrades(selectedChallenge.id) : [];

  const filteredTrades = trades.filter(trade => {
    // Date range filter
    if (dateRange?.from) {
      const tradeDate = new Date(trade.date);

      // Normalize to cover full day range
      const from = new Date(dateRange.from);
      from.setHours(0, 0, 0, 0);

      const to = new Date(dateRange.to || dateRange.from);
      to.setHours(23, 59, 59, 999);

      if (tradeDate < from || tradeDate > to) {
        return false;
      }
    }

    // Direction filter
    if (directionFilter !== "all" && trade.direction !== directionFilter) {
      return false;
    }

    // Profit filter
    if (profitFilter === "profit" && trade.profit <= 0) return false;
    if (profitFilter === "loss" && trade.profit >= 0) return false;
    if (profitFilter === "breakeven" && trade.profit !== 0) return false;

    return true;
  });

  const clearFilters = () => {
    setDateRange(undefined);
    setDirectionFilter("all");
    setProfitFilter("all");
  };

  const exportToCSV = () => {
    if (filteredTrades.length === 0) {
      toast.error("No trades to export");
      return;
    }

    const headers = ["Date", "Pair", "Direction", "Entry Price", "Exit Price", "SL Price", "Lot Size", "Profit/Loss", "Fees", "Notes"];
    const csvData = filteredTrades.map(trade => [
      trade.date,
      trade.pair,
      trade.direction,
      trade.entryPrice,
      trade.exitPrice,
      trade.slPrice,
      trade.lotSize,
      trade.profit,
      trade.fees || 0,
      trade.notes || ""
    ]);

    const csvContent = [
      headers.join(","),
      ...csvData.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `trades_${selectedChallenge?.name}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Trades exported to CSV!");
  };

  const exportToJSON = () => {
    if (filteredTrades.length === 0) {
      toast.error("No trades to export");
      return;
    }

    const exportData = {
      challenge: selectedChallenge?.name,
      exportDate: new Date().toISOString(),
      openingBalance: selectedChallenge?.openingBalance,
      currentBalance: (selectedChallenge?.openingBalance || 0) + netProfit,
      totalTrades: filteredTrades.length,
      netProfit,
      winRate,
      trades: filteredTrades
    };

    const jsonContent = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonContent], { type: "application/json;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `trades_${selectedChallenge?.name}_${new Date().toISOString().split('T')[0]}.json`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Trades exported to JSON!");
  };

  const handleShare = async () => {
    if (!shareCardRef.current) {
      toast.error("Share card not found");
      return;
    }

    setIsCapturing(true);
    toast.loading("Generating image...");

    try {
      // Wait for render
      await new Promise(resolve => setTimeout(resolve, 300));

      const canvas = await html2canvas(shareCardRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: null,
      });

      const imageUrl = canvas.toDataURL("image/png", 1.0);
      setPreviewImage(imageUrl);
      setShowPreview(true);
      setIsCapturing(false);
      toast.dismiss();
      toast.success("Image ready!");
    } catch (error: any) {
      console.error("Error:", error);
      toast.dismiss();
      toast.error(`Failed: ${error.message || 'Unknown error'}`);
      setIsCapturing(false);
    }
  };

  const handleDownload = () => {
    if (!previewImage) return;

    const link = document.createElement("a");
    link.href = previewImage;
    link.download = `mr-journal-stats-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Image downloaded!");
  };

  const handleShareNative = async () => {
    if (!previewImage) return;

    try {
      const response = await fetch(previewImage);
      const blob = await response.blob();
      const file = new File([blob], `mr-journal-stats-${Date.now()}.png`, {
        type: "image/png",
      });

      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: "Trading Stats",
          text: `Net Profit: ${netProfit >= 0 ? '+' : ''}$${netProfit.toFixed(2)} | Win Rate: ${winRate}%`,
        });
        toast.success("Shared successfully!");
      } else {
        toast.error("Sharing not supported on this device");
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        toast.error("Failed to share");
      }
    }
  };

  const netProfit = filteredTrades.reduce((sum, trade) => sum + trade.profit, 0);

  const winningTrades = filteredTrades.filter(t => t.profit > 0);
  const losingTrades = filteredTrades.filter(t => t.profit < 0);
  const breakevenTrades = filteredTrades.filter(t => t.profit === 0);

  const totalTrades = filteredTrades.length;
  const winRate = totalTrades > 0 ? ((winningTrades.length / totalTrades) * 100).toFixed(0) : "0";
  const lossRate = totalTrades > 0 ? ((losingTrades.length / totalTrades) * 100).toFixed(0) : "0";
  const breakevenRate = totalTrades > 0 ? ((breakevenTrades.length / totalTrades) * 100).toFixed(0) : "0";

  const totalFees = filteredTrades.reduce((sum, trade) => sum + trade.fees, 0);

  // Prepare chart data - cumulative profit per day
  const chartData = (() => {
    if (filteredTrades.length === 0) return [];

    // Group trades by date and calculate daily profit and count
    const dailyData = new Map<string, { profit: number; count: number }>();
    filteredTrades.forEach(trade => {
      const current = dailyData.get(trade.date) || { profit: 0, count: 0 };
      dailyData.set(trade.date, {
        profit: current.profit + trade.profit,
        count: current.count + 1
      });
    });

    // Sort dates chronologically
    const sortedDates = Array.from(dailyData.keys()).sort();

    // Calculate cumulative profit
    let cumulativeProfit = selectedChallenge?.openingBalance || 0;
    return sortedDates.map(date => {
      const data = dailyData.get(date)!;
      cumulativeProfit += data.profit;
      return {
        date: format(new Date(date), "MMM dd"),
        balance: Number(cumulativeProfit.toFixed(2)),
        profit: Number(data.profit.toFixed(2)),
        trades: data.count,
      };
    });
  })();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <Navbar />

      {/* Hidden share card for image generation */}
      <div className="fixed -left-[9999px] -top-[9999px]">
        <div ref={shareCardRef}>
          <ShareCard
            netProfit={netProfit - totalFees}
            totalTrades={totalTrades}
            winRate={winRate}
            winningTrades={winningTrades.length}
            losingTrades={losingTrades.length}
            bestTrade={winningTrades.length > 0 ? Math.max(...winningTrades.map(t => t.profit)) : 0}
            userName={"The Hidden FT"}
            dateRange={dateRange}
          />
        </div>
      </div>

      {/* Preview Modal */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-2xl bg-card/95 backdrop-blur-xl border-border/50">
          <DialogHeader>
            <DialogTitle className="text-2xl">Share Your Trading Stats</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {previewImage && (
              <div className="flex justify-center bg-muted/50 rounded-lg p-4">
                <img
                  src={previewImage}
                  alt="Trading Stats Preview"
                  className="max-w-full h-auto rounded-lg shadow-2xl"
                  style={{ maxHeight: "70vh" }}
                />
              </div>
            )}

            <div className="flex gap-3 justify-center pt-2">
              <Button
                onClick={handleDownload}
                className="gap-2 hover:scale-105 transition-all"
                size="lg"
              >
                <Download className="h-4 w-4" />
                Download
              </Button>
              {navigator.share && (
                <Button
                  onClick={handleShareNative}
                  variant="outline"
                  className="gap-2 hover:scale-105 transition-all"
                  size="lg"
                >
                  <Share2 className="h-4 w-4" />
                  Share
                </Button>
              )}
              <Button
                onClick={() => setShowPreview(false)}
                variant="ghost"
                size="lg"
                className="hover:scale-105 transition-all"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <div className="max-w-7xl mx-auto p-4 md:p-8 animate-fade-in">
        <div className="flex flex-col gap-4 mb-8 animate-slide-down">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-4xl font-bold mb-2 ">Dashboard</h1>
              <p className="text-muted-foreground text-lg">
                Analyze your trading performance
              </p>
            </div>

            {/* Quick Actions */}
            <div className="flex gap-2">
              <Button
                onClick={exportToCSV}
                variant="outline"
                className="gap-2 hover:scale-105 transition-all border-2"
                disabled={filteredTrades.length === 0}
              >
                <FileDown className="h-4 w-4" />
                Export CSV
              </Button>
              <Button
                onClick={exportToJSON}
                variant="outline"
                className="gap-2 hover:scale-105 transition-all border-2"
                disabled={filteredTrades.length === 0}
              >
                <FileJson className="h-4 w-4" />
                Export JSON
              </Button>
            </div>
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-6 bg-card/50 backdrop-blur-sm rounded-xl border border-border/50 shadow-lg hover:shadow-xl transition-shadow duration-300">
            <div className="space-y-2">
              <label className="text-sm font-medium">Date Range</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal hover:scale-105 transition-all",
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
                      <span>Filter desired trade history</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-card/95 backdrop-blur-xl border-border/50" align="start">
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
            <div className="space-y-2">
              <label className="text-sm font-medium">Direction</label>
              <Select value={directionFilter} onValueChange={setDirectionFilter}>
                <SelectTrigger className="hover:scale-105 transition-all">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card/95 backdrop-blur-xl border-border/50">
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="Buy">Buy</SelectItem>
                  <SelectItem value="Sell">Sell</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Result</label>
              <Select value={profitFilter} onValueChange={setProfitFilter}>
                <SelectTrigger className="hover:scale-105 transition-all">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card/95 backdrop-blur-xl border-border/50">
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="profit">Profit</SelectItem>
                  <SelectItem value="loss">Loss</SelectItem>
                  <SelectItem value="breakeven">Breakeven</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end gap-2">
              <Button onClick={clearFilters} variant="outline" className="flex-1 hover:scale-105 transition-all">
                Clear Filters
              </Button>
              <Button
                onClick={handleShare}
                variant="default"
                className="flex-1 gap-2 hover:scale-105 transition-all shadow-lg hover:shadow-xl hover:shadow-primary/20"
                disabled={isCapturing || filteredTrades.length === 0}
              >
                <Share2 className="h-4 w-4" />
                Share Stats
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <div className="animate-scale-in" style={{ animationDelay: "0s" }}>
            <StatsCard
              title="Opening Balance"
              value={`$${selectedChallenge?.openingBalance.toFixed(2) || '0.00'}`}
              variant="default"
            />
          </div>

          <div className="animate-scale-in" style={{ animationDelay: "0.05s" }}>
            <StatsCard
              title="Current Balance"
              value={`$${(((selectedChallenge?.openingBalance || 0) + netProfit) - totalFees).toFixed(2)}`}
              variant={(netProfit > 0 ? "profit" : netProfit < 0 ? "loss" : "neutral") as "profit" | "loss" | "neutral"}
              subtitle={`${netProfit >= 0 ? '+' : ''}$${netProfit.toFixed(2)} Net PL & -${totalFees.toFixed(2)} Fees`}
            />
          </div>

          <div className="animate-scale-in" style={{ animationDelay: "0.15s" }}>
            <StatsCard
              title="Performance"
              value={`${netProfit >= 0 ? '+' : ''}${(((netProfit - totalFees) / (selectedChallenge?.openingBalance || 1)) * 100).toFixed(2)}%`}
              variant={netProfit > 0 ? "profit" : netProfit < 0 ? "loss" : "neutral"}
              subtitle={`${netProfit >= 0 ? '+' : ''}$${netProfit.toFixed(2)} Net PL & -${totalFees.toFixed(2)} Fees`}
            />
          </div>

          <div className="animate-scale-in" style={{ animationDelay: "0.35s" }}>
            <StatsCard
              title="Win Rate"
              value={`${winRate}%`}
              variant="profit"
            />
          </div>

          <div className="animate-scale-in" style={{ animationDelay: "0.2s" }}>
            <StatsCard
              title="Winning Trades"
              value={winningTrades.length}
              subtitle={`${winRate}%`}
              variant="profit"
            />
          </div>

          <div className="animate-scale-in" style={{ animationDelay: "0.25s" }}>
            <StatsCard
              title="Losing Trades"
              value={losingTrades.length}
              subtitle={`${lossRate}%`}
              variant="loss"
            />
          </div>

          <div className="animate-scale-in" style={{ animationDelay: "0.3s" }}>
            <StatsCard
              title="Breakeven Trades"
              value={breakevenTrades.length}
              subtitle={`${breakevenRate}%`}
              variant="neutral"
            />
          </div>

          <div className="animate-scale-in" style={{ animationDelay: "0.35s" }}>
            <StatsCard
              title="Total Trades"
              value={totalTrades}
              variant="default"
            />
          </div>

        </div>

        {/* Profit Progression Chart */}
        {chartData.length > 0 && (
          <div className="bg-card/50 backdrop-blur-sm rounded-2xl p-6 border border-border/50 mb-8 shadow-lg hover:shadow-xl transition-shadow duration-300 animate-fade-in">
            <h3 className="text-xl font-semibold mb-6 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">Balance Progression</h3>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis
                  dataKey="date"
                  stroke="hsl(var(--muted-foreground))"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis
                  stroke="hsl(var(--muted-foreground))"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  tickFormatter={(value) => `$${value}`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '12px',
                    color: 'hsl(var(--foreground))',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                  }}
                  formatter={(value: number, name: string) => {
                    if (name === 'balance') return [`$${value.toFixed(2)}`, 'Balance'];
                    if (name === 'profit') return [`$${value >= 0 ? '+' : ''}${value.toFixed(2)}`, 'Daily P&L'];
                    if (name === 'trades') return [`${value} trade${value !== 1 ? 's' : ''}`, 'Trades'];
                    return value;
                  }}
                />
                <ReferenceLine
                  y={selectedChallenge?.openingBalance || 0}
                  stroke="hsl(var(--muted-foreground))"
                  strokeDasharray="3 3"
                  label={{ value: 'Opening', fill: 'hsl(var(--muted-foreground))' }}
                />
                <Line
                  type="monotone"
                  dataKey="balance"
                  stroke="hsl(var(--primary))"
                  strokeWidth={1}
                  dot={{ fill: 'hsl(var(--primary))', r: 3 }}
                  activeDot={{ r: 7, className: "animate-pulse" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Additional Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-card/50 backdrop-blur-sm rounded-2xl p-6 border border-border/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 animate-fade-in">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <span className="text-2xl">🏆</span>
              Best Day
            </h3>
            {filteredTrades.length > 0 ? (
              <div>
                {(() => {
                  const dayTotals = new Map<string, number>();
                  filteredTrades.forEach(trade => {
                    const current = dayTotals.get(trade.date) || 0;
                    dayTotals.set(trade.date, current + trade.profit);
                  });

                  let bestDay = '';
                  let bestProfit = -Infinity;
                  dayTotals.forEach((profit, date) => {
                    if (profit > bestProfit) {
                      bestProfit = profit;
                      bestDay = date;
                    }
                  });

                  return (
                    <>
                      <p className="text-3xl font-bold text-profit mb-2">
                        ${bestProfit > 0 ? `+${bestProfit.toFixed(2)}` : "0.00"}
                      </p>
                      <p className="text-muted-foreground">
                        {new Date(bestDay).toLocaleDateString('en-US', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                    </>
                  );
                })()}
              </div>
            ) : (
              <p className="text-muted-foreground">No trades yet</p>
            )}
          </div>


          <div className="bg-card/50 backdrop-blur-sm rounded-2xl p-6 border border-border/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 animate-fade-in" style={{ animationDelay: "0.1s" }}>
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <span className="text-2xl">📊</span>
              Average Trade
            </h3>
            {filteredTrades.length > 0 ? (
              <div>
                <p className={cn(
                  "text-3xl font-bold mb-2",
                  netProfit / totalTrades > 0 ? "text-profit" : "text-loss"
                )}>
                  {netProfit / totalTrades >= 0 ? '+' : ''}${(netProfit / totalTrades).toFixed(2)}
                </p>
                <p className="text-muted-foreground">
                  Per trade
                </p>
              </div>
            ) : (
              <p className="text-muted-foreground">No trades yet</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
