import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import { PrismaClient } from "@prisma/client";

// Routes
import authRoutes from "./routes/auth";
import walletRoutes from "./routes/wallet";
import usersRoutes from "./routes/users";
import transactionsRoutes from "./routes/transactions";
import instantpayRoutes from "./routes/instantpay";
import commissionRoutes from "./routes/commission";
import fundRequestRoutes from "./routes/fundRequests";
import notificationsRoutes from "./routes/notifications";
import statsRoutes from "./routes/stats";
import kycRoutes from "./routes/kyc";
import supportRoutes from "./routes/support";
import serviceConfigRoutes from "./routes/serviceConfig";
import tpinRoutes from "./routes/tpin";
import filesRoutes from "./routes/files";
import staffRoutes from "./routes/staff";
import publicServiceInfoRoutes from "./routes/publicServiceInfo";
import publicContactRoutes from "./routes/publicContact";
import dbRoutes from "./routes/db";
import settlementRoutes from "./routes/settlements";
import limitRoutes from "./routes/limits";
import systemLogsRoutes from "./routes/systemLogs";
import posRoutes from "./routes/pos";

export const prisma = new PrismaClient();

const app = express();
const PORT = process.env.PORT || 4000;

const staticAllowedOrigins = [
  process.env.FRONTEND_URL || "http://localhost:5173",
  "http://localhost:5173",
  "http://localhost:3000",
];

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

app.use(express.json());
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/wallet", walletRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/transactions", transactionsRoutes);
app.use("/api/instantpay", instantpayRoutes);
app.use("/api/commission", commissionRoutes);
app.use("/api/fund-requests", fundRequestRoutes);
app.use("/api/notifications", notificationsRoutes);
app.use("/api/stats", statsRoutes);
app.use("/api/kyc", kycRoutes);
app.use("/api/support", supportRoutes);
app.use("/api/service-config", serviceConfigRoutes);
app.use("/api/tpin", tpinRoutes);
app.use("/api/files", filesRoutes);
app.use("/api/staff", staffRoutes);
app.use("/api/db", dbRoutes);
app.use("/api/settlements", settlementRoutes);
app.use("/api/limits", limitRoutes);
app.use("/api/system-logs", systemLogsRoutes);
app.use("/api/pos", posRoutes);
app.use("/api/public", publicServiceInfoRoutes);
app.use("/api/public", publicContactRoutes);

app.listen(PORT, () => {
  console.log(`✅ GenPay backend running on http://localhost:${PORT}`);
});

export default app;
