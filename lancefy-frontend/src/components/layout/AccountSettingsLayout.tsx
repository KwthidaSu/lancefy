import { Outlet } from "react-router-dom";

import AccountSettingsSidebar from "@/components/navigation/sidebar/AccountSettingsSidebar";

export default function AccountSettingsLayout() {
  return (
    <div className="flex h-full bg-white">
      <AccountSettingsSidebar />
      <main className="min-w-0 flex-1 overflow-y-auto overflow-x-hidden bg-white p-6">
        <div className="w-full">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
