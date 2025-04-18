import express, { Request, Response } from "express";
import getActiveSymbols from "../controllers/getActiveSymbols";
import getActiveSymbolData from "../controllers/getActiveSymbolData";
import getActiveIndicatorList from "../controllers/getActiveIndicatorList";
import getActiveCooldown from "../controllers/getActiveCooldown";
import getActiveSingals from "../controllers/getActiveSignals";
import getRulesToEvaluate from "../controllers/getRulesToEvaluate";

const apiRouter = express.Router();

apiRouter.get("/symbols", getActiveSymbols);
apiRouter.post("/symbol-data", getActiveSymbolData);
apiRouter.get("/active-indicators", getActiveIndicatorList);
apiRouter.get("/cooldown", getActiveCooldown);
apiRouter.get("/active-signals", getActiveSingals);
apiRouter.get("/evaluation-rules", getRulesToEvaluate);

export default apiRouter;
