import { useMemo } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";

interface ChartDataPoint {
  index: number;
  value: number;
}

function TopGainersLoserssLosers({
  chartData,
  interval,
}: {
  chartData: ChartDataPoint[];
  interval: string;
}) {
  const formatXAxis = (value: number) => {
    if (interval === "M") {
      const months = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ];
      return months[value - 1] || value.toString();
    }
    return value.toString();
  };

  const topGainers: ChartDataPoint[] = useMemo(() => {
    return [...chartData].sort((a, b) => b.value - a.value).slice(0, 5);
  }, [chartData]);
  const topLosers: ChartDataPoint[] = useMemo(() => {
    return [...chartData].sort((a, b) => a.value - b.value).slice(0, 5);
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

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {sections.map((section) => (
        <div
          key={section.title}
          className="p-4 rounded-lg bg-slate-900 shadow-lg border border-slate-700"
        >
          <div className="flex items-center gap-2 mb-4">
            {section.icon}
            <h2 className={`text-xl font-semibold text-${section.color}-500`}>
              {section.title}
            </h2>
          </div>

          {section.data.length > 0 ? (
            <div className="overflow-hidden rounded-lg border border-slate-800">
              <table className="min-w-full">
                <thead>
                  <tr className="bg-slate-800">
                    <th className="py-2 px-4 text-left text-xs font-medium text-slate-400">
                      Rank
                    </th>
                    <th className="py-2 px-4 text-left text-xs font-medium text-slate-400">
                      Index
                    </th>
                    <th className="py-2 px-4 text-right text-xs font-medium text-slate-400">
                      Value
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {section.data.map((item, index) => (
                    <tr
                      key={`${item.index}-${index}`}
                      className="border-b border-slate-800 hover:bg-slate-800/50 transition-colors"
                    >
                      <td className="py-3 px-4 text-sm">{index + 1}</td>
                      <td className="py-3 px-4 text-sm font-medium">
                        {formatXAxis(item.index)}
                      </td>
                      <td
                        className={`py-3 px-4 text-right font-medium text-${section.color}-500`}
                      >
                        {item.value}
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
  );
}

export default TopGainersLoserssLosers;
