import cors from "cors";
const FRONTEND_BASE_URL = process.env.FRONTEND_BASE_URL;
export const corsMiddleware = cors({
  origin: FRONTEND_BASE_URL,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  credentials: true,
  allowedHeaders: [
    "Origin",
    "X-Requested-With",
    "Content-Type",
    "Accept",
    "Authorization",
  ],
  exposedHeaders: ["set-cookie"],
  maxAge: 86400, // 24 hours in seconds
  preflightContinue: false,
  optionsSuccessStatus: 204,
});

const allowedOrigins = [FRONTEND_BASE_URL, "http://localhost:3000"];

export const corsMiddlewareMultipleOrigins = cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Origin",
    "X-Requested-With",
    "Content-Type",
    "Accept",
    "Authorization",
  ],
  exposedHeaders: ["set-cookie"],
  maxAge: 86400,
  preflightContinue: false,
  optionsSuccessStatus: 204,
});
