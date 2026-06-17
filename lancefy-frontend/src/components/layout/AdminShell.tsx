import { Outlet } from "react-router-dom"
import TopNavbar from "@/components/navigation/TopNavbar"
import AdminSidebar from "@/components/navigation/admin/AdminSidebar"
import { AppNavigationProvider } from "@/context/AppNavigationContext"
import { NotificationProvider } from "@/context/NotificationContext"
import { ToastProvider } from "@/components/ui/Toast"

export default function AdminShell() {
  return (
    <ToastProvider>
      <NotificationProvider>
        <AppNavigationProvider>
          <div className="flex h-screen flex-col overflow-hidden bg-surface text-foreground">
            <TopNavbar variant="admin" />

            <div className="flex min-h-0 flex-1 overflow-hidden bg-background">
              <aside className="h-full w-72 shrink-0 border-r border-border bg-surface">
                <div className="h-full overflow-y-auto overflow-x-hidden bg-surface">
                  <AdminSidebar />
                </div>
              </aside>

              <main className="min-w-0 flex-1 overflow-y-auto overflow-x-hidden bg-background">
                <Outlet />
              </main>
            </div>
          </div>
        </AppNavigationProvider>
      </NotificationProvider>
    </ToastProvider>
  )
}