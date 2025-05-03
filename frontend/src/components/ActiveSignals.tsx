import { useState, useEffect } from "react";
import Sidebar from "./Sidebar";

// Type definitions
interface SignalInfo {
  timeframe: Timeframe;
  candleData: AddCandleData;
  rulesEvaluationResult: Map<number, SignalResultType>;
  signalId: string;
}

type Timeframe = "W" | "D" | "1m" | "5m" | "15m" | "30m" | "1h" | "4h";

interface AddCandleData {
  openingTimestamp: number;
  openPrice: number;
  highPrice: number;
  lowPrice: number;
  closePrice: number;
  volume: number;
  closingTimestamp: number;
}

// We don't use this, but TypeScript needs it for the Map type
type SignalResultType = any;

interface ActiveSignalsResponse {
  "active-signals": Record<string, SignalInfo>;
}
const backend = import.meta.env.VITE_BACKEND_BASE_URL;
export default function ActiveTrades() {
  const [activeSignals, setActiveSignals] = useState<
    Record<string, SignalInfo>
  >({});
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchActiveSignals = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${backend}/api/active-signals`);

        if (!response.ok) {
          throw new Error(`Error fetching signals: ${response.statusText}`);
        }

        const data: ActiveSignalsResponse = await response.json();
        setActiveSignals(data["active-signals"]);
        setError(null);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "An unknown error occurred"
        );
        console.error("Failed to fetch active signals:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchActiveSignals();

    // Set up periodic refresh (every 30 seconds)
    const intervalId = setInterval(fetchActiveSignals, 30000);

    // Clean up interval on component unmount
    return () => clearInterval(intervalId);
  }, []);

  // Format timestamp to a readable date/time
  const formatTimestamp = (timestamp: number): string => {
    return new Date(timestamp).toLocaleString();
  };

  if (error && Object.keys(activeSignals).length === 0) {
    return (
      <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded shadow-md">
        <p className="font-bold">Error</p>
        <p>{error}</p>
      </div>
    );
  }

  const section = {
    title: "Active Signals",
    color: "blue",
    data: Object.entries(activeSignals).map(([symbol, signal]) => ({
      symbol,
      value: signal.candleData.closePrice,
      timeframe: signal.timeframe,
      openingTimestamp: signal.candleData.openingTimestamp,
      signalId: signal.signalId,
    })),
  };

  return (
    <div className="flex grow w-screen">
      <Sidebar />
      <div className="flex flex-col w-full gap-2 h-max m-4 p-2">
        <h1 className="text-2xl font-bold mb-6">Market Signals</h1>

        {loading && (
          <div className="text-sm text-gray-400 mb-4 flex items-center">
            <div className="animate-spin h-4 w-4 mr-2 border-t-2 border-blue-500 rounded-full"></div>
            Refreshing data...
          </div>
        )}

        {error && (
          <div className="text-sm text-red-500 mb-4">
            Error refreshing: {error}
          </div>
        )}

        {Object.keys(activeSignals).length === 0 ? (
          <div className="bg-slate-950 rounded-lg p-8 text-center text-gray-400 border border-slate-800">
            No active trades at the moment
          </div>
        ) : (
          <div className="flex gap-2 border border-slate-600 rounded-lg h-full w-full p-2">
            <div className="w-full p-4 rounded-lg bg-slate-950 shadow">
              <h2
                className={`text-xl font-bold mb-4 text-${section.color}-600`}
              >
                {section.title}
              </h2>
              <div className="overflow-hidden">
                <table className="min-w-full">
                  <thead>
                    <tr className="bg-slate-900">
                      <th className="py-2 px-4 text-left">S.No</th>
                      <th className="py-2 px-4 text-left">Symbol</th>
                      <th className="py-2 px-4 text-left">Timeframe</th>
                      <th className="py-2 px-4 text-left">Opening Time</th>
                      <th className="py-2 px-4 text-right">Close Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {section.data.map((item, index) => {
                      return (
                        <tr
                          key={item.signalId}
                          className="border-b border-slate-800 hover:bg-slate-800"
                        >
                          <td className="py-2 px-4">{index + 1}</td>
                          <td className="py-2 px-4 font-medium">
                            {item.symbol}
                          </td>
                          <td className="py-2 px-4">{item.timeframe}</td>
                          <td className="py-2 px-4">
                            {formatTimestamp(item.openingTimestamp)}
                          </td>
                          <td className="py-2 px-4 text-right">
                            {item.value.toFixed(2)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
