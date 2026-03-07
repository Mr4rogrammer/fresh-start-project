import { useState, useEffect, useRef } from "react";
import { useCurrency, SUPPORTED_CURRENCIES } from "@/hooks/useCurrency";
import { db } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import { useChallenge } from "@/contexts/ChallengeContext";
import { useData } from "@/contexts/DataContext";
import { useNavigate } from "react-router-dom";
import { Trade, TRADE_EMOTIONS } from "@/types/trade";
import { analyzeTrades, TradeInsight } from "@/lib/tradeAnalyzer";
import { useGeminiAnalysis, DEFAULT_PROMPT_TEMPLATE } from "@/hooks/useGeminiAnalysis";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { CalendarIcon, Share2, Download, X, List, FileDown, FileJson, RefreshCw, ChevronDown, AlertTriangle, TrendingUp, Lightbulb, Sparkles, Settings2, Loader2, RefreshCcw, KeyRound } from "lucide-react";
import { format } from "date-fns";
import { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";
import html2canvas from "html2canvas";
import { toast } from "sonner";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

const PROFIT_COLOR = 'hsl(155,55%,52%)';
const LOSS_COLOR = 'hsl(15,60%,58%)';

const Dashboard = () => {
  const { user } = useAuth();
  const { selectedChallenge } = useChallenge();
  const { getTrades } = useData();
  const navigate = useNavigate();
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    const now = new Date();
    return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: new Date(now.getFullYear(), now.getMonth() + 1, 0) };
  });
  const [directionFilter, setDirectionFilter] = useState<string>("all");
  const [profitFilter, setProfitFilter] = useState<string>("all");
  const [isCapturing, setIsCapturing] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewImage, setPreviewImage] = useState<string>("");
  const shareCardRef = useRef<HTMLDivElement>(null);
  const {
    currency,
    setCurrency,
    refreshingRate,
    fetchExchangeRates,
    currentCurrencyInfo,
    currentRate,
    fmt,
  } = useCurrency();

  const sym = currentCurrencyInfo.symbol;


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

    const headers = ["Date", "Pair", "Direction", "Entry Price", "Exit Price", "SL Price", "Lot Size", "Profit/Loss", "Fees", "Emotion", "Strategy", "Rating", "Notes"];
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
      trade.emotion || "",
      trade.strategy || "",
      trade.rating || "",
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

  const grossProfit = winningTrades.reduce((s, t) => s + t.profit, 0);
  const grossLoss = Math.abs(losingTrades.reduce((s, t) => s + t.profit, 0));
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;
  const avgWin = winningTrades.length > 0 ? grossProfit / winningTrades.length : 0;
  const avgLoss = losingTrades.length > 0 ? grossLoss / losingTrades.length : 0;

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

  // Daily P&L bar chart data
  const dailyPnLData = (() => {
    const map = new Map<string, { profit: number; trades: number }>();
    filteredTrades.forEach(t => {
      const cur = map.get(t.date) || { profit: 0, trades: 0 };
      map.set(t.date, { profit: cur.profit + t.profit, trades: cur.trades + 1 });
    });
    let runningBalance = selectedChallenge?.openingBalance || 0;
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, data]) => {
        runningBalance += data.profit;
        return {
          date: format(new Date(date), "MMM dd"),
          profit: Number(data.profit.toFixed(2)),
          profitBar: data.profit >= 0 ? Number(data.profit.toFixed(2)) : 0,
          lossBar: data.profit < 0 ? Number(data.profit.toFixed(2)) : 0,
          trades: data.trades,
          balance: Number(runningBalance.toFixed(2)),
        };
      });
  })();

  // Cumulative fees line chart data
  const feesChartData = (() => {
    const map = new Map<string, number>();
    filteredTrades.forEach(t => {
      map.set(t.date, (map.get(t.date) || 0) + (t.fees || 0));
    });
    let cumFees = 0;
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, fees]) => {
        cumFees += fees;
        return {
          date: format(new Date(date), "MMM dd"),
          fees: Number(cumFees.toFixed(2)),
          dailyFees: Number(fees.toFixed(2)),
        };
      });
  })();

  // Emotion breakdown data
  const emotionData = (() => {
    const map = new Map<string, { count: number; wins: number; losses: number; pnl: number }>();
    filteredTrades.forEach(t => {
      if (!t.emotion) return;
      const cur = map.get(t.emotion) || { count: 0, wins: 0, losses: 0, pnl: 0 };
      map.set(t.emotion, {
        count: cur.count + 1,
        wins: cur.wins + (t.profit > 0 ? 1 : 0),
        losses: cur.losses + (t.profit < 0 ? 1 : 0),
        pnl: cur.pnl + t.profit,
      });
    });
    return Array.from(map.entries())
      .map(([emotion, stats]) => ({ emotion, ...stats }))
      .sort((a, b) => b.count - a.count);
  })();

  // Pair analytics
  const pairData = (() => {
    const map = new Map<string, { trades: number; wins: number; pnl: number }>();
    filteredTrades.forEach(t => {
      const cur = map.get(t.pair) || { trades: 0, wins: 0, pnl: 0 };
      map.set(t.pair, { trades: cur.trades + 1, wins: cur.wins + (t.profit > 0 ? 1 : 0), pnl: cur.pnl + t.profit });
    });
    return Array.from(map.entries())
      .map(([pair, s]) => ({ pair, ...s, winRate: s.trades > 0 ? ((s.wins / s.trades) * 100).toFixed(0) : '0' }))
      .sort((a, b) => b.trades - a.trades);
  })();

  // Best & worst single trade
  const bestTrade = filteredTrades.length > 0 ? filteredTrades.reduce((a, b) => b.profit > a.profit ? b : a) : null;
  const worstTrade = filteredTrades.length > 0 ? filteredTrades.reduce((a, b) => b.profit < a.profit ? b : a) : null;

  // Win/loss streaks
  const { currentStreak, streakType, maxWinStreak, maxLossStreak } = (() => {
    const sorted = [...filteredTrades].sort((a, b) => a.date.localeCompare(b.date));
    let cur = 0, curType: 'win' | 'loss' | null = null, maxW = 0, maxL = 0, runW = 0, runL = 0;
    sorted.forEach(t => {
      if (t.profit > 0) {
        runW++; runL = 0;
        if (runW > maxW) maxW = runW;
        if (curType === 'win') cur++;
        else { curType = 'win'; cur = 1; }
      } else if (t.profit < 0) {
        runL++; runW = 0;
        if (runL > maxL) maxL = runL;
        if (curType === 'loss') cur++;
        else { curType = 'loss'; cur = 1; }
      }
    });
    return { currentStreak: cur, streakType: curType, maxWinStreak: maxW, maxLossStreak: maxL };
  })();

  // Max drawdown
  const maxDrawdown = (() => {
    if (chartData.length === 0) return 0;
    let peak = chartData[0].balance, maxDD = 0;
    chartData.forEach(d => {
      if (d.balance > peak) peak = d.balance;
      const dd = peak - d.balance;
      if (dd > maxDD) maxDD = dd;
    });
    return maxDD;
  })();

  // Trade Coach — runs on ALL trades for the challenge, not just filtered
  const insights: TradeInsight[] = analyzeTrades(trades);
  const gemini = useGeminiAnalysis(trades, user?.uid);
  const [showKeyManager, setShowKeyManager] = useState(false);
  const [showPromptEditor, setShowPromptEditor] = useState(false);
  const [keyDraft, setKeyDraft] = useState("");
  const [promptDraft, setPromptDraft] = useState("");
  const [promptSaving, setPromptSaving] = useState(false);

  const tooltipStyle = {
    backgroundColor: 'hsl(var(--popover))',
    border: '1px solid hsl(var(--border))',
    borderRadius: '10px',
    color: 'hsl(var(--foreground))',
    fontSize: '13px',
    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
  };

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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 animate-fade-in">
        {/* Header */}
        <div className="mb-6 sm:mb-8 animate-slide-down">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">Dashboard</h1>
              <p className="text-muted-foreground text-sm mt-1">
                Analyze your trading performance
              </p>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap sm:flex-nowrap">
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger className="w-[100px] sm:w-[110px] h-9 sm:h-10 text-sm border">
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
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    1 USD = {currentCurrencyInfo.symbol}{currentRate.toFixed(2)}
                  </span>
                  <button
                    onClick={() => fetchExchangeRates(true)}
                    disabled={refreshingRate}
                    className="text-muted-foreground hover:text-primary transition-colors p-1"
                    title="Refresh exchange rates"
                  >
                    <RefreshCw className={cn("h-3.5 w-3.5", refreshingRate && "animate-spin")} />
                  </button>
                </div>
              )}
              <Button
                onClick={exportToCSV}
                variant="outline"
                size="sm"
                className="gap-2"
                disabled={filteredTrades.length === 0}
              >
                <FileDown className="h-4 w-4" />
                CSV
              </Button>
              <Button
                onClick={exportToJSON}
                variant="outline"
                size="sm"
                className="gap-2"
                disabled={filteredTrades.length === 0}
              >
                <FileJson className="h-4 w-4" />
                JSON
              </Button>
            </div>
          </div>
        </div>

          {/* Filters */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 p-4 sm:p-6 bg-card/80 backdrop-blur-sm rounded-2xl border border-border/50 mb-6 sm:mb-8">
            <div className="space-y-1 sm:space-y-2 col-span-2 md:col-span-1">
              <label className="text-xs sm:text-sm font-medium">Date Range</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal hover:scale-105 transition-all text-xs sm:text-sm h-9 sm:h-10",
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
                      <span>Filter dates</span>
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
                    numberOfMonths={1}
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-1 sm:space-y-2">
              <label className="text-xs sm:text-sm font-medium">Direction</label>
              <Select value={directionFilter} onValueChange={setDirectionFilter}>
                <SelectTrigger className="hover:scale-105 transition-all h-9 sm:h-10 text-xs sm:text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card/95 backdrop-blur-xl border-border/50">
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="Buy">Buy</SelectItem>
                  <SelectItem value="Sell">Sell</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1 sm:space-y-2">
              <label className="text-xs sm:text-sm font-medium">Result</label>
              <Select value={profitFilter} onValueChange={setProfitFilter}>
                <SelectTrigger className="hover:scale-105 transition-all h-9 sm:h-10 text-xs sm:text-sm">
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
              <Button onClick={clearFilters} variant="outline" className="flex-1 hover:scale-105 transition-all h-9 sm:h-10 text-xs sm:text-sm">
                Clear
              </Button>
              <Button
                onClick={handleShare}
                variant="default"
                className="flex-1 gap-1 sm:gap-2 hover:scale-105 transition-all shadow-lg hover:shadow-xl hover:shadow-primary/20 h-9 sm:h-10 text-xs sm:text-sm"
                disabled={isCapturing || filteredTrades.length === 0}
              >
                <Share2 className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden xs:inline">Share</span>
              </Button>
            </div>
          </div>

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <div className="animate-scale-in" style={{ animationDelay: "0s" }}>
            <StatsCard
              title="Opening Balance"
              value={fmt(selectedChallenge?.openingBalance || 0)}
              variant="default"
            />
          </div>

          <div className="animate-scale-in" style={{ animationDelay: "0.05s" }}>
            <StatsCard
              title="Current Balance"
              value={fmt(((selectedChallenge?.openingBalance || 0) + netProfit) - totalFees)}
              variant={(netProfit > 0 ? "profit" : netProfit < 0 ? "loss" : "neutral") as "profit" | "loss" | "neutral"}
              subtitle={`${netProfit >= 0 ? '+' : ''}${fmt(netProfit)} Net PL & -${fmt(totalFees)} Fees`}
            />
          </div>

          <div className="animate-scale-in" style={{ animationDelay: "0.15s" }}>
            <StatsCard
              title="Performance"
              value={`${netProfit >= 0 ? '+' : ''}${(((netProfit - totalFees) / (selectedChallenge?.openingBalance || 1)) * 100).toFixed(2)}%`}
              variant={netProfit > 0 ? "profit" : netProfit < 0 ? "loss" : "neutral"}
              subtitle={`${netProfit >= 0 ? '+' : ''}${fmt(netProfit)} Net PL & -${fmt(totalFees)} Fees`}
            />
          </div>

          <div className="animate-scale-in" style={{ animationDelay: "0.2s" }}>
            <StatsCard
              title="Total P/L"
              value={`${(netProfit - totalFees) >= 0 ? '+' : ''}${fmt(netProfit - totalFees)}`}
              variant={(netProfit - totalFees) > 0 ? "profit" : (netProfit - totalFees) < 0 ? "loss" : "neutral"}
              subtitle="Current - Opening Balance"
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
              variant="breakeven"
            />
          </div>

          <div className="animate-scale-in" style={{ animationDelay: "0.35s" }}>
            <StatsCard
              title="Total Trades"
              value={totalTrades}
              variant="default"
            />
          </div>

          <div className="animate-scale-in" style={{ animationDelay: "0.4s" }}>
            <StatsCard
              title="Profit Factor"
              value={filteredTrades.length > 0 ? (profitFactor === Infinity ? '∞' : profitFactor.toFixed(2)) : '—'}
              subtitle={grossLoss > 0 ? `${fmt(grossProfit)} gross / ${fmt(grossLoss)} loss` : 'No losses yet'}
              variant={profitFactor >= 1.5 ? "profit" : profitFactor >= 1 ? "neutral" : "loss"}
            />
          </div>

          <div className="animate-scale-in" style={{ animationDelay: "0.45s" }}>
            {(() => {
              const wr = filteredTrades.length > 0 ? winningTrades.length / filteredTrades.length : 0;
              const lr = 1 - wr;
              const expectancy = (wr * avgWin) - (lr * avgLoss);
              return (
                <StatsCard
                  title="Expectancy"
                  value={filteredTrades.length > 0 ? `${expectancy >= 0 ? '+' : ''}${fmt(expectancy)}` : '—'}
                  subtitle="Avg profit per trade"
                  variant={expectancy > 0 ? "profit" : expectancy < 0 ? "loss" : "neutral"}
                />
              );
            })()}
          </div>

        </div>

        {/* Charts row 1: Balance Progression + Daily P&L */}
        {chartData.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
            {/* Balance Progression */}
            <div className="bg-card/80 backdrop-blur-sm rounded-2xl p-4 sm:p-6 border border-border/50 shadow-lg animate-fade-in">
              <h3 className="text-sm sm:text-base font-semibold mb-4 text-foreground/80">Balance Progression</h3>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} tickMargin={6} />
                  <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} tickFormatter={(v) => `${sym}${v}`} width={60} domain={['dataMin - 20', 'dataMax + 20']} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(value: number, name: string) => {
                    if (name === 'balance') return [fmt(value), 'Balance'];
                    return value;
                  }} />
                  <ReferenceLine y={selectedChallenge?.openingBalance || 0} stroke="hsl(var(--muted-foreground))" strokeDasharray="4 4" />
                  <Line type="monotone" dataKey="balance" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ fill: 'hsl(var(--primary))', r: 3 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Daily P&L Bars */}
            <div className="bg-card/80 backdrop-blur-sm rounded-2xl p-4 sm:p-6 border border-border/50 shadow-lg animate-fade-in">
              <h3 className="text-sm sm:text-base font-semibold mb-4 text-foreground/80">Daily P&L</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={dailyPnLData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} tickMargin={6} />
                  <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} tickFormatter={(v) => `${sym}${v}`} width={60} />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0].payload;
                      return (
                        <div style={tooltipStyle} className="px-3 py-2 space-y-1">
                          <p className="font-semibold text-foreground">{label}</p>
                          <p className={d.profit >= 0 ? 'text-[hsl(155,55%,52%)]' : 'text-[hsl(15,60%,58%)]'} style={{ color: d.profit >= 0 ? PROFIT_COLOR : LOSS_COLOR }}>
                            P&L: {d.profit >= 0 ? '+' : ''}{fmt(d.profit)}
                          </p>
                          <p className="text-muted-foreground text-xs">{d.trades} trade{d.trades !== 1 ? 's' : ''}</p>
                          <p className="text-muted-foreground text-xs">Balance: {fmt(d.balance)}</p>
                        </div>
                      );
                    }}
                  />
                  <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeOpacity={0.5} />
                  <Bar dataKey="profitBar" fill={PROFIT_COLOR} fillOpacity={0.85} radius={[3,3,0,0]} isAnimationActive={false} />
                  <Bar dataKey="lossBar" fill={LOSS_COLOR} fillOpacity={0.85} radius={[3,3,0,0]} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Charts row 2: Fees + Best/Avg */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
          {/* Cumulative Fees */}
          {feesChartData.length > 0 && (
            <div className="bg-card/80 backdrop-blur-sm rounded-2xl p-4 sm:p-6 border border-border/50 shadow-lg animate-fade-in">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm sm:text-base font-semibold text-foreground/80">Cumulative Fees</h3>
                <span className="text-sm font-mono text-loss/80 font-semibold">-{fmt(totalFees)}</span>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={feesChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} tickMargin={6} />
                  <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} tickFormatter={(v) => `${sym}${v}`} width={60} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(value: number, name: string) => {
                    if (name === 'fees') return [fmt(value), 'Cumulative Fees'];
                    if (name === 'dailyFees') return [fmt(value), 'Daily Fees'];
                    return value;
                  }} />
                  <Line type="monotone" dataKey="fees" stroke="hsl(var(--loss))" strokeWidth={2} dot={{ fill: 'hsl(var(--loss))', r: 3 }} activeDot={{ r: 6 }} strokeOpacity={0.8} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Best day + Average trade */}
          <div className="grid grid-rows-2 gap-4">
            <div className="bg-card/80 backdrop-blur-sm rounded-2xl p-4 sm:p-5 border border-border/50 shadow-lg animate-fade-in">
              <h3 className="text-sm font-semibold mb-2 text-foreground/80 flex items-center gap-2">
                <span>🏆</span> Best Day
              </h3>
              {filteredTrades.length > 0 ? (() => {
                const dayTotals = new Map<string, number>();
                filteredTrades.forEach(t => dayTotals.set(t.date, (dayTotals.get(t.date) || 0) + t.profit));
                let bestDay = '', bestProfit = -Infinity;
                dayTotals.forEach((profit, date) => { if (profit > bestProfit) { bestProfit = profit; bestDay = date; } });
                return (
                  <div className="flex items-baseline justify-between">
                    <p className="text-2xl font-bold text-profit font-mono">{bestProfit > 0 ? `+${fmt(bestProfit)}` : fmt(0)}</p>
                    <p className="text-xs text-muted-foreground">{new Date(bestDay).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</p>
                  </div>
                );
              })() : <p className="text-sm text-muted-foreground">No trades yet</p>}
            </div>

            <div className="bg-card/80 backdrop-blur-sm rounded-2xl p-4 sm:p-5 border border-border/50 shadow-lg animate-fade-in">
              <h3 className="text-sm font-semibold mb-2 text-foreground/80 flex items-center gap-2">
                <span>📊</span> Average Trade
              </h3>
              {filteredTrades.length > 0 ? (
                <div className="flex items-baseline justify-between">
                  <p className={cn("text-2xl font-bold font-mono", netProfit / totalTrades >= 0 ? "text-profit" : "text-loss/80")}>
                    {netProfit / totalTrades >= 0 ? '+' : ''}{fmt(netProfit / totalTrades)}
                  </p>
                  <p className="text-xs text-muted-foreground">per trade</p>
                </div>
              ) : <p className="text-sm text-muted-foreground">No trades yet</p>}
            </div>
          </div>
        </div>

        {/* Best/Worst + Streaks + Drawdown */}
        {filteredTrades.length > 0 && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6 sm:mb-8">
            <div className="bg-card/80 backdrop-blur-sm rounded-2xl p-4 border border-border/50 shadow-lg">
              <p className="text-xs text-muted-foreground mb-1">Best Trade</p>
              <p className="text-xl font-bold text-profit font-mono">+{fmt(bestTrade?.profit || 0)}</p>
              <p className="text-xs text-muted-foreground mt-1">{bestTrade?.pair} · {bestTrade?.date}</p>
            </div>
            <div className="bg-card/80 backdrop-blur-sm rounded-2xl p-4 border border-border/50 shadow-lg">
              <p className="text-xs text-muted-foreground mb-1">Worst Trade</p>
              <p className="text-xl font-bold text-loss/80 font-mono">{fmt(worstTrade?.profit || 0)}</p>
              <p className="text-xs text-muted-foreground mt-1">{worstTrade?.pair} · {worstTrade?.date}</p>
            </div>
            <div className="bg-card/80 backdrop-blur-sm rounded-2xl p-4 border border-border/50 shadow-lg">
              <p className="text-xs text-muted-foreground mb-1">Current Streak</p>
              <p className={cn("text-xl font-bold font-mono", streakType === 'win' ? 'text-profit' : streakType === 'loss' ? 'text-loss/80' : 'text-muted-foreground')}>
                {currentStreak > 0 ? `${currentStreak} ${streakType === 'win' ? 'W' : 'L'}` : '-'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Best W: {maxWinStreak} · Best L: {maxLossStreak}</p>
            </div>
            <div className="bg-card/80 backdrop-blur-sm rounded-2xl p-4 border border-border/50 shadow-lg">
              <p className="text-xs text-muted-foreground mb-1">Max Drawdown</p>
              <p className="text-xl font-bold text-loss/80 font-mono">-{fmt(maxDrawdown)}</p>
              <p className="text-xs text-muted-foreground mt-1">From peak balance</p>
            </div>
          </div>
        )}

        {/* Day of Week Heatmap */}
        {filteredTrades.length >= 5 && (
          <div className="bg-card/80 backdrop-blur-sm rounded-2xl p-4 sm:p-6 border border-border/50 shadow-lg animate-fade-in mb-6 sm:mb-8">
            <h3 className="text-sm sm:text-base font-semibold mb-4 text-foreground/80">Day of Week Performance</h3>
            <div className="grid grid-cols-5 gap-2 sm:gap-3">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map((day, idx) => {
                const dowTrades = filteredTrades.filter(t => {
                  const d = new Date(t.date);
                  return d.getDay() === idx + 1; // Mon=1 ... Fri=5
                });
                const pnl = dowTrades.reduce((s, t) => s + t.profit, 0);
                const wins = dowTrades.filter(t => t.profit > 0).length;
                const wr = dowTrades.length > 0 ? Math.round((wins / dowTrades.length) * 100) : null;
                const isProfit = pnl > 0;
                const isLoss = pnl < 0;
                return (
                  <div
                    key={day}
                    className={cn(
                      "rounded-xl p-3 sm:p-4 border text-center",
                      dowTrades.length === 0 && "bg-muted/20 border-border/20",
                      isProfit && "bg-profit/8 border-profit/20",
                      isLoss && "bg-loss/5 border-loss/15",
                      !isProfit && !isLoss && dowTrades.length > 0 && "bg-muted/30 border-border/30"
                    )}
                  >
                    <p className="text-xs font-semibold text-muted-foreground mb-2">{day}</p>
                    {dowTrades.length > 0 ? (
                      <>
                        <p className={cn(
                          "text-sm sm:text-base font-bold font-mono mb-1",
                          isProfit ? "text-profit" : isLoss ? "text-loss/80" : "text-muted-foreground"
                        )}>
                          {isProfit ? '+' : ''}{fmt(pnl)}
                        </p>
                        <p className="text-xs text-muted-foreground">{dowTrades.length} trade{dowTrades.length !== 1 ? 's' : ''}</p>
                        <p className={cn("text-xs font-medium mt-1", Number(wr) >= 50 ? "text-profit" : "text-loss/70")}>{wr}% W</p>
                      </>
                    ) : (
                      <p className="text-xs text-muted-foreground/40 mt-3">No trades</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Pair Analytics */}
        {pairData.length > 0 && (
          <div className="bg-card/80 backdrop-blur-sm rounded-2xl p-4 sm:p-6 border border-border/50 shadow-lg animate-fade-in mb-6 sm:mb-8">
            <h3 className="text-sm sm:text-base font-semibold mb-4 text-foreground/80">Pair Analytics</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50 text-xs text-muted-foreground uppercase tracking-wide">
                    <th className="text-left pb-3 pr-4">Pair</th>
                    <th className="text-center pb-3 px-3">Trades</th>
                    <th className="text-center pb-3 px-3">Wins</th>
                    <th className="text-center pb-3 px-3">Win%</th>
                    <th className="text-right pb-3 pl-3">Total P&L</th>
                    <th className="text-right pb-3 pl-3">Avg P&L</th>
                  </tr>
                </thead>
                <tbody>
                  {pairData.map(row => (
                    <tr key={row.pair} className="border-b border-border/30 hover:bg-muted/30 transition-colors">
                      <td className="py-2.5 pr-4 font-semibold">{row.pair}</td>
                      <td className="py-2.5 px-3 text-center font-mono">{row.trades}</td>
                      <td className="py-2.5 px-3 text-center text-profit font-mono">{row.wins}</td>
                      <td className="py-2.5 px-3 text-center">
                        <span className={cn("text-xs font-medium px-1.5 py-0.5 rounded", Number(row.winRate) >= 50 ? "bg-profit/10 text-profit" : "bg-loss/10 text-loss/80")}>{row.winRate}%</span>
                      </td>
                      <td className={cn("py-2.5 pl-3 text-right font-mono font-semibold", row.pnl > 0 ? "text-profit" : row.pnl < 0 ? "text-loss/80" : "text-muted-foreground")}>
                        {row.pnl > 0 ? '+' : ''}{fmt(row.pnl)}
                      </td>
                      <td className={cn("py-2.5 pl-3 text-right font-mono text-sm", (row.pnl/row.trades) > 0 ? "text-profit" : "text-loss/80")}>
                        {(row.pnl/row.trades) > 0 ? '+' : ''}{fmt(row.pnl/row.trades)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Trade Coach */}
        {trades.length >= 5 && (
          <div className="bg-card/80 backdrop-blur-sm rounded-2xl p-4 sm:p-6 border border-border/50 shadow-lg animate-fade-in mb-6 sm:mb-8">
            <div className="flex items-center gap-2 mb-5">
              <h3 className="text-sm sm:text-base font-semibold text-foreground/80">Trade Coach</h3>
              <span className="text-xs text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-full">Based on all {trades.length} trades</span>
            </div>
            {insights.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Not enough data yet for meaningful insights. Keep logging trades.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {insights.map(insight => {
                  const isWarning = insight.type === 'warning';
                  const isPositive = insight.type === 'positive';
                  return (
                    <div
                      key={insight.id}
                      className={cn(
                        "rounded-xl p-4 border",
                        isWarning && "bg-loss/5 border-loss/20",
                        isPositive && "bg-profit/5 border-profit/20",
                        !isWarning && !isPositive && "bg-muted/40 border-border/40"
                      )}
                    >
                      <div className="flex items-start gap-2.5">
                        <div className={cn(
                          "mt-0.5 flex-shrink-0 rounded-full p-1",
                          isWarning && "bg-loss/15 text-loss",
                          isPositive && "bg-profit/15 text-profit",
                          !isWarning && !isPositive && "bg-muted text-muted-foreground"
                        )}>
                          {isWarning && <AlertTriangle className="h-3.5 w-3.5" />}
                          {isPositive && <TrendingUp className="h-3.5 w-3.5" />}
                          {!isWarning && !isPositive && <Lightbulb className="h-3.5 w-3.5" />}
                        </div>
                        <div>
                          <p className={cn(
                            "text-xs font-semibold mb-1",
                            isWarning && "text-loss",
                            isPositive && "text-profit",
                            !isWarning && !isPositive && "text-foreground"
                          )}>
                            {insight.title}
                          </p>
                          <p className="text-xs text-muted-foreground leading-relaxed">{insight.body}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Gemini AI Coaching */}
        {trades.length >= 5 && (
          <div className="bg-card/80 backdrop-blur-sm rounded-2xl p-4 sm:p-6 border border-border/50 shadow-lg animate-fade-in mb-6 sm:mb-8">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <h3 className="text-sm sm:text-base font-semibold text-foreground/80">AI Coaching Report</h3>
                <span className="text-xs text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-full">Groq · Llama 3</span>
                {gemini.apiKeys.length > 0 && (
                  <span className="text-xs text-profit bg-profit/10 px-2 py-0.5 rounded-full">{gemini.apiKeys.length} key{gemini.apiKeys.length > 1 ? 's' : ''}</span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {gemini.report && !gemini.loading && (
                  <button onClick={() => gemini.generate()} className="text-muted-foreground hover:text-primary p-1.5 transition-colors rounded-lg hover:bg-muted/50" title="Regenerate">
                    <RefreshCcw className="h-3.5 w-3.5" />
                  </button>
                )}
                <button
                  onClick={() => { setShowPromptEditor(v => !v); setPromptDraft(gemini.promptTemplate); setShowKeyManager(false); }}
                  className={cn("p-1.5 transition-colors rounded-lg hover:bg-muted/50", showPromptEditor ? "text-primary" : "text-muted-foreground hover:text-primary")}
                  title="Edit prompt"
                >
                  <Lightbulb className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => { setShowKeyManager(v => !v); setKeyDraft(""); setShowPromptEditor(false); }}
                  className={cn("p-1.5 transition-colors rounded-lg hover:bg-muted/50", showKeyManager ? "text-primary" : "text-muted-foreground hover:text-primary")}
                  title="Manage API keys"
                >
                  <Settings2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Key manager panel */}
            {showKeyManager && (
              <div className="mb-4 p-4 bg-muted/40 rounded-xl border border-border/40 space-y-3">
                <p className="text-xs text-muted-foreground font-medium">Groq API Keys — stored in Firebase, picked randomly per request</p>
                {gemini.apiKeys.map((k, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-xs font-mono bg-muted px-2 py-1 rounded flex-1 truncate text-muted-foreground">
                      {k.slice(0, 8)}••••••••{k.slice(-4)}
                    </span>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-loss/70 hover:text-loss" onClick={() => gemini.removeKey(k)}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
                <div className="flex gap-2">
                  <Input
                    type="password"
                    placeholder="Paste Groq API key (gsk_...)"
                    value={keyDraft}
                    onChange={e => setKeyDraft(e.target.value)}
                    className="h-8 text-xs font-mono"
                    onKeyDown={e => { if (e.key === 'Enter' && keyDraft) { gemini.addKey(keyDraft); setKeyDraft(""); } }}
                  />
                  <Button size="sm" className="h-8 text-xs whitespace-nowrap" disabled={!keyDraft} onClick={() => { gemini.addKey(keyDraft); setKeyDraft(""); }}>
                    Add Key
                  </Button>
                </div>
              </div>
            )}

            {/* Prompt editor panel */}
            {showPromptEditor && (
              <div className="mb-4 p-4 bg-muted/40 rounded-xl border border-border/40 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-foreground/80">Customize AI Prompt</p>
                  <button
                    onClick={async () => { setPromptDraft(DEFAULT_PROMPT_TEMPLATE); await gemini.resetPromptTemplate(); }}
                    className="text-xs text-muted-foreground hover:text-primary underline"
                  >
                    Reset to default
                  </button>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Use <code className="bg-muted px-1 py-0.5 rounded text-[11px]">{"{{stats}}"}</code> and <code className="bg-muted px-1 py-0.5 rounded text-[11px]">{"{{insights}}"}</code> — these are replaced with your actual trade data when the report is generated.
                </p>
                <Textarea
                  value={promptDraft}
                  onChange={e => setPromptDraft(e.target.value)}
                  className="text-xs font-mono min-h-[220px] resize-y"
                  spellCheck={false}
                />
                <div className="flex gap-2 justify-end">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs"
                    onClick={() => { setShowPromptEditor(false); setPromptDraft(""); }}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    className="h-8 text-xs gap-1.5"
                    disabled={promptSaving || !promptDraft.trim()}
                    onClick={async () => {
                      setPromptSaving(true);
                      await gemini.savePromptTemplate(promptDraft);
                      setPromptSaving(false);
                      setShowPromptEditor(false);
                    }}
                  >
                    {promptSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                    Save & Close
                  </Button>
                </div>
              </div>
            )}

            {/* No keys yet */}
            {gemini.apiKeys.length === 0 && !gemini.keysLoading && !showKeyManager && (
              <div className="flex flex-col items-center gap-3 py-6 text-center">
                <div className="p-3 bg-primary/10 rounded-full">
                  <KeyRound className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">Add your Gemini API keys</p>
                  <p className="text-xs text-muted-foreground mt-1">Add up to 2 keys from console.groq.com — one is picked randomly each time to stay within free limits. Keys are saved to your Firebase account.</p>
                </div>
                <Button size="sm" variant="outline" className="gap-2" onClick={() => setShowKeyManager(true)}>
                  <Settings2 className="h-3.5 w-3.5" /> Manage Keys
                </Button>
              </div>
            )}

            {/* Loading */}
            {gemini.loading && (
              <div className="flex items-center gap-3 py-6 justify-center text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <span className="text-sm">Gemini is reviewing your trades...</span>
              </div>
            )}

            {/* Error */}
            {gemini.error && !gemini.loading && (
              <div className="flex items-center gap-2 p-3 bg-loss/10 rounded-xl border border-loss/20 text-loss text-sm">
                <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                <span>{gemini.error}</span>
              </div>
            )}

            {/* Report */}
            {gemini.report && !gemini.loading && (
              <div className="space-y-3">
                {gemini.report.split(/\n\n+/).filter(p => p.trim()).map((para, i) => (
                  <p key={i} className="text-sm text-foreground/80 leading-relaxed">{para.trim()}</p>
                ))}
                {gemini.isStale && (
                  <p className="text-xs text-muted-foreground pt-2 border-t border-border/40">
                    Trade data has changed.{" "}
                    <button className="text-primary underline" onClick={() => gemini.generate()}>Regenerate report</button>
                  </p>
                )}
              </div>
            )}

            {/* Keys loaded, no report yet */}
            {gemini.apiKeys.length > 0 && !gemini.report && !gemini.loading && !gemini.error && (
              <div className="flex justify-center py-4">
                <Button onClick={() => gemini.generate()} className="gap-2">
                  <Sparkles className="h-4 w-4" />
                  Generate Coaching Report
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Emotion Breakdown */}
        {emotionData.length > 0 && (
          <div className="bg-card/80 backdrop-blur-sm rounded-2xl p-4 sm:p-6 border border-border/50 shadow-lg animate-fade-in mb-6 sm:mb-8">
            <h3 className="text-sm sm:text-base font-semibold mb-4 text-foreground/80">Emotion Breakdown</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50 text-xs text-muted-foreground uppercase tracking-wide">
                    <th className="text-left pb-3 pr-4">Emotion</th>
                    <th className="text-left pb-3 pr-4 hidden sm:table-cell">Description</th>
                    <th className="text-center pb-3 px-3">Trades</th>
                    <th className="text-center pb-3 px-3">Wins</th>
                    <th className="text-center pb-3 px-3">Losses</th>
                    <th className="text-center pb-3 px-3">Win%</th>
                    <th className="text-right pb-3 pl-3">Total P&L</th>
                  </tr>
                </thead>
                <tbody>
                  {emotionData.map((row) => {
                    const em = TRADE_EMOTIONS.find(e => e.value === row.emotion);
                    const winPct = row.count > 0 ? ((row.wins / row.count) * 100).toFixed(0) : '0';
                    return (
                      <tr key={row.emotion} className="border-b border-border/30 hover:bg-muted/30 transition-colors">
                        <td className="py-3 pr-4">
                          <span className="font-medium">{em?.emoji} {em?.label ?? row.emotion}</span>
                        </td>
                        <td className="py-3 pr-4 hidden sm:table-cell">
                          <span className="text-xs text-muted-foreground line-clamp-1">{em?.description}</span>
                        </td>
                        <td className="py-3 px-3 text-center font-mono">{row.count}</td>
                        <td className="py-3 px-3 text-center text-profit font-mono">{row.wins}</td>
                        <td className="py-3 px-3 text-center text-loss/80 font-mono">{row.losses}</td>
                        <td className="py-3 px-3 text-center">
                          <span className={cn(
                            "text-xs font-medium px-1.5 py-0.5 rounded",
                            Number(winPct) >= 50 ? "bg-profit/10 text-profit" : "bg-loss/10 text-loss/80"
                          )}>
                            {winPct}%
                          </span>
                        </td>
                        <td className={cn(
                          "py-3 pl-3 text-right font-mono font-semibold",
                          row.pnl > 0 ? "text-profit" : row.pnl < 0 ? "text-loss/80" : "text-muted-foreground"
                        )}>
                          {row.pnl > 0 ? '+' : ''}{fmt(row.pnl)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
