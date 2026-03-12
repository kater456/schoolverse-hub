import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import InstallPrompt from "@/components/InstallPrompt";
import ProtectedRoute from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Browse from "./pages/Browse";
import VendorProfile from "./pages/VendorProfile";
import VendorRegistration from "./pages/VendorRegistration";
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

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <InstallPrompt />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/browse" element={<Browse />} />
            <Route path="/vendor/:id" element={<VendorProfile />} />
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

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
