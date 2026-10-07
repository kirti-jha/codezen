import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { Suspense, lazy } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import PageLoader from "@/components/PageLoader";

const LandingPage = lazy(() => import("./pages/LandingPage"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const ServicesIndexPage = lazy(() => import("./pages/ServicesIndexPage"));
const ServiceDetailPage = lazy(() => import("./pages/ServiceDetailPage"));
const BlogsPage = lazy(() => import("./pages/BlogsPage"));
const BlogDetailPage = lazy(() => import("./pages/BlogDetailPage"));
const AboutPage = lazy(() => import("./pages/AboutPage"));
const RefundPolicyPage = lazy(() => import("./pages/RefundPolicyPage"));
const PrivacyPolicyPage = lazy(() => import("./pages/PrivacyPolicyPage"));
const TermsPage = lazy(() => import("./pages/TermsPage"));
const UnauthorizedPage = lazy(() => import("./pages/UnauthorizedPage"));
const BootstrapAdminPage = lazy(() => import("./pages/BootstrapAdminPage"));
const ImpersonatePage = lazy(() => import("./pages/ImpersonatePage"));
const NotFound = lazy(() => import("./pages/NotFound"));

const DashboardLayout = lazy(() => import("./components/DashboardLayout"));
const DashboardOverview = lazy(() => import("./pages/DashboardOverview"));
const DashboardUsers = lazy(() => import("./pages/DashboardUsers"));
const DashboardWallet = lazy(() => import("./pages/DashboardWallet"));
const DashboardFundRequests = lazy(() => import("./pages/DashboardFundRequests"));
const DashboardTransactions = lazy(() => import("./pages/DashboardTransactions"));
const DashboardSettlements = lazy(() => import("./pages/DashboardSettlements"));
const DashboardSetLimit = lazy(() => import("./pages/DashboardSetLimit"));
const DashboardSystemLogs = lazy(() => import("./pages/DashboardSystemLogs"));

const DashboardAEPS = lazy(() => import("./pages/DashboardAEPS"));
const DashboardRemittance = lazy(() => import("./pages/DashboardRemittance"));
const DashboardBBPS = lazy(() => import("./pages/DashboardBBPS"));
const DashboardPAN = lazy(() => import("./pages/DashboardPAN"));
const DashboardRecharge = lazy(() => import("./pages/DashboardRecharge"));
const DashboardLoan = lazy(() => import("./pages/DashboardLoan"));
const DashboardCreditCard = lazy(() => import("./pages/DashboardCreditCard"));
const DashboardCCBillPay = lazy(() => import("./pages/DashboardCCBillPay"));
const DashboardPayout = lazy(() => import("./pages/DashboardPayout"));
const DashboardMATM = lazy(() => import("./pages/DashboardMATM"));
const DashboardBankAccount = lazy(() => import("./pages/DashboardBankAccount"));
const DashboardPPIWallet = lazy(() => import("./pages/DashboardPPIWallet"));
const DashboardTravelBooking = lazy(() => import("./pages/DashboardTravelBooking"));
const DashboardTravelPackage = lazy(() => import("./pages/DashboardTravelPackage"));
const DashboardInsurance = lazy(() => import("./pages/DashboardInsurance"));
const DashboardPG = lazy(() => import("./pages/DashboardPG"));
const DashboardPOS = lazy(() => import("./pages/DashboardPOS"));
const DashboardSoundBox = lazy(() => import("./pages/DashboardSoundBox"));
const DashboardUPIQR = lazy(() => import("./pages/DashboardUPIQR"));

const DashboardCommissions = lazy(() => import("./pages/DashboardCommissions"));
const DashboardKYC = lazy(() => import("./pages/DashboardKYC"));
const DashboardReports = lazy(() => import("./pages/DashboardReports"));
const DashboardStaffManagement = lazy(() => import("./pages/DashboardStaffManagement"));
const DashboardServiceManagement = lazy(() => import("./pages/DashboardServiceManagement"));
const DashboardSecurity = lazy(() => import("./pages/DashboardSecurity"));
const DashboardSettings = lazy(() => import("./pages/DashboardSettings"));

const DashboardProfile = lazy(() => import("./pages/DashboardProfile"));
const DashboardTpin = lazy(() => import("./pages/DashboardTpin"));
const DashboardChangePassword = lazy(() => import("./pages/DashboardChangePassword"));
const DashboardCertificate = lazy(() => import("./pages/DashboardCertificate"));
const DashboardCommissionPlan = lazy(() => import("./pages/DashboardCommissionPlan"));
const DashboardSupport = lazy(() => import("./pages/DashboardSupport"));
const DashboardPOSRateSetting = lazy(() => import("./pages/DashboardPOSRateSetting"));

import ErrorBoundary from "@/components/ErrorBoundary";

const queryClient = new QueryClient();

const suspense = (node: React.ReactNode, label?: string) => (
  <ErrorBoundary>
    <Suspense fallback={<PageLoader label={label} />}>
      {node}
    </Suspense>
  </ErrorBoundary>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="dark" storageKey="genpay-theme">
      <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AuthProvider>
          <Routes>
            <Route path="/" element={suspense(<LandingPage />, "Loading...")} />
            <Route path="/login" element={suspense(<LoginPage />, "Loading login...")} />
            <Route path="/services" element={suspense(<ServicesIndexPage />, "Loading services...")} />
            <Route path="/services/:serviceKey" element={suspense(<ServiceDetailPage />, "Loading...")} />
            <Route path="/blogs" element={suspense(<BlogsPage />, "Loading...")} />
            <Route path="/blogs/:blogId" element={suspense(<BlogDetailPage />, "Loading...")} />
            <Route path="/about" element={suspense(<AboutPage />, "Loading...")} />
            <Route path="/refund-policy" element={suspense(<RefundPolicyPage />, "Loading...")} />
            <Route path="/privacy-policy" element={suspense(<PrivacyPolicyPage />, "Loading...")} />
            <Route path="/terms" element={suspense(<TermsPage />, "Loading...")} />
            <Route path="/bootstrap" element={suspense(<BootstrapAdminPage />, "Loading...")} />
            <Route path="/unauthorized" element={suspense(<UnauthorizedPage />, "Loading...")} />
            <Route path="/impersonate" element={suspense(<ImpersonatePage />, "Setting up session...")} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  {suspense(<DashboardLayout />, "Loading dashboard...")}
                </ProtectedRoute>
              }
            >
              <Route index element={suspense(<DashboardOverview />, "Loading...")} />
              <Route path="users" element={<ProtectedRoute minRole="master_distributor">{suspense(<DashboardUsers />, "Loading users...")}</ProtectedRoute>} />
              <Route path="wallet" element={suspense(<DashboardWallet />, "Loading wallet...")} />
              <Route path="fund-requests" element={suspense(<DashboardFundRequests />, "Loading...")} />
              <Route path="funds" element={suspense(<DashboardFundRequests />, "Loading...")} />
              <Route path="wallet-funds" element={suspense(<DashboardWallet />, "Loading wallet...")} />
              <Route path="transactions" element={suspense(<DashboardTransactions />, "Loading...")} />
              <Route path="settlements" element={suspense(<DashboardSettlements />, "Loading settlements...")} />
              {/* Services */}
              <Route path="aeps" element={suspense(<DashboardAEPS />, "Loading...")} />
              <Route path="bbps" element={suspense(<DashboardBBPS />, "Loading...")} />
              <Route path="remittance" element={suspense(<DashboardRemittance />, "Loading...")} />
              <Route path="recharge" element={suspense(<DashboardRecharge />, "Loading...")} />
              <Route path="loan" element={suspense(<DashboardLoan />, "Loading...")} />
              <Route path="credit-card" element={suspense(<DashboardCreditCard />, "Loading...")} />
              <Route path="cc-bill-pay" element={suspense(<DashboardCCBillPay />, "Loading...")} />
              <Route path="payout" element={suspense(<DashboardPayout />, "Loading...")} />
              <Route path="matm" element={suspense(<DashboardMATM />, "Loading...")} />
              <Route path="bank-account" element={suspense(<DashboardBankAccount />, "Loading...")} />
              <Route path="pan" element={suspense(<DashboardPAN />, "Loading...")} />
              <Route path="ppi-wallet" element={suspense(<DashboardPPIWallet />, "Loading...")} />
              <Route path="travel-booking" element={suspense(<DashboardTravelBooking />, "Loading...")} />
              <Route path="travel-package" element={suspense(<DashboardTravelPackage />, "Loading...")} />
              <Route path="insurance" element={suspense(<DashboardInsurance />, "Loading...")} />
              <Route path="pg" element={suspense(<DashboardPG />, "Loading...")} />
              <Route path="pos" element={suspense(<DashboardPOS />, "Loading...")} />
              <Route path="sound-box" element={suspense(<DashboardSoundBox />, "Loading...")} />
              <Route path="upi-qr" element={suspense(<DashboardUPIQR />, "Loading...")} />
              {/* Management */}
              <Route path="commissions" element={<ProtectedRoute minRole="distributor">{suspense(<DashboardCommissions />, "Loading...")}</ProtectedRoute>} />
              <Route path="set-limit" element={<ProtectedRoute minRole="distributor">{suspense(<DashboardSetLimit />, "Loading limits...")}</ProtectedRoute>} />
              <Route path="kyc" element={<ProtectedRoute minRole="distributor">{suspense(<DashboardKYC />, "Loading...")}</ProtectedRoute>} />
              <Route path="reports" element={suspense(<DashboardReports />, "Loading...")} />
              <Route path="staff-management" element={<ProtectedRoute allowedRoles={["admin"]}>{suspense(<DashboardStaffManagement />, "Loading...")}</ProtectedRoute>} />
              <Route path="service-management" element={<ProtectedRoute allowedRoles={["admin"]}>{suspense(<DashboardServiceManagement />, "Loading...")}</ProtectedRoute>} />
              <Route path="security" element={<ProtectedRoute allowedRoles={["admin"]}>{suspense(<DashboardSecurity />, "Loading...")}</ProtectedRoute>} />
              <Route path="system-logs" element={<ProtectedRoute allowedRoles={["admin"]}>{suspense(<DashboardSystemLogs />, "Loading logs...")}</ProtectedRoute>} />
              <Route path="settings" element={<ProtectedRoute allowedRoles={["admin"]}>{suspense(<DashboardSettings />, "Loading...")}</ProtectedRoute>} />
              <Route path="pos-rates" element={<ProtectedRoute allowedRoles={["admin"]}>{suspense(<DashboardPOSRateSetting />, "Loading...")}</ProtectedRoute>} />
              {/* User Settings (non-admin) */}
              <Route path="commission-plan" element={suspense(<DashboardCommissionPlan />, "Loading...")} />
              <Route path="profile" element={suspense(<DashboardProfile />, "Loading...")} />
              <Route path="tpin" element={suspense(<DashboardTpin />, "Loading...")} />
              <Route path="change-password" element={suspense(<DashboardChangePassword />, "Loading...")} />
              <Route path="certificate" element={suspense(<DashboardCertificate />, "Loading...")} />
              <Route path="support" element={suspense(<DashboardSupport />, "Loading...")} />
            </Route>
            <Route path="*" element={suspense(<NotFound />, "Loading...")} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
