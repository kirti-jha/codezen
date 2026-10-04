import { Router } from "express";
import { prisma } from "../index";
import { requireAuth, AuthRequest } from "../middleware/auth";

const router = Router();

function isOverlap(
  newMin: number | null,
  newMax: number | null,
  existingRecords: Array<{ id: string; minAmount: any; maxAmount: any }>,
  excludeId?: string
) {
  const nMin = newMin ?? 0;
  const nMax = newMax ?? Infinity;

  for (const r of existingRecords) {
    if (excludeId && r.id === excludeId) continue;
    const eMin = r.minAmount ? Number(r.minAmount) : 0;
    const eMax = r.maxAmount ? Number(r.maxAmount) : Infinity;

    if (nMax >= eMin && nMin <= eMax) {
      return true;
    }
  }
  return false;
}

// POST /api/commission/process — auto-distribute commissions up hierarchy
router.post("/process", requireAuth, async (req: AuthRequest, res) => {
  const { service_key, transaction_amount } = req.body;
  if (!service_key || !transaction_amount || Number(transaction_amount) <= 0) {
    return res.status(400).json({ error: "service_key and positive transaction_amount required" });
  }

  const txnAmt = Number(transaction_amount);

  try {
    const allSlabs = await prisma.commissionSlab.findMany({
      where: { serviceKey: service_key, isActive: true },
    });

    const slabs = allSlabs.filter((s) => {
      const min = s.minAmount ? Number(s.minAmount) : 0;
      const max = s.maxAmount ? Number(s.maxAmount) : Infinity;
      return txnAmt >= min && txnAmt <= max;
    });

    if (slabs.length === 0) return res.json({ message: "No slabs configured", commissions: [] });

    const slabMap = new Map(slabs.map(s => [s.role as string, s]));
    const results: { userId: string; role: string; commission: number }[] = [];

    let currentUserId = req.userId!;
    const visited = new Set<string>();

    while (currentUserId && !visited.has(currentUserId)) {
      visited.add(currentUserId);

      const roleRow = await prisma.userRole.findFirst({ where: { userId: currentUserId } });
      if (!roleRow) break;

      // Note: We should ideally check overrides first, but sticking to existing logic flow if overrides aren't fully implemented in process yet.
      // But let's check if there is an override for this user and service that matches the range
      const allOverrides = await prisma.userCommissionOverride.findMany({
        where: { targetUserId: currentUserId, serviceKey: service_key, isActive: true }
      });
      const validOverrides = allOverrides.filter(o => {
        const min = o.minAmount ? Number(o.minAmount) : 0;
        const max = o.maxAmount ? Number(o.maxAmount) : Infinity;
        return txnAmt >= min && txnAmt <= max;
      });

      let finalCommissionType = "flat";
      let finalCommissionValue = 0;
      let finalLabel = "";
      let validSlabFound = false;
      let slabId = null;

      if (validOverrides.length > 0) {
        const o = validOverrides[0];
        finalCommissionType = o.commissionType;
        finalCommissionValue = Number(o.commissionValue);
        finalLabel = o.serviceLabel;
        validSlabFound = true;
      } else {
        const slab = slabMap.get(roleRow.role);
        if (slab) {
          finalCommissionType = slab.commissionType;
          finalCommissionValue = Number(slab.commissionValue);
          finalLabel = slab.serviceLabel;
          validSlabFound = true;
          slabId = slab.id;
        }
      }

      if (validSlabFound) {
        const commissionAmount = finalCommissionType === "percent"
          ? Math.round((txnAmt * finalCommissionValue / 100) * 100) / 100
          : finalCommissionValue;

        if (commissionAmount > 0) {
          const wallet = await prisma.wallet.findUnique({ where: { userId: currentUserId } });
          const newBalance = Number(wallet?.balance ?? 0) + commissionAmount;

          await prisma.wallet.update({
            where: { userId: currentUserId },
            data: { balance: newBalance },
          });

          const txn = await prisma.walletTransaction.create({
            data: {
              toUserId: currentUserId,
              amount: commissionAmount,
              type: "commission",
              description: `Commission: ${finalLabel}`,
              toBalanceAfter: newBalance,
              createdBy: req.userId!,
              reference: `comm_${service_key}_${Date.now()}`,
            },
          });

          await prisma.commissionLog.create({
            data: {
              userId: currentUserId,
              slabId: slabId,
              serviceKey: service_key,
              transactionAmount: txnAmt,
              commissionAmount,
              commissionType: finalCommissionType,
              commissionValue: finalCommissionValue,
              credited: true,
              walletTxnId: txn.id,
            },
          });

          // Create in-app notification for the commission credit
          await prisma.notification.create({
            data: {
              userId: currentUserId,
              title: "Commission Credited",
              message: `₹${commissionAmount.toFixed(2)} commission credited for ${finalLabel} transaction of ₹${txnAmt}.`,
              type: "commission",
            },
          });

          results.push({ userId: currentUserId, role: roleRow.role, commission: commissionAmount });
        }
      }

      const profile = await prisma.profile.findUnique({
        where: { userId: currentUserId },
        select: { parentId: true },
      });
      if (!profile?.parentId) break;

      const parentProfile = await prisma.profile.findUnique({
        where: { id: profile.parentId },
        select: { userId: true },
      });
      currentUserId = parentProfile?.userId || "";
    }

    res.json({ success: true, commissions: results });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/commission/slabs — get commission slabs
router.get("/slabs", requireAuth, async (_req, res) => {
  try {
    const slabs = await prisma.commissionSlab.findMany({
      where: { isActive: true },
      orderBy: [{ serviceKey: "asc" }, { role: "asc" }, { minAmount: "asc" }],
    });
    res.json(slabs);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/commission/slabs — create a new global slab
router.post("/slabs", requireAuth, async (req: AuthRequest, res) => {
  const { service_key, service_label, role, commission_type, commission_value, min_amount, max_amount } = req.body;
  try {
    const existingSlabs = await prisma.commissionSlab.findMany({
      where: { serviceKey: service_key, role },
    });

    if (isOverlap(min_amount, max_amount, existingSlabs)) {
      return res.status(400).json({ error: "Slab range overlaps with an existing slab for this service and role." });
    }

    const created = await prisma.commissionSlab.create({
      data: {
        serviceKey: service_key,
        serviceLabel: service_label || service_key,
        role: role,
        commissionType: commission_type || "flat",
        commissionValue: Math.max(0, Number(commission_value || 0)),
        minAmount: min_amount != null ? Math.max(0, Number(min_amount)) : null,
        maxAmount: max_amount != null ? Math.max(0, Number(max_amount)) : null,
      },
    });

    // Notify all users with this role
    try {
      const usersWithRole = await prisma.userRole.findMany({ where: { role }, select: { userId: true } });
      const rangeLabel = min_amount != null
        ? ` for range ₹${min_amount}${max_amount != null ? `–₹${max_amount}` : "+"}`
        : "";
      if (usersWithRole.length > 0) {
        await prisma.notification.createMany({
          data: usersWithRole.map(u => ({
            userId: u.userId,
            title: "Commission Rate Updated",
            message: `Your commission for ${service_label || service_key}${rangeLabel} has been set to ${commission_value} (${commission_type || "flat"}).`,
            type: "commission_update",
          })),
          skipDuplicates: true,
        });
      }
    } catch (_) {}

    res.json(created);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// PATCH /api/commission/slabs/:id — update a global slab
router.patch("/slabs/:id", requireAuth, async (req: AuthRequest, res) => {
  const { commission_value, commission_type, min_amount, max_amount } = req.body;
  
  try {
    const targetInfo = await prisma.commissionSlab.findUnique({ where: { id: req.params.id } });
    if (!targetInfo) return res.status(404).json({ error: "Not found" });

    // Validate overlap
    if (min_amount !== undefined || max_amount !== undefined) {
      const existingSlabs = await prisma.commissionSlab.findMany({
        where: { serviceKey: targetInfo.serviceKey, role: targetInfo.role },
      });
      const newMin = min_amount !== undefined ? min_amount : (targetInfo.minAmount ? Number(targetInfo.minAmount) : null);
      const newMax = max_amount !== undefined ? max_amount : (targetInfo.maxAmount ? Number(targetInfo.maxAmount) : null);
      if (isOverlap(newMin, newMax, existingSlabs, req.params.id)) {
        return res.status(400).json({ error: "Updated slab range overlaps with an existing slab." });
      }
    }

    let dataToUpdate: any = {};
    if (commission_value !== undefined) dataToUpdate.commissionValue = Math.max(0, Number(commission_value));
    if (commission_type !== undefined) dataToUpdate.commissionType = commission_type;
    if (min_amount !== undefined) dataToUpdate.minAmount = min_amount != null ? Math.max(0, Number(min_amount)) : null;
    if (max_amount !== undefined) dataToUpdate.maxAmount = max_amount != null ? Math.max(0, Number(max_amount)) : null;

    const updated = await prisma.commissionSlab.update({
      where: { id: req.params.id },
      data: dataToUpdate,
    });

    // Notify all users with this slab's role
    try {
      const usersWithRole = await prisma.userRole.findMany({ where: { role: targetInfo.role }, select: { userId: true } });
      const newVal = commission_value ?? Number(targetInfo.commissionValue);
      const newType = commission_type ?? targetInfo.commissionType;
      const newMin = dataToUpdate.minAmount ?? (targetInfo.minAmount ? Number(targetInfo.minAmount) : null);
      const newMax = dataToUpdate.maxAmount ?? (targetInfo.maxAmount ? Number(targetInfo.maxAmount) : null);
      const rangeLabel = newMin != null ? ` for range ₹${newMin}${newMax != null ? `–₹${newMax}` : "+"}` : "";
      if (usersWithRole.length > 0) {
        await prisma.notification.createMany({
          data: usersWithRole.map(u => ({
            userId: u.userId,
            title: "Commission Rate Updated",
            message: `Your commission for ${targetInfo.serviceLabel}${rangeLabel} has been updated to ${newVal} (${newType}).`,
            type: "commission_update",
          })),
          skipDuplicates: true,
        });
      }
    } catch (_) {}

    res.json(updated);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE /api/commission/slabs/:id
router.delete("/slabs/:id", requireAuth, async (req: AuthRequest, res) => {
  try {
    await prisma.commissionSlab.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/commission/logs — get recent commission logs
router.get("/logs", requireAuth, async (req: AuthRequest, res) => {
  try {
    const logs = await prisma.commissionLog.findMany({
      where: { userId: req.userId! },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    res.json(logs);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/commission/overrides — get user commission overrides
router.get("/overrides", requireAuth, async (req: AuthRequest, res) => {
  try {
    const overrides = await prisma.userCommissionOverride.findMany({
      orderBy: { createdAt: "desc" },
    });

    const userIds = Array.from(new Set(overrides.map(o => o.targetUserId)));
    const profiles = await prisma.profile.findMany({
      where: { userId: { in: userIds } },
      select: { userId: true, fullName: true },
    });
    const profileMap = new Map(profiles.map(p => [p.userId, p.fullName]));

    const enriched = overrides.map(o => ({
      ...o,
      target_user_id: o.targetUserId,
      target_name: profileMap.get(o.targetUserId) || "Unknown",
      service_key: o.serviceKey,
      service_label: o.serviceLabel,
      commission_type: o.commissionType,
      commission_value: o.commissionValue,
      min_amount: o.minAmount,
      max_amount: o.maxAmount,
      charge_type: o.chargeType,
      charge_value: o.chargeValue,
      is_active: o.isActive,
    }));

    res.json(enriched);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/commission/overrides — create an override
router.post("/overrides", requireAuth, async (req: AuthRequest, res) => {
  const { target_user_id, service_key, service_label, commission_type, commission_value, charge_type, charge_value, min_amount, max_amount } = req.body;
  try {
    const existing = await prisma.userCommissionOverride.findMany({
      where: { targetUserId: target_user_id, serviceKey: service_key }
    });

    if (isOverlap(min_amount, max_amount, existing)) {
      return res.status(400).json({ error: "Override range overlaps with an existing override for this user and service." });
    }

    const override = await prisma.userCommissionOverride.create({
      data: {
        setBy: req.userId!,
        targetUserId: target_user_id,
        serviceKey: service_key,
        serviceLabel: service_label || service_key,
        commissionType: commission_type || "flat",
        commissionValue: Math.max(0, Number(commission_value || 0)),
        minAmount: min_amount != null ? Math.max(0, Number(min_amount)) : null,
        maxAmount: max_amount != null ? Math.max(0, Number(max_amount)) : null,
        chargeType: charge_type || "flat",
        chargeValue: Math.max(0, Number(charge_value || 0)),
        isActive: true,
      }
    });

    // Notify the target user about their custom commission
    try {
      const rangeLabel = min_amount != null
        ? ` for range ₹${min_amount}${max_amount != null ? `–₹${max_amount}` : "+"}`
        : "";
      await prisma.notification.create({
        data: {
          userId: target_user_id,
          title: "Custom Commission Set",
          message: `Your custom commission for ${service_label || service_key}${rangeLabel} has been set to ${commission_value} (${commission_type || "flat"}).`,
          type: "commission_update",
        },
      });
    } catch (_) {}

    res.json(override);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// PATCH /api/commission/overrides/:id — update an override
router.patch("/overrides/:id", requireAuth, async (req: AuthRequest, res) => {
  const { commission_type, commission_value, charge_type, charge_value, min_amount, max_amount } = req.body;
  try {
    const targetInfo = await prisma.userCommissionOverride.findUnique({ where: { id: req.params.id } });
    if (!targetInfo) return res.status(404).json({ error: "Not found" });

    // Validate overlap
    if (min_amount !== undefined || max_amount !== undefined) {
      const existing = await prisma.userCommissionOverride.findMany({
        where: { targetUserId: targetInfo.targetUserId, serviceKey: targetInfo.serviceKey },
      });
      const newMin = min_amount !== undefined ? min_amount : (targetInfo.minAmount ? Number(targetInfo.minAmount) : null);
      const newMax = max_amount !== undefined ? max_amount : (targetInfo.maxAmount ? Number(targetInfo.maxAmount) : null);
      if (isOverlap(newMin, newMax, existing, req.params.id)) {
        return res.status(400).json({ error: "Updated override range overlaps with an existing override." });
      }
    }

    let dataToUpdate: any = {};
    if (commission_value !== undefined) dataToUpdate.commissionValue = Math.max(0, Number(commission_value));
    if (commission_type !== undefined) dataToUpdate.commissionType = commission_type;
    if (charge_value !== undefined) dataToUpdate.chargeValue = Math.max(0, Number(charge_value));
    if (charge_type !== undefined) dataToUpdate.chargeType = charge_type;
    if (min_amount !== undefined) dataToUpdate.minAmount = min_amount != null ? Math.max(0, Number(min_amount)) : null;
    if (max_amount !== undefined) dataToUpdate.maxAmount = max_amount != null ? Math.max(0, Number(max_amount)) : null;

    const updated = await prisma.userCommissionOverride.update({
      where: { id: req.params.id },
      data: dataToUpdate,
    });

    // Notify the target user about their updated commission
    try {
      const newVal = commission_value ?? Number(targetInfo.commissionValue);
      const newType = commission_type ?? targetInfo.commissionType;
      const newMin = dataToUpdate.minAmount ?? (targetInfo.minAmount ? Number(targetInfo.minAmount) : null);
      const newMax = dataToUpdate.maxAmount ?? (targetInfo.maxAmount ? Number(targetInfo.maxAmount) : null);
      const rangeLabel = newMin != null ? ` for range ₹${newMin}${newMax != null ? `–₹${newMax}` : "+"}` : "";
      await prisma.notification.create({
        data: {
          userId: targetInfo.targetUserId,
          title: "Custom Commission Updated",
          message: `Your custom commission for ${targetInfo.serviceLabel}${rangeLabel} has been updated to ${newVal} (${newType}).`,
          type: "commission_update",
        },
      });
    } catch (_) {}

    res.json(updated);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE /api/commission/overrides/:id — remove an override
router.delete("/overrides/:id", requireAuth, async (req: AuthRequest, res) => {
  try {
    await prisma.userCommissionOverride.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/commission/my-plan — get user's active commission plan (slabs + overrides)
router.get("/my-plan", requireAuth, async (req: AuthRequest, res) => {
  try {
    const userRole = await prisma.userRole.findFirst({ where: { userId: req.userId! } });
    if (!userRole) return res.status(403).json({ error: "No role found for user" });

    // Fetch active global slabs for the user's role
    const globalSlabs = await prisma.commissionSlab.findMany({
      where: { role: userRole.role, isActive: true },
      orderBy: [{ serviceKey: "asc" }, { minAmount: "asc" }],
    });

    // Fetch user-specific overrides
    const overrides = await prisma.userCommissionOverride.findMany({
      where: { targetUserId: req.userId!, isActive: true },
      orderBy: [{ serviceKey: "asc" }, { minAmount: "asc" }],
    });

    // Merge them: if an override exists for a service and range, it takes precedence.
    // For simplicity in the UI, we'll return both and let the frontend merge or display them clearly, 
    // or we can format them here. Let's return both arrays and the frontend can map it.
    res.json({
      role: userRole.role,
      globalSlabs,
      overrides
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
