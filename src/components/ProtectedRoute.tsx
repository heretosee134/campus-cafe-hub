import { forwardRef, ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth, AppRole } from "@/hooks/useAuth";

interface Props { children: ReactNode; roles?: AppRole[] }

const ProtectedRoute = forwardRef<HTMLDivElement, Props>(({ children, roles }, _ref) => {
  const { user, loading, hasRole, isAdmin } = useAuth();
  if (loading) {
    return <div className="min-h-[50vh] flex items-center justify-center text-muted-foreground">Loading…</div>;
  }
  if (!user) return <Navigate to="/auth" replace />;
  if (roles && roles.length > 0 && !isAdmin && !roles.some((r) => hasRole(r))) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
});
ProtectedRoute.displayName = "ProtectedRoute";

export default ProtectedRoute;
