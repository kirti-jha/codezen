import { Router } from "express";
import { prisma } from "../index";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { logSystemActivity } from "./systemLogs";

const router = Router();

// GET /api/wallet — get my wallet balance
router.get("/", requireAuth, async (req: AuthRequest, res) => {
  try {
    const wallet = await prisma.wallet.findUnique({
      where: { userId: req.userId! },
    });
    if (!wallet) return res.status(404).json({ error: "Wallet not found" });
    res.json({ balance: Number(wallet.balance), eWalletBalance: Number(wallet.eWalletBalance) });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/wallet/transactions — get wallet transaction history
router.get("/transactions", requireAuth, async (req: AuthRequest, res) => {
  try {
    const txns = await prisma.walletTransaction.findMany({
      where: {
        OR: [{ fromUserId: req.userId }, { toUserId: req.userId }],
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    res.json(txns);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/wallet/top-up — admin top-up a user
router.post("/top-up", requireAuth, async (req: AuthRequest, res) => {
  const { to_user_id, amount, description } = req.body;
  const amt = Number(amount);
  if (!amt || amt <= 0) return res.status(400).json({ error: "Amount must be greater than zero" });

  try {
    const roleRow = await prisma.userRole.findFirst({ where: { userId: req.userId! } });
    if (roleRow?.role !== "admin") return res.status(403).json({ error: "Forbidden" });

    const toWallet = await prisma.wallet.findUnique({ where: { userId: to_user_id } });
    if (!toWallet) return res.status(404).json({ error: "User wallet not found" });

    const newBalance = Number(toWallet.balance) + amt;
    const [, txn] = await prisma.$transaction([
      prisma.wallet.update({ where: { userId: to_user_id }, data: { balance: newBalance } }),
      prisma.walletTransaction.create({
        data: {
          toUserId: to_user_id,
          amount: amt,
          type: "top_up",
          description: description || "Admin Top-up",
          toBalanceAfter: newBalance,
          createdBy: req.userId!,
        },
      }),
    ]);

    await prisma.notification.create({
      data: {
        userId: to_user_id,
        title: "Wallet Topped Up ✓",
        message: `Your wallet was topped up with ₹${amt}.`,
        type: "success",
      },
    });

    await logSystemActivity({
      userId: req.userId!,
      action: "ADMIN_WALLET_TOPUP",
      module: "WALLET",
      severity: "info",
      details: { targetUserId: to_user_id, amount: amt, description },
    });

    res.json(txn);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/wallet/transfer — transfer funds to downline
router.post("/transfer", requireAuth, async (req: AuthRequest, res) => {
  const { to_user_id, amount, description } = req.body;
  const amt = Number(amount);
  if (!amt || amt <= 0) return res.status(400).json({ error: "Amount must be greater than zero" });

  try {
    // Duplicate transaction check (same sender, same receiver, same amount within 5 mins)
    const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000);
    const recentTx = await prisma.walletTransaction.findFirst({
      where: {
        fromUserId: req.userId!,
        toUserId: to_user_id,
        amount: amt,
        createdAt: { gte: fiveMinsAgo }
      }
    });
    if (recentTx) return res.status(429).json({ error: "Duplicate transaction: Please wait 5 minutes before repeating the same transfer." });

    const fromWallet = await prisma.wallet.findUnique({ where: { userId: req.userId! } });
    if (!fromWallet || Number(fromWallet.balance) < amt) {
      return res.status(400).json({ error: "Insufficient balance" });
    }

    const toWallet = await prisma.wallet.findUnique({ where: { userId: to_user_id } });
    if (!toWallet) return res.status(404).json({ error: "Recipient wallet not found" });

    const fromNewBalance = Number(fromWallet.balance) - amt;
    const toNewBalance = Number(toWallet.balance) + amt;

    const [, , txn] = await prisma.$transaction([
      prisma.wallet.update({ where: { userId: req.userId! }, data: { balance: fromNewBalance } }),
      prisma.wallet.update({ where: { userId: to_user_id }, data: { balance: toNewBalance } }),
      prisma.walletTransaction.create({
        data: {
          fromUserId: req.userId!,
          toUserId: to_user_id,
          amount: amt,
          type: "transfer",
          description: description || "Fund Transfer",
          fromBalanceAfter: fromNewBalance,
          toBalanceAfter: toNewBalance,
          createdBy: req.userId!,
        },
      }),
    ]);

    await prisma.notification.create({
      data: {
        userId: to_user_id,
        title: "Funds Received",
        message: `You received ₹${amt} from your upline.`,
        type: "success",
      },
    });

    await logSystemActivity({
      userId: req.userId!,
      action: "WALLET_FUND_TRANSFER",
      module: "WALLET",
      severity: "info",
      details: { targetUserId: to_user_id, amount: amt, description },
    });

    res.json(txn);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/wallet/pg-add — simulated PG add fund
router.post("/pg-add", requireAuth, async (req: AuthRequest, res) => {
  const { amount } = req.body;
  const amt = Number(amount);
  if (!amt || amt <= 0) return res.status(400).json({ error: "Amount must be greater than zero" });

  try {
    const wallet = await prisma.wallet.findUnique({ where: { userId: req.userId! } });
    const newBalance = Number(wallet?.balance ?? 0) + amt;

    const [, txn] = await prisma.$transaction([
      prisma.wallet.update({ where: { userId: req.userId! }, data: { balance: newBalance } }),
      prisma.walletTransaction.create({
        data: {
          toUserId: req.userId!,
          amount: amt,
          type: "pg_add",
          description: "Fund Added via Payment Gateway",
          toBalanceAfter: newBalance,
          createdBy: req.userId!,
        },
      }),
    ]);
    res.json(txn);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/wallet/bank-topup — admin self top-up via bank
router.post("/bank-topup", requireAuth, async (req: AuthRequest, res) => {
  const { amount, bank_reference, bank_name, description } = req.body;
  const amt = Number(amount);
  if (!amt || amt <= 0) return res.status(400).json({ error: "Amount must be greater than zero" });

  try {
    const roleRow = await prisma.userRole.findFirst({ where: { userId: req.userId! } });
    if (roleRow?.role !== "admin") return res.status(403).json({ error: "Forbidden" });

    const wallet = await prisma.wallet.findUnique({ where: { userId: req.userId! } });
    const newBalance = Number(wallet?.balance ?? 0) + amt;

    const [, txn] = await prisma.$transaction([
      prisma.wallet.update({ where: { userId: req.userId! }, data: { balance: newBalance } }),
      prisma.walletTransaction.create({
        data: {
          toUserId: req.userId!,
          amount: amt,
          type: "bank_deposit",
          description: `${description || "Bank Deposit"} - Ref: ${bank_reference} (${bank_name})`,
          toBalanceAfter: newBalance,
          createdBy: req.userId!,
        },
      }),
    ]);
    res.json(txn);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/wallet/e-wallet-credits — get e-wallet credits
router.get("/e-wallet-credits", requireAuth, async (req: AuthRequest, res) => {
  try {
    const credits = await prisma.eWalletCredit.findMany({
      where: { userId: req.userId! },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    res.json(credits);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
