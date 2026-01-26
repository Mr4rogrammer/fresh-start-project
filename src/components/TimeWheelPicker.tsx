import { useRef, useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface TimeWheelPickerProps {
  value: string;
  onChange: (value: string) => void;
}

const hours12 = Array.from({ length: 12 }, (_, i) => (i === 0 ? 12 : i));
const minutes = Array.from({ length: 60 }, (_, i) => i);
const periods = ["AM", "PM"];

const ITEM_HEIGHT = 40;
const VISIBLE_ITEMS = 5;

interface WheelColumnProps {
  items: (string | number)[];
  value: string | number;
  onChange: (value: string | number) => void;
  formatValue?: (val: string | number) => string;
}

const WheelColumn = ({ items, value, onChange, formatValue }: WheelColumnProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollTimeout = useRef<NodeJS.Timeout>();

  const selectedIndex = items.indexOf(value);

  useEffect(() => {
    if (containerRef.current && !isScrolling) {
      const scrollTop = selectedIndex * ITEM_HEIGHT;
      containerRef.current.scrollTop = scrollTop;
    }
  }, [selectedIndex, isScrolling]);

  const handleScroll = () => {
    if (!containerRef.current) return;

    setIsScrolling(true);

    if (scrollTimeout.current) {
      clearTimeout(scrollTimeout.current);
    }

    scrollTimeout.current = setTimeout(() => {
      if (!containerRef.current) return;
      
      const scrollTop = containerRef.current.scrollTop;
      const index = Math.round(scrollTop / ITEM_HEIGHT);
      const clampedIndex = Math.max(0, Math.min(items.length - 1, index));
      
      // Snap to position
      containerRef.current.scrollTop = clampedIndex * ITEM_HEIGHT;
      
      if (items[clampedIndex] !== value) {
        onChange(items[clampedIndex]);
      }
      
      setIsScrolling(false);
    }, 100);
  };

  const handleItemClick = (index: number) => {
    if (containerRef.current) {
      containerRef.current.scrollTo({
        top: index * ITEM_HEIGHT,
        behavior: "smooth",
      });
      onChange(items[index]);
    }
  };

  return (
    <div className="relative h-[200px] w-16 overflow-hidden">
      {/* Gradient overlays */}
      <div className="absolute top-0 left-0 right-0 h-20 bg-gradient-to-b from-background to-transparent z-10 pointer-events-none" />
      <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-background to-transparent z-10 pointer-events-none" />
      
      {/* Selection highlight */}
      <div className="absolute top-1/2 left-0 right-0 h-10 -translate-y-1/2 bg-primary/10 border-y border-primary/30 z-0" />
      
      {/* Scrollable column */}
      <div
        ref={containerRef}
        className="h-full overflow-y-auto scrollbar-none scroll-smooth"
        onScroll={handleScroll}
        style={{ 
          paddingTop: `${ITEM_HEIGHT * 2}px`, 
          paddingBottom: `${ITEM_HEIGHT * 2}px`,
          scrollSnapType: "y mandatory"
        }}
      >
        {items.map((item, index) => {
          const isSelected = item === value;
          return (
            <div
              key={`${item}-${index}`}
              onClick={() => handleItemClick(index)}
              className={cn(
                "h-10 flex items-center justify-center cursor-pointer transition-all font-mono text-lg",
                "scroll-snap-align-center",
                isSelected
                  ? "text-primary font-bold scale-110"
                  : "text-muted-foreground hover:text-foreground"
              )}
              style={{ scrollSnapAlign: "center" }}
            >
              {formatValue ? formatValue(item) : item}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const TimeWheelPicker = ({ value, onChange }: TimeWheelPickerProps) => {
  // Parse the 24h time value to 12h format
  const [hours24, mins] = value.split(":").map(Number);
  const period = hours24 >= 12 ? "PM" : "AM";
  const hours12Value = hours24 === 0 ? 12 : hours24 > 12 ? hours24 - 12 : hours24;

  const handleHourChange = (newHour: string | number) => {
    const h = Number(newHour);
    let h24: number;
    if (period === "AM") {
      h24 = h === 12 ? 0 : h;
    } else {
      h24 = h === 12 ? 12 : h + 12;
    }
    onChange(`${h24.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`);
  };

  const handleMinuteChange = (newMinute: string | number) => {
    const m = Number(newMinute);
    onChange(`${hours24.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`);
  };

  const handlePeriodChange = (newPeriod: string | number) => {
    const p = String(newPeriod);
    let h24: number;
    if (p === "AM") {
      h24 = hours12Value === 12 ? 0 : hours12Value;
    } else {
      h24 = hours12Value === 12 ? 12 : hours12Value + 12;
    }
    onChange(`${h24.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`);
  };

  return (
    <div className="flex items-center justify-center gap-1 p-4 rounded-2xl bg-muted/30 border border-border/50">
      <WheelColumn
        items={hours12}
        value={hours12Value}
        onChange={handleHourChange}
        formatValue={(v) => String(v).padStart(2, "0")}
      />
      
      <div className="text-2xl font-bold text-primary">:</div>
      
      <WheelColumn
        items={minutes}
        value={mins}
        onChange={handleMinuteChange}
        formatValue={(v) => String(v).padStart(2, "0")}
      />
      
      <div className="w-2" />
      
      <WheelColumn
        items={periods}
        value={period}
        onChange={handlePeriodChange}
      />
    </div>
  );
};
