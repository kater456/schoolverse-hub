import DashboardLayout from "@/components/layout/DashboardLayout";
import PushBroadcastPanel from "@/components/PushBroadcastPanel";

const AdminNotifications = () => (
  <DashboardLayout userRole="super_admin">
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold">Push Notifications</h1>
        <p className="text-muted-foreground mt-1 text-sm">Broadcast updates to all users or filter by campus / vendors.</p>
      </div>
      <PushBroadcastPanel scope="super_admin" />
    </div>
  </DashboardLayout>
);

export default AdminNotifications;
