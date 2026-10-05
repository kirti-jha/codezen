import { Router, Request } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { randomUUID } from "crypto";
import fs from "fs";
import path from "path";
import { prisma } from "../index";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { logSystemActivity } from "./systemLogs";

const router = Router();

type PendingReset = { otp: string; resetToken?: string; expiresAt: number };
const resetStore = new Map<string, PendingReset>();

const loginDebugDir = path.join(process.cwd(), "logs");
const loginDebugFile = path.join(loginDebugDir, "login-debug.log");

async function appendLoginDebug(message: string) {
  console.log(message);
}

function buildLoginDebugLine(req: Request, event: string, details: string) {
  return `${new Date().toISOString()} | login | ip=${req.ip || "unknown"} | event=${event} | ${details}`;
}

function signBackendToken(userId: string) {
  const secret = process.env.BACKEND_JWT_SECRET || "dev_backend_secret_change_me";
  return jwt.sign({ sub: userId, typ: "access" }, secret, { expiresIn: "7d" });
}

router.post("/login", async (req, res) => {
  const email = String(req.body?.email || "").trim().toLowerCase();
  const password = String(req.body?.password || "");
  if (!email || !password) return res.status(400).json({ error: "Email and password are required" });

  await appendLoginDebug(
    buildLoginDebugLine(req, "received", `email=${email} password_present=${Boolean(password)}`)
  );

  try {
    const authUser = await prisma.authUser.findUnique({ where: { email } });
    await appendLoginDebug(
      buildLoginDebugLine(
        req,
        "lookup",
        `found=${Boolean(authUser)} active=${authUser?.isActive ?? "n/a"}`
      )
    );

    if (!authUser || !authUser.isActive) {
      await appendLoginDebug(buildLoginDebugLine(req, "failed", "reason=invalid_credentials"));
      await logSystemActivity({
        userEmail: email,
        action: "USER_LOGIN_FAILED",
        module: "AUTH",
        severity: "warning",
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
        details: `Failed login attempt for ${email} (User not found or inactive)`,
      });
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const ok = await bcrypt.compare(password, authUser.passwordHash);
    await appendLoginDebug(buildLoginDebugLine(req, "password_check", `ok=${ok}`));
    if (!ok) {
      await appendLoginDebug(buildLoginDebugLine(req, "failed", "reason=invalid_credentials"));
      await logSystemActivity({
        userId: authUser.userId,
        userEmail: email,
        action: "USER_LOGIN_FAILED",
        module: "AUTH",
        severity: "warning",
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
        details: `Failed login attempt for ${email} (Incorrect password)`,
      });
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = signBackendToken(authUser.userId);
    const profile = await prisma.profile.findUnique({ where: { userId: authUser.userId } });
    const userRole = await prisma.userRole.findFirst({ where: { userId: authUser.userId } });

    await logSystemActivity({
      userId: authUser.userId,
      userEmail: email,
      userRole: userRole?.role,
      action: "USER_LOGIN_SUCCESS",
      module: "AUTH",
      severity: "info",
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
      details: `User ${email} logged in successfully`,
    });

    await appendLoginDebug(
      buildLoginDebugLine(req, "success", `userId=${authUser.userId} profile_found=${Boolean(profile)}`)
    );
    return res.json({
      access_token: token,
      user: { id: authUser.userId, email: authUser.email },
      profile,
    });
  } catch (e: any) {
    await appendLoginDebug(buildLoginDebugLine(req, "error", `message=${String(e?.message ?? e)}`));
    return res.status(500).json({ error: e.message });
  }
});

router.post("/signup", async (req, res) => {
  const email = String(req.body?.email || "").trim().toLowerCase();
  const password = String(req.body?.password || "");
  const fullName = String(req.body?.full_name || "").trim();

  if (!email || !password || !fullName) {
    return res.status(400).json({ error: "full_name, email and password are required" });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters" });
  }

  try {
    const existing = await prisma.authUser.findUnique({ where: { email } });
    if (existing) return res.status(409).json({ error: "Email already exists" });

    const userId = randomUUID();
    const passwordHash = await bcrypt.hash(password, 10);

    await prisma.$transaction(async (tx) => {
      await tx.authUser.create({
        data: { userId, email, passwordHash, isActive: true },
      });
      await tx.profile.create({
        data: {
          userId,
          fullName,
          status: "active",
          kycStatus: "pending",
        },
      });
      await tx.userRole.create({
        data: { userId, role: "retailer" },
      });
      await tx.wallet.create({
        data: { userId, balance: 0, eWalletBalance: 0 },
      });
    });

    const token = signBackendToken(userId);
    return res.status(201).json({
      access_token: token,
      user: { id: userId, email },
      message: "Account created",
    });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

router.post("/bootstrap-admin", async (req, res) => {
  const secret = String(req.body?.secret || "");
  const expected = process.env.BOOTSTRAP_SECRET || "abheepay-bootstrap-2026";
  if (secret !== expected) return res.status(403).json({ error: "Invalid bootstrap secret" });

  const email = String(req.body?.email || "").trim().toLowerCase();
  const password = String(req.body?.password || "");
  const fullName = String(req.body?.full_name || "").trim();
  if (!email || !password || !fullName) return res.status(400).json({ error: "Missing fields" });

  try {
    const hasAdmin = await prisma.userRole.findFirst({ where: { role: "admin" } });
    if (hasAdmin) return res.status(409).json({ error: "Admin already exists" });

    const existing = await prisma.authUser.findUnique({ where: { email } });
    if (existing) return res.status(409).json({ error: "Email already exists" });

    const userId = randomUUID();
    const passwordHash = await bcrypt.hash(password, 10);
    await prisma.$transaction(async (tx) => {
      await tx.authUser.create({ data: { userId, email, passwordHash, isActive: true } });
      await tx.profile.create({
        data: {
          userId,
          fullName,
          status: "active",
          kycStatus: "verified",
          isMasterAdmin: true,
        },
      });
      await tx.userRole.create({ data: { userId, role: "admin" } });
      await tx.wallet.create({ data: { userId, balance: 0, eWalletBalance: 0 } });
    });
    return res.json({ success: true, user_id: userId });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

router.get("/me", requireAuth, async (req: AuthRequest, res) => {
  try {
    const profile = await prisma.profile.findUnique({ where: { userId: req.userId! } });
    const role = await prisma.userRole.findFirst({ where: { userId: req.userId! } });
    const wallet = await prisma.wallet.findUnique({ where: { userId: req.userId! } });
    const authUser = await prisma.authUser.findUnique({ where: { userId: req.userId! } });

    res.json({
      user: authUser ? { id: authUser.userId, email: authUser.email } : { id: req.userId, email: "" },
      profile,
      role: role?.role,
      walletBalance: wallet ? Number(wallet.balance) : 0,
      eWalletBalance: wallet ? Number(wallet.eWalletBalance) : 0,
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/change-password", requireAuth, async (req: AuthRequest, res) => {
  const currentPassword = String(req.body?.current_password || "");
  const newPassword = String(req.body?.new_password || "");
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: "current_password and new_password are required" });
  }
  if (newPassword.length < 6) return res.status(400).json({ error: "Password must be at least 6 characters" });

  try {
    const authUser = await prisma.authUser.findUnique({ where: { userId: req.userId! } });
    if (!authUser) return res.status(404).json({ error: "User not found" });

    const ok = await bcrypt.compare(currentPassword, authUser.passwordHash);
    if (!ok) return res.status(401).json({ error: "Incorrect current password" });

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.authUser.update({ where: { userId: req.userId! }, data: { passwordHash } });

    return res.json({ success: true, message: "Password changed" });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

router.post("/forgot-password", async (req, res) => {
  const action = String(req.body?.action || "");
  const email = String(req.body?.email || "").trim().toLowerCase();
  if (!email) return res.status(400).json({ error: "Email is required" });

  try {
    const authUser = await prisma.authUser.findUnique({ where: { email } });
    if (!authUser) return res.status(404).json({ error: "Account not found" });

    if (action === "verify_identity") {
      const otp = `${Math.floor(100000 + Math.random() * 900000)}`;
      resetStore.set(email, { otp, expiresAt: Date.now() + 10 * 60 * 1000 });
      return res.json({ success: true, otp_hint: "Use OTP shown in dev", _demo_otp: otp });
    }

    if (action === "verify_otp") {
      const otp = String(req.body?.otp || "");
      const entry = resetStore.get(email);
      if (!entry || entry.expiresAt < Date.now() || entry.otp !== otp) {
        return res.status(400).json({ error: "Invalid or expired OTP" });
      }
      const resetToken = randomUUID();
      resetStore.set(email, { ...entry, resetToken });
      return res.json({ success: true, reset_token: resetToken });
    }

    if (action === "reset_password") {
      const resetToken = String(req.body?.reset_token || "");
      const newPassword = String(req.body?.new_password || "");
      const entry = resetStore.get(email);
      if (!entry || entry.expiresAt < Date.now() || entry.resetToken !== resetToken) {
        return res.status(400).json({ error: "Invalid or expired reset token" });
      }
      if (newPassword.length < 6) return res.status(400).json({ error: "Password must be at least 6 characters" });

      const passwordHash = await bcrypt.hash(newPassword, 10);
      await prisma.authUser.update({ where: { email }, data: { passwordHash } });
      resetStore.delete(email);
      return res.json({ success: true });
    }

    return res.status(400).json({ error: "Invalid action" });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

router.post("/logout", (_req, res) => res.json({ success: true }));

export default router;
