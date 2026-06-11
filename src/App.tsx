import { Suspense, lazy } from "react";
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
import ScrollManager from "@/components/ScrollManager";
import PromoToastListener from "@/components/PromoToastListener";
import AdPopup from "@/components/AdPopup";
import PushPrompt from "@/components/PushPrompt";
import { Loader2 } from "lucide-react";
import { Analytics } from "@vercel/analytics/react";

// ── Lazy-loaded pages (only downloaded when visited) ─────────────────────────
const Index              = lazy(() => import("./pages/Index"));
const Help               = lazy(() => import("./pages/Help"));
const Browse             = lazy(() => import("./pages/Browse"));
const VendorProfile      = lazy(() => import("./pages/VendorProfile"));
const StorePage          = lazy(() => import("./pages/StorePage"));
const AcademicsHub       = lazy(() => import("./pages/academics/AcademicsHub"));
const BIC1CBT            = lazy(() => import("./pages/academics/BIC1CBT"));
const PhysioCBT          = lazy(() => import("./pages/academics/PhysioCBT"));
const AdminAcademicsPage = lazy(() => import("./pages/admin/AdminAcademicsPage"));
const VendorRegistration = lazy(() => import("./pages/VendorRegistration"));
const Reels              = lazy(() => import("./pages/Reels"));
const NotFound           = lazy(() => import("./pages/NotFound"));
const PrivacyPolicy      = lazy(() => import("./pages/PrivacyPolicy"));

// Auth
const SignUp         = lazy(() => import("./pages/auth/SignUp"));
const Login          = lazy(() => import("./pages/auth/Login"));
const VerifyEmail    = lazy(() => import("./pages/auth/VerifyEmail"));
const ForgotPassword = lazy(() => import("./pages/auth/ForgotPassword"));

// Setup
const SetupSuperAdmin = lazy(() => import("./pages/SetupSuperAdmin"));

// Admin
const AdminDashboard       = lazy(() => import("./pages/admin/AdminDashboard"));
const ManageVendors        = lazy(() => import("./pages/admin/ManageVendors"));
const ManageSchools        = lazy(() => import("./pages/admin/ManageSchools"));
const ManageCampusLocations = lazy(() => import("./pages/admin/ManageCampusLocations"));
const ManageFeatured       = lazy(() => import("./pages/admin/ManageFeatured"));
const ManageAds            = lazy(() => import("./pages/admin/ManageAds"));
const AdminAnalytics       = lazy(() => import("./pages/admin/AdminAnalytics"));
const AdminChats           = lazy(() => import("./pages/admin/AdminChats"));
const ManageSubAdmins      = lazy(() => import("./pages/admin/ManageSubAdmins"));
const AdminNotifications   = lazy(() => import("./pages/admin/AdminNotifications"));

// Dashboards
const VendorDashboard   = lazy(() => import("./pages/dashboard/VendorDashboard"));
const SubAdminDashboard = lazy(() => import("./pages/dashboard/SubAdminDashboard"));

// Chat
const MessagesPage = lazy(() => import("./pages/MessagesPage"));
const ChatPage     = lazy(() => import("./pages/ChatPage"));
const AccountPage  = lazy(() => import("./pages/AccountPage"));

// ── Page loading fallback ─────────────────────────────────────────────────────
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <Loader2 className="h-8 w-8 animate-spin text-accent" />
  </div>
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,   // 5 minutes cache
      gcTime: 1000 * 60 * 10,     // 10 minutes in memory
      retry: 1,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <Analytics />
        <BrowserRouter>
          <ScrollManager />
          <PromoToastListener />
          <InstallPrompt />
          <AppDownloadPopup />
          <PromotionNotification />
          <AdPopup />
          <PushPrompt />
          <ScrollToTop />
          <PageTracker />
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/"        element={<Index />} />
              <Route path="/browse"  element={<Browse />} />
              <Route path="/help"    element={<Help />} />
              <Route path="/vendor/:id"       element={<VendorProfile />} />
              <Route path="/vendor/:id/:slug" element={<VendorProfile />} />
              <Route path="/store/:vendorId"        element={<StorePage />} />
              <Route path="/store/:vendorId/:slug"  element={<StorePage />} />
              <Route path="/academics"              element={<AcademicsHub />} />
              <Route path="/academics/bic1"         element={<BIC1CBT />} />
              <Route path="/academics/physio"       element={<PhysioCBT />} />
              <Route path="/privacy" element={<PrivacyPolicy />} />
              <Route path="/reels"   element={<Reels />} />
              <Route path="/register-vendor" element={
                <ProtectedRoute><VendorRegistration /></ProtectedRoute>
              } />

              {/* Auth */}
              <Route path="/signup"          element={<SignUp />} />
              <Route path="/login"           element={<Login />} />
              <Route path="/verify-email"    element={<VerifyEmail />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/setup-admin"     element={<SetupSuperAdmin />} />

              {/* Admin */}
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
              <Route path="/admin/ads" element={
                <ProtectedRoute allowedRoles={["super_admin"]}><ManageAds /></ProtectedRoute>
              } />
              <Route path="/admin/analytics" element={
                <ProtectedRoute allowedRoles={["super_admin"]}><AdminAnalytics /></ProtectedRoute>
              } />
              <Route path="/admin/chats" element={
                <ProtectedRoute allowedRoles={["super_admin"]}><AdminChats /></ProtectedRoute>
              } />
              <Route path="/admin/sub-admins" element={
                <ProtectedRoute allowedRoles={["super_admin"]}><ManageSubAdmins /></ProtectedRoute>
              } />
              <Route path="/admin/academics" element={
                <ProtectedRoute allowedRoles={["super_admin", "admin"]}><AdminAcademicsPage /></ProtectedRoute>
              } />
              <Route path="/admin/notifications" element={
                <ProtectedRoute allowedRoles={["super_admin"]}><AdminNotifications /></ProtectedRoute>
              } />

              {/* Vendor Dashboard */}
              <Route path="/vendor-dashboard" element={
                <ProtectedRoute allowedRoles={["vendor"]}><VendorDashboard /></ProtectedRoute>
              } />

              {/* Messaging */}
              <Route path="/messages" element={
                <ProtectedRoute><MessagesPage /></ProtectedRoute>
              } />
              <Route path="/chat/:conversationId" element={
                <ProtectedRoute><ChatPage /></ProtectedRoute>
              } />

              {/* User Account */}
              <Route path="/account" element={
                <ProtectedRoute><AccountPage /></ProtectedRoute>
              } />

              {/* Sub-Admin */}
              <Route path="/sub-admin" element={
                <ProtectedRoute allowedRoles={["sub_admin", "admin"]}><SubAdminDashboard /></ProtectedRoute>
              } />

              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
