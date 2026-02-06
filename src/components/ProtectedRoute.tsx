import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";

type AppRole = "super_admin" | "school_admin" | "staff" | "student";

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

  if (allowedRoles && userRole && !allowedRoles.includes(userRole.role)) {
    // Redirect to appropriate dashboard based on role
    if (userRole.role === "super_admin") {
      return <Navigate to="/super-admin" replace />;
    } else if (userRole.role === "school_admin") {
      return <Navigate to="/dashboard" replace />;
    } else {
      return <Navigate to="/portal" replace />;
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;
