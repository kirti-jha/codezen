import { Router } from "express";
import { prisma } from "../index";
import { requireAuth, AuthRequest } from "../middleware/auth";
import jwt from "jsonwebtoken";

const router = Router();

const INSTANTPAY_BASE = process.env.INSTANTPAY_BASE_URL || "https://api.instantpay.in";
const API_KEY = process.env.INSTANTPAY_API_KEY || "";
const CLIENT_ID = process.env.INSTANTPAY_CLIENT_ID || "";
const ENC_KEY = process.env.INSTANTPAY_ENCRYPTION_KEY || "";

import crypto from "crypto";

function generateSignature() {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signature = crypto.createHmac("sha256", ENC_KEY)
    .update(CLIENT_ID + API_KEY + timestamp)
    .digest("hex");
  return { timestamp, signature };
}

async function ipPost(endpoint: string, body: Record<string, unknown>) {
  console.log(`[MOCK InstantPay Request] POST ${endpoint}`);
  console.log(`[MOCK InstantPay Payload] ${JSON.stringify(body, null, 2)}`);
  
  // Simulate network delay
  await new Promise(r => setTimeout(r, 800));

  const result = {
    status: "SUCCESS",
    statusCode: "SUCCESS",
    statuscode: "SUCCESS",
    response_code: "SUCCESS",
    code: 200,
    txnId: `MOCK_TXN_${Date.now()}`,
    refId: `MOCK_REF_${Date.now()}`,
    clientRefId: body.clientRefId || `MOCK_CREF_${Date.now()}`,
    balance: "10000.00",
    message: "Transaction successful (MOCK)",
    data: {
      txnId: `MOCK_TXN_${Date.now()}`,
      balance: "10000.00",
    }
  };
  
  console.log(`[MOCK InstantPay Response] ${JSON.stringify(result, null, 2)}`);
  return result;
}

async function ipGet(endpoint: string) {
  console.log(`[MOCK InstantPay Request] GET ${endpoint}`);
  await new Promise(r => setTimeout(r, 300));
  
  // Mock simple list responses
  let data = [];
  if (endpoint.includes("bank-list")) {
    data = [
      { iin: "123456", name: "Mock State Bank" },
      { iin: "654321", name: "Mock HDFC Bank" },
    ];
  } else if (endpoint.includes("billers")) {
    data = [
      { billerId: "AIRP00000NAT01", billerName: "Airtel" },
      { billerId: "JIOP00000NAT01", billerName: "Jio" },
    ];
  }

  const result = {
    status: "SUCCESS",
    statusCode: "SUCCESS",
    code: 200,
    data
  };

  console.log(`[MOCK InstantPay Response] ${JSON.stringify(result, null, 2)}`);
  return result;
}
async function checkDuplicateTransaction(userId: string, amount: number, target: string) {
  const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000);
  const duplicate = await prisma.transaction.findFirst({
    where: {
      userId,
      amount,
      createdAt: { gte: fiveMinsAgo },
      OR: [
        { beneficiary: { equals: target } },
        { consumer: { equals: target } }
      ]
    }
  });
  if (duplicate) {
    throw new Error("Duplicate transaction: Please wait 5 minutes before repeating the same transaction for this user/target.");
  }
}

// Robust helper to check for success across different InstantPay API formats
function isTransactionSuccess(result: any) {
  if (!result) return false;
  
  const status = String(result.status || "").toLowerCase();
  const code = Number(result.code ?? 0);
  const respCode = String(result.response_code || "").toUpperCase();
  const statusCode = String(result.statuscode || result.statusCode || result.status_code || "").toUpperCase();
  const actCode = String(result.actcode || "").toUpperCase();
  
  // Explicitly fail if there's an error actcode or statuscode
  if (actCode === "EHR02" || statusCode === "ERR") return false;

  const successKeywords = [
    "success", "successful", "completed", "done", "processed",
    "pending", "initiated", "in progress", "processing", "accepted", "otp_sent", "active",
    "transaction successful", "bill payment successful", "txn", "tnp"
  ];

  const hasSuccessKeyword = successKeywords.some(kw => status === kw || status.includes("success"));
  const hasSuccessCode = code === 2 || code === 2 || code === 200 || respCode === "SUCCESS" || respCode === "TRANSACTION SUCCESSFUL";
  const hasStatusCode = ["SUCCESS", "TXN", "TNP"].includes(statusCode);

  return (hasSuccessKeyword || hasSuccessCode || hasStatusCode) && actCode !== "EHR02";
}

// Helper to deduct funds and trigger commission
async function handlePaidService(
  userId: string,
  amount: number,
  serviceKey: string,
  result: any,
  txnData: any
) {
  console.log(`[handlePaidService] userId=${userId} serviceKey=${serviceKey} amount=${amount} result=${JSON.stringify(result)}`);
  
  const status = String(result?.status || "").toLowerCase();
  const isSuccess = isTransactionSuccess(result);
  console.log(`[handlePaidService] isSuccess=${isSuccess} for result fields: status=${status}, code=${result.code}, statusCode=${result.statuscode || result.statusCode}`);

  if (isSuccess) {
    console.log(`[handlePaidService] Proceding to debit wallet for userId=${userId}`);
    const wallet = await prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) throw new Error("Wallet not found");

    const newBalance = Number(wallet.balance) - Number(amount);
    if (newBalance < 0) throw new Error("Insufficient balance (concurrent check)");

    await prisma.$transaction([
      prisma.wallet.update({
        where: { userId },
        data: { balance: newBalance },
      }),
      prisma.walletTransaction.create({
        data: {
          toUserId: userId,
          amount: Number(amount),
          type: "service_usage",
          description: `Service: ${serviceKey.toUpperCase()} - ${txnData.beneficiary || txnData.consumer || ""}`,
          toBalanceAfter: newBalance,
          createdBy: userId,
          reference: result.txnId || result.refId || result.clientRefId,
        },
      }),
      prisma.transaction.create({
        data: {
          userId,
          serviceType: serviceKey,
          amount: Number(amount),
          status: result.status || status || "success",
          refId: result.txnId || result.refId || result.clientRefId,
          ...txnData,
        },
      }),
    ]);
    console.log(`[handlePaidService] Debit successful. New balance: ${newBalance}`);

    // Notify the transacting user
    try {
      const serviceLabel = serviceKey.toUpperCase();
      const statusMsg = result.status === "success" ? "Successful" : "Processing";
      await prisma.notification.create({
        data: {
          userId,
          title: `${serviceLabel} Transaction ${statusMsg}`,
          message: `Your ${serviceLabel} transaction of ₹${amount} is ${result.status || status}. Ref: ${result.txnId || result.refId || result.clientRefId || "N/A"}.`,
          type: "transaction",
        },
      });
    } catch (_) {}

    // Trigger commission (silent)
    try {
      const backendSecret = process.env.BACKEND_JWT_SECRET || "dev_backend_secret_change_me";
      const token = jwt.sign({ sub: userId }, backendSecret);

      await fetch(`${process.env.BACKEND_URL || "http://localhost:4000"}/api/commission/process`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ service_key: serviceKey, transaction_amount: amount }),
      });
    } catch (e) {
      console.error("Commission trigger failed:", e);
    }
  } else {
    console.log(`[handlePaidService] Skipping debit for userId=${userId}. Status was not considered success.`);
  }
}

// ─── AePS ───────────────────────────────────────────────────────────────────

router.get("/aeps/bank-list", requireAuth, async (_req, res) => {
  try { res.json(await ipGet("/v1/aeps/bank-list")); }
  catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/aeps/:action", requireAuth, async (req: AuthRequest, res) => {
  console.log(`[AEPS Request] Action: ${req.params.action}, Body: ${JSON.stringify(req.body)}`);
  try {
    const amt = Number(req.body.amount || 0);
    if (req.params.action === "cash_withdrawal" && amt <= 0) {
      return res.status(400).json({ error: "Amount must be greater than zero" });
    }

    const result = await ipPost(`/v1/aeps/${req.params.action}`, req.body);
    const isSuccess = isTransactionSuccess(result);

    if (req.params.action === "cash_withdrawal" && isSuccess) {
      const wallet = await prisma.wallet.findUnique({ where: { userId: req.userId! } });
      const newBalance = Number(wallet?.balance ?? 0) + amt;
      await prisma.$transaction([
        prisma.wallet.update({ where: { userId: req.userId! }, data: { balance: newBalance } }),
        prisma.walletTransaction.create({
          data: {
            toUserId: req.userId!,
            amount: amt,
            type: "aeps_withdrawal",
            toBalanceAfter: newBalance,
            createdBy: req.userId!,
            reference: result.txnId
          }
        }),
        prisma.transaction.create({
          data: {
            userId: req.userId!,
            serviceType: "aeps",
            amount: amt,
            status: "success",
            refId: result.txnId,
            beneficiary: req.body.aadhaar_number
          }
        })
      ]);
    }
    res.json(result);
  }
  catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ─── Remittance (formerly DMT) ─────────────────────────────────────────────

router.post("/remittance/transaction", requireAuth, async (req: AuthRequest, res) => {
  console.log(`[Remittance Request] Body: ${JSON.stringify(req.body)}`);
  try {
    const amount = Number(req.body.amount);
    if (!amount || amount <= 0) return res.status(400).json({ error: "Amount must be greater than zero" });

    const wallet = await prisma.wallet.findUnique({ where: { userId: req.userId! } });
    if (!wallet || Number(wallet.balance) < amount) {
      return res.status(400).json({ error: "Insufficient balance" });
    }

    const beneficiary = req.body.beneficiary_name || req.body.beneficiary_id || "";
    if (beneficiary) await checkDuplicateTransaction(req.userId!, amount, beneficiary);

    const result = await ipPost("/v1/remittance/transaction", {
      ...req.body,
      clientRefId: `RMT_${Date.now()}_${req.userId?.slice(0, 6)}`,
    });

    await handlePaidService(req.userId!, amount, "remittance", result, {
      beneficiary: req.body.beneficiary_name || req.body.beneficiary_id,
    });

    res.json(result);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/bbps/fetch-bill", requireAuth, async (req, res) => {
  try { res.json(await ipPost("/v1/bbps/fetch-bill", req.body)); }
  catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get("/bbps/billers", requireAuth, async (req, res) => {
  try {
    const category = req.query.category || "Mobile Prepaid"; // Default to mobile
    console.log(`[InstantPay] Fetching billers for category: ${category}`);
    res.json(await ipGet(`/v1/bbps/billers?category=${category}`));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/bbps/pay-bill", requireAuth, async (req: AuthRequest, res) => {
  console.log(`[BBPS Pay Bill Request] Body: ${JSON.stringify(req.body)}`);
  try {
    const amount = Number(req.body.amount);
    if (!amount || amount <= 0) return res.status(400).json({ error: "Amount must be greater than zero" });

    const wallet = await prisma.wallet.findUnique({ where: { userId: req.userId! } });
    if (!wallet || Number(wallet.balance) < amount) {
      return res.status(400).json({ error: "Insufficient balance" });
    }

    const consumer = req.body.consumerNumber || req.body.billerId || "";
    if (consumer) await checkDuplicateTransaction(req.userId!, amount, consumer);

    const result = await ipPost("/v1/bbps/pay-bill", {
      ...req.body,
      clientRefId: `BBPS_${Date.now()}_${req.userId?.slice(0, 6)}`,
    });

    await handlePaidService(req.userId!, amount, "bbps", result, {
      category: req.body.category,
      provider: req.body.billerId,
      consumer: req.body.consumerNumber,
    });

    res.json(result);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/bbps/recharge", requireAuth, async (req: AuthRequest, res) => {
  const mobile = req.body.mobile_number || req.body.mobile;
  const rawProvider = req.body.operator || req.body.biller_id || "";
  const amount = Number(req.body.amount);

  // Mapping friendly names to common InstantPay BBPS Biller IDs for Sandbox/Production
  const billerMapping: Record<string, string> = {
    "AIRTEL": "AIRP00000NAT01",
    "JIO": "JIOP00000NAT01",
    "VI": "VODA00000NAT01",
    "BSNL": "BSNL00000NAT01",
  };

  const billerId = billerMapping[rawProvider.toUpperCase()] || rawProvider;

  console.log(`[Recharge Request] User: ${req.userId} | Mobile: ${mobile} | Operator: ${rawProvider} (Mapped ID: ${billerId}) | Amount: ${amount}`);
  
  try {
    if (!amount || amount <= 0) return res.status(400).json({ error: "Amount must be greater than zero" });

    const wallet = await prisma.wallet.findUnique({ where: { userId: req.userId! } });
    if (!wallet || Number(wallet.balance) < amount) {
      return res.status(400).json({ error: "Insufficient balance" });
    }

    // Determine environment-specific endpoint
    const isSandbox = process.env.INSTANTPAY_ENVIRONMENT === "SANDBOX";
    const endpoint = isSandbox ? "/v1/sandbox/bbps/pay-bill" : "/v1/bbps/pay-bill";

    console.log(`[Recharge API Call] Target Endpoint: ${endpoint} (isSandbox: ${isSandbox})`);

    // Standard BBPS Pay Bill payload as seen in Supabase and InstantPay docs
    const result = await ipPost(endpoint, {
      billerId: billerId,
      consumerNumber: mobile,
      amount: amount,
      mobileNumber: mobile,
      clientRefId: `RCH_${Date.now()}_${req.userId?.slice(0, 6)}`,
      additionalInfo: {
        operatorName: rawProvider.toUpperCase(),
        rechargeType: req.body.recharge_type || "PREPAID",
      },
    });

    await handlePaidService(req.userId!, amount, "recharge", result, {
      provider: billerId,
      consumer: mobile,
    });

    res.json(result);
  } catch (e: any) { 
    console.error(`[Recharge Route Error] ${e.message}`);
    res.status(500).json({ error: e.message }); 
  }
});

// ─── Payout ─────────────────────────────────────────────────────────────────

router.get("/payout/bank-list", requireAuth, async (_req, res) => {
  try { res.json(await ipGet("/v1/payouts/bank-list")); }
  catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/payout/bank-accounts", requireAuth, async (req: AuthRequest, res) => {
  console.log(`[Payout Bank Request] Amount: ${req.body.amount}, ACC: ${req.body.account_number}`);
  try {
    const amount = Number(req.body.amount);
    if (!amount || amount <= 0) return res.status(400).json({ error: "Amount must be greater than zero" });

    const wallet = await prisma.wallet.findUnique({ where: { userId: req.userId! } });
    if (!wallet || Number(wallet.balance) < amount) {
      return res.status(400).json({ error: "Insufficient balance" });
    }

    const beneficiary = req.body.beneficiary_name || req.body.account_number || "";
    if (beneficiary) await checkDuplicateTransaction(req.userId!, amount, beneficiary);

    const result = await ipPost("/v1/payouts/bank-accounts", {
      ...req.body,
      clientRefId: `PYT_${Date.now()}_${req.userId?.slice(0, 6)}`,
    });

    await handlePaidService(req.userId!, amount, "payout", result, {
      beneficiary: req.body.beneficiary_name || req.body.account_number,
    });

    res.json(result);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/payout/upi-vpa", requireAuth, async (req: AuthRequest, res) => {
  console.log(`[Payout UPI Request] Amount: ${req.body.amount}, VPA: ${req.body.vpa}`);
  try {
    const amount = Number(req.body.amount);
    if (!amount || amount <= 0) return res.status(400).json({ error: "Amount must be greater than zero" });

    const wallet = await prisma.wallet.findUnique({ where: { userId: req.userId! } });
    if (!wallet || Number(wallet.balance) < amount) {
      return res.status(400).json({ error: "Insufficient balance" });
    }

    const beneficiary = req.body.beneficiary_name || req.body.vpa || "";
    if (beneficiary) await checkDuplicateTransaction(req.userId!, amount, beneficiary);

    const result = await ipPost("/v1/payouts/upi-vpa", {
      ...req.body,
      clientRefId: `UPI_${Date.now()}_${req.userId?.slice(0, 6)}`,
    });

    await handlePaidService(req.userId!, amount, "payout", result, {
      beneficiary: req.body.vpa,
    });

    res.json(result);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ─── Transaction Status ───────────────────────────────────────────────────

router.post("/txn-status", requireAuth, async (req, res) => {
  try {
    const result = await ipPost("/v1/payouts/transaction-status", req.body);
    res.json(result);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
