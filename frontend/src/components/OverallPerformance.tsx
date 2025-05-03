import { useEffect, useMemo, useState } from "react";
import { ChartComponent, ChartData } from "./OverallChart";
import Sidebar from "./Sidebar";
import {
  ArrowDown,
  ArrowUp,
  TrendingUp,
  TrendingDown,
  Info,
  RefreshCw,
} from "lucide-react";

async function getOverallData() {
  const response = await fetch("http://localhost:3000/api/performance/overall");
  const data = await response.json();
  return data;
}

interface ChartDataOverall extends ChartData {
  tradeIndex?: number; // Optional property to hold the original index
}

export default function OverallPerformance() {
  const [chartData, setChartData] = useState<ChartDataOverall[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [overallStats, setOverallStats] = useState({
    totalTrades: 0,
    positiveCount: 0,
    negativeCount: 0,
    avgGain: 0,
    avgLoss: 0,
    totalChange: 0,
  });

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      try {
        const data: ChartDataOverall[] = await getOverallData();
        // Add the original index as tradeIndex to each item
        const dataWithTradeIndex = data.map((item, index) => ({
          ...item,
          tradeIndex: index + 1,
        }));
        setChartData(dataWithTradeIndex);

        // Calculate overall stats
        const totalTrades = dataWithTradeIndex.length;
        const positiveCount = dataWithTradeIndex.filter(
          (item) => item.change > 0
        ).length;
        const negativeCount = dataWithTradeIndex.filter(
          (item) => item.change < 0
        ).length;

        const positives = dataWithTradeIndex.filter((item) => item.change > 0);
        const negatives = dataWithTradeIndex.filter((item) => item.change < 0);

        const avgGain =
          positives.length > 0
            ? positives.reduce((sum, item) => sum + item.change, 0) /
              positives.length
            : 0;

        const avgLoss =
          negatives.length > 0
            ? negatives.reduce((sum, item) => sum + item.change, 0) /
              negatives.length
            : 0;

        const totalChange = dataWithTradeIndex.reduce(
          (sum, item) => sum + item.change,
          0
        );

        setOverallStats({
          totalTrades,
          positiveCount,
          negativeCount,
          avgGain,
          avgLoss,
          totalChange,
        });
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, []);

  const topGainers: ChartDataOverall[] = useMemo(() => {
    return [...chartData].sort((a, b) => b.change - a.change).slice(0, 5);
  }, [chartData]);

  const topLosers: ChartDataOverall[] = useMemo(() => {
    return [...chartData].sort((a, b) => a.change - b.change).slice(0, 5);
  }, [chartData]);

  const sections = [
    {
      title: "Top Gainers",
      data: topGainers,
      color: "green",
      icon: <TrendingUp className="w-5 h-5 text-green-500" />,
    },
    {
      title: "Top Losers",
      data: topLosers,
      color: "red",
      icon: <TrendingDown className="w-5 h-5 text-red-500" />,
    },
  ];

  const handleRefresh = async () => {
    setIsLoading(true);
    try {
      const data: ChartDataOverall[] = await getOverallData();
      const dataWithTradeIndex = data.map((item, index) => ({
        ...item,
        tradeIndex: index + 1,
      }));
      setChartData(dataWithTradeIndex);
    } catch (error) {
      console.error("Error refreshing data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex grow w-screen bg-slate-950">
      <Sidebar />
      <div className="flex flex-col w-full gap-4 h-max m-4 p-2">
        {/* Summary Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-2">
          <div className="bg-slate-900 p-4 rounded-lg border border-slate-700 shadow-lg flex flex-col">
            <div className="flex justify-between items-center mb-2">
              <span className="text-slate-400 text-sm">Total Trades</span>
              <Info className="h-4 w-4 text-slate-500" />
            </div>
            <div className="text-2xl font-bold text-white">
              {overallStats.totalTrades}
            </div>
            <div className="mt-2 text-xs text-slate-400">
              Win: {overallStats.positiveCount} | Loss:{" "}
              {overallStats.negativeCount}
            </div>
          </div>

          <div className="bg-slate-900 p-4 rounded-lg border border-slate-700 shadow-lg flex flex-col">
            <div className="flex justify-between items-center mb-2">
              <span className="text-slate-400 text-sm">Win Rate</span>
              <Info className="h-4 w-4 text-slate-500" />
            </div>
            <div className="text-2xl font-bold text-white">
              {overallStats.totalTrades > 0
                ? (
                    (overallStats.positiveCount / overallStats.totalTrades) *
                    100
                  ).toFixed(1) + "%"
                : "0%"}
            </div>
            <div className="mt-2 text-xs text-slate-400">
              Based on {overallStats.totalTrades} trades
            </div>
          </div>

          <div className="bg-slate-900 p-4 rounded-lg border border-slate-700 shadow-lg flex flex-col">
            <div className="flex justify-between items-center mb-2">
              <span className="text-slate-400 text-sm">Avg. Profit/Loss</span>
              <Info className="h-4 w-4 text-slate-500" />
            </div>
            <div className="flex items-center">
              <span className="text-2xl font-bold text-green-500">
                {overallStats.avgGain.toFixed(2)}%
              </span>
              <span className="mx-2 text-slate-500">/</span>
              <span className="text-2xl font-bold text-red-500">
                {overallStats.avgLoss.toFixed(2)}%
              </span>
            </div>
            <div className="mt-2 text-xs text-slate-400">
              Profit/Loss ratio:{" "}
              {overallStats.avgLoss !== 0
                ? Math.abs(overallStats.avgGain / overallStats.avgLoss).toFixed(
                    2
                  )
                : "N/A"}
            </div>
          </div>

          <div className="bg-slate-900 p-4 rounded-lg border border-slate-700 shadow-lg flex flex-col">
            <div className="flex justify-between items-center mb-2">
              <span className="text-slate-400 text-sm">Total Performance</span>
              <Info className="h-4 w-4 text-slate-500" />
            </div>
            <div
              className={`text-2xl font-bold flex items-center ${
                overallStats.totalChange > 0 ? "text-green-500" : "text-red-500"
              }`}
            >
              {overallStats.totalChange > 0 ? (
                <ArrowUp className="mr-1 h-5 w-5" />
              ) : (
                <ArrowDown className="mr-1 h-5 w-5" />
              )}
              {Math.abs(overallStats.totalChange).toFixed(2)}%
            </div>
            <div className="mt-2 text-xs text-slate-400">
              Cumulative across all trades
            </div>
          </div>
        </div>

        {/* Chart Section */}
        <div className="w-full gap-2 h-max p-4 border border-slate-700 rounded-lg bg-slate-900 shadow-lg">
          <div className="flex justify-between items-center mb-4">
            <div className="flex flex-col">
              <span className="text-xl font-semibold text-white">
                Cumulative Performance
              </span>
              <span className="text-xs text-slate-400">
                Trade-by-trade percent change
              </span>
            </div>
            <button
              onClick={handleRefresh}
              className="flex items-center gap-2 px-3 py-1 rounded-md bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors"
              disabled={isLoading}
            >
              <RefreshCw
                className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
              />
              <span className="text-sm">Refresh</span>
            </button>
          </div>

          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-cyan-500"></div>
            </div>
          ) : (
            <ChartComponent
              data={chartData}
              colors={{
                backgroundColor: "#0f172a",
                lineColor: "#06b6d4",
                textColor: "#f8fafc",
                areaTopColor: "#06b6d4",
                areaBottomColor: "#0c4a6e",
              }}
            />
          )}
        </div>

        {/* Top Gainers and Losers Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sections.map((section) => (
            <div
              key={section.title}
              className="p-4 rounded-lg bg-slate-900 shadow-lg border border-slate-700"
            >
              <div className="flex items-center gap-2 mb-4">
                {section.icon}
                <h2
                  className={`text-xl font-semibold text-${section.color}-500`}
                >
                  {section.title}
                </h2>
              </div>

              {isLoading ? (
                <div className="flex justify-center items-center h-40">
                  <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-cyan-500"></div>
                </div>
              ) : section.data.length > 0 ? (
                <div className="overflow-hidden rounded-lg border border-slate-800">
                  <table className="min-w-full">
                    <thead>
                      <tr className="bg-slate-800">
                        <th className="py-2 px-4 text-left text-xs font-medium text-slate-400">
                          Rank
                        </th>
                        <th className="py-2 px-4 text-left text-xs font-medium text-slate-400">
                          Trade No.
                        </th>
                        <th className="py-2 px-4 text-left text-xs font-medium text-slate-400">
                          Symbol
                        </th>
                        <th className="py-2 px-4 text-right text-xs font-medium text-slate-400">
                          Value
                        </th>
                        <th className="py-2 px-4 text-right text-xs font-medium text-slate-400">
                          Change %
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {section.data.map((item, index) => (
                        <tr
                          key={`${item.symbol}-${index}`}
                          className="border-b border-slate-800 hover:bg-slate-800/50 transition-colors"
                        >
                          <td className="py-3 px-4 text-sm">{index + 1}</td>
                          <td className="py-3 px-4 text-sm">
                            {item.tradeIndex ? item.tradeIndex : index}
                          </td>
                          <td className="py-3 px-4 text-sm font-medium">
                            {item.symbol}
                          </td>
                          <td className="py-3 px-4 text-right text-sm">
                            {item.value.toFixed(2)}
                          </td>
                          <td
                            className={`py-3 px-4 text-right font-medium text-${section.color}-500`}
                          >
                            <div className="flex items-center justify-end">
                              {section.color === "green" ? (
                                <ArrowUp className="mr-1 h-3 w-3" />
                              ) : (
                                <ArrowDown className="mr-1 h-3 w-3" />
                              )}
                              {Math.abs(item.change).toFixed(2)}%
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-slate-500">
                  No data available
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
