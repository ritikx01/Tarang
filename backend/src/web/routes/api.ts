import express from "express";
import getActiveSymbols from "../controllers/getActiveSymbols";
import getActiveSymbolData from "../controllers/getActiveSymbolData";
import getActiveIndicatorList from "../controllers/getActiveIndicatorList";
import getActiveCooldown from "../controllers/getActiveCooldown";
import getActiveSingals from "../controllers/getActiveSignals";
import getRulesToEvaluate from "../controllers/getRulesToEvaluate";
import { checkAuth } from "../middlewares/checkAuth";
import removeSignal from "../controllers/removeSignal";
import getPeriodicPerformance from "../controllers/analytics";
import checkWsStatus from "../controllers/checkWsStatus";
import getOverAllPerformance from "../controllers/getOverAllPerformance";

const apiRouter = express.Router();

apiRouter.get("/symbols", getActiveSymbols);
apiRouter.post("/symbol-data", getActiveSymbolData);
apiRouter.get("/active-indicators", getActiveIndicatorList);
apiRouter.get("/cooldown", getActiveCooldown);
apiRouter.get("/active-signals", getActiveSingals);
apiRouter.get("/evaluation-rules", getRulesToEvaluate);

apiRouter.post("/delete-signal", checkAuth, removeSignal);
apiRouter.post("/performance/periodic", getPeriodicPerformance);
apiRouter.get("/performance/overall", getOverAllPerformance);

apiRouter.get("/check-ws-status", checkWsStatus);
export default apiRouter;
