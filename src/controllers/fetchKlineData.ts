import axios from "axios";
const KLINE_URL = "https://fapi.binance.com/fapi/v1/klines";

interface Kline {
  openTime: number;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
  closeTime: number;
  quoteAssetVolume: string;
  numberOfTrades: number;
  takerBuyBaseVolume: string;
  takerBuyQuoteVolume: string;
  ignore: string;
}

interface KLineData {
  time: number;
  symbol: string;
  data: string[];
}

// Interface for the array of Klines
type Klines = Kline[];

async function fetchKlineData(symbols: string[], interval = "5m", limit = 288) {
  const requests = symbols.map((symbol) =>
    axios.get(KLINE_URL, {
      params: { symbol, interval, limit: limit + 1 },
    }),
  );
  const responses = await axios.all(requests);
  const time = responses[0].data.at(-1)[0];

  const data = responses.map((response, index) => {
    response.data.pop();
    return {
      symbol: symbols[index],
      volumes: response.data.map((item) => Number(item[5])),
      closing: response.data.map((item) => Number(item[4])),
    };
  });
  return { time, data };
}

export default fetchKlineData;
