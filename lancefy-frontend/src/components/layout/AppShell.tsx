import { Outlet } from "react-router-dom";
import { AppNavigationProvider } from "@/context/AppNavigationContext";
import { NotificationProvider } from "@/context/NotificationContext";
import TopNavbar from "@/components/navigation/TopNavbar";
import { ToastProvider } from "@/components/ui/Toast";
import ChatWidget from "@/components/chat/ChatWidget";

export default function AppShell() {
  return (
    <AppNavigationProvider>
      {/* NotificationProvider requires Keycloak to be authenticated — safe here
          because AppShell only renders inside <RequireAuth zone="user"> */}
      <ToastProvider>
        <NotificationProvider>
          <div className="flex h-screen flex-col overflow-hidden bg-gray-50">
            <TopNavbar variant="user" />

            <main className="min-h-0 flex-1 overflow-hidden">
              <Outlet />
            </main>
          </div>

          <ChatWidget />
        </NotificationProvider>
      </ToastProvider>
    </AppNavigationProvider>
  );
}
