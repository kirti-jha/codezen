import { Router } from "express";
import { prisma } from "../index";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { logSystemActivity } from "./systemLogs";

const router = Router();

// Helper to check admin status
async function isAdminUser(userId: string) {
  const roleRow = await prisma.userRole.findFirst({ where: { userId } });
  return roleRow?.role === "admin";
}

// Helper to get today's date string YYYY-MM-DD in IST/local time
function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Helper to get or create SystemLimitConfig
async function getOrCreateSystemLimitConfig() {
  let config = await prisma.systemLimitConfig.findFirst();
  if (!config) {
    config = await prisma.systemLimitConfig.create({
      data: {
        defaultDailyLimit: 100000,
        defaultPerTxnLimit: 25000,
        globalUnlimited: false,
      },
    });
  }
  return config;
}

// Helper to ensure UserLimit record exists and resets daily usage if date changed
async function getOrInitUserLimit(userId: string, systemConfig: any) {
  const todayStr = getTodayDateString();
  let userLimit = await prisma.userLimit.findUnique({ where: { userId } });

  if (!userLimit) {
    userLimit = await prisma.userLimit.create({
      data: {
        userId,
        dailyLimit: null, // Fall back to system default
        perTxnLimit: null, // Fall back to system default
        isUnlimited: false,
        todayUsedAmount: 0,
        lastUsedDate: todayStr,
      },
    });
  } else if (userLimit.lastUsedDate !== todayStr) {
    // Reset daily usage for a new day
    userLimit = await prisma.userLimit.update({
      where: { userId },
      data: {
        todayUsedAmount: 0,
        lastUsedDate: todayStr,
      },
    });
  }

  const effectiveDailyLimit = userLimit.isUnlimited || systemConfig.globalUnlimited
    ? -1
    : userLimit.dailyLimit !== null ? Number(userLimit.dailyLimit) : Number(systemConfig.defaultDailyLimit);

  const effectivePerTxnLimit = userLimit.isUnlimited || systemConfig.globalUnlimited
    ? -1
    : userLimit.perTxnLimit !== null ? Number(userLimit.perTxnLimit) : Number(systemConfig.defaultPerTxnLimit);

  const usedAmount = Number(userLimit.todayUsedAmount || 0);
  const remainingDailyLimit = effectiveDailyLimit === -1 ? -1 : Math.max(0, effectiveDailyLimit - usedAmount);

  return {
    raw: userLimit,
    effectiveDailyLimit,
    effectivePerTxnLimit,
    isUnlimited: userLimit.isUnlimited || systemConfig.globalUnlimited,
    isCustom: userLimit.dailyLimit !== null || userLimit.perTxnLimit !== null || userLimit.isUnlimited,
    todayUsedAmount: usedAmount,
    remainingDailyLimit,
  };
}

// ─── 1. GET /api/limits ───────────────────────────────────────────────────────
router.get("/", requireAuth, async (req: AuthRequest, res) => {
  try {
    const requesterId = req.userId!;
    const isAdm = await isAdminUser(requesterId);

    const search = (req.query.search as string || "").trim().toLowerCase();
    const roleFilter = req.query.role as string;
    const limitTypeFilter = req.query.limitType as string; // "custom", "unlimited", "default"

    const page = parseInt((req.query.page as string) || "1", 10);
    const limit = parseInt((req.query.limit as string) || "20", 10);
    const skip = (page - 1) * limit;

    const systemConfig = await getOrCreateSystemLimitConfig();

    // Fetch auth users + profiles + roles
    const authUsers = await prisma.authUser.findMany({
      orderBy: { createdAt: "desc" },
    });

    const userIds = authUsers.map((a) => a.userId);
    const profiles = await prisma.profile.findMany({ where: { userId: { in: userIds } } });
    const roles = await prisma.userRole.findMany({ where: { userId: { in: userIds } } });
    const userLimits = await prisma.userLimit.findMany({ where: { userId: { in: userIds } } });

    const profileMap = new Map(profiles.map((p) => [p.userId, p]));
    const roleMap = new Map(roles.map((r) => [r.userId, r.role]));
    const limitMap = new Map(userLimits.map((l) => [l.userId, l]));

    const todayStr = getTodayDateString();

    let list = authUsers.map((a) => {
      const p = profileMap.get(a.userId);
      const r = roleMap.get(a.userId) || "retailer";
      const ul = limitMap.get(a.userId);

      let usedAmount = Number(ul?.todayUsedAmount || 0);
      if (ul && ul.lastUsedDate !== todayStr) {
        usedAmount = 0;
      }

      const isUnlim = Boolean(ul?.isUnlimited || systemConfig.globalUnlimited);
      const isCustom = Boolean(ul?.dailyLimit !== null || ul?.perTxnLimit !== null || ul?.isUnlimited);

      const dailyLimitVal = isUnlim
        ? -1
        : ul?.dailyLimit !== null && ul?.dailyLimit !== undefined
        ? Number(ul.dailyLimit)
        : Number(systemConfig.defaultDailyLimit);

      const perTxnLimitVal = isUnlim
        ? -1
        : ul?.perTxnLimit !== null && ul?.perTxnLimit !== undefined
        ? Number(ul.perTxnLimit)
        : Number(systemConfig.defaultPerTxnLimit);

      const remaining = isUnlim ? -1 : Math.max(0, dailyLimitVal - usedAmount);

      return {
        userId: a.userId,
        email: a.email,
        fullName: p?.fullName || a.email,
        phone: p?.phone || "",
        businessName: p?.businessName || "",
        role: r,
        status: p?.status || "active",
        dailyLimit: dailyLimitVal,
        perTxnLimit: perTxnLimitVal,
        isUnlimited: isUnlim,
        isCustom,
        todayUsedAmount: usedAmount,
        remainingDailyLimit: remaining,
        systemDefaultDaily: Number(systemConfig.defaultDailyLimit),
        systemDefaultPerTxn: Number(systemConfig.defaultPerTxnLimit),
      };
    });

    // Apply role check if non-admin (non-admins see only downlines or lower roles)
    if (!isAdm) {
      // Non-admins see downlines or filtered users
      const myProfile = profileMap.get(requesterId);
      list = list.filter((item) => item.userId !== requesterId);
    }

    // Filter by Search
    if (search) {
      list = list.filter(
        (u) =>
          u.fullName.toLowerCase().includes(search) ||
          u.email.toLowerCase().includes(search) ||
          u.phone.toLowerCase().includes(search) ||
          u.userId.toLowerCase().includes(search)
      );
    }

    // Filter by Role
    if (roleFilter && roleFilter !== "all") {
      list = list.filter((u) => u.role === roleFilter);
    }

    // Filter by Limit Type
    if (limitTypeFilter && limitTypeFilter !== "all") {
      if (limitTypeFilter === "unlimited") {
        list = list.filter((u) => u.isUnlimited);
      } else if (limitTypeFilter === "custom") {
        list = list.filter((u) => u.isCustom && !u.isUnlimited);
      } else if (limitTypeFilter === "default") {
        list = list.filter((u) => !u.isCustom && !u.isUnlimited);
      }
    }

    const total = list.length;
    const paginatedItems = list.slice(skip, skip + limit);

    res.json({
      items: paginatedItems,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      systemConfig: {
        defaultDailyLimit: Number(systemConfig.defaultDailyLimit),
        defaultPerTxnLimit: Number(systemConfig.defaultPerTxnLimit),
        globalUnlimited: systemConfig.globalUnlimited,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── 2. GET /api/limits/my-limit ─────────────────────────────────────────────
router.get("/my-limit", requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    const systemConfig = await getOrCreateSystemLimitConfig();
    const info = await getOrInitUserLimit(userId, systemConfig);
    res.json({
      ...info,
      systemConfig: {
        defaultDailyLimit: Number(systemConfig.defaultDailyLimit),
        defaultPerTxnLimit: Number(systemConfig.defaultPerTxnLimit),
        globalUnlimited: systemConfig.globalUnlimited,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── 3. GET /api/limits/config ───────────────────────────────────────────────
router.get("/config", requireAuth, async (_req, res) => {
  try {
    const config = await getOrCreateSystemLimitConfig();
    res.json(config);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── 4. PUT /api/limits/config ───────────────────────────────────────────────
router.put("/config", requireAuth, async (req: AuthRequest, res) => {
  try {
    const adminId = req.userId!;
    const isAdm = await isAdminUser(adminId);
    if (!isAdm) return res.status(403).json({ error: "Only admins can update system limit configurations." });

    const { defaultDailyLimit, defaultPerTxnLimit, globalUnlimited } = req.body;

    const existingConfig = await getOrCreateSystemLimitConfig();

    const updatedConfig = await prisma.systemLimitConfig.update({
      where: { id: existingConfig.id },
      data: {
        defaultDailyLimit: defaultDailyLimit !== undefined ? Number(defaultDailyLimit) : existingConfig.defaultDailyLimit,
        defaultPerTxnLimit: defaultPerTxnLimit !== undefined ? Number(defaultPerTxnLimit) : existingConfig.defaultPerTxnLimit,
        globalUnlimited: globalUnlimited !== undefined ? Boolean(globalUnlimited) : existingConfig.globalUnlimited,
        updatedBy: adminId,
      },
    });

    await prisma.limitAuditLog.create({
      data: {
        targetUserId: adminId,
        actionBy: adminId,
        action: "SYSTEM_CONFIG_UPDATED",
        newDailyLimit: Number(updatedConfig.defaultDailyLimit),
        newPerTxnLimit: Number(updatedConfig.defaultPerTxnLimit),
        details: JSON.stringify({ globalUnlimited: updatedConfig.globalUnlimited }),
      },
    });

    await logSystemActivity({
      userId: adminId,
      action: "SYSTEM_LIMIT_CONFIG_UPDATED",
      module: "LIMITS",
      severity: "info",
      details: {
        defaultDailyLimit: Number(updatedConfig.defaultDailyLimit),
        defaultPerTxnLimit: Number(updatedConfig.defaultPerTxnLimit),
        globalUnlimited: updatedConfig.globalUnlimited,
      },
    });

    res.json({ message: "System limit defaults updated successfully", config: updatedConfig });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── 5. PUT /api/limits/user/:userId ──────────────────────────────────────────
router.put("/user/:targetUserId", requireAuth, async (req: AuthRequest, res) => {
  try {
    const actionBy = req.userId!;
    const isAdm = await isAdminUser(actionBy);
    if (!isAdm) return res.status(403).json({ error: "Only authorized managers can update user transaction limits." });

    const targetUserId = req.params.targetUserId;
    const { dailyLimit, perTxnLimit, isUnlimited, resetDailyUsage } = req.body;

    const systemConfig = await getOrCreateSystemLimitConfig();
    const existingLimit = await prisma.userLimit.findUnique({ where: { userId: targetUserId } });

    const newDaily = isUnlimited ? null : (dailyLimit !== undefined && dailyLimit !== null && dailyLimit !== "" ? Number(dailyLimit) : null);
    const newPerTxn = isUnlimited ? null : (perTxnLimit !== undefined && perTxnLimit !== null && perTxnLimit !== "" ? Number(perTxnLimit) : null);
    const newUnlim = Boolean(isUnlimited);

    const todayStr = getTodayDateString();

    const updatedUserLimit = await prisma.userLimit.upsert({
      where: { userId: targetUserId },
      create: {
        userId: targetUserId,
        dailyLimit: newDaily,
        perTxnLimit: newPerTxn,
        isUnlimited: newUnlim,
        todayUsedAmount: resetDailyUsage ? 0 : 0,
        lastUsedDate: todayStr,
        updatedBy: actionBy,
      },
      update: {
        dailyLimit: newDaily,
        perTxnLimit: newPerTxn,
        isUnlimited: newUnlim,
        ...(resetDailyUsage ? { todayUsedAmount: 0, lastUsedDate: todayStr } : {}),
        updatedBy: actionBy,
      },
    });

    // Record Audit Log
    await prisma.limitAuditLog.create({
      data: {
        targetUserId,
        actionBy,
        action: "SET_USER_LIMIT",
        previousDailyLimit: existingLimit?.dailyLimit ? Number(existingLimit.dailyLimit) : null,
        newDailyLimit: newDaily,
        previousPerTxnLimit: existingLimit?.perTxnLimit ? Number(existingLimit.perTxnLimit) : null,
        newPerTxnLimit: newPerTxn,
        details: JSON.stringify({ isUnlimited: newUnlim, resetDailyUsage }),
      },
    });

    await logSystemActivity({
      userId: actionBy,
      action: "USER_LIMIT_UPDATED",
      module: "LIMITS",
      severity: "info",
      details: { targetUserId, newDaily, newPerTxn, isUnlimited: newUnlim, resetDailyUsage },
    });

    // Send Notification
    await prisma.notification.create({
      data: {
        userId: targetUserId,
        title: "Transaction Limits Updated ⚙️",
        message: newUnlim
          ? "Your transaction limit has been set to UNLIMITED by administration."
          : `Your new daily limit is ₹${newDaily ?? systemConfig.defaultDailyLimit} and per-txn limit is ₹${newPerTxn ?? systemConfig.defaultPerTxnLimit}.`,
        type: "info",
      },
    });

    res.json({ message: "User limit updated successfully", limit: updatedUserLimit });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── 6. POST /api/limits/batch ────────────────────────────────────────────────
router.post("/batch", requireAuth, async (req: AuthRequest, res) => {
  try {
    const actionBy = req.userId!;
    const isAdm = await isAdminUser(actionBy);
    if (!isAdm) return res.status(403).json({ error: "Only admins can perform batch limit updates." });

    const { updates } = req.body; // Array of { userId, dailyLimit, perTxnLimit, isUnlimited }
    if (!Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({ error: "Invalid payload: updates array is required." });
    }

    const todayStr = getTodayDateString();
    let updatedCount = 0;

    for (const item of updates) {
      if (!item.userId) continue;

      const newDaily = item.isUnlimited ? null : (item.dailyLimit !== undefined && item.dailyLimit !== null && item.dailyLimit !== "" ? Number(item.dailyLimit) : null);
      const newPerTxn = item.isUnlimited ? null : (item.perTxnLimit !== undefined && item.perTxnLimit !== null && item.perTxnLimit !== "" ? Number(item.perTxnLimit) : null);
      const newUnlim = Boolean(item.isUnlimited);

      await prisma.userLimit.upsert({
        where: { userId: item.userId },
        create: {
          userId: item.userId,
          dailyLimit: newDaily,
          perTxnLimit: newPerTxn,
          isUnlimited: newUnlim,
          todayUsedAmount: 0,
          lastUsedDate: todayStr,
          updatedBy: actionBy,
        },
        update: {
          dailyLimit: newDaily,
          perTxnLimit: newPerTxn,
          isUnlimited: newUnlim,
          updatedBy: actionBy,
        },
      });

      await prisma.limitAuditLog.create({
        data: {
          targetUserId: item.userId,
          actionBy,
          action: "BATCH_LIMIT_UPDATE",
          newDailyLimit: newDaily,
          newPerTxnLimit: newPerTxn,
          details: JSON.stringify({ isUnlimited: newUnlim }),
        },
      });

      updatedCount++;
    }

    await logSystemActivity({
      userId: actionBy,
      action: "BATCH_LIMIT_UPDATE",
      module: "LIMITS",
      severity: "info",
      details: { updatedCount },
    });

    res.json({ message: `Successfully updated transaction limits for ${updatedCount} user(s).`, updatedCount });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── 7. GET /api/limits/audit-logs ───────────────────────────────────────────
router.get("/audit-logs", requireAuth, async (req: AuthRequest, res) => {
  try {
    const requesterId = req.userId!;
    const isAdm = await isAdminUser(requesterId);
    if (!isAdm) return res.status(403).json({ error: "Only admins can view limit audit logs." });

    const logs = await prisma.limitAuditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    res.json(logs);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
