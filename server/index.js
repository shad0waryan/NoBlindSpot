import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import rateLimit from "express-rate-limit";
import connectDB from "./config/db.js";
import { APP_CONFIG } from "./config/appConfig.js";
import authRoutes from "./routes/auth.js";
import mapRoutes from "./routes/maps.js";
import donateRoutes from "./routes/donate.js";
import errorHandler from "./middleware/errorHandler.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;

connectDB();

app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:5173",
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const apiLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100, standardHeaders: true, legacyHeaders: false, message: { message: "Too many requests, please try again later." } });
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, message: { message: "Too many auth attempts, please try again later." } });
const aiLimiter = rateLimit({ windowMs: 60 * 1000, max: 10, message: { message: "AI rate limit reached. Please wait a moment." } });


// Health check
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    app: APP_CONFIG.name,
    version: APP_CONFIG.version,
    timestamp: new Date().toISOString(),
  });
});

// Routes
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);
app.use("/api/maps/generate", aiLimiter);
app.use("/api/maps/explain", aiLimiter);
app.use("/api/maps/quiz", aiLimiter);
app.use("/api", apiLimiter);

app.use("/api/auth", authRoutes);
app.use("/api/maps", mapRoutes);
app.use("/api/donate", donateRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: `Route ${req.originalUrl} not found` });
});

// Global error handler (must be last)
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`🚀 ${APP_CONFIG.name} server running on port ${PORT}`);
});
