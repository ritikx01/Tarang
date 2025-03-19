import axios from "axios";
import WebSocket from "ws";
import fetchSymbolList from "./data/fetchSymbolList";
// import fetchKlineStream from "./controllers/fetchKlineStream";
import fetchKlineData from "./data/fetchKlineData";
import SymbolTracker from "./services/symbolTracker";
import FetchKlineStream from "./data/fetchKlineStream";
import Broadcast from "./services/broadcast";

export const broadcast = new Broadcast();

async function fetchData() {
  const symbols = await fetchSymbolList();
  // const testSymbols = ["btcusdt", "ethusdt"];
  const testSymbols = ["manausdt"];
  // console.log(symbols);
  // const klineData = await fetchKlineData(testSymbols, undefined, 4);
  const klineData = await fetchKlineData(symbols);
  // const openTime = klineData.da
  // console.log(typeof klineData, klineData);
  // console.table(klineData.data);
  // console.log(klineData.time);
  const symbolTracker = new SymbolTracker(klineData.time); //Pass time as argument
  klineData.data.forEach((item) => {
    symbolTracker.createMedian(item.symbol, item.volumes);
    symbolTracker.initEMA(item.symbol, item.closingPrices);
  });
  const fetchKlineStream = new FetchKlineStream(
    symbols,
    klineData.time,
    symbolTracker,
  );
}

fetchData();
