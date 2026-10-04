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

// Helper to get or create system config
async function getOrCreateSettlementConfig() {
  let config = await prisma.settlementConfig.findFirst();
  if (!config) {
    config = await prisma.settlementConfig.create({
      data: {
        minSettlementAmount: 100,
        maxSettlementAmount: 500000,
        settlementFeeType: "flat",
        settlementFeeValue: 5,
        autoSettlementEnabled: false,
        settlementSchedule: "instant",
      },
    });
  }
  return config;
}

// ─── 1. GET /api/settlements/summary ──────────────────────────────────────────
router.get("/summary", requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    const targetUserId = (req.query.userId as string) || userId;

    // Check permissions if requesting another user's summary
    if (targetUserId !== userId) {
      const isAdm = await isAdminUser(userId);
      if (!isAdm) return res.status(403).json({ error: "Forbidden" });
    }

    const wallet = await prisma.wallet.findUnique({ where: { userId: targetUserId } });
    const profile = await prisma.profile.findUnique({ where: { userId: targetUserId } });

    // Active holds
    const activeHolds = await prisma.settlementHold.findMany({
      where: { userId: targetUserId, status: "active" },
    });
    const totalHoldAmount = activeHolds.reduce((acc, h) => acc + Number(h.amount), 0);

    // Pending settlements
    const pendingSettlements = await prisma.settlementRequest.findMany({
      where: {
        userId: targetUserId,
        status: { in: ["pending", "processing"] },
      },
    });
    const pendingAmount = pendingSettlements.reduce((acc, s) => acc + Number(s.amount), 0);

    // Completed settlements
    const completedSettlements = await prisma.settlementRequest.findMany({
      where: { userId: targetUserId, status: "completed" },
    });
    const totalSettled = completedSettlements.reduce((acc, s) => acc + Number(s.netAmount), 0);

    const mainBalance = Number(wallet?.balance ?? 0);
    const availableForSettlement = Math.max(0, mainBalance - totalHoldAmount);

    const config = await getOrCreateSettlementConfig();

    res.json({
      mainBalance,
      availableForSettlement,
      pendingSettlementAmount: pendingAmount,
      totalHoldAmount,
      activeHoldsCount: activeHolds.length,
      totalSettledAmount: totalSettled,
      completedSettlementsCount: completedSettlements.length,
      bankDetails: {
        bankName: profile?.bankName || "",
        accountNumber: profile?.bankAccountNumber || "",
        ifsc: profile?.bankIfsc || "",
        accountHolder: profile?.bankAccountHolder || profile?.fullName || "",
      },
      kycStatus: profile?.kycStatus || "pending",
      config: {
        minSettlementAmount: Number(config.minSettlementAmount),
        maxSettlementAmount: Number(config.maxSettlementAmount),
        settlementFeeType: config.settlementFeeType,
        settlementFeeValue: Number(config.settlementFeeValue),
        autoSettlementEnabled: config.autoSettlementEnabled,
        settlementSchedule: config.settlementSchedule,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── 2. GET /api/settlements/history ──────────────────────────────────────────
router.get("/history", requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    const isAdm = await isAdminUser(userId);

    const statusFilter = req.query.status as string;
    const search = (req.query.search as string || "").trim().toLowerCase();
    const filterUserId = req.query.userId as string;

    const page = parseInt((req.query.page as string) || "1", 10);
    const limit = parseInt((req.query.limit as string) || "20", 10);
    const skip = (page - 1) * limit;

    const whereClause: any = {};

    if (isAdm && filterUserId) {
      whereClause.userId = filterUserId;
    } else if (!isAdm) {
      whereClause.userId = userId;
    }

    if (statusFilter && statusFilter !== "all") {
      whereClause.status = statusFilter;
    }

    if (search) {
      whereClause.OR = [
        { referenceId: { contains: search, mode: "insensitive" } },
        { bankAccountNumber: { contains: search, mode: "insensitive" } },
        { bankName: { contains: search, mode: "insensitive" } },
      ];
    }

    const [total, items] = await prisma.$transaction([
      prisma.settlementRequest.count({ where: whereClause }),
      prisma.settlementRequest.findMany({
        where: whereClause,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
    ]);

    // Attach user profile info if admin
    let mappedItems = items;
    if (isAdm) {
      const userIds = Array.from(new Set(items.map((i) => i.userId)));
      const profiles = await prisma.profile.findMany({
        where: { userId: { in: userIds } },
      });
      const authUsers = await prisma.authUser.findMany({
        where: { userId: { in: userIds } },
      });

      const profileMap = new Map(profiles.map((p) => [p.userId, p]));
      const authMap = new Map(authUsers.map((a) => [a.userId, a]));

      mappedItems = items.map((item) => {
        const p = profileMap.get(item.userId);
        const a = authMap.get(item.userId);
        return {
          ...item,
          userName: p?.fullName || a?.email || "Unknown User",
          userEmail: a?.email || "",
          userPhone: p?.phone || "",
        } as any;
      });
    }

    res.json({
      items: mappedItems,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── 3. POST /api/settlements/request ─────────────────────────────────────────
router.post("/request", requireAuth, async (req: AuthRequest, res) => {
  const { amount, payoutMode, remarks } = req.body;
  const requestedAmount = Number(amount);

  if (!requestedAmount || requestedAmount <= 0) {
    return res.status(400).json({ error: "Invalid settlement amount" });
  }

  const mode = payoutMode || "bank_transfer";

  try {
    const userId = req.userId!;
    const profile = await prisma.profile.findUnique({ where: { userId } });

    // KYC Check
    if (profile?.kycStatus !== "approved") {
      return res.status(400).json({
        error: "Settlement request failed: Your KYC must be approved before requesting settlements.",
      });
    }

    // Bank Account details check if bank transfer
    if (mode === "bank_transfer" && (!profile?.bankAccountNumber || !profile?.bankIfsc)) {
      return res.status(400).json({
        error: "Bank details missing: Please update your Bank Account Number & IFSC in profile settings.",
      });
    }

    // Config checks
    const config = await getOrCreateSettlementConfig();
    const minAmt = Number(config.minSettlementAmount);
    const maxAmt = Number(config.maxSettlementAmount);

    if (requestedAmount < minAmt) {
      return res.status(400).json({
        error: `Minimum settlement amount allowed is ₹${minAmt}`,
      });
    }
    if (requestedAmount > maxAmt) {
      return res.status(400).json({
        error: `Maximum settlement amount allowed per transaction is ₹${maxAmt}`,
      });
    }

    // Calculate fee
    let fee = 0;
    if (config.settlementFeeType === "percent") {
      fee = (requestedAmount * Number(config.settlementFeeValue)) / 100;
    } else {
      fee = Number(config.settlementFeeValue);
    }
    const netAmount = Math.max(0, requestedAmount - fee);

    // Check Wallet & Hold balance
    const wallet = await prisma.wallet.findUnique({ where: { userId } });
    const currentBalance = Number(wallet?.balance ?? 0);

    const activeHolds = await prisma.settlementHold.findMany({
      where: { userId, status: "active" },
    });
    const totalHold = activeHolds.reduce((acc, h) => acc + Number(h.amount), 0);
    const availableBalance = Math.max(0, currentBalance - totalHold);

    if (requestedAmount > availableBalance) {
      return res.status(400).json({
        error: `Insufficient available balance. Balance: ₹${currentBalance}, Active Holds: ₹${totalHold}, Available: ₹${availableBalance}`,
      });
    }

    const newBalance = currentBalance - requestedAmount;
    const initialStatus = config.autoSettlementEnabled ? "completed" : "pending";
    const refId = `SETTLE_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;

    const [updatedWallet, settlementReq, walletTxn] = await prisma.$transaction([
      prisma.wallet.update({
        where: { userId },
        data: { balance: newBalance },
      }),
      prisma.settlementRequest.create({
        data: {
          userId,
          amount: requestedAmount,
          fee,
          netAmount,
          settlementType: "manual",
          payoutMode: mode,
          status: initialStatus,
          bankName: profile?.bankName || null,
          bankAccountNumber: profile?.bankAccountNumber || null,
          bankIfsc: profile?.bankIfsc || null,
          bankAccountHolder: profile?.bankAccountHolder || profile?.fullName || null,
          referenceId: refId,
          remarks: remarks || "Settlement request submitted",
          processedAt: config.autoSettlementEnabled ? new Date() : null,
        },
      }),
      prisma.walletTransaction.create({
        data: {
          toUserId: userId,
          amount: requestedAmount,
          type: "settlement_deduction",
          description: `Settlement request (${refId}) - Fee: ₹${fee.toFixed(2)}, Net Payout: ₹${netAmount.toFixed(2)}`,
          toBalanceAfter: newBalance,
          createdBy: userId,
        },
      }),
    ]);

    // Create Audit Log
    await prisma.settlementAuditLog.create({
      data: {
        settlementId: settlementReq.id,
        userId,
        actionBy: userId,
        action: "REQUEST_CREATED",
        details: JSON.stringify({
          amount: requestedAmount,
          fee,
          netAmount,
          payoutMode: mode,
          status: initialStatus,
          referenceId: refId,
        }),
      },
    });

    await logSystemActivity({
      userId,
      action: "SETTLEMENT_REQUESTED",
      module: "SETTLEMENTS",
      severity: "info",
      details: { amount: requestedAmount, fee, netAmount, payoutMode: mode, referenceId: refId, status: initialStatus },
    });

    // Send Notification
    await prisma.notification.create({
      data: {
        userId,
        title: initialStatus === "completed" ? "Settlement Processed ✓" : "Settlement Requested",
        message: initialStatus === "completed"
          ? `Your settlement of ₹${requestedAmount} (Net: ₹${netAmount}) has been processed successfully.`
          : `Your settlement request of ₹${requestedAmount} has been submitted for approval.`,
        type: "success",
      },
    });

    res.json({
      message: "Settlement request submitted successfully",
      settlement: settlementReq,
      newBalance,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── 4. GET /api/settlements/holds ─────────────────────────────────────────────
router.get("/holds", requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    const isAdm = await isAdminUser(userId);
    const filterUserId = req.query.userId as string;

    const whereClause: any = {};
    if (isAdm && filterUserId) {
      whereClause.userId = filterUserId;
    } else if (!isAdm) {
      whereClause.userId = userId;
    }

    const holds = await prisma.settlementHold.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
    });

    res.json(holds);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── 5. POST /api/settlements/holds ────────────────────────────────────────────
router.post("/holds", requireAuth, async (req: AuthRequest, res) => {
  try {
    const adminId = req.userId!;
    const isAdm = await isAdminUser(adminId);
    if (!isAdm) return res.status(403).json({ error: "Only admins can place settlement holds." });

    const { targetUserId, amount, reason } = req.body;
    const holdAmount = Number(amount);

    if (!targetUserId || !holdAmount || holdAmount <= 0 || !reason) {
      return res.status(400).json({ error: "Target user ID, valid amount, and reason are required." });
    }

    const hold = await prisma.settlementHold.create({
      data: {
        userId: targetUserId,
        amount: holdAmount,
        reason,
        status: "active",
        placedBy: adminId,
      },
    });

    // Audit Log
    await prisma.settlementAuditLog.create({
      data: {
        userId: targetUserId,
        actionBy: adminId,
        action: "HOLD_PLACED",
        details: JSON.stringify({ holdId: hold.id, amount: holdAmount, reason }),
      },
    });

    await logSystemActivity({
      userId: adminId,
      action: "SETTLEMENT_HOLD_PLACED",
      module: "SETTLEMENTS",
      severity: "warning",
      details: { targetUserId, holdId: hold.id, amount: holdAmount, reason },
    });

    // Notification
    await prisma.notification.create({
      data: {
        userId: targetUserId,
        title: "Settlement Hold Placed ⚠️",
        message: `A settlement hold of ₹${holdAmount} was placed on your account. Reason: ${reason}`,
        type: "warning",
      },
    });

    res.json({ message: "Settlement hold placed successfully", hold });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── 6. POST /api/settlements/holds/:id/release ───────────────────────────────
router.post("/holds/:id/release", requireAuth, async (req: AuthRequest, res) => {
  try {
    const adminId = req.userId!;
    const isAdm = await isAdminUser(adminId);
    if (!isAdm) return res.status(403).json({ error: "Only admins can release settlement holds." });

    const holdId = req.params.id;
    const hold = await prisma.settlementHold.findUnique({ where: { id: holdId } });

    if (!hold) return res.status(404).json({ error: "Settlement hold record not found." });
    if (hold.status === "released") return res.status(400).json({ error: "Hold is already released." });

    const updatedHold = await prisma.settlementHold.update({
      where: { id: holdId },
      data: {
        status: "released",
        releasedBy: adminId,
        releasedAt: new Date(),
      },
    });

    // Audit Log
    await prisma.settlementAuditLog.create({
      data: {
        userId: hold.userId,
        actionBy: adminId,
        action: "HOLD_RELEASED",
        details: JSON.stringify({ holdId, amount: Number(hold.amount) }),
      },
    });

    await logSystemActivity({
      userId: adminId,
      action: "SETTLEMENT_HOLD_RELEASED",
      module: "SETTLEMENTS",
      severity: "info",
      details: { targetUserId: hold.userId, holdId, amount: Number(hold.amount) },
    });

    // Notification
    await prisma.notification.create({
      data: {
        userId: hold.userId,
        title: "Settlement Hold Released ✓",
        message: `Your settlement hold of ₹${Number(hold.amount)} has been released.`,
        type: "success",
      },
    });

    res.json({ message: "Hold released successfully", hold: updatedHold });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── 7. POST /api/settlements/:id/process ──────────────────────────────────────
router.post("/:id/process", requireAuth, async (req: AuthRequest, res) => {
  try {
    const adminId = req.userId!;
    const isAdm = await isAdminUser(adminId);
    if (!isAdm) return res.status(403).json({ error: "Only admins can process settlement requests." });

    const settlementId = req.params.id;
    const { action, referenceId, failureReason, remarks } = req.body;

    const request = await prisma.settlementRequest.findUnique({ where: { id: settlementId } });
    if (!request) return res.status(404).json({ error: "Settlement request not found." });

    if (request.status === "completed" || request.status === "failed") {
      return res.status(400).json({ error: `Settlement request is already ${request.status}.` });
    }

    if (action === "complete") {
      const updatedReq = await prisma.settlementRequest.update({
        where: { id: settlementId },
        data: {
          status: "completed",
          referenceId: referenceId || request.referenceId,
          remarks: remarks || request.remarks,
          processedBy: adminId,
          processedAt: new Date(),
        },
      });

      await prisma.settlementAuditLog.create({
        data: {
          settlementId,
          userId: request.userId,
          actionBy: adminId,
          action: "COMPLETED",
          details: JSON.stringify({ referenceId, remarks, netAmount: Number(request.netAmount) }),
        },
      });

      await logSystemActivity({
        userId: adminId,
        action: "SETTLEMENT_COMPLETED",
        module: "SETTLEMENTS",
        severity: "info",
        details: { settlementId, targetUserId: request.userId, referenceId, remarks, netAmount: Number(request.netAmount) },
      });

      await prisma.notification.create({
        data: {
          userId: request.userId,
          title: "Settlement Completed ✓",
          message: `Your settlement of ₹${request.amount} (Net Payout: ₹${request.netAmount}) has been completed. Ref UTR: ${referenceId || "N/A"}`,
          type: "success",
        },
      });

      return res.json({ message: "Settlement marked as completed", settlement: updatedReq });
    } else if (action === "reject") {
      // Refund wallet balance
      const wallet = await prisma.wallet.findUnique({ where: { userId: request.userId } });
      const refundAmount = Number(request.amount);
      const newBalance = Number(wallet?.balance ?? 0) + refundAmount;

      const [updatedReq] = await prisma.$transaction([
        prisma.settlementRequest.update({
          where: { id: settlementId },
          data: {
            status: "failed",
            failureReason: failureReason || "Rejected by administrator",
            remarks: remarks || request.remarks,
            processedBy: adminId,
            processedAt: new Date(),
          },
        }),
        prisma.wallet.update({
          where: { userId: request.userId },
          data: { balance: newBalance },
        }),
        prisma.walletTransaction.create({
          data: {
            toUserId: request.userId,
            amount: refundAmount,
            type: "settlement_refund",
            description: `Settlement Request Refund (${request.referenceId}) - Reason: ${failureReason || "Rejected"}`,
            toBalanceAfter: newBalance,
            createdBy: adminId,
          },
        }),
      ]);

      await prisma.settlementAuditLog.create({
        data: {
          settlementId,
          userId: request.userId,
          actionBy: adminId,
          action: "REJECTED",
          details: JSON.stringify({ failureReason, refundAmount }),
        },
      });

      await logSystemActivity({
        userId: adminId,
        action: "SETTLEMENT_REJECTED",
        module: "SETTLEMENTS",
        severity: "warning",
        details: { settlementId, targetUserId: request.userId, failureReason, refundAmount },
      });

      await prisma.notification.create({
        data: {
          userId: request.userId,
          title: "Settlement Request Rejected ❌",
          message: `Your settlement request of ₹${refundAmount} was rejected. Amount has been refunded to your wallet. Reason: ${failureReason || "N/A"}`,
          type: "error",
        },
      });

      return res.json({ message: "Settlement rejected and refunded to wallet", settlement: updatedReq });
    } else {
      return res.status(400).json({ error: "Invalid action. Allowed values: 'complete', 'reject'." });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── 8. GET /api/settlements/config ───────────────────────────────────────────
router.get("/config", requireAuth, async (_req, res) => {
  try {
    const config = await getOrCreateSettlementConfig();
    res.json(config);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── 9. PUT /api/settlements/config ───────────────────────────────────────────
router.put("/config", requireAuth, async (req: AuthRequest, res) => {
  try {
    const adminId = req.userId!;
    const isAdm = await isAdminUser(adminId);
    if (!isAdm) return res.status(403).json({ error: "Only admins can update settlement settings." });

    const {
      minSettlementAmount,
      maxSettlementAmount,
      settlementFeeType,
      settlementFeeValue,
      autoSettlementEnabled,
      settlementSchedule,
    } = req.body;

    const existingConfig = await getOrCreateSettlementConfig();

    const updatedConfig = await prisma.settlementConfig.update({
      where: { id: existingConfig.id },
      data: {
        minSettlementAmount: minSettlementAmount !== undefined ? Number(minSettlementAmount) : existingConfig.minSettlementAmount,
        maxSettlementAmount: maxSettlementAmount !== undefined ? Number(maxSettlementAmount) : existingConfig.maxSettlementAmount,
        settlementFeeType: settlementFeeType || existingConfig.settlementFeeType,
        settlementFeeValue: settlementFeeValue !== undefined ? Number(settlementFeeValue) : existingConfig.settlementFeeValue,
        autoSettlementEnabled: autoSettlementEnabled !== undefined ? Boolean(autoSettlementEnabled) : existingConfig.autoSettlementEnabled,
        settlementSchedule: settlementSchedule || existingConfig.settlementSchedule,
        updatedBy: adminId,
      },
    });

    await prisma.settlementAuditLog.create({
      data: {
        userId: adminId,
        actionBy: adminId,
        action: "CONFIG_UPDATED",
        details: JSON.stringify(updatedConfig),
      },
    });

    res.json({ message: "Settlement configuration updated successfully", config: updatedConfig });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── 10. GET /api/settlements/audit-logs ──────────────────────────────────────
router.get("/audit-logs", requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    const isAdm = await isAdminUser(userId);

    const whereClause: any = {};
    if (!isAdm) {
      whereClause.userId = userId;
    }

    const logs = await prisma.settlementAuditLog.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    res.json(logs);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── 11. GET /api/settlements/t0-t1-settings ──────────────────────────────────
router.get("/t0-t1-settings", requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    const targetUserId = (req.query.userId as string) || userId;

    if (targetUserId !== userId) {
      const isAdm = await isAdminUser(userId);
      if (!isAdm) return res.status(403).json({ error: "Forbidden" });
    }

    const config = await getOrCreateSettlementConfig();
    const wallet = await prisma.wallet.findUnique({ where: { userId: targetUserId } });

    let setting = await prisma.userSettlementSetting.findUnique({ where: { userId: targetUserId } });
    if (!setting) {
      setting = await prisma.userSettlementSetting.create({
        data: {
          userId: targetUserId,
          settlementType: "T0",
          t0DailyLimit: 100000,
          t0TodayUsed: 0,
          allocatedDownlineLimit: 0,
          remainingSelfLimit: 100000,
          isT0Enabled: true,
        },
      });
    }

    // Calculate pool allocation for downlines
    const childrenProfiles = await prisma.profile.findMany({ where: { parentId: targetUserId } });
    const childrenUserIds = childrenProfiles.map((c) => c.userId);
    const childrenSettings = await prisma.userSettlementSetting.findMany({
      where: { userId: { in: childrenUserIds } },
    });

    const totalAllocatedToDownlines = childrenSettings.reduce((acc, s) => acc + Number(s.t0DailyLimit), 0);
    const totalPoolLimit = Number(setting.t0DailyLimit);
    const remainingSelfLimit = Math.max(0, totalPoolLimit - totalAllocatedToDownlines);

    res.json({
      settlementType: setting.settlementType,
      t0DailyLimit: Number(setting.t0DailyLimit),
      t0TodayUsed: Number(setting.t0TodayUsed),
      allocatedDownlineLimit: totalAllocatedToDownlines,
      remainingSelfLimit,
      isT0Enabled: setting.isT0Enabled,
      usableMainWalletBalance: Number(wallet?.balance ?? 0),
      t1WalletBalance: Number(wallet?.t1Balance ?? 0),
      featureFlags: {
        posT0Settlement: (config as any).posT0Settlement ?? true,
        userDailyLimit: (config as any).userDailyLimit ?? true,
        t1CutoffTime: (config as any).t1CutoffTime ?? "10:00 AM",
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── 12. POST /api/settlements/update-user-settlement-type ────────────────────
router.post("/update-user-settlement-type", requireAuth, async (req: AuthRequest, res) => {
  try {
    const actionBy = req.userId!;
    const isAdm = await isAdminUser(actionBy);
    const { targetUserId, settlementType, t0DailyLimit, isT0Enabled } = req.body;

    if (!targetUserId) return res.status(400).json({ error: "targetUserId is required" });

    // Hierarchy validation: check if actionBy is parent or admin
    if (!isAdm) {
      const targetProfile = await prisma.profile.findUnique({ where: { userId: targetUserId } });
      if (targetProfile?.parentId !== actionBy) {
        return res.status(403).json({ error: "Forbidden: You can only update settlement rules for your direct downlines." });
      }

      // Validate parent pool limit
      const parentSetting = await prisma.userSettlementSetting.findUnique({ where: { userId: actionBy } });
      const parentTotalLimit = Number(parentSetting?.t0DailyLimit ?? 100000);

      const siblingSettings = await prisma.userSettlementSetting.findMany({
        where: { userId: { not: targetUserId } },
      });

      const proposedLimit = Number(t0DailyLimit ?? 100000);
      const totalSiblingAllocated = siblingSettings.reduce((acc, s) => acc + Number(s.t0DailyLimit), 0);

      if (totalSiblingAllocated + proposedLimit > parentTotalLimit) {
        return res.status(400).json({
          error: `Limit Allocation Exceeded: Proposed T0 limit ₹${proposedLimit} exceeds parent available pool (Max Available: ₹${Math.max(0, parentTotalLimit - totalSiblingAllocated)}).`,
        });
      }
    }

    const updatedSetting = await prisma.userSettlementSetting.upsert({
      where: { userId: targetUserId },
      create: {
        userId: targetUserId,
        settlementType: settlementType || "T0",
        t0DailyLimit: t0DailyLimit !== undefined ? Number(t0DailyLimit) : 100000,
        isT0Enabled: isT0Enabled !== undefined ? Boolean(isT0Enabled) : true,
        updatedBy: actionBy,
      },
      update: {
        settlementType: settlementType || undefined,
        t0DailyLimit: t0DailyLimit !== undefined ? Number(t0DailyLimit) : undefined,
        isT0Enabled: isT0Enabled !== undefined ? Boolean(isT0Enabled) : undefined,
        updatedBy: actionBy,
      },
    });

    await prisma.settlementAuditLog.create({
      data: {
        userId: targetUserId,
        actionBy,
        action: "UPDATE_USER_SETTLEMENT_TYPE",
        details: JSON.stringify({ settlementType, t0DailyLimit, isT0Enabled }),
      },
    });

    await prisma.notification.create({
      data: {
        userId: targetUserId,
        title: "Settlement Mode Updated ⚙️",
        message: `Your settlement mode is set to ${updatedSetting.settlementType} with T0 limit ₹${Number(updatedSetting.t0DailyLimit).toLocaleString()}.`,
        type: "info",
      },
    });

    res.json({ message: "User settlement mode updated successfully", setting: updatedSetting });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── 13. POST /api/settlements/update-all-user-settlement-type ────────────────
router.post("/update-all-user-settlement-type", requireAuth, async (req: AuthRequest, res) => {
  try {
    const actionBy = req.userId!;
    const isAdm = await isAdminUser(actionBy);
    const { settlementType, isT0Enabled } = req.body;

    let targetUserIds: string[] = [];
    if (isAdm) {
      const allAuthUsers = await prisma.authUser.findMany({ select: { userId: true } });
      targetUserIds = allAuthUsers.map((u) => u.userId);
    } else {
      const downlineProfiles = await prisma.profile.findMany({ where: { parentId: actionBy }, select: { userId: true } });
      targetUserIds = downlineProfiles.map((p) => p.userId);
    }

    let updatedCount = 0;
    for (const uId of targetUserIds) {
      await prisma.userSettlementSetting.upsert({
        where: { userId: uId },
        create: {
          userId: uId,
          settlementType: settlementType || "T0",
          isT0Enabled: isT0Enabled !== undefined ? Boolean(isT0Enabled) : true,
          updatedBy: actionBy,
        },
        update: {
          settlementType: settlementType || undefined,
          isT0Enabled: isT0Enabled !== undefined ? Boolean(isT0Enabled) : undefined,
          updatedBy: actionBy,
        },
      });
      updatedCount++;
    }

    res.json({ message: `Successfully updated settlement mode for ${updatedCount} user(s).`, updatedCount });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── 14. POST /api/settlements/trigger-t1-settlement ──────────────────────────
router.post("/trigger-t1-settlement", requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    const wallet = await prisma.wallet.findUnique({ where: { userId } });

    const t1Amt = Number(wallet?.t1Balance ?? 0);
    if (t1Amt <= 0) {
      return res.status(400).json({ error: "No pending T1 wallet balance to settle." });
    }

    const newT1Balance = 0;
    const newMainBalance = Number(wallet?.balance ?? 0) + t1Amt;

    await prisma.$transaction([
      prisma.wallet.update({
        where: { userId },
        data: {
          t1Balance: newT1Balance,
          balance: newMainBalance,
        },
      }),
      prisma.walletTransaction.create({
        data: {
          toUserId: userId,
          amount: t1Amt,
          type: "t1_auto_settlement",
          description: "T1 Next-Day Auto-Settlement credited to Main Wallet",
          toBalanceAfter: newMainBalance,
          createdBy: userId,
        },
      }),
    ]);

    res.json({ message: `Successfully auto-settled T1 balance of ₹${t1Amt} to Main Wallet.`, newMainBalance });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
