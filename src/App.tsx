import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import InstallPrompt from "@/components/InstallPrompt";
import AppDownloadPopup from "@/components/AppDownloadPopup";
import ProtectedRoute from "@/components/ProtectedRoute";
import PromotionNotification from "@/components/PromotionNotification";
import PageTracker from "@/components/PageTracker";
import ScrollToTop from "@/components/ScrollToTop";
import AdPopup from "@/components/AdPopup";
import Index from "./pages/Index";
import Help from "./pages/Help";
import Browse from "./pages/Browse";
import VendorProfile from "./pages/VendorProfile";
import VendorRegistration from "./pages/VendorRegistration";
import Reels from "./pages/Reels";
import NotFound from "./pages/NotFound";

// Auth Pages
import SignUp from "./pages/auth/SignUp";
import Login from "./pages/auth/Login";
import VerifyEmail from "./pages/auth/VerifyEmail";
import ForgotPassword from "./pages/auth/ForgotPassword";

// Setup Page
import SetupSuperAdmin from "./pages/SetupSuperAdmin";

// Admin Pages
import AdminDashboard from "./pages/admin/AdminDashboard";
import ManageVendors from "./pages/admin/ManageVendors";
import ManageSchools from "./pages/admin/ManageSchools";
import ManageCampusLocations from "./pages/admin/ManageCampusLocations";
import ManageFeatured from "./pages/admin/ManageFeatured";
import ManageAds from "./pages/admin/ManageAds";
import AdminAnalytics from "./pages/admin/AdminAnalytics";
import ManageSubAdmins from "./pages/admin/ManageSubAdmins";

// Dashboard Pages
import VendorDashboard from "./pages/dashboard/VendorDashboard";
import SubAdminDashboard from "./pages/dashboard/SubAdminDashboard";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <InstallPrompt />
        <AppDownloadPopup />
        <PromotionNotification />
        <AdPopup />
        <BrowserRouter>
          <ScrollToTop />
          <PageTracker />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/browse" element={<Browse />} />
            <Route path="/help" element={<Help />} />
            <Route path="/vendor/:id" element={<VendorProfile />} />
            <Route path="/reels" element={<Reels />} />
            <Route path="/register-vendor" element={
              <ProtectedRoute><VendorRegistration /></ProtectedRoute>
            } />

            {/* Auth Routes */}
            <Route path="/signup" element={<SignUp />} />
            <Route path="/login" element={<Login />} />
            <Route path="/verify-email" element={<VerifyEmail />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/setup-admin" element={<SetupSuperAdmin />} />

            {/* Admin Routes */}
            <Route path="/admin" element={
              <ProtectedRoute allowedRoles={["super_admin"]}><AdminDashboard /></ProtectedRoute>
            } />
            <Route path="/admin/vendors" element={
              <ProtectedRoute allowedRoles={["super_admin"]}><ManageVendors /></ProtectedRoute>
            } />
            <Route path="/admin/schools" element={
              <ProtectedRoute allowedRoles={["super_admin"]}><ManageSchools /></ProtectedRoute>
            } />
            <Route path="/admin/locations" element={
              <ProtectedRoute allowedRoles={["super_admin"]}><ManageCampusLocations /></ProtectedRoute>
            } />
            <Route path="/admin/featured" element={
              <ProtectedRoute allowedRoles={["super_admin"]}><ManageFeatured /></ProtectedRoute>
            } />
            <Route path="/admin/analytics" element={
              <ProtectedRoute allowedRoles={["super_admin"]}><AdminAnalytics /></ProtectedRoute>
            } />
            <Route path="/admin/sub-admins" element={
              <ProtectedRoute allowedRoles={["super_admin"]}><ManageSubAdmins /></ProtectedRoute>
            } />

            {/* Vendor Dashboard */}
            <Route path="/vendor-dashboard" element={
              <ProtectedRoute allowedRoles={["vendor"]}><VendorDashboard /></ProtectedRoute>
            } />

            {/* Sub-Admin Dashboard */}
            <Route path="/sub-admin" element={
              <ProtectedRoute allowedRoles={["sub_admin", "admin"]}><SubAdminDashboard /></ProtectedRoute>
            } />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
