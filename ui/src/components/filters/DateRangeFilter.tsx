import { CalendarIcon, RotateCcw } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { getDatePresetValue } from "@/lib/filters";
import { cn } from "@/lib/utils";
import { DateRangeValue } from "@/types/filters";

interface DateRangeFilterProps {
  value: DateRangeValue;
  onChange: (value: DateRangeValue) => void;
  error?: string;
  presets?: string[];
}

const PRESET_LABELS: Record<string, string> = {
  today: "Today",
  yesterday: "Yesterday",
  last7days: "Last 7 Days",
  last30days: "Last 30 Days",
  thisMonth: "This Month",
};

export const DateRangeFilter: React.FC<DateRangeFilterProps> = ({
  value,
  onChange,
  error,
  presets = ["today", "yesterday", "last7days", "last30days", "thisMonth"],
}) => {
  const [isFromOpen, setIsFromOpen] = useState(false);
  const [isToOpen, setIsToOpen] = useState(false);

  const formatDateDisplay = (date: Date | null) => {
    if (!date) return "Select date";
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const handlePresetClick = (preset: string) => {
    const presetValue = getDatePresetValue(preset);
    onChange(presetValue);
  };

  const handleFromChange = (date: Date | undefined) => {
    if (date) {
      const fromDate = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
      let toDate = value.to;
      // If "To" date is before the new "From" date, push it to end of "From" date
      if (!toDate || toDate < fromDate) {
        toDate = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
      }
      onChange({ from: fromDate, to: toDate });
    }
    setIsFromOpen(false);
  };

  const handleToChange = (date: Date | undefined) => {
    if (date) {
      const toDate = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
      let fromDate = value.from;
      // If "From" date is unset or after "To" date, align it to start of "To" date
      if (!fromDate || fromDate > toDate) {
        fromDate = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
      }
      onChange({ from: fromDate, to: toDate });
    }
    setIsToOpen(false);
  };

  const handleClearDates = () => {
    onChange({ from: null, to: null });
  };

  return (
    <div className="space-y-3">
      {/* 1-Click Quick Presets */}
      {presets.length > 0 && (
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground font-medium">Quick Presets</Label>
          <div className="flex flex-wrap gap-1.5">
            {presets.map((preset) => {
              const label = PRESET_LABELS[preset] || preset;
              return (
                <Button
                  key={preset}
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 px-2.5 text-xs font-medium rounded-lg hover:bg-accent"
                  onClick={() => handlePresetClick(preset)}
                >
                  {label}
                </Button>
              );
            })}
          </div>
        </div>
      )}

      {/* Date Pickers */}
      <div className="grid grid-cols-2 gap-2.5 pt-1">
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-foreground">From Date</Label>
          <Popover open={isFromOpen} onOpenChange={setIsFromOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full h-8.5 justify-start text-left text-xs font-normal rounded-lg",
                  !value.from && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                <span className="truncate">{formatDateDisplay(value.from)}</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={value.from || undefined}
                onSelect={handleFromChange}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-foreground">To Date</Label>
          <Popover open={isToOpen} onOpenChange={setIsToOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full h-8.5 justify-start text-left text-xs font-normal rounded-lg",
                  !value.to && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                <span className="truncate">{formatDateDisplay(value.to)}</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={value.to || undefined}
                onSelect={handleToChange}
                initialFocus
                disabled={(date) => (value.from ? date < new Date(value.from.getFullYear(), value.from.getMonth(), value.from.getDate()) : false)}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {(value.from || value.to) && (
        <div className="flex justify-end pt-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-[11px] text-muted-foreground hover:text-foreground gap-1"
            onClick={handleClearDates}
          >
            <RotateCcw className="h-3 w-3" />
            Clear dates
          </Button>
        </div>
      )}

      {error && (
        <p className="text-xs text-rose-500 font-medium mt-1">{error}</p>
      )}
    </div>
  );
};
