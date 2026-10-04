export type PrivacyPolicySection = {
  id: number;
  title: string;
  subtitle: string;
  items: string[];
};

export const PRIVACY_POLICY_SECTIONS: PrivacyPolicySection[] = [
  {
    id: 1,
    title: "Introduction & Acceptance",
    subtitle: "Who we are and what this policy covers",
    items: [
      'GenPay ("we", "us", "our") respects every individual\'s right to privacy and is committed to protecting their Personal Data and Sensitive Personal Data or Information.',
      'This Privacy Policy ("Policy") applies to all visitors (who do not have an account) and users (who have registered accounts) (collectively "User") who access, browse, or use our website, applications, platforms, or services (collectively "Platform").',
      "This Policy explains how we collect, use, store, process, transfer, and disclose User data.",
      "By accessing or using our Platform, you acknowledge that you have read, understood, and agreed to this Policy. If you do not agree, please do not use our services.",
      "This Policy forms part of GenPay's Terms & Conditions. Continued use of our services after updates constitutes acceptance of the revised Policy.",
      "We reserve the right to modify this Policy at any time. Material changes will be notified via registered email or other communication channels. Users are advised to review this Policy periodically.",
    ],
  },
  {
    id: 2,
    title: "Legal Compliance",
    subtitle: "Laws and regulations we follow",
    items: [
      "This Policy is published in compliance with:",
      "Section 43A of the Information Technology Act, 2000",
      "Information Technology (Reasonable Security Practices and Procedures and Sensitive Personal Data or Information) Rules, 2011",
      'Digital Personal Data Protection Act, 2023 ("DPDP Act") and applicable rules',
    ],
  },
  {
    id: 3,
    title: "Definitions",
    subtitle: "Key terms used in this Policy",
    items: [
      "Data Fiduciary: Entity determining purpose and means of processing personal data.",
      "Data Principal: Individual to whom personal data relates.",
      "Personal Data: Any data about an identifiable individual.",
      "Personal Information: Information capable of identifying a person directly or indirectly.",
      "Sensitive Personal Data or Information: Includes passwords, financial information, health data, biometric information, and similar sensitive categories as defined under applicable law.",
      "Payment Data: Transaction data including customer information, payment credentials, account details, and transaction references.",
      "Information publicly available or disclosed under law is not treated as sensitive data.",
    ],
  },
  {
    id: 4,
    title: "Consent",
    subtitle: "Your consent and how it works",
    items: [
      "By using our Platform, Users consent to collection, storage, processing, and use of their Personal Information for lawful purposes.",
      "Sensitive Personal Data is collected only with explicit consent, such as when creating an account or submitting forms.",
      "If a User is under 18 years of age, parental or guardian consent is presumed.",
      "Users may withdraw consent at any time. However, doing so may limit service availability.",
    ],
  },
  {
    id: 5,
    title: "Information We Collect",
    subtitle: "Categories of data we may collect",
    items: [
      "Account & Identity Data: Name, age, demographic details, username and password, email address, mobile number, postal address and contact details, PAN or other KYC details.",
      "Payment & Transaction Data: Payment instrument details, transaction records, payment history, deposits and withdrawals, service usage records, settlement and reconciliation data.",
      "Device & Technical Data: IP address and device identifiers, device and browser information, cookies and usage data, log files and access timestamps.",
      "Support & Communications: Feedback, queries, and communications shared with us through customer support or other channels.",
      "Other Necessary Information: Any other information required for service delivery and compliance, as applicable.",
    ],
  },
  {
    id: 6,
    title: "Purpose of Collection",
    subtitle: "Why we collect and use your data",
    items: [
      "Providing secure and efficient services.",
      "Account creation and verification.",
      "Customer support and issue resolution.",
      "Processing transactions.",
      "Fraud detection and prevention.",
      "Service improvement and analytics.",
      "Compliance with regulatory requirements.",
      "Marketing and promotional communication (with opt-out option).",
      "Development of new products and features.",
      "Enforcement of legal rights and agreements.",
    ],
  },
  {
    id: 7,
    title: "How Information Is Collected",
    subtitle: "Sources of data collection",
    items: [
      "Directly from Users during registration or service use.",
      "Through communications with customer support.",
      "Automatically via cookies and analytics tools.",
      "From third-party integrations or partners where permitted.",
    ],
  },
  {
    id: 8,
    title: "Disclosure of Information",
    subtitle: "When and with whom we may share data",
    items: [
      "Affiliates and group companies.",
      "Banks and payment partners.",
      "Technology vendors and service providers.",
      "Regulatory authorities or law enforcement when required by law.",
      "Professional advisors.",
      "We may also disclose data in connection with mergers, acquisitions, restructuring, or sale of business assets.",
      "Credit information accessed through our platform shall be used strictly for consented purposes and never for unauthorized use.",
    ],
  },
  {
    id: 9,
    title: "Location Data",
    subtitle: "Collection and use of location information",
    items: [
      "We may collect approximate or precise device location data if permission is granted.",
      "Uses include: location-based services, fraud detection, regulatory compliance, and service optimization.",
      "Users may disable location permissions through device or browser settings. Some features may then become unavailable.",
      "Location data is shared only with authorized service providers or authorities and retained only as long as necessary.",
    ],
  },
  {
    id: 10,
    title: "Cookies & Tracking Technologies",
    subtitle: "How cookies help improve your experience",
    items: [
      "We use cookies and similar technologies to understand user behavior, improve performance, and personalize experience.",
      "Users may disable cookies in browser settings; however, some features may not function properly.",
      "Third-party cookies may appear on certain pages, and we are not responsible for such third-party practices.",
    ],
  },
  {
    id: 11,
    title: "Third-Party Links",
    subtitle: "External sites and services",
    items: [
      "Our Platform may contain links to external websites. We are not responsible for the privacy practices of such websites.",
    ],
  },
  {
    id: 12,
    title: "User Rights (Access, Correction, Erasure)",
    subtitle: "Your rights over your personal data",
    items: [
      "Review your data.",
      "Update or correct inaccuracies.",
      "Request deletion of personal data (subject to legal retention requirements).",
      "Requests can be made through account settings or by contacting us.",
    ],
  },
  {
    id: 13,
    title: "Data Retention",
    subtitle: "How long we keep your data",
    items: [
      "We retain personal data only for as long as required for stated purposes, required by law/regulation, or needed for legal/contractual obligations.",
      "After this period, data is securely deleted or anonymized.",
    ],
  },
  {
    id: 14,
    title: "Communications",
    subtitle: "Transactional and promotional messages",
    items: [
      "We may send transactional or promotional communications.",
      "Users can opt out of promotional emails via unsubscribe links or account settings.",
    ],
  },
  {
    id: 15,
    title: "Advertising",
    subtitle: "How ads may be served",
    items: [
      "We may use third-party advertising providers.",
      "These providers may use anonymized data to display relevant advertisements.",
      "No personally identifiable information is shared for advertising purposes.",
    ],
  },
  {
    id: 16,
    title: "Data Localization",
    subtitle: "Where payment data is stored",
    items: [
      "In compliance with Reserve Bank of India regulations, all payment data is stored only on servers located within India.",
      "For cross-border transactions, copies of domestic transaction data may be stored abroad if legally required.",
    ],
  },
  {
    id: 17,
    title: "Security Measures",
    subtitle: "How we protect your data",
    items: [
      "We maintain strict administrative, technical, and physical safeguards to protect data, including secure servers, encryption protocols, access controls, firewall protection, and periodic security audits.",
      "In case of any data breach likely to cause harm, affected Users will be notified promptly.",
    ],
  },
  {
    id: 18,
    title: "Changes to This Policy",
    subtitle: "Policy updates and revisions",
    items: [
      "We reserve the right to modify this Policy at any time. Material changes will be notified via registered email or other communication channels. Continued use of our services after updates constitutes acceptance of the revised Policy.",
    ],
  },
];

export const PRIVACY_POLICY_GRIEVANCE = {
  heading: "Grievance Officer / Contact Us",
  intro:
    "For any privacy concerns, complaints, or requests related to this Privacy Policy, please contact us. Response Time: Within 30 days of receipt of request.",
  email: "support@genpay.com",
  phone: "8860037218",
  badges: ["256-bit Encryption", "Privacy Controls", "30-day Response", "Regular Audits"],
};

