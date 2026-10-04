import { Router } from "express";
import { prisma } from "../index";
import { requireAuth, AuthRequest } from "../middleware/auth";

const router = Router();

// Helper to check admin status
async function isAdminUser(userId: string) {
  const roleRow = await prisma.userRole.findFirst({ where: { userId } });
  return roleRow?.role === "admin";
}

// Exportable logger function for other backend modules
export async function logSystemActivity(data: {
  userId?: string;
  userEmail?: string;
  userRole?: string;
  action: string;
  module?: string;
  severity?: "info" | "warning" | "error" | "critical";
  ipAddress?: string;
  userAgent?: string;
  details?: any;
}) {
  try {
    await prisma.systemLog.create({
      data: {
        userId: data.userId || null,
        userEmail: data.userEmail || null,
        userRole: data.userRole || null,
        action: data.action,
        module: data.module || "SYSTEM",
        severity: data.severity || "info",
        ipAddress: data.ipAddress || null,
        userAgent: data.userAgent || null,
        details: typeof data.details === "object" ? JSON.stringify(data.details) : data.details || null,
      },
    });
  } catch (err) {
    console.error("Failed to record system log:", err);
  }
}

// ─── 1. GET /api/system-logs ──────────────────────────────────────────────────
router.get("/", requireAuth, async (req: AuthRequest, res) => {
  try {
    const adminId = req.userId!;
    const isAdm = await isAdminUser(adminId);
    if (!isAdm) return res.status(403).json({ error: "Forbidden: Only administrators can view system logs." });

    const search = (req.query.search as string || "").trim();
    const moduleFilter = req.query.module as string;
    const severityFilter = req.query.severity as string;
    const startDateStr = req.query.startDate as string;
    const endDateStr = req.query.endDate as string;

    const page = parseInt((req.query.page as string) || "1", 10);
    const limit = parseInt((req.query.limit as string) || "25", 10);
    const skip = (page - 1) * limit;

    const whereClause: any = {};

    if (moduleFilter && moduleFilter !== "all") {
      whereClause.module = moduleFilter;
    }

    if (severityFilter && severityFilter !== "all") {
      whereClause.severity = severityFilter;
    }

    if (startDateStr || endDateStr) {
      whereClause.createdAt = {};
      if (startDateStr) whereClause.createdAt.gte = new Date(startDateStr);
      if (endDateStr) whereClause.createdAt.lte = new Date(endDateStr);
    }

    if (search) {
      whereClause.OR = [
        { action: { contains: search, mode: "insensitive" } },
        { userEmail: { contains: search, mode: "insensitive" } },
        { userRole: { contains: search, mode: "insensitive" } },
        { details: { contains: search, mode: "insensitive" } },
        { ipAddress: { contains: search, mode: "insensitive" } },
      ];
    }

    const [total, items] = await prisma.$transaction([
      prisma.systemLog.count({ where: whereClause }),
      prisma.systemLog.findMany({
        where: whereClause,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
    ]);

    res.json({
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── 2. GET /api/system-logs/stats ───────────────────────────────────────────
router.get("/stats", requireAuth, async (req: AuthRequest, res) => {
  try {
    const adminId = req.userId!;
    const isAdm = await isAdminUser(adminId);
    if (!isAdm) return res.status(403).json({ error: "Forbidden" });

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [totalCount, todayCount, errorCount, warningCount] = await prisma.$transaction([
      prisma.systemLog.count(),
      prisma.systemLog.count({ where: { createdAt: { gte: todayStart } } }),
      prisma.systemLog.count({ where: { severity: { in: ["error", "critical"] } } }),
      prisma.systemLog.count({ where: { severity: "warning" } }),
    ]);

    res.json({
      totalCount,
      todayCount,
      errorCount,
      warningCount,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── 3. DELETE /api/system-logs/clear (Disabled - Logs are immutable) ─────────
router.delete("/clear", requireAuth, async (_req, res) => {
  return res.status(403).json({ error: "System activity logs are immutable security audit records and cannot be manually deleted." });
});

// ─── 4. POST /api/system-logs/test-event (Disabled - System auto-logs actions) ─
router.post("/test-event", requireAuth, async (_req, res) => {
  return res.status(403).json({ error: "System activity logs are generated automatically by system operations and cannot be manually added." });
});

export default router;
