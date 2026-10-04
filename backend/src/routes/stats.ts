import { Router } from "express";
import { prisma } from "../index";
import { requireAuth, AuthRequest } from "../middleware/auth";

const router = Router();

// GET /api/stats/retailer — get retailer dashboard stats
router.get("/retailer", requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const [earningsToday, transactionsToday, recentTxns] = await Promise.all([
      prisma.commissionLog.aggregate({
        where: { userId, createdAt: { gte: startOfDay } },
        _sum: { commissionAmount: true },
      }),
      prisma.transaction.count({
        where: { userId, createdAt: { gte: startOfDay } },
      }),
      prisma.transaction.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 6,
      }),
    ]);

    res.json({
      earningsToday: Number(earningsToday._sum.commissionAmount || 0),
      transactionsToday,
      recentTransactions: recentTxns,
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/stats/admin — admin dashboard stats
router.get("/admin", requireAuth, async (req: AuthRequest, res) => {
  try {
    const role = await prisma.userRole.findFirst({ where: { userId: req.userId! } });
    if (role?.role !== "admin") return res.status(403).json({ error: "Forbidden" });

    const [walletAgg, usersCount, wallets, roleRows] = await Promise.all([
      prisma.wallet.aggregate({
        _sum: { balance: true },
      }),
      prisma.profile.count(),
      prisma.wallet.findMany({
        select: { userId: true, balance: true, eWalletBalance: true },
      }),
      prisma.userRole.findMany({
        select: { role: true, userId: true },
      }),
    ]);

    const roleByUser = new Map(roleRows.map((r) => [r.userId, r.role]));
    const walletByUser = new Map(wallets.map((w) => [w.userId, Number(w.balance || 0)]));

    const topWallets = [...wallets]
      .sort((a, b) => Number(b.balance || 0) - Number(a.balance || 0))
      .slice(0, 10);

    const topUsersProfiles = await prisma.profile.findMany({
      where: { userId: { in: topWallets.map((w) => w.userId) } },
      select: { userId: true, fullName: true },
    });
    const topNameMap = new Map(topUsersProfiles.map((p) => [p.userId, p.fullName]));

    const topUsers = topWallets.map((w) => ({
      user_id: w.userId,
      name: topNameMap.get(w.userId) || "User",
      role: roleByUser.get(w.userId) || "retailer",
      total_balance: Number(w.balance || 0),
      e_wallet_balance: Number(w.eWalletBalance || 0),
    }));

    const volumeToday = await prisma.transaction.aggregate({
      where: { createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
      _sum: { amount: true },
    });

    const successCount = await prisma.transaction.count({
      where: { status: { in: ["success", "Success", "approved", "Approved"] } },
    });
    const totalTxn = await prisma.transaction.count();
    const successRate = totalTxn > 0 ? (successCount / totalTxn) * 100 : 0;

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const [recentTxns, recentComms] = await Promise.all([
      prisma.transaction.findMany({
        where: { createdAt: { gte: sevenDaysAgo } },
        select: { createdAt: true, amount: true },
      }),
      prisma.commissionLog.findMany({
        where: { createdAt: { gte: sevenDaysAgo } },
        select: { createdAt: true, commissionAmount: true },
      })
    ]);

    const revenueMap = new Map();
    for (let i = 0; i < 7; i++) {
      const d = new Date(sevenDaysAgo);
      d.setDate(d.getDate() + i);
      const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      revenueMap.set(dateStr, { date: dateStr, volume: 0, commission: 0 });
    }

    recentTxns.forEach(t => {
      const dateStr = new Date(t.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      if (revenueMap.has(dateStr)) {
        revenueMap.get(dateStr).volume += Number(t.amount || 0);
      }
    });

    recentComms.forEach(c => {
      const dateStr = new Date(c.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      if (revenueMap.has(dateStr)) {
        revenueMap.get(dateStr).commission += Number(c.commissionAmount || 0);
      }
    });

    res.json({
      platformBalance: Number(walletAgg._sum.balance || 0),
      todaysVolume: Number(volumeToday._sum.amount || 0),
      totalUsers: usersCount,
      successRate: Number(successRate.toFixed(2)),
      topUsers,
      userBreakdown: {
        super_distributor: roleRows.filter((r) => r.role === "super_distributor").length,
        master_distributor: roleRows.filter((r) => r.role === "master_distributor").length,
        distributor: roleRows.filter((r) => r.role === "distributor").length,
        retailer: roleRows.filter((r) => r.role === "retailer").length,
      },
      topUsersTotalBalance: topUsers.reduce((sum, u) => sum + u.total_balance, 0),
      avgWalletBalance:
        usersCount > 0
          ? Number(
              (
                Array.from(walletByUser.values()).reduce((s, v) => s + v, 0) /
                usersCount
              ).toFixed(2)
            )
          : 0,
      revenueData: Array.from(revenueMap.values()),
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
