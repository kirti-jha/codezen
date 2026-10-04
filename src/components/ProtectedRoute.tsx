import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { getAuthToken } from "@/services/api";
import type { AppRole } from "@/types/auth";

const ROLE_HIERARCHY: Record<AppRole, number> = {
  admin: 1,
  super_distributor: 2,
  master_distributor: 3,
  distributor: 4,
  retailer: 5,
};

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: AppRole[];
  minRole?: AppRole;
}

export default function ProtectedRoute({ children, allowedRoles, minRole }: ProtectedRouteProps) {
  const { session, role, loading } = useAuth();
  const token = getAuthToken();

  // If loading, or if valid token exists in storage but AuthContext session/role state is still populating:
  if (loading || (token && (!session || !role))) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!token || !session || !role) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  if (minRole && ROLE_HIERARCHY[role] > ROLE_HIERARCHY[minRole]) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
}
