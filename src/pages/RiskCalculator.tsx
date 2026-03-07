import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calculator, AlertTriangle, TrendingUp, DollarSign, Target, RotateCcw, Star } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Instrument Definitions ────────────────────────────────────────────
interface Instrument {
  label: string;
  group: string;
  pipSize: number;        // price movement that equals 1 pip (forex) or tick (metals)
  pipValuePerLot: number; // USD value of 1 pip per 1 standard lot
  contractSize: number;   // units per standard lot
  unit: string;           // unit label for display
  slType: "pips" | "price"; // stop loss input type
}

const INSTRUMENTS: Record<string, Instrument> = {
  // Popular — shown first
  "EUR/USD": { label: "EUR/USD", group: "Popular", pipSize: 0.0001, pipValuePerLot: 10, contractSize: 100000, unit: "units", slType: "pips" },
  "GBP/USD": { label: "GBP/USD", group: "Popular", pipSize: 0.0001, pipValuePerLot: 10, contractSize: 100000, unit: "units", slType: "pips" },
  "XAU/USD": { label: "XAU/USD (Gold)", group: "Popular", pipSize: 0.01, pipValuePerLot: 100, contractSize: 100, unit: "oz", slType: "price" },
  "XAG/USD": { label: "XAG/USD (Silver)", group: "Popular", pipSize: 0.001, pipValuePerLot: 5000, contractSize: 5000, unit: "oz", slType: "price" },

  // Forex
  "AUD/USD": { label: "AUD/USD", group: "Forex", pipSize: 0.0001, pipValuePerLot: 10, contractSize: 100000, unit: "units", slType: "pips" },
  "NZD/USD": { label: "NZD/USD", group: "Forex", pipSize: 0.0001, pipValuePerLot: 10, contractSize: 100000, unit: "units", slType: "pips" },
  "USD/CHF": { label: "USD/CHF", group: "Forex", pipSize: 0.0001, pipValuePerLot: 10, contractSize: 100000, unit: "units", slType: "pips" },
  "USD/CAD": { label: "USD/CAD", group: "Forex", pipSize: 0.0001, pipValuePerLot: 10, contractSize: 100000, unit: "units", slType: "pips" },
  "USD/JPY": { label: "USD/JPY", group: "Forex", pipSize: 0.01, pipValuePerLot: 6.67, contractSize: 100000, unit: "units", slType: "pips" },
  "EUR/JPY": { label: "EUR/JPY", group: "Forex", pipSize: 0.01, pipValuePerLot: 6.67, contractSize: 100000, unit: "units", slType: "pips" },
  "GBP/JPY": { label: "GBP/JPY", group: "Forex", pipSize: 0.01, pipValuePerLot: 6.67, contractSize: 100000, unit: "units", slType: "pips" },
  "EUR/GBP": { label: "EUR/GBP", group: "Forex", pipSize: 0.0001, pipValuePerLot: 12.74, contractSize: 100000, unit: "units", slType: "pips" },
};

const INSTRUMENT_GROUPS = ["Popular", "Forex"];
const FAVORITES_KEY = "risk_calc_favorites";

// ─── Calculator Logic ──────────────────────────────────────────────────
function calculatePosition(
  accountSize: number,
  riskPercent: number,
  stopLossInput: number,
  instrument: Instrument
) {
  const riskAmount = accountSize * (riskPercent / 100);

  // For forex: SL is in pips, cost per lot = pips × pipValuePerLot
  // For metals: SL is price distance ($), cost per lot = distance × contractSize
  const costPerLotPerUnit = instrument.slType === "price"
    ? instrument.contractSize  // e.g., gold: 100 oz × $1 = $100/lot/$1
    : instrument.pipValuePerLot; // e.g., EUR/USD: $10/lot/pip

  if (stopLossInput <= 0 || costPerLotPerUnit <= 0) {
    return { lots: 0, riskAmount, units: 0, valuePerUnit: 0 };
  }

  const lots = riskAmount / (stopLossInput * costPerLotPerUnit);
  const units = lots * instrument.contractSize;
  const valuePerUnit = lots * costPerLotPerUnit;

  return {
    lots: Math.floor(lots * 100) / 100,
    riskAmount,
    units: Math.floor(units),
    valuePerUnit,
  };
}

// ─── Component ─────────────────────────────────────────────────────────
const RiskCalculator = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [accountSize, setAccountSize] = useState("10000");
  const [riskPercent, setRiskPercent] = useState("1");
  const [stopLoss, setStopLoss] = useState("20");
  const [selectedInstrument, setSelectedInstrument] = useState("EUR/USD");
  const [result, setResult] = useState<ReturnType<typeof calculatePosition> | null>(null);
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(FAVORITES_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  const toggleFavorite = (key: string) => {
    setFavorites((prev) => {
      const next = prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key];
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
      return next;
    });
  };

  useEffect(() => {
    if (!authLoading && !user) navigate("/");
  }, [user, authLoading, navigate]);

  // Auto-calculate on input change
  useEffect(() => {
    const acc = parseFloat(accountSize);
    const risk = parseFloat(riskPercent);
    const sl = parseFloat(stopLoss);
    const instrument = INSTRUMENTS[selectedInstrument];

    if (!isNaN(acc) && !isNaN(risk) && !isNaN(sl) && acc > 0 && risk > 0 && sl > 0 && instrument) {
      setResult(calculatePosition(acc, risk, sl, instrument));
    } else {
      setResult(null);
    }
  }, [accountSize, riskPercent, stopLoss, selectedInstrument]);

  const handleReset = () => {
    setAccountSize("10000");
    setRiskPercent("1");
    setStopLoss("20");
    setSelectedInstrument("EUR/USD");
  };

  const instrument = INSTRUMENTS[selectedInstrument];
  const riskAmount = result?.riskAmount ?? 0;
  const isHighRisk = parseFloat(riskPercent) > 2;
  const isMetal = instrument.slType === "price";
  const slLabel = isMetal ? "Price Distance ($)" : "Stop Loss (pips)";
  const slUnitLabel = isMetal ? "$" : "pips";
  const slPlaceholder = isMetal
    ? (selectedInstrument.includes("XAU") ? "5" : "0.50")
    : "20";

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-mesh flex items-center justify-center">
        <div className="relative">
          <div className="w-12 h-12 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-mesh">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 animate-fade-in">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-xl">
              <Calculator className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">Risk Calculator</h1>
              <p className="text-muted-foreground text-sm mt-0.5">
                Calculate position size for Forex, Gold & Silver
              </p>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Input Card */}
          <Card className="bg-card/80 backdrop-blur-sm border-border/50">
            <CardContent className="p-5 sm:p-6 space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-foreground/80 uppercase tracking-wide">Parameters</h2>
                <Button variant="ghost" size="sm" onClick={handleReset} className="gap-1.5 text-xs text-muted-foreground h-7">
                  <RotateCcw className="h-3 w-3" />
                  Reset
                </Button>
              </div>

              {/* Instrument */}
              <div className="space-y-2">
                <Label className="text-sm">Instrument</Label>
                <Select value={selectedInstrument} onValueChange={setSelectedInstrument}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card/95 backdrop-blur-xl border-border/50">
                    {/* Favorites section */}
                    {favorites.length > 0 && (
                      <div>
                        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                          <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                          Favorites
                        </div>
                        {favorites.map((key) => {
                          const inst = INSTRUMENTS[key];
                          if (!inst) return null;
                          return (
                            <SelectItem key={`fav-${key}`} value={key}>
                              <span className="flex items-center gap-2">
                                <Star className="h-3 w-3 fill-yellow-500 text-yellow-500 flex-shrink-0" />
                                {inst.label}
                              </span>
                            </SelectItem>
                          );
                        })}
                      </div>
                    )}
                    {/* Regular groups */}
                    {INSTRUMENT_GROUPS.map((group) => (
                      <div key={group}>
                        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          {group}
                        </div>
                        {Object.entries(INSTRUMENTS)
                          .filter(([, v]) => v.group === group)
                          .map(([key, v]) => (
                            <SelectItem key={key} value={key}>
                              <span className="flex items-center gap-2">
                                {favorites.includes(key) && <Star className="h-3 w-3 fill-yellow-500 text-yellow-500 flex-shrink-0" />}
                                {v.label}
                              </span>
                            </SelectItem>
                          ))}
                      </div>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    {isMetal
                      ? `1 lot = ${instrument.contractSize.toLocaleString()} ${instrument.unit} · $1 move = $${instrument.contractSize}/lot`
                      : `1 pip = ${instrument.pipSize} · 1 lot = ${instrument.contractSize.toLocaleString()} ${instrument.unit}`
                    }
                  </p>
                  <button
                    onClick={() => toggleFavorite(selectedInstrument)}
                    className={cn(
                      "flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border transition-colors",
                      favorites.includes(selectedInstrument)
                        ? "bg-yellow-500/10 border-yellow-500/30 text-yellow-500"
                        : "border-border/50 text-muted-foreground hover:border-yellow-500/30 hover:text-yellow-500"
                    )}
                  >
                    <Star className={cn("h-3 w-3", favorites.includes(selectedInstrument) && "fill-yellow-500")} />
                    {favorites.includes(selectedInstrument) ? "Saved" : "Save"}
                  </button>
                </div>
              </div>

              {/* Account Size */}
              <div className="space-y-2">
                <Label className="text-sm">Account Size (USD)</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="number"
                    placeholder="10000"
                    value={accountSize}
                    onChange={(e) => setAccountSize(e.target.value)}
                    className="pl-9 font-mono"
                    min={0}
                  />
                </div>
                {/* Quick presets */}
                <div className="flex gap-1.5">
                  {[1000, 5000, 10000, 25000, 50000, 100000].map((v) => (
                    <button
                      key={v}
                      onClick={() => setAccountSize(String(v))}
                      className={cn(
                        "text-[10px] px-2 py-0.5 rounded-full border transition-colors",
                        accountSize === String(v)
                          ? "bg-primary/10 border-primary/30 text-primary"
                          : "border-border/50 text-muted-foreground hover:border-primary/30"
                      )}
                    >
                      {v >= 1000 ? `${v / 1000}k` : v}
                    </button>
                  ))}
                </div>
              </div>

              {/* Risk % */}
              <div className="space-y-2">
                <Label className="text-sm">
                  Risk per Trade (%)
                  {isHighRisk && (
                    <span className="ml-2 text-xs text-loss/80">
                      <AlertTriangle className="inline h-3 w-3 mr-0.5" />
                      High Risk
                    </span>
                  )}
                </Label>
                <Input
                  type="number"
                  placeholder="1"
                  value={riskPercent}
                  onChange={(e) => setRiskPercent(e.target.value)}
                  className="font-mono"
                  min={0}
                  max={100}
                  step={0.25}
                />
                <div className="flex gap-1.5">
                  {[0.5, 1, 1.5, 2, 3, 5].map((v) => (
                    <button
                      key={v}
                      onClick={() => setRiskPercent(String(v))}
                      className={cn(
                        "text-[10px] px-2 py-0.5 rounded-full border transition-colors",
                        riskPercent === String(v)
                          ? "bg-primary/10 border-primary/30 text-primary"
                          : "border-border/50 text-muted-foreground hover:border-primary/30",
                        v > 2 && "border-loss/30 text-loss/70"
                      )}
                    >
                      {v}%
                    </button>
                  ))}
                </div>
              </div>

              {/* Stop Loss */}
              <div className="space-y-2">
                <Label className="text-sm">
                  {slLabel}
                </Label>
                <div className="relative">
                  <Target className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="number"
                    placeholder={slPlaceholder}
                    value={stopLoss}
                    onChange={(e) => setStopLoss(e.target.value)}
                    className="pl-9 font-mono"
                    min={0}
                    step={isMetal ? 0.1 : 1}
                  />
                </div>
                {isMetal ? (
                  <p className="text-xs text-muted-foreground">
                    e.g., entry {selectedInstrument.includes("XAU") ? "2900" : "32.00"} → SL {selectedInstrument.includes("XAU")
                      ? (2900 - parseFloat(stopLoss || "0")).toFixed(2)
                      : (32 - parseFloat(stopLoss || "0")).toFixed(3)
                    }
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    = {(parseFloat(stopLoss) * instrument.pipSize || 0).toFixed(instrument.pipSize < 0.01 ? 4 : 2)} price movement
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Results Card */}
          <div className="space-y-4">
            <Card className={cn(
              "bg-card/80 backdrop-blur-sm border-border/50 transition-all",
              result && "border-primary/30 shadow-primary/5 shadow-lg"
            )}>
              <CardContent className="p-5 sm:p-6">
                <h2 className="text-sm font-semibold text-foreground/80 uppercase tracking-wide mb-5">Position Size</h2>

                {result ? (
                  <div className="space-y-6">
                    {/* Main result */}
                    <div className="text-center py-4">
                      <p className="text-xs text-muted-foreground mb-1">Recommended Lot Size</p>
                      <p className="text-5xl font-bold font-mono text-primary">
                        {result.lots.toFixed(2)}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        standard lot{result.lots !== 1 ? "s" : ""}
                      </p>
                    </div>

                    {/* Stats grid */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-muted/40 rounded-xl p-3 text-center">
                        <p className="text-xs text-muted-foreground">Risk Amount</p>
                        <p className={cn(
                          "text-lg font-bold font-mono mt-0.5",
                          isHighRisk ? "text-loss" : "text-foreground"
                        )}>
                          ${riskAmount.toFixed(2)}
                        </p>
                      </div>
                      <div className="bg-muted/40 rounded-xl p-3 text-center">
                        <p className="text-xs text-muted-foreground">Units</p>
                        <p className="text-lg font-bold font-mono mt-0.5">
                          {result.units.toLocaleString()}
                        </p>
                      </div>
                      <div className="bg-muted/40 rounded-xl p-3 text-center">
                        <p className="text-xs text-muted-foreground">{isMetal ? "$/move" : "Pip Value"}</p>
                        <p className="text-lg font-bold font-mono mt-0.5">
                          ${result.valuePerUnit.toFixed(2)}
                        </p>
                      </div>
                      <div className="bg-muted/40 rounded-xl p-3 text-center">
                        <p className="text-xs text-muted-foreground">Max Loss</p>
                        <p className="text-lg font-bold font-mono mt-0.5 text-loss/80">
                          -${(result.valuePerUnit * parseFloat(stopLoss || "0")).toFixed(2)}
                        </p>
                      </div>
                    </div>

                    {/* Lot breakdown */}
                    <div className="border-t border-border/40 pt-4">
                      <p className="text-xs text-muted-foreground mb-2 font-medium">Lot Breakdown</p>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="bg-muted/30 rounded-lg p-2">
                          <p className="text-[10px] text-muted-foreground">Standard</p>
                          <p className="text-sm font-mono font-semibold">{result.lots.toFixed(2)}</p>
                        </div>
                        <div className="bg-muted/30 rounded-lg p-2">
                          <p className="text-[10px] text-muted-foreground">Mini</p>
                          <p className="text-sm font-mono font-semibold">{(result.lots * 10).toFixed(2)}</p>
                        </div>
                        <div className="bg-muted/30 rounded-lg p-2">
                          <p className="text-[10px] text-muted-foreground">Micro</p>
                          <p className="text-sm font-mono font-semibold">{(result.lots * 100).toFixed(2)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Calculator className="h-10 w-10 text-muted-foreground/40 mb-3" />
                    <p className="text-sm text-muted-foreground">
                      Fill in the parameters to calculate position size
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Risk Warning */}
            {isHighRisk && result && (
              <Card className="border-loss/30 bg-loss/5">
                <CardContent className="p-4 flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-loss flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-loss">High Risk Warning</p>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      You're risking {riskPercent}% per trade. Most professional traders risk 1-2% max.
                      At {riskPercent}% risk, just {Math.ceil(100 / parseFloat(riskPercent))} consecutive losses
                      would wipe your account.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 2R/3R Targets */}
            {result && result.lots > 0 && (
              <Card className="bg-card/80 backdrop-blur-sm border-border/50">
                <CardContent className="p-5 sm:p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <TrendingUp className="h-4 w-4 text-profit" />
                    <h3 className="text-sm font-semibold text-foreground/80">Reward Targets</h3>
                  </div>
                  <div className="space-y-2">
                    {[1, 1.5, 2, 3, 5].map((rr) => {
                      const target = riskAmount * rr;
                      const targetDistance = parseFloat(stopLoss) * rr;
                      return (
                        <div key={rr} className="flex items-center justify-between py-1.5 px-3 rounded-lg hover:bg-muted/30 transition-colors">
                          <span className="text-sm font-medium">
                            {rr}R
                            <span className="text-xs text-muted-foreground ml-1.5">
                              ({isMetal ? `$${targetDistance.toFixed(2)}` : `${targetDistance.toFixed(1)} pips`})
                            </span>
                          </span>
                          <span className="text-sm font-mono font-semibold text-profit">
                            +${target.toFixed(2)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RiskCalculator;
