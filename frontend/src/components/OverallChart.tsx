import {
  ColorType,
  ISeriesApi,
  BaselineSeries,
  BaselineData,
  createOptionsChart,
  IChartApiBase,
  WhitespaceData,
  BaselineSeriesOptions,
  DeepPartial,
  BaselineStyleOptions,
  SeriesOptionsCommon,
} from "lightweight-charts";
import { useEffect, useRef } from "react";

export interface ChartData {
  time: number;
  value: number;
  symbol: string;
  change: number;
}

interface ChartComponentProps {
  data: ChartData[];
  colors?: {
    backgroundColor?: string;
    lineColor?: string;
    textColor?: string;
    areaTopColor?: string;
    areaBottomColor?: string;
  };
}

export const ChartComponent = (props: ChartComponentProps) => {
  const {
    data,
    colors: {
      backgroundColor = "black",
      lineColor = "#2962FF",
      textColor = "white",
      areaTopColor = "#2962FF",
      areaBottomColor = "rgba(41, 98, 255, 0.28)",
    } = {},
  } = props;

  const chartContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleResize = () => {
      if (chart && chartContainerRef.current) {
        chart.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };

    let chart: IChartApiBase<number>;
    let newSeries: ISeriesApi<
      "Baseline",
      number,
      BaselineData<number> | WhitespaceData<number>,
      BaselineSeriesOptions,
      DeepPartial<BaselineStyleOptions & SeriesOptionsCommon>
    >;

    if (chartContainerRef.current) {
      chart = createOptionsChart(chartContainerRef.current, {
        layout: {
          background: { type: ColorType.Solid, color: backgroundColor },
          textColor,
          attributionLogo: false,
        },
        width: chartContainerRef.current.clientWidth,
        localization: {
          priceFormatter: (price: number) => `${price.toFixed(2)}%`,
        },
        timeScale: { borderVisible: true },
        rightPriceScale: { borderVisible: true },
        height: 300,
        crosshair: {
          horzLine: {
            labelVisible: false,
          },
          vertLine: {
            labelVisible: false,
          },
        },
        grid: {
          vertLines: { visible: false },
          horzLines: { visible: false },
        },
      });
      chart.timeScale().fitContent();
      newSeries = chart.addSeries(BaselineSeries, {
        baseValue: { type: "price", price: 0 },
        // Vibrant green colors for positive values
        topLineColor: "rgba(46, 204, 113, 1)", // Emerald green (full opacity)
        topFillColor1: "rgba(46, 204, 113, 0.8)", // 80% opacity
        topFillColor2: "rgba(46, 204, 113, 0.3)", // 30% opacity

        // Rich red colors for negative values
        bottomLineColor: "rgba(231, 76, 60, 1)", // Alizarin red (full opacity)
        bottomFillColor1: "rgba(231, 76, 60, 0.3)", // 30% opacity
        bottomFillColor2: "rgba(231, 76, 60, 0.8)", // 80% opacity

        lineWidth: 2,
      });
      // Set only the required AreaData properties for plotting
      const chartData: BaselineData<number>[] = data.map(({ time, value }) => ({
        time: time + 1,
        value,
      }));
      newSeries.setData(chartData);

      window.addEventListener("resize", handleResize);
      const container = chartContainerRef.current;
      if (!container) {
        console.log("Container is not defined");
        return;
      }

      const toolTipWidth = 96;
      const toolTipHeight = 80;
      const toolTipMargin = 15;
      const toolTip = document.createElement("div");

      toolTip.setAttribute(
        "style",
        `
          width: 200px;
          padding: 10px;
          position: absolute;
          display: none;
          box-sizing: border-box;
          z-index: 1000;
          pointer-events: none;
          border-radius: 6px;
          font-family: -apple-system, BlinkMacSystemFont, 'Trebuchet MS', Roboto, sans-serif;
          background: rgba(15, 23, 42, 0.95);
          color: rgb(241, 245, 249);
          box-shadow: 0 4px 6px rgba(0,0,0,0.1), 0 1px 3px rgba(0,0,0,0.1);
          border: 1px solid rgba(100, 116, 139, 0.5);
          backdrop-filter: blur(4px);
          -webkit-font-smoothing: antialiased;
          transition: opacity 0.2s ease;
        `
      );
      container.appendChild(toolTip);

      // Update tooltip
      chart.subscribeCrosshairMove((param) => {
        if (
          param.point === undefined ||
          param.time === undefined ||
          param.point.x < 0 ||
          param.point.x > container.clientWidth ||
          param.point.y < 0 ||
          param.point.y > container.clientHeight
        ) {
          toolTip.style.display = "none";
        } else {
          const dateStr = param.time;
          toolTip.style.display = "block";
          const dataPoint = param.seriesData.get(
            newSeries
          ) as BaselineData<number>;
          if (!dataPoint) {
            console.log("data is not defined");
            return;
          }
          const price = dataPoint.value;

          // Get additional data from the Map
          // For simplicity, display the first matching entry (or handle multiple entries as needed)
          const logicalIndex = param.logical;
          let symbol = "N/A";
          let change = "N/A";
          if (logicalIndex != null) {
            const toolTipData = data[logicalIndex];
            symbol = toolTipData.symbol!;
            change = toolTipData.change!.toFixed(2);
          }

          const isNegative = change.startsWith("-");
          const borderColor = isNegative
            ? "rgba(239, 68, 68, 0.8)"
            : "rgba(16, 185, 129, 0.8)";

          const bgGradient = isNegative
            ? "linear-gradient(to bottom, rgba(239, 68, 68, 0.1), rgba(15, 23, 42, 0.95))"
            : "linear-gradient(to bottom, rgba(16, 185, 129, 0.1), rgba(15, 23, 42, 0.95))";

          toolTip.style.borderColor = borderColor;
          toolTip.style.background = bgGradient;

          toolTip.innerHTML = `
    <div style="display: grid; gap: 2px;">
      <div style="
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 8px;
      ">
        <span style="
          font-weight: 600;
          color: white;
          font-size: 0.8rem;
        ">${symbol}
      </div>
      <div style="
        font-weight: 600;
        font-size: 1rem;
        color: hsl(0 0% 98%);
      ">${price.toFixed(2)}
        </span>
        <span style="
          color: ${
            change.startsWith("-")
              ? "hsl(0 72.2% 50.6%)"
              : "hsl(142.1 70.6% 45.3%)"
          };
          justify-content: away;
          font-weight: 500;
          font-size: 0.75rem
        ">(${change}%)</span>
      </div>
      <div style="
        color: hsl(0 0% 72%);
        font-size: 0.7rem;
      ">Trade: ${dateStr}</div>
    </div>
  `;

          const y = param.point.y;
          let left = param.point.x + toolTipMargin;
          if (left > container.clientWidth - toolTipWidth * 2) {
            left = param.point.x - toolTipMargin - toolTipWidth * 2;
          }

          let top = y + toolTipMargin;
          if (top > container.clientHeight - toolTipHeight) {
            top = y - toolTipHeight - toolTipMargin;
          }
          toolTip.style.left = left + "px";
          toolTip.style.top = top + "px";
        }
      });
    }

    return () => {
      window.removeEventListener("resize", handleResize);
      if (chart) {
        chart.remove();
      }
    };
  }, [
    data,
    backgroundColor,
    lineColor,
    textColor,
    areaTopColor,
    areaBottomColor,
  ]);

  return <div ref={chartContainerRef} style={{ position: "relative" }} />;
};
