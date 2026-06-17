import { Outlet } from "react-router-dom";
import DashboardSidebar from "@/components/navigation/sidebar/DashboardSidebar";

export default function DashboardLayout() {
  return (
    <div className="flex h-full min-h-0 overflow-hidden">
      {/* Sidebar */}
      <DashboardSidebar />

      {/* Content */}
      <div className="min-w-0 flex-1 overflow-y-auto overflow-x-hidden">
        <Outlet />
      </div>
    </div>
  );
}
