import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useKeycloak } from "@react-keycloak/web";

import { authService } from "@/services/auth.service";

interface RequireAuthProps {
  children: React.ReactNode;
  zone: "user" | "admin";
}

function getHttpStatus(error: unknown): number | null {
  if (
    typeof error === "object" &&
    error !== null &&
    "response" in error &&
    typeof error.response === "object" &&
    error.response !== null &&
    "status" in error.response &&
    typeof error.response.status === "number"
  ) {
    return error.response.status;
  }

  return null;
}

export function RequireAuth({ children, zone }: RequireAuthProps) {
  const { keycloak, initialized } = useKeycloak();
  const [loading, setLoading] = useState(true);
  const [profileChecked, setProfileChecked] = useState(false);

  useEffect(() => {
    if (!initialized) return;

    if (!keycloak.authenticated) {
      setProfileChecked(true);
      setLoading(false);
      return;
    }

    authService
      .getCurrentUser()
      .then(() => {
        setProfileChecked(true);
      })
      .catch((error) => {
        const status = getHttpStatus(error);

        if (status === 401 || status === 403) {
          keycloak.logout({ redirectUri: `${window.location.origin}/` });
          return;
        }

        console.error("RequireAuth: failed to load current user profile", error);
        setProfileChecked(true);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [initialized, keycloak, keycloak.authenticated]);

  if (!initialized || loading) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  if (!keycloak.authenticated) {
    return <Navigate to="/" replace />;
  }

  if (!profileChecked) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  const roles = keycloak.tokenParsed?.realm_access?.roles ?? [];

  const isAdmin =
    roles.includes("platform_admin") ||
    roles.includes("staff");

  const isUser = !isAdmin;

  if (zone === "admin" && !isAdmin) {
    return <Navigate to="/app" replace />;
  }

  if (zone === "user" && !isUser) {
    return <Navigate to="/admin" replace />;
  }

  return <>{children}</>;
}
