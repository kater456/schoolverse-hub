import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { CartProvider } from "@/hooks/useCart";
import InstallPrompt from "@/components/InstallPrompt";
import ProtectedRoute from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

// Auth Pages
import SignUp from "./pages/auth/SignUp";
import Login from "./pages/auth/Login";
import VerifyEmail from "./pages/auth/VerifyEmail";
import ForgotPassword from "./pages/auth/ForgotPassword";

// Setup Page
import SetupSuperAdmin from "./pages/SetupSuperAdmin";

// Super Admin Pages
import SuperAdminDashboard from "./pages/dashboard/SuperAdminDashboard";
import Schools from "./pages/super-admin/Schools";
import Subscriptions from "./pages/super-admin/Subscriptions";
import SuperAdminAnalytics from "./pages/super-admin/Analytics";
import SuperAdminSettings from "./pages/super-admin/Settings";

// School Admin Pages
import SchoolAdminDashboard from "./pages/dashboard/SchoolAdminDashboard";
import Products from "./pages/dashboard/Products";
import Orders from "./pages/dashboard/Orders";
import Users from "./pages/dashboard/Users";
import SchoolAnalytics from "./pages/dashboard/SchoolAnalytics";
import Branding from "./pages/dashboard/Branding";
import SchoolSettings from "./pages/dashboard/SchoolSettings";

// User Portal Pages
import UserPortal from "./pages/dashboard/UserPortal";
import Shop from "./pages/portal/Shop";
import MyOrders from "./pages/portal/MyOrders";
import Profile from "./pages/portal/Profile";

// Help Page
import Help from "./pages/Help";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <CartProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <InstallPrompt />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              
              {/* Auth Routes */}
              <Route path="/signup" element={<SignUp />} />
              <Route path="/login" element={<Login />} />
              <Route path="/verify-email" element={<VerifyEmail />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/setup-admin" element={<SetupSuperAdmin />} />
              
              {/* Super Admin Routes */}
              <Route path="/super-admin" element={<ProtectedRoute allowedRoles={["super_admin"]}><SuperAdminDashboard /></ProtectedRoute>} />
              <Route path="/super-admin/schools" element={<ProtectedRoute allowedRoles={["super_admin"]}><Schools /></ProtectedRoute>} />
              <Route path="/super-admin/subscriptions" element={<ProtectedRoute allowedRoles={["super_admin"]}><Subscriptions /></ProtectedRoute>} />
              <Route path="/super-admin/analytics" element={<ProtectedRoute allowedRoles={["super_admin"]}><SuperAdminAnalytics /></ProtectedRoute>} />
              <Route path="/super-admin/settings" element={<ProtectedRoute allowedRoles={["super_admin"]}><SuperAdminSettings /></ProtectedRoute>} />
              
              {/* School Admin Routes */}
              <Route path="/dashboard" element={<ProtectedRoute allowedRoles={["school_admin"]}><SchoolAdminDashboard /></ProtectedRoute>} />
              <Route path="/dashboard/products" element={<ProtectedRoute allowedRoles={["school_admin"]}><Products /></ProtectedRoute>} />
              <Route path="/dashboard/orders" element={<ProtectedRoute allowedRoles={["school_admin"]}><Orders /></ProtectedRoute>} />
              <Route path="/dashboard/users" element={<ProtectedRoute allowedRoles={["school_admin"]}><Users /></ProtectedRoute>} />
              <Route path="/dashboard/analytics" element={<ProtectedRoute allowedRoles={["school_admin"]}><SchoolAnalytics /></ProtectedRoute>} />
              <Route path="/dashboard/branding" element={<ProtectedRoute allowedRoles={["school_admin"]}><Branding /></ProtectedRoute>} />
              <Route path="/dashboard/settings" element={<ProtectedRoute allowedRoles={["school_admin"]}><SchoolSettings /></ProtectedRoute>} />
              
              {/* User Portal Routes */}
              <Route path="/portal" element={<ProtectedRoute allowedRoles={["student", "staff"]}><UserPortal /></ProtectedRoute>} />
              <Route path="/portal/shop" element={<ProtectedRoute allowedRoles={["student", "staff"]}><Shop /></ProtectedRoute>} />
              <Route path="/portal/orders" element={<ProtectedRoute allowedRoles={["student", "staff"]}><MyOrders /></ProtectedRoute>} />
              <Route path="/portal/profile" element={<ProtectedRoute allowedRoles={["student", "staff"]}><Profile /></ProtectedRoute>} />
              
              {/* Help Route */}
              <Route path="/help" element={<Help />} />
              
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </CartProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
