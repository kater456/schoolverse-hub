import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";

type AppRole = "super_admin" | "admin" | "sub_admin" | "school_admin" | "staff" | "student" | "vendor";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: AppRole[];
}

const ProtectedRoute = ({ children, allowedRoles }: ProtectedRouteProps) => {
  const { user, userRole, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If allowedRoles specified but user has no role yet, wait briefly then redirect
  const role = userRole?.role as string;
  if (allowedRoles && role && !allowedRoles.includes(role as AppRole)) {
    if (role === "super_admin") {
      return <Navigate to="/admin" replace />;
    }
    if (role === "vendor") {
      return <Navigate to="/vendor-dashboard" replace />;
    }
    if (role === "sub_admin" || role === "admin") {
      return <Navigate to="/sub-admin" replace />;
    }
    return <Navigate to="/browse" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
