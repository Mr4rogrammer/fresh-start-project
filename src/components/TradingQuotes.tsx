import { useState, useEffect, useCallback } from "react";
import { TRADING_QUOTES } from "@/data/tradingQuotes";
import { Quote, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

type AnimState = "visible" | "slide-out" | "slide-in";

export const TradingQuotes = () => {
  const [index, setIndex] = useState(() =>
    Math.floor(Math.random() * TRADING_QUOTES.length)
  );
  const [anim, setAnim] = useState<AnimState>("visible");

  const nextQuote = useCallback(() => {
    if (anim !== "visible") return;
    setAnim("slide-out");
    setTimeout(() => {
      setIndex((prev) => {
        let next: number;
        do {
          next = Math.floor(Math.random() * TRADING_QUOTES.length);
        } while (next === prev && TRADING_QUOTES.length > 1);
        return next;
      });
      setAnim("slide-in");
      setTimeout(() => setAnim("visible"), 400);
    }, 400);
  }, [anim]);

  // Auto-rotate every 10s
  useEffect(() => {
    const timer = setInterval(nextQuote, 10000);
    return () => clearInterval(timer);
  }, [nextQuote]);

  const quote = TRADING_QUOTES[index];

  return (
    <div className="bg-card/80 backdrop-blur-sm rounded-2xl p-4 sm:p-5 border border-border/50 shadow-lg animate-fade-in mb-6 sm:mb-8 overflow-hidden">
      <div className="flex items-start gap-3">
        <div className="shrink-0 mt-0.5 p-2 rounded-lg bg-primary/10">
          <Quote className="h-4 w-4 text-primary" />
        </div>
        <div
          className="flex-1 min-w-0"
          style={{
            transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
            opacity: anim === "visible" ? 1 : anim === "slide-in" ? 1 : 0,
            transform:
              anim === "slide-out"
                ? "translateY(-12px)"
                : anim === "slide-in"
                ? "translateY(0)"
                : "translateY(0)",
            filter: anim === "visible" ? "blur(0px)" : anim === "slide-in" ? "blur(0px)" : "blur(4px)",
          }}
        >
          <p className="text-sm text-foreground/80 leading-relaxed italic">
            "{quote.text}"
          </p>
          <p className="text-xs text-muted-foreground mt-2 font-medium">
            — {quote.author}
          </p>
        </div>
        <button
          onClick={nextQuote}
          className={cn(
            "shrink-0 p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-muted/50 transition-all",
            anim !== "visible" && "pointer-events-none"
          )}
          title="Next quote"
        >
          <RefreshCw className={cn("h-3.5 w-3.5 transition-transform duration-500", anim === "slide-out" && "rotate-180")} />
        </button>
      </div>
    </div>
  );
};
