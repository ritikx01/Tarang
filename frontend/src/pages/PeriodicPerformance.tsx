import Options from "@/components/Options";
import { PeriodicChart } from "@/components/PeriodicChart";
import Sidebar from "@/components/Sidebar";
import TopGainersLosers from "@/components/TopGainersLosers";
import { useState, useEffect, createContext } from "react";

interface ChartDataPoint {
  index: number;
  value: number;
}
const intervalCountMapping = { D: 31, W: 53, M: 12, Y: 10 };
const backend = import.meta.env.VITE_BACKEND_BASE_URL;
export type PerformanceInterval = "D" | "W" | "M" | "Y";

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
  return parsedResp["SMART"][1];
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

  useEffect(() => {
    // This inner function can be async
    async function loadData() {
      try {
        const count = intervalCountMapping[interval] || 0;
        const data =
          (await fetchChartData(interval, startTime)) ||
          Array.from({ length: count }, (_, index) => ({
            index:
              interval === "D"
                ? index + 1
                : interval === "Y"
                ? new Date().getFullYear() - (new Date().getFullYear() % 10)
                : index,
            value: 0,
          }));
        setChartData(data);
      } catch (error) {
        console.error("Failed to fetch chart data:", error);
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
