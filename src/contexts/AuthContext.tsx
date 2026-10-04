import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { AUTH_SESSION_EVENT, apiFetch, clearAuthSession, getAuthToken, getStoredUser, TOKEN_KEY, type AppAuthUser } from "@/services/api";
import type { AppRole } from "@/types/auth";

interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  phone: string | null;
  business_name: string | null;
  kyc_status: string;
  status: string;
  parent_id: string | null;
  is_master_admin: boolean;
}

export interface StaffPermissions {
  // Section Masters
  can_manage_users: boolean;
  can_manage_finance: boolean;
  can_manage_commissions: boolean;
  can_manage_services: boolean;
  can_manage_support: boolean;
  // Users
  can_create_users: boolean;
  can_edit_users: boolean;
  can_block_users: boolean;
  can_delete_users: boolean;
  can_manage_user_services: boolean;
  can_change_user_roles: boolean;
  can_reset_user_passwords: boolean;
  can_view_user_docs: boolean;
  // Finance
  can_approve_fund_requests: boolean;
  can_reject_fund_requests: boolean;
  can_manage_bank_accounts: boolean;
  can_view_transactions: boolean;
  can_perform_wallet_transfer: boolean;
  // Others
  can_manage_global_services: boolean;
  can_manage_settings: boolean;
  can_manage_security: boolean;
  can_reply_support_tickets: boolean;
  can_view_reports: boolean;
}

const DEFAULT_PERMISSIONS: StaffPermissions = {
  can_manage_users: false,
  can_manage_finance: false,
  can_manage_commissions: false,
  can_manage_services: false,
  can_manage_support: false,
  can_create_users: false,
  can_edit_users: false,
  can_block_users: false,
  can_delete_users: false,
  can_manage_user_services: false,
  can_change_user_roles: false,
  can_reset_user_passwords: false,
  can_view_user_docs: true,
  can_approve_fund_requests: false,
  can_reject_fund_requests: false,
  can_manage_bank_accounts: false,
  can_view_transactions: true,
  can_perform_wallet_transfer: false,
  can_manage_global_services: false,
  can_manage_settings: false,
  can_manage_security: false,
  can_reply_support_tickets: true,
  can_view_reports: true,
};

type AppSession = { access_token: string } | null;

interface AuthContextType {
  session: AppSession;
  user: AppAuthUser | null;
  profile: Profile | null;
  role: AppRole | null;
  loading: boolean;
  isMasterAdmin: boolean;
  permissions: StaffPermissions;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  walletBalance: number;
  eWalletBalance: number;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  profile: null,
  role: null,
  loading: true,
  isMasterAdmin: false,
  permissions: DEFAULT_PERMISSIONS,
  signOut: async () => {},
  refreshProfile: async () => {},
  walletBalance: 0,
  eWalletBalance: 0,
});

export const useAuth = () => useContext(AuthContext);

function normalizeProfile(p: any): Profile | null {
  if (!p) return null;
  // Backend (Prisma) returns camelCase; UI expects snake_case.
  return {
    id: p.id,
    user_id: p.user_id ?? p.userId,
    full_name: p.full_name ?? p.fullName ?? "",
    phone: p.phone ?? null,
    business_name: p.business_name ?? p.businessName ?? null,
    kyc_status: p.kyc_status ?? p.kycStatus ?? "pending",
    status: p.status ?? "active",
    parent_id: p.parent_id ?? p.parentId ?? null,
    is_master_admin: p.is_master_admin ?? p.isMasterAdmin ?? false,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AppSession>(null);
  const [user, setUser] = useState<AppAuthUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [isMasterAdmin, setIsMasterAdmin] = useState(false);
  const [permissions, setPermissions] = useState<StaffPermissions>(DEFAULT_PERMISSIONS);
  const [walletBalance, setWalletBalance] = useState(0);
  const [eWalletBalance, setEWalletBalance] = useState(0);

  const fetchUserData = useCallback(async () => {
    const token = getAuthToken();
    const storedUser = getStoredUser();
    if (token) setSession({ access_token: token });
    if (storedUser) setUser(storedUser);

    try {
      const data = await apiFetch("/auth/me");
      if (data.user) setUser(data.user as AppAuthUser);
      if (data.profile) {
        const normalized = normalizeProfile(data.profile);
        setProfile(normalized);
        setIsMasterAdmin(normalized?.is_master_admin === true);
      }
      setWalletBalance(data.walletBalance || 0);
      setEWalletBalance(data.eWalletBalance || 0);
      setRole((data.role || null) as AppRole | null);
      setPermissions(DEFAULT_PERMISSIONS);
      return data;
    } catch (err: any) {
      const isAuthError =
        err?.message?.includes("Unauthorized") ||
        err?.message?.includes("Forbidden") ||
        err?.message?.includes("token") ||
        err?.message?.includes("jwt");

      if (isAuthError) {
        clearAuthSession();
        setSession(null);
        setUser(null);
        setProfile(null);
        setRole(null);
        setIsMasterAdmin(false);
        setPermissions(DEFAULT_PERMISSIONS);
        setWalletBalance(0);
        setEWalletBalance(0);
      }
      throw err;
    }
  }, []);

  useEffect(() => {
    const loadSession = () => {
      // Prevent initial fetch with wrong token if we are on the impersonate page
      const isImpersonating = window.location.pathname.startsWith('/impersonate');
      if (isImpersonating && !sessionStorage.getItem(TOKEN_KEY)) {
        setLoading(false);
        return; // Let ImpersonatePage handle the session setup
      }

      const token = getAuthToken();
      const storedUser = getStoredUser();
      if (!token || !storedUser) {
        setSession(null);
        setUser(null);
        setProfile(null);
        setRole(null);
        setIsMasterAdmin(false);
        setPermissions(DEFAULT_PERMISSIONS);
        setWalletBalance(0);
        setEWalletBalance(0);
        setLoading(false);
        return;
      }

      setLoading(true);
      setSession({ access_token: token });
      setUser(storedUser);
      fetchUserData()
        .catch((err) => {
          console.error("Failed to load user session data:", err);
          clearAuthSession();
          setSession(null);
          setUser(null);
          setProfile(null);
          setRole(null);
          setIsMasterAdmin(false);
          setPermissions(DEFAULT_PERMISSIONS);
          setWalletBalance(0);
          setEWalletBalance(0);
        })
        .finally(() => setLoading(false));
    };

    window.addEventListener(AUTH_SESSION_EVENT, loadSession);
    loadSession();
    return () => window.removeEventListener(AUTH_SESSION_EVENT, loadSession);
  }, [fetchUserData]);

  const signOut = useCallback(async () => {
    clearAuthSession();
    setSession(null);
    setUser(null);
    setProfile(null);
    setRole(null);
    setIsMasterAdmin(false);
    setPermissions(DEFAULT_PERMISSIONS);
    setWalletBalance(0);
    setEWalletBalance(0);
    window.location.href = "/";
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!getAuthToken()) return;
    await fetchUserData();
  }, [fetchUserData]);

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        profile,
        role,
        loading,
        isMasterAdmin,
        permissions,
        signOut,
        refreshProfile,
        walletBalance,
        eWalletBalance,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
