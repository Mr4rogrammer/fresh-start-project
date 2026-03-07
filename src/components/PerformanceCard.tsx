import { useRef, useState } from "react";
import { Trade } from "@/types/trade";
import { format } from "date-fns";
import { DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Download, Share2, X, Image as ImageIcon } from "lucide-react";
import html2canvas from "html2canvas";
import { toast } from "sonner";

interface PerformanceCardProps {
  trades: Trade[];
  openingBalance: number;
  dateRange?: DateRange;
  userName?: string;
  currencySymbol: string;
  formatValue: (v: number) => string;
}

export const PerformanceCard = ({
  trades,
  openingBalance,
  dateRange,
  userName = "Trader",
  currencySymbol,
  formatValue,
}: PerformanceCardProps) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [previewImage, setPreviewImage] = useState("");
  const [capturing, setCapturing] = useState(false);

  // Stats
  const netProfit = trades.reduce((s, t) => s + t.profit, 0);
  const totalFees = trades.reduce((s, t) => s + (t.fees || 0), 0);
  const winningTrades = trades.filter((t) => t.profit > 0);
  const losingTrades = trades.filter((t) => t.profit < 0);
  const totalTrades = trades.length;
  const winRate =
    totalTrades > 0
      ? ((winningTrades.length / totalTrades) * 100).toFixed(1)
      : "0";
  const grossProfit = winningTrades.reduce((s, t) => s + t.profit, 0);
  const grossLoss = Math.abs(losingTrades.reduce((s, t) => s + t.profit, 0));
  const profitFactor =
    grossLoss > 0 ? (grossProfit / grossLoss).toFixed(2) : grossProfit > 0 ? "∞" : "0";
  const avgWin =
    winningTrades.length > 0 ? grossProfit / winningTrades.length : 0;
  const avgLoss =
    losingTrades.length > 0 ? grossLoss / losingTrades.length : 0;
  const bestTrade =
    trades.length > 0 ? Math.max(...trades.map((t) => t.profit)) : 0;
  const worstTrade =
    trades.length > 0 ? Math.min(...trades.map((t) => t.profit)) : 0;

  const currentBalance = openingBalance + netProfit - totalFees;
  const returnPct =
    openingBalance > 0
      ? (((netProfit - totalFees) / openingBalance) * 100).toFixed(2)
      : "0";

  // Max drawdown
  const maxDrawdownInfo = (() => {
    if (trades.length === 0) return { value: 0, pct: 0 };
    const dailyMap = new Map<string, number>();
    trades.forEach((t) =>
      dailyMap.set(t.date, (dailyMap.get(t.date) || 0) + t.profit)
    );
    const sortedDates = Array.from(dailyMap.keys()).sort();
    let balance = openingBalance;
    let peak = openingBalance;
    let maxDD = 0;
    sortedDates.forEach((d) => {
      balance += dailyMap.get(d)!;
      if (balance > peak) peak = balance;
      const dd = peak - balance;
      if (dd > maxDD) maxDD = dd;
    });
    return {
      value: maxDD,
      pct: peak > 0 ? (maxDD / peak) * 100 : 0,
    };
  })();

  // Mini equity line (SVG polyline points)
  const equityPoints = (() => {
    if (trades.length === 0) return "";
    const dailyMap = new Map<string, number>();
    trades.forEach((t) =>
      dailyMap.set(t.date, (dailyMap.get(t.date) || 0) + t.profit)
    );
    const sorted = Array.from(dailyMap.keys()).sort();
    let balance = openingBalance;
    const points: { x: number; y: number }[] = [];
    sorted.forEach((d, i) => {
      balance += dailyMap.get(d)!;
      points.push({ x: i, y: balance });
    });
    if (points.length === 0) return "";
    const minY = Math.min(...points.map((p) => p.y));
    const maxY = Math.max(...points.map((p) => p.y));
    const rangeY = maxY - minY || 1;
    const width = 380;
    const height = 60;
    const padX = 4;
    const padY = 4;
    return points
      .map((p, i) => {
        const x = padX + (i / Math.max(points.length - 1, 1)) * (width - padX * 2);
        const y = padY + (1 - (p.y - minY) / rangeY) * (height - padY * 2);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
  })();

  const dateLabel = dateRange?.from
    ? dateRange.to && dateRange.to.getTime() !== dateRange.from.getTime()
      ? `${format(dateRange.from, "MMM d, yyyy")} — ${format(dateRange.to, "MMM d, yyyy")}`
      : format(dateRange.from, "MMM d, yyyy")
    : "All Time";

  const handleGenerate = async () => {
    if (!cardRef.current) return;
    setCapturing(true);
    toast.loading("Generating card...");

    try {
      await new Promise((r) => setTimeout(r, 300));
      const canvas = await html2canvas(cardRef.current, {
        scale: 3,
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: null,
      });
      const url = canvas.toDataURL("image/png", 1.0);
      setPreviewImage(url);
      setShowPreview(true);
      toast.dismiss();
      toast.success("Card generated!");
    } catch (e: any) {
      toast.dismiss();
      toast.error("Failed to generate card");
    } finally {
      setCapturing(false);
    }
  };

  const handleDownload = () => {
    if (!previewImage) return;
    const link = document.createElement("a");
    link.href = previewImage;
    link.download = `tradeify-performance-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Downloaded!");
  };

  const handleShare = async () => {
    if (!previewImage) return;
    try {
      const res = await fetch(previewImage);
      const blob = await res.blob();
      const file = new File([blob], `tradeify-performance-${Date.now()}.png`, {
        type: "image/png",
      });
      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: "Trading Performance",
          text: `Net P&L: ${netProfit >= 0 ? "+" : ""}${formatValue(netProfit)} | Win Rate: ${winRate}%`,
        });
      } else {
        toast.error("Sharing not supported on this device");
      }
    } catch (e: any) {
      if (e.name !== "AbortError") toast.error("Failed to share");
    }
  };

  const isProfit = netProfit - totalFees >= 0;

  return (
    <>
      {/* Generate button */}
      <Button
        onClick={handleGenerate}
        variant="outline"
        size="sm"
        className="gap-2"
        disabled={capturing || trades.length === 0}
      >
        <ImageIcon className="h-4 w-4" />
        Performance Card
      </Button>

      {/* Hidden card template for html2canvas */}
      <div className="fixed -left-[9999px] -top-[9999px]">
        <div ref={cardRef}>
          <div
            style={{
              width: 440,
              padding: "36px 32px 28px",
              background: "linear-gradient(135deg, #0c1929 0%, #0a1220 40%, #0d1a2d 100%)",
              borderRadius: 20,
              fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
              color: "#fff",
              position: "relative",
              overflow: "hidden",
            }}
          >
            {/* Background pattern */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                background:
                  "radial-gradient(circle at 80% 20%, rgba(74, 222, 128, 0.08) 0%, transparent 50%), radial-gradient(circle at 20% 80%, rgba(56, 189, 248, 0.06) 0%, transparent 50%)",
                pointerEvents: "none",
              }}
            />

            {/* Header */}
            <div
              style={{
                position: "relative",
                zIndex: 1,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: 24,
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 18,
                    fontWeight: 700,
                    letterSpacing: "3px",
                    textTransform: "uppercase" as const,
                    marginBottom: 4,
                  }}
                >
                  {userName}
                </div>
                <div style={{ fontSize: 11, color: "#94a3b8", letterSpacing: "0.5px" }}>
                  {dateLabel}
                </div>
              </div>
              <div
                style={{
                  fontSize: 10,
                  color: "#64748b",
                  textAlign: "right" as const,
                  lineHeight: "1.4",
                }}
              >
                <div style={{ fontWeight: 600, color: "#94a3b8", letterSpacing: "1px" }}>
                  TRADEIFY
                </div>
              </div>
            </div>

            {/* Net P&L hero */}
            <div
              style={{
                position: "relative",
                zIndex: 1,
                textAlign: "center" as const,
                marginBottom: 20,
                padding: "16px 0",
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  letterSpacing: "2px",
                  color: "#94a3b8",
                  marginBottom: 8,
                  textTransform: "uppercase" as const,
                }}
              >
                NET P&L
              </div>
              <div
                style={{
                  fontSize: 36,
                  fontWeight: 800,
                  color: isProfit ? "#4ade80" : "#f87171",
                  fontVariantNumeric: "tabular-nums",
                  lineHeight: 1,
                }}
              >
                {isProfit ? "+" : ""}
                {currencySymbol}
                {Math.abs(netProfit - totalFees).toFixed(2)}
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: isProfit ? "#4ade80" : "#f87171",
                  opacity: 0.8,
                  marginTop: 6,
                  fontWeight: 600,
                }}
              >
                {isProfit ? "+" : ""}
                {returnPct}% return
              </div>
            </div>

            {/* Mini equity curve */}
            {equityPoints && (
              <div
                style={{
                  position: "relative",
                  zIndex: 1,
                  marginBottom: 20,
                  padding: "0 4px",
                }}
              >
                <svg
                  viewBox="0 0 380 60"
                  style={{ width: "100%", height: 60 }}
                  preserveAspectRatio="none"
                >
                  <defs>
                    <linearGradient
                      id="miniEquityFill"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="0%"
                        stopColor={isProfit ? "#4ade80" : "#f87171"}
                        stopOpacity="0.2"
                      />
                      <stop
                        offset="100%"
                        stopColor={isProfit ? "#4ade80" : "#f87171"}
                        stopOpacity="0"
                      />
                    </linearGradient>
                  </defs>
                  {/* Fill area */}
                  <polygon
                    points={`4,60 ${equityPoints} 376,60`}
                    fill="url(#miniEquityFill)"
                  />
                  {/* Line */}
                  <polyline
                    points={equityPoints}
                    fill="none"
                    stroke={isProfit ? "#4ade80" : "#f87171"}
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            )}

            {/* Stats grid */}
            <div
              style={{
                position: "relative",
                zIndex: 1,
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                gap: 10,
                marginBottom: 16,
              }}
            >
              {[
                { label: "Win Rate", value: `${winRate}%`, color: Number(winRate) >= 50 ? "#4ade80" : "#f87171" },
                { label: "Profit Factor", value: String(profitFactor), color: Number(profitFactor) >= 1 ? "#4ade80" : "#f87171" },
                { label: "Total Trades", value: String(totalTrades), color: "#e2e8f0" },
                { label: "Best Trade", value: `+${currencySymbol}${bestTrade.toFixed(2)}`, color: "#4ade80" },
                { label: "Worst Trade", value: `${currencySymbol}${worstTrade.toFixed(2)}`, color: "#f87171" },
                { label: "Max DD", value: `-${currencySymbol}${maxDrawdownInfo.value.toFixed(2)}`, color: "#f87171" },
              ].map((stat, i) => (
                <div
                  key={i}
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    borderRadius: 10,
                    padding: "10px 8px",
                    textAlign: "center" as const,
                  }}
                >
                  <div
                    style={{
                      fontSize: 9,
                      color: "#94a3b8",
                      textTransform: "uppercase" as const,
                      letterSpacing: "1px",
                      marginBottom: 4,
                    }}
                  >
                    {stat.label}
                  </div>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 700,
                      color: stat.color,
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {stat.value}
                  </div>
                </div>
              ))}
            </div>

            {/* Win/Loss bar */}
            <div
              style={{
                position: "relative",
                zIndex: 1,
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 12,
              }}
            >
              <span
                style={{
                  fontSize: 10,
                  color: "#4ade80",
                  fontWeight: 600,
                  minWidth: 20,
                }}
              >
                {winningTrades.length}W
              </span>
              <div
                style={{
                  flex: 1,
                  height: 6,
                  borderRadius: 3,
                  background: "#1e293b",
                  overflow: "hidden",
                  display: "flex",
                }}
              >
                <div
                  style={{
                    width: `${totalTrades > 0 ? (winningTrades.length / totalTrades) * 100 : 0}%`,
                    background: "#4ade80",
                    borderRadius: "3px 0 0 3px",
                  }}
                />
                <div
                  style={{
                    width: `${totalTrades > 0 ? (losingTrades.length / totalTrades) * 100 : 0}%`,
                    background: "#f87171",
                    borderRadius: "0 3px 3px 0",
                  }}
                />
              </div>
              <span
                style={{
                  fontSize: 10,
                  color: "#f87171",
                  fontWeight: 600,
                  minWidth: 20,
                  textAlign: "right" as const,
                }}
              >
                {losingTrades.length}L
              </span>
            </div>

            {/* Balance */}
            <div
              style={{
                position: "relative",
                zIndex: 1,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "10px 0 0",
                borderTop: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <div>
                <div style={{ fontSize: 9, color: "#64748b", textTransform: "uppercase" as const, letterSpacing: "1px" }}>
                  Balance
                </div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#e2e8f0", marginTop: 2 }}>
                  {currencySymbol}{currentBalance.toFixed(2)}
                </div>
              </div>
              <div style={{ textAlign: "right" as const }}>
                <div style={{ fontSize: 9, color: "#64748b", textTransform: "uppercase" as const, letterSpacing: "1px" }}>
                  Avg Win / Loss
                </div>
                <div style={{ fontSize: 12, marginTop: 2 }}>
                  <span style={{ color: "#4ade80", fontWeight: 600 }}>
                    +{currencySymbol}{avgWin.toFixed(2)}
                  </span>
                  <span style={{ color: "#475569", margin: "0 4px" }}>/</span>
                  <span style={{ color: "#f87171", fontWeight: 600 }}>
                    -{currencySymbol}{avgLoss.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-lg bg-card/95 backdrop-blur-xl border-border/50">
          <DialogHeader>
            <DialogTitle className="text-lg">Performance Card</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {previewImage && (
              <div className="flex justify-center bg-muted/50 rounded-lg p-3">
                <img
                  src={previewImage}
                  alt="Performance Card Preview"
                  className="max-w-full h-auto rounded-lg shadow-2xl"
                  style={{ maxHeight: "65vh" }}
                />
              </div>
            )}

            <div className="flex gap-3 justify-center pt-1">
              <Button onClick={handleDownload} className="gap-2" size="sm">
                <Download className="h-4 w-4" />
                Download
              </Button>
              {navigator.share && (
                <Button onClick={handleShare} variant="outline" className="gap-2" size="sm">
                  <Share2 className="h-4 w-4" />
                  Share
                </Button>
              )}
              <Button onClick={() => setShowPreview(false)} variant="ghost" size="sm">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
