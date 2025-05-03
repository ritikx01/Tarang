import Options from "@/components/Options";
import { PeriodicChart } from "@/components/PeriodicChart";
import Sidebar from "@/components/Sidebar";
import TopGainersLosers from "@/components/TopGainersLosers";
import { useState, useEffect, createContext } from "react";

interface ChartDataPoint {
  index: number;
  value: number;
}
const backend = import.meta.env.VITE_BACKEND_BASE_URL;
export type PerformanceInterval = "D" | "W" | "M" | "Y";
const dummy = [
  { index: 1, value: 85 },
  { index: 2, value: -30 },
  { index: 3, value: 50 },
  { index: 4, value: -65 },
  { index: 5, value: 2 },
  { index: 6, value: 56 },
  { index: 7, value: 23 },
  { index: 8, value: 27 },
  { index: 9, value: -9 },
  { index: 10, value: -46 },
  { index: 11, value: -8 },
  { index: 12, value: 20 },
];

async function fetchChartData(
  period: PerformanceInterval,
  startDate: Date
): Promise<ChartDataPoint[]> {
  const start = startDate.getTime().toString();
  const response = await fetch(`${backend}/api/performance/periodic`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      interval: period,
      start,
    }),
  });
  const parsedResp = await response.json();
  return parsedResp["NORMAL"][1];
}

type FormContextType = {
  interval: PerformanceInterval;
  setIntervalValue: React.Dispatch<React.SetStateAction<PerformanceInterval>>;
  startTime: Date;
  setStartTime: React.Dispatch<React.SetStateAction<Date>>;
};

export const FormContext = createContext<FormContextType | null>(null);

function DashboardPage() {
  const [interval, setIntervalValue] = useState<PerformanceInterval>("D");
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [startTime, setStartTime] = useState<Date>(new Date());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // This inner function can be async
    async function loadData() {
      setIsLoading(true);
      try {
        const data = await fetchChartData(interval, startTime);
        setChartData(data);
      } catch (error) {
        console.error("Failed to fetch chart data:", error);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [interval, startTime]);
  return (
    <div className="flex grow h-screen w-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-col w-full p-6 gap-6 overflow-y-auto">
        <FormContext.Provider
          value={{ interval, setIntervalValue, startTime, setStartTime }}
        >
          <Options />
        </FormContext.Provider>
        <div className="w-full bg-slate-900">
          <PeriodicChart chartData={chartData} interval={interval} />
        </div>
        <div className="w-full">
          <TopGainersLosers chartData={chartData} interval={interval} />
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;
