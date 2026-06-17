import { createContext, useContext, useEffect, useState } from "react";

export type AppSection = "dashboard" | "gallery" | "explore";

interface AppNavigationContextValue {
  section: AppSection;
  setSection: (section: AppSection) => void;
  isSidebarCollapsed: boolean;
  setIsSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebarCollapsed: () => void;
}

const AppNavigationContext = createContext<AppNavigationContextValue | null>(null);

const SIDEBAR_COLLAPSED_STORAGE_KEY = "lancefy.sidebar.collapsed";

export function AppNavigationProvider({ children }: { children: React.ReactNode }) {
  const [section, setSection] = useState<AppSection>("dashboard");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") {
      return false;
    }

    return window.localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY) === "1";
  });

  useEffect(() => {
    window.localStorage.setItem(
      SIDEBAR_COLLAPSED_STORAGE_KEY,
      isSidebarCollapsed ? "1" : "0"
    );
  }, [isSidebarCollapsed]);

  return (
    <AppNavigationContext.Provider
      value={{
        section,
        setSection,
        isSidebarCollapsed,
        setIsSidebarCollapsed,
        toggleSidebarCollapsed: () =>
          setIsSidebarCollapsed((collapsed) => !collapsed),
      }}
    >
      {children}
    </AppNavigationContext.Provider>
  );
}

export function useAppNavigation() {
  const ctx = useContext(AppNavigationContext);
  if (!ctx) {
    throw new Error("useAppNavigation must be used within AppNavigationProvider");
  }
  return ctx;
}
