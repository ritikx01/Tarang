import { useState, useEffect, useContext } from "react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { FormContext } from "@/pages/PeriodicPerformance";

export function DatePicker() {
  const context = useContext(FormContext);
  if (!context) {
    throw new Error("SetIntervalValueContext is not available");
  }

  const { setStartTime } = context;
  const [date, setDate] = useState<Date | undefined>(new Date());
  useEffect(() => {
    setStartTime(date ?? new Date());
  }, [date]);
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "w-[200px] justify-start text-left font-normal bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700 focus:ring-slate-500 focus:ring-opacity-50"
          )}
        >
          <CalendarIcon />
          {date ? format(date, "PPP") : <span>Pick a date</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <Calendar
          className="bg-slate-800"
          mode="single"
          selected={date}
          onSelect={setDate}
          defaultMonth={date}
          autoFocus
        />
      </PopoverContent>
    </Popover>
  );
}
