import { Router } from "express";

const router = Router();

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function normalizeMobile(value: string) {
  return value.replace(/[^\d+]/g, "").trim();
}

type RateLimitEntry = { count: number; resetAt: number };
const rate = new Map<string, RateLimitEntry>();
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 5;

function rateLimitKey(req: any) {
  const xff = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim();
  return xff || req.ip || "unknown";
}

router.post("/contact", async (req, res) => {
  const key = rateLimitKey(req);
  const now = Date.now();
  const existing = rate.get(key);
  if (!existing || existing.resetAt <= now) {
    rate.set(key, { count: 1, resetAt: now + WINDOW_MS });
  } else {
    existing.count += 1;
    if (existing.count > MAX_PER_WINDOW) {
      return res.status(429).json({ error: "Too many requests. Please try again later." });
    }
  }

  const name = String(req.body?.name || "").trim();
  const email = String(req.body?.email || "").trim();
  const mobileRaw = String(req.body?.mobile || "").trim();
  const message = String(req.body?.message || req.body?.query || "").trim();

  const mobile = normalizeMobile(mobileRaw);

  if (!name) return res.status(400).json({ error: "Name is required" });
  if (!email || !isValidEmail(email)) return res.status(400).json({ error: "Valid email is required" });
  if (!mobile) return res.status(400).json({ error: "Mobile is required" });
  if (!message) return res.status(400).json({ error: "Message is required" });
  if (name.length > 120) return res.status(400).json({ error: "Name is too long" });
  if (email.length > 200) return res.status(400).json({ error: "Email is too long" });
  if (mobile.length > 20) return res.status(400).json({ error: "Mobile is too long" });
  if (message.length > 4000) return res.status(400).json({ error: "Message is too long" });

  const to = process.env.CONTACT_TO_EMAIL || "sales@genpay.com";
  const from = process.env.CONTACT_FROM_EMAIL || "onboarding@resend.dev";
  const resendKey = process.env.RESEND_API_KEY;

  if (!resendKey) {
    return res.status(501).json({
      error:
        "Email sending is not configured. Set RESEND_API_KEY (and optionally CONTACT_FROM_EMAIL/CONTACT_TO_EMAIL) in backend/.env.",
    });
  }

  const subject = `New sales query from ${name}`;
  const text = [
    "New sales query received:",
    "",
    `Name: ${name}`,
    `Email: ${email}`,
    `Mobile: ${mobile}`,
    "",
    "Message:",
    message,
  ].join("\n");

  const html = `
    <div style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial;">
      <h2>New sales query</h2>
      <p><b>Name:</b> ${escapeHtml(name)}</p>
      <p><b>Email:</b> ${escapeHtml(email)}</p>
      <p><b>Mobile:</b> ${escapeHtml(mobile)}</p>
      <p><b>Message:</b></p>
      <pre style="white-space: pre-wrap; background: #f6f6f6; padding: 12px; border-radius: 8px;">${escapeHtml(
        message,
      )}</pre>
    </div>
  `.trim();

  const resp = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      reply_to: email,
      subject,
      text,
      html,
    }),
  });

  const json = (await resp.json().catch(() => null)) as any;
  if (!resp.ok) {
    return res.status(502).json({
      error: json?.message || json?.error?.message || "Failed to send email",
    });
  }

  return res.json({ ok: true });
});

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export default router;

