export interface DefaultServiceConfig {
  serviceKey: string;
  serviceLabel: string;
  routePath: string;
  icon?: string;
}

export const DEFAULT_SERVICES: DefaultServiceConfig[] = [
  { serviceKey: "aeps", serviceLabel: "AEPS", routePath: "/dashboard/aeps", icon: "Fingerprint" },
  { serviceKey: "remittance", serviceLabel: "Remittance", routePath: "/dashboard/remittance", icon: "Send" },
  { serviceKey: "bbps", serviceLabel: "BBPS", routePath: "/dashboard/bbps", icon: "Receipt" },
  { serviceKey: "recharge", serviceLabel: "Recharge", routePath: "/dashboard/recharge", icon: "Smartphone" },
  { serviceKey: "pan", serviceLabel: "PAN Card", routePath: "/dashboard/pan", icon: "FileText" },
  { serviceKey: "credit_card", serviceLabel: "Credit Card", routePath: "/dashboard/credit-card", icon: "CreditCard" },
  { serviceKey: "cc_bill_pay", serviceLabel: "CC Bill Pay", routePath: "/dashboard/cc-bill-pay", icon: "BadgeIndianRupee" },
  { serviceKey: "payout", serviceLabel: "Payout", routePath: "/dashboard/payout", icon: "HandCoins" },
  { serviceKey: "matm", serviceLabel: "mATM", routePath: "/dashboard/matm", icon: "MonitorSmartphone" },
  { serviceKey: "pos", serviceLabel: "POS", routePath: "/dashboard/pos", icon: "QrCode" },
  { serviceKey: "insurance", serviceLabel: "Insurance", routePath: "/dashboard/insurance", icon: "Heart" },
  { serviceKey: "loan", serviceLabel: "Loan", routePath: "/dashboard/loan", icon: "Landmark" },
  { serviceKey: "ppi_wallet", serviceLabel: "PPI Wallet", routePath: "/dashboard/ppi-wallet", icon: "Wallet" },
  { serviceKey: "sound_box", serviceLabel: "SoundBox", routePath: "/dashboard/sound-box", icon: "Volume2" },
  { serviceKey: "travel_booking", serviceLabel: "Travel", routePath: "/dashboard/travel-booking", icon: "Plane" },
  { serviceKey: "travel_package", serviceLabel: "Travel Pkg", routePath: "/dashboard/travel-package", icon: "Globe" },
  { serviceKey: "pg", serviceLabel: "PG", routePath: "/dashboard/pg", icon: "Shield" },
  { serviceKey: "bank_account", serviceLabel: "Bank A/C", routePath: "/dashboard/bank-account", icon: "Landmark" },
  { serviceKey: "upi_qr", serviceLabel: "UPI QR", routePath: "/dashboard/upi-qr", icon: "QrCode" },
];
