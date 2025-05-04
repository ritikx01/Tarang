import { PerformanceInterval } from "@/pages/PeriodicPerformance";
import { useContext } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FormContext } from "@/pages/PeriodicPerformance";

const intervals: PerformanceInterval[] = ["D", "W", "M", "Y"];
export const intervalTypeValueMapping: Record<PerformanceInterval, string> = {
  D: "Day",
  M: "Month",
  W: "Week",
  Y: "Year",
};

function RadioInterval() {
  const context = useContext(FormContext);
  if (!context) {
    throw new Error("SetIntervalValueContext is not available");
  }
  const { interval, setIntervalValue } = context;

  const handleChange = (value: string) => {
    setIntervalValue(value as PerformanceInterval); // lift change up
  };

  return (
    <Select onValueChange={handleChange} value={interval}>
      <SelectTrigger className="w-[180px] bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700 focus:ring-slate-500 focus:ring-opacity-50">
        <SelectValue
          placeholder={
            <span className="text-slate-300">
              {intervalTypeValueMapping[interval]}
            </span>
          }
        />
      </SelectTrigger>
      <SelectContent
        className="bg-slate-800 border border-slate-700 text-slate-200"
        defaultValue={interval}
      >
        {intervals.map((intervalOption) => (
          <SelectItem
            value={intervalOption}
            key={intervalOption}
            className="text-slate-200 hover:bg-slate-700 focus:bg-slate-700 cursor-pointer"
          >
            {intervalTypeValueMapping[intervalOption]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export default RadioInterval;
