import { useKeycloak } from "@react-keycloak/web";
import { useTranslation } from "react-i18next";
import {
  HiOutlineBell,
  HiChevronDown,
  HiMiniUserCircle,
} from "react-icons/hi2";

export default function AdminTopbar() {
  const { keycloak } = useKeycloak();
  const { i18n } = useTranslation();

  const currentLanguage = i18n.language?.toUpperCase().startsWith("TH")
    ? "TH"
    : "EN";

  const username =
    (keycloak.tokenParsed?.preferred_username as string | undefined) ||
    (keycloak.tokenParsed?.name as string | undefined) ||
    "Admin User";

  return (
    <header className="border-b border-border bg-surface">
      <div className="flex h-14 items-center justify-between px-5">
        {/* Left */}
        <div className="flex items-center gap-8">
          <div className="text-2xl font-bold text-primary-foreground">
            LanceFy
          </div>

          {/* ไม่มีเมนู top nav */}
        </div>

        {/* Right */}
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-warning/20 px-4 py-1.5 text-sm font-medium text-warning-foreground">
            Admin Console
          </div>

          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-full text-text-secondary transition hover:bg-primary/20 hover:text-foreground"
          >
            <HiOutlineBell className="h-5 w-5" />
          </button>

          <div className="flex items-center overflow-hidden rounded-md border border-border bg-background text-xs font-medium">
            <button
              type="button"
              className={`px-3 py-1 ${
                currentLanguage === "EN"
                  ? "bg-primary text-primary-foreground"
                  : "text-text-secondary"
              }`}
            >
              EN
            </button>
            <button
              type="button"
              className={`px-3 py-1 ${
                currentLanguage === "TH"
                  ? "bg-primary text-primary-foreground"
                  : "text-text-secondary"
              }`}
            >
              TH
            </button>
          </div>

          <button
            type="button"
            className="flex items-center gap-2 rounded-full px-1 py-1 transition hover:bg-primary/20"
          >
            <HiMiniUserCircle className="h-8 w-8 text-text-secondary" />
            <span className="hidden max-w-[140px] truncate text-sm text-foreground lg:inline">
              {username}
            </span>
            <HiChevronDown className="h-4 w-4 text-text-secondary" />
          </button>
        </div>
      </div>
    </header>
  );
}