import { useState, useMemo } from "react";
import { ArrowRightLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface TimezoneOption {
  value: string;
  label: string;
  flag: string;
}

const timezones: TimezoneOption[] = [
  { value: "Asia/Kolkata", label: "India (IST)", flag: "🇮🇳" },
  { value: "America/New_York", label: "New York (EST/EDT)", flag: "🇺🇸" },
  { value: "Europe/London", label: "London (GMT/BST)", flag: "🇬🇧" },
  { value: "Asia/Tokyo", label: "Tokyo (JST)", flag: "🇯🇵" },
  { value: "Asia/Dubai", label: "Dubai (GST)", flag: "🇦🇪" },
  { value: "Australia/Sydney", label: "Sydney (AEST)", flag: "🇦🇺" },
  { value: "Europe/Paris", label: "Paris (CET)", flag: "🇫🇷" },
  { value: "Asia/Singapore", label: "Singapore (SGT)", flag: "🇸🇬" },
];

export const TimeConverter = () => {
  const [selectedTime, setSelectedTime] = useState("12:00");
  const [sourceTimezone, setSourceTimezone] = useState("Asia/Kolkata");

  const convertedTimes = useMemo(() => {
    const [hours, minutes] = selectedTime.split(":").map(Number);
    
    // Create a date object for today with the selected time in source timezone
    const now = new Date();
    const dateStr = now.toISOString().split("T")[0];
    
    // Create date string and parse in source timezone
    const sourceDate = new Date(`${dateStr}T${selectedTime}:00`);
    
    // Get the offset difference
    const sourceOffset = getTimezoneOffset(sourceTimezone, sourceDate);
    const utcTime = new Date(sourceDate.getTime() - sourceOffset);

    return timezones.map((tz) => {
      const targetOffset = getTimezoneOffset(tz.value, utcTime);
      const targetTime = new Date(utcTime.getTime() + targetOffset);
      
      const formattedTime = targetTime.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });

      const formattedDate = targetTime.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      });

      // Check if it's a different day
      const sourceDay = sourceDate.getDate();
      const targetDay = targetTime.getDate();
      const dayDiff = targetDay - sourceDay;

      return {
        ...tz,
        time: formattedTime,
        date: formattedDate,
        dayDiff,
        isSource: tz.value === sourceTimezone,
      };
    });
  }, [selectedTime, sourceTimezone]);

  return (
    <Card className="mt-8">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ArrowRightLeft className="h-5 w-5 text-primary" />
          Time Converter
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Input Section */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="time-input">Select Time</Label>
            <Input
              id="time-input"
              type="time"
              value={selectedTime}
              onChange={(e) => setSelectedTime(e.target.value)}
              className="text-lg font-mono"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="timezone-select">Source Timezone</Label>
            <Select value={sourceTimezone} onValueChange={setSourceTimezone}>
              <SelectTrigger id="timezone-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover border border-border z-50">
                {timezones.map((tz) => (
                  <SelectItem key={tz.value} value={tz.value}>
                    <span className="flex items-center gap-2">
                      <span>{tz.flag}</span>
                      <span>{tz.label}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Converted Times Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {convertedTimes.map((tz) => (
            <div
              key={tz.value}
              className={`p-4 rounded-xl border transition-all ${
                tz.isSource
                  ? "bg-primary/10 border-primary/30 ring-2 ring-primary/20"
                  : "bg-muted/50 border-border/50 hover:border-primary/30"
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">{tz.flag}</span>
                <span className="text-xs font-medium text-muted-foreground truncate">
                  {tz.label.split(" (")[0]}
                </span>
              </div>
              <p className="text-xl md:text-2xl font-bold font-mono text-foreground">
                {tz.time}
              </p>
              <div className="flex items-center gap-1 mt-1">
                <p className="text-xs text-muted-foreground">{tz.date}</p>
                {tz.dayDiff !== 0 && (
                  <span className={`text-xs font-medium ${tz.dayDiff > 0 ? "text-profit" : "text-loss"}`}>
                    ({tz.dayDiff > 0 ? "+" : ""}{tz.dayDiff}d)
                  </span>
                )}
              </div>
              {tz.isSource && (
                <span className="inline-block mt-2 text-[10px] uppercase tracking-wider font-semibold text-primary">
                  Source
                </span>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

// Helper function to get timezone offset in milliseconds
function getTimezoneOffset(timezone: string, date: Date): number {
  const utcDate = new Date(date.toLocaleString("en-US", { timeZone: "UTC" }));
  const tzDate = new Date(date.toLocaleString("en-US", { timeZone: timezone }));
  return tzDate.getTime() - utcDate.getTime();
}
