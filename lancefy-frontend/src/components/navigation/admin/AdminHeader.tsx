import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { getAdminPageMeta } from "@/components/navigation/admin/adminPageMeta";

export default function AdminHeader() {
  const location = useLocation();
  const { t } = useTranslation("common");
  const meta = getAdminPageMeta(location.pathname, t);

  return (
    <header className="border-b border-border bg-surface/80 px-6 py-5 backdrop-blur">
      <h1 className="text-2xl font-bold text-foreground">{meta.title}</h1>
      <p className="mt-1 text-sm text-text-secondary">{meta.description}</p>
    </header>
  );
}
