export type BlogHighlight = {
  title: string;
  desc: string;
};

export type BlogPost = {
  id: string;
  img: string;
  tag: string;
  title: string;
  author: string;
  date: string;
  time: string;
  comments: number;
  content: string[];
  whyChoose: string[];
  highlights: BlogHighlight[];
  related: number[];
};

export const BLOG_POSTS: BlogPost[] = [
  {
    id: "unlocking-dual-wallet-settlement-speeds",
    img: "https://images.unsplash.com/photo-1559526324-4b87b5e36e44?q=80&w=1000&auto=format&fit=crop",
    tag: "SETTLEMENTS",
    title: "Unlocking Dual-Wallet T0 & T1 Settlement Speeds for Retailers",
    author: "GenPay Product Team",
    date: "Oct 2026",
    time: "4 min read",
    comments: 5,
    content: [
      "In modern retail banking, liquidity is cash flow fuel. Traditional settlement delays of 24-48 hours often freeze merchant working capital.",
      "GenPay's innovative Dual-Wallet Architecture introduces real-time T0 Same-Day instant payouts alongside T1 Next-Day Auto-Settlements.",
      "Retailers can now request instant transfers to their bank accounts or manage downline limit allocations seamlessly with automated cutoff windows."
    ],
    whyChoose: [
      "Instant T0 main wallet transfers",
      "Automated T1 next-day settlements at 10:00 AM",
      "Dynamic upline-downline pool management",
      "Zero hidden payout processing fees"
    ],
    highlights: [
      { title: "Real-time Payouts", desc: "Instant fund access anytime, anywhere." },
      { title: "Liquidity Control", desc: "Balance T0 daily limits with T1 auto-settlements." },
      { title: "Audit Trail", desc: "Transparent audit logs for every settlement action." }
    ],
    related: [1, 2]
  },
  {
    id: "how-aeps-and-micro-atms-transform-rural-banking",
    img: "https://images.unsplash.com/photo-1563013544-824ae1b704d3?q=80&w=1000&auto=format&fit=crop",
    tag: "DIGITAL BANKING",
    title: "How AEPS & Micro ATMs are Revolutionizing Rural Banking Access",
    author: "GenPay Field Operations",
    date: "Sep 2026",
    time: "3 min read",
    comments: 8,
    content: [
      "Aadhaar Enabled Payment System (AEPS) has brought essential banking services directly to rural doorsteps through neighborhood kirana stores.",
      "Using biometrics and Micro-ATM devices, customers can withdraw cash, check balances, and transfer funds without traveling miles to bank branches.",
      "GenPay's high-speed AEPS gateway boasts a 99.8% transaction success rate with instant commission credits for retail partners."
    ],
    whyChoose: [
      "Biometric finger-scan authentication",
      "High commission per cash withdrawal",
      "Instant wallet settlement for retailers",
      "Supports all major Indian public & private banks"
    ],
    highlights: [
      { title: "Inclusion", desc: "Financial services for Tier-3 and rural users." },
      { title: "High Earnings", desc: "Consistent retail commission per transaction." },
      { title: "Biometric Safety", desc: "Secure Aadhaar-backed transactions." }
    ],
    related: [0, 3]
  },
  {
    id: "maximizing-commission-income-with-bbps-bill-payments",
    img: "https://images.unsplash.com/photo-1556742400-b5b7c5121f44?q=80&w=1000&auto=format&fit=crop",
    tag: "BBPS",
    title: "Maximizing Commission Income with BBPS Utility Bill Payments",
    author: "GenPay Growth Desk",
    date: "Aug 2026",
    time: "3 min read",
    comments: 4,
    content: [
      "Bharat Bill Payment System (BBPS) provides an integrated, interoperable bill payment service for electricity, water, gas, FASTag, and mobile recharges.",
      "Retailers serving as BBPS payment points experience high daily footfall and repeat customer visits.",
      "With GenPay's unified BBPS interface, agents receive real-time bill fetch, instant receipt generation, and attractive slab commissions."
    ],
    whyChoose: [
      "Instant fetch for 200+ utility billers nationwide",
      "Automated bill payment receipt via SMS & print",
      "High multi-tier distributor commission split",
      "24x7 automated dispute resolution"
    ],
    highlights: [
      { title: "Footfall Booster", desc: "Attract regular monthly footfall to your shop." },
      { title: "Universal Billers", desc: "Pay electricity, gas, DTH, water & broadband." },
      { title: "Reliability", desc: "Instant BBPS transaction reference number." }
    ],
    related: [1, 4]
  },
  {
    id: "automated-kyc-verification-speeding-up-onboarding",
    img: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?q=80&w=1000&auto=format&fit=crop",
    tag: "COMPLIANCE",
    title: "Automated KYC Verification: Fast-Tracking Onboarding Security",
    author: "GenPay Security Lab",
    date: "Jul 2026",
    time: "5 min read",
    comments: 3,
    content: [
      "Manual document verification can delay agent onboarding by days, hindering network expansion for Master Distributors and Super Franchises.",
      "GenPay's automated KYC engine leverages OCR technology, real-time Aadhaar OTP verification, and instant PAN verification.",
      "Partners can onboard new downline retailers in less than 2 minutes while maintaining full RBI compliance and audit trails."
    ],
    whyChoose: [
      "Sub-minute automated document verification",
      "Real-time NSDL PAN & UIDAI Aadhaar verification",
      "Encrypted document storage with RBAC controls",
      "Instant agent activation upon approval"
    ],
    highlights: [
      { title: "Speed", desc: "Onboard agents in under 2 minutes." },
      { title: "Accuracy", desc: "Automated OCR extraction reduces errors." },
      { title: "Compliance", desc: "Full RBI compliant audit logs." }
    ],
    related: [2, 5]
  },
  {
    id: "smart-daily-limit-controls-for-franchise-networks",
    img: "https://images.unsplash.com/photo-1507679799987-c73779587ccf?q=80&w=1000&auto=format&fit=crop",
    tag: "MANAGEMENT",
    title: "Smart Daily Limit Controls for Franchise Networks",
    author: "GenPay Risk Management",
    date: "Jun 2026",
    time: "4 min read",
    comments: 6,
    content: [
      "Managing financial risk across extensive distributor networks requires intelligent transaction limits and per-transaction caps.",
      "GenPay's Set Limit system allows admins and uplines to configure custom daily limits, per-transaction caps, or toggle free-will unlimited overrides.",
      "Live limit utilization tracking prevents over-exposure while allowing high-performing retailers room to grow."
    ],
    whyChoose: [
      "Per-user custom daily & transaction caps",
      "Global & individual unlimited overrides",
      "Bulk CSV limit updates for fast network management",
      "Real-time usage tracking & alert notifications"
    ],
    highlights: [
      { title: "Risk Mitigation", desc: "Protect distribution networks from over-exposure." },
      { title: "Flexibility", desc: "Toggle unlimited mode for trusted partners." },
      { title: "CSV Bulk Ops", desc: "Update hundreds of retailer limits in one click." }
    ],
    related: [0, 3]
  },
  {
    id: "the-future-of-api-driven-payouts-for-msmes",
    img: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=1000&auto=format&fit=crop",
    tag: "PAYOUTS",
    title: "The Future of API-Driven Payouts for MSMEs and FinTechs",
    author: "GenPay Engineering",
    date: "May 2026",
    time: "4 min read",
    comments: 2,
    content: [
      "Bulk payouts to vendor accounts, employee salaries, and customer refunds are moving from tedious manual banking portals to developer-friendly APIs.",
      "GenPay's API Payout Suite allows businesses to trigger IMPS, NEFT, RTGS, and UPI payouts programmatically with sub-second callbacks.",
      "With built-in webhooks and dual-wallet balance fallbacks, businesses ensure seamless operations around the clock."
    ],
    whyChoose: [
      "RESTful API integration with sandbox environment",
      "Support for IMPS, NEFT, RTGS, and UPI handles",
      "Instant webhook callbacks for payout status",
      "24/7 processing with bank channel routing"
    ],
    highlights: [
      { title: "Automation", desc: "Automate thousands of daily vendor payouts." },
      { title: "Reliability", desc: "Smart routing across multiple banking nodes." },
      { title: "Developer First", desc: "SDKs & clear documentation for fast integration." }
    ],
    related: [4, 1]
  }
];

export function getBlogPost(blogId: string) {
  return BLOG_POSTS.find((p) => p.id === blogId) || null;
}

export function getRelatedBlogPosts(post: BlogPost) {
  const maxIndex = BLOG_POSTS.length - 1;
  const indices = Array.isArray(post.related) ? post.related : [];
  const valid = indices
    .filter((i) => Number.isInteger(i) && i >= 0 && i <= maxIndex)
    .filter((i) => BLOG_POSTS[i]?.id !== post.id);
  return valid.map((i) => BLOG_POSTS[i]).filter(Boolean);
}
