import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

// Auth Pages
import SignUp from "./pages/auth/SignUp";
import Login from "./pages/auth/Login";
import VerifyEmail from "./pages/auth/VerifyEmail";
import ForgotPassword from "./pages/auth/ForgotPassword";

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
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          
          {/* Auth Routes */}
          <Route path="/signup" element={<SignUp />} />
          <Route path="/login" element={<Login />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          
          {/* Super Admin Routes */}
          <Route path="/super-admin" element={<SuperAdminDashboard />} />
          <Route path="/super-admin/schools" element={<Schools />} />
          <Route path="/super-admin/subscriptions" element={<Subscriptions />} />
          <Route path="/super-admin/analytics" element={<SuperAdminAnalytics />} />
          <Route path="/super-admin/settings" element={<SuperAdminSettings />} />
          
          {/* School Admin Routes */}
          <Route path="/dashboard" element={<SchoolAdminDashboard />} />
          <Route path="/dashboard/products" element={<Products />} />
          <Route path="/dashboard/orders" element={<Orders />} />
          <Route path="/dashboard/users" element={<Users />} />
          <Route path="/dashboard/analytics" element={<SchoolAnalytics />} />
          <Route path="/dashboard/branding" element={<Branding />} />
          <Route path="/dashboard/settings" element={<SchoolSettings />} />
          
          {/* User Portal Routes */}
          <Route path="/portal" element={<UserPortal />} />
          <Route path="/portal/shop" element={<Shop />} />
          <Route path="/portal/orders" element={<MyOrders />} />
          <Route path="/portal/profile" element={<Profile />} />
          
          {/* Help Route */}
          <Route path="/help" element={<Help />} />
          
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
