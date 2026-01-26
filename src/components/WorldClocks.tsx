import { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface ClockData {
  city: string;
  timezone: string;
  flag: string;
}

const clocks: ClockData[] = [
  { city: "India", timezone: "Asia/Kolkata", flag: "🇮🇳" },
  { city: "New York", timezone: "America/New_York", flag: "🇺🇸" },
];

const ClockFace = ({ city, timezone, flag }: ClockData) => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formattedTime = time.toLocaleTimeString("en-US", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  const formattedDate = time.toLocaleDateString("en-US", {
    timeZone: timezone,
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  // Get hours and minutes for analog clock hands
  const options = { timeZone: timezone };
  const localTime = new Date(time.toLocaleString("en-US", options));
  const hours = localTime.getHours() % 12;
  const minutes = localTime.getMinutes();
  const seconds = localTime.getSeconds();

  const hourDeg = (hours * 30) + (minutes * 0.5);
  const minuteDeg = minutes * 6;
  const secondDeg = seconds * 6;

  return (
    <Card className="group hover:shadow-glow transition-all duration-300">
      <CardContent className="p-4 md:p-6 flex flex-col items-center gap-4">
        {/* Analog Clock */}
        <div className="relative w-28 h-28 md:w-36 md:h-36">
          {/* Clock face */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-muted/50 to-muted border-2 border-border/50 shadow-inner">
            {/* Hour markers */}
            {[...Array(12)].map((_, i) => (
              <div
                key={i}
                className="absolute w-full h-full"
                style={{ transform: `rotate(${i * 30}deg)` }}
              >
                <div 
                  className={`absolute top-2 left-1/2 -translate-x-1/2 rounded-full bg-foreground/60 ${
                    i % 3 === 0 ? 'w-1.5 h-1.5' : 'w-1 h-1'
                  }`}
                />
              </div>
            ))}
            
            {/* Center dot */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-primary shadow-lg z-10" />
            
            {/* Hour hand */}
            <div
              className="absolute top-1/2 left-1/2 origin-bottom -translate-x-1/2"
              style={{ 
                transform: `translateX(-50%) rotate(${hourDeg}deg)`,
                transformOrigin: 'center bottom'
              }}
            >
              <div className="w-1 h-8 md:h-10 -mt-8 md:-mt-10 bg-foreground rounded-full" />
            </div>
            
            {/* Minute hand */}
            <div
              className="absolute top-1/2 left-1/2 origin-bottom -translate-x-1/2"
              style={{ 
                transform: `translateX(-50%) rotate(${minuteDeg}deg)`,
                transformOrigin: 'center bottom'
              }}
            >
              <div className="w-0.5 h-11 md:h-14 -mt-11 md:-mt-14 bg-foreground/80 rounded-full" />
            </div>
            
            {/* Second hand */}
            <div
              className="absolute top-1/2 left-1/2 origin-bottom -translate-x-1/2 transition-transform"
              style={{ 
                transform: `translateX(-50%) rotate(${secondDeg}deg)`,
                transformOrigin: 'center bottom'
              }}
            >
              <div className="w-[2px] h-12 md:h-16 -mt-12 md:-mt-16 bg-primary rounded-full" />
            </div>
          </div>
        </div>

        {/* Digital time display */}
        <div className="text-center space-y-1">
          <div className="flex items-center justify-center gap-2">
            <span className="text-xl">{flag}</span>
            <span className="font-semibold text-foreground">{city}</span>
          </div>
          <p className="text-2xl md:text-3xl font-mono font-bold text-primary tracking-wider">
            {formattedTime}
          </p>
          <p className="text-xs text-muted-foreground">{formattedDate}</p>
        </div>
      </CardContent>
    </Card>
  );
};

export const WorldClocks = () => {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Clock className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold text-foreground">World Clocks</h2>
      </div>
      <div className="grid grid-cols-2 gap-3 md:gap-4">
        {clocks.map((clock) => (
          <ClockFace key={clock.city} {...clock} />
        ))}
      </div>
    </div>
  );
};
