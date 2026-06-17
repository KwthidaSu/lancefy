import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import {
  HiOutlineBell,
  HiChevronDown,
  HiMiniUserCircle,
  HiOutlineCheckCircle,
} from "react-icons/hi2";
import { useKeycloak } from "@react-keycloak/web";
import { useTranslation } from "react-i18next";

import { useAppNavigation } from "@/context/AppNavigationContext";
import { fetchKycStatus, getStoredKycStatusFallback } from "@/services/kyc/kyc";
import type { KycStatus } from "@/services/kyc/kyc.types";
import { useNotifications } from "@/context/NotificationContext";
import { authService } from "@/services/auth.service";

const mainNavBase =
  "relative px-3 py-2 text-sm font-medium transition-colors " +
  "text-text-secondary hover:text-primary " +
  "after:absolute after:left-0 after:-bottom-1 after:h-[2px] after:w-full " +
  "after:bg-primary after:origin-left after:scale-x-0 " +
  "after:transition-transform after:duration-200 " +
  "hover:after:scale-x-100";

const mainNavActive = "text-primary after:scale-x-100";

type TopNavbarProps = {
  variant?: "user" | "admin";
};

export default function TopNavbar({
  variant = "user",
}: TopNavbarProps) {
  const { setSection } = useAppNavigation();
  const { keycloak } = useKeycloak();
  const { t, i18n } = useTranslation("common");
  const location = useLocation();
  const navigate = useNavigate();
  const roles = keycloak.tokenParsed?.realm_access?.roles ?? [];
  const hasFreelancerRole = roles.includes("freelancer");
  const storedKycFallback = getStoredKycStatusFallback();

  const { notifications, unreadCount, markAsRead, markAllAsRead } =
    useNotifications();

  const [openUserMenu, setOpenUserMenu] = useState(false);
  const [openExplore, setOpenExplore] = useState(false);
  const [openBell, setOpenBell] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const [kycStatus, setKycStatus] = useState<KycStatus | null>(
    hasFreelancerRole ? "approved" : storedKycFallback?.status ?? null
  );
  const [loadingKycStatus, setLoadingKycStatus] = useState(
    variant === "user" && !hasFreelancerRole && !storedKycFallback
  );

  const userMenuRef = useRef<HTMLDivElement>(null);
  const exploreRef = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLDivElement>(null);
  const isAdminNavbar = variant === "admin";

  const isDashboardActive = location.pathname === "/app/dashboard";
  const isGalleryActive = location.pathname.startsWith("/app/gallery");
  const isExploreActive = location.pathname.startsWith("/app/explore");
  const isKycPage =
    location.pathname.startsWith("/app/kyc") ||
    location.pathname.startsWith("/app/account/verification");

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (exploreRef.current && !exploreRef.current.contains(target)) {
        setOpenExplore(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(target)) {
        setOpenUserMenu(false);
      }
      if (bellRef.current && !bellRef.current.contains(target)) {
        setOpenBell(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (isAdminNavbar) {
      setLoadingKycStatus(false);
      setKycStatus(null);
      return;
    }

    if (hasFreelancerRole) {
      setLoadingKycStatus(false);
      setKycStatus("approved");
      return;
    }

    const loadKycStatus = async () => {
      try {
        const res = await fetchKycStatus();
        setKycStatus(res.data.status);
      } catch (error) {
        console.error("Failed to fetch KYC status:", error);
        setKycStatus(storedKycFallback?.status ?? "not_submitted");
      } finally {
        setLoadingKycStatus(false);
      }
    };

    loadKycStatus();
  }, [hasFreelancerRole, isAdminNavbar, storedKycFallback?.status]);

  const changeLanguage = (lang: "en" | "th") => {
    i18n.changeLanguage(lang);
    localStorage.setItem("lang", lang);
  };

  useEffect(() => {
    if (!keycloak.authenticated) return;
    authService.getCurrentUser()
      .then((u) => setCurrentUserId(u.id))
      .catch(() => {});
  }, [keycloak.authenticated]);

  const handleLogout = () => {
    keycloak.logout({ redirectUri: window.location.origin + "/" });
  };

  const handleFreelancerClick = () => {
    if (isAdminNavbar || loadingKycStatus || isKycPage) return;

    if (!kycStatus || kycStatus === "not_submitted") {
      navigate("/app/account/verification/start");
      return;
    }

    if (kycStatus === "under_review") {
      navigate("/app/account/verification/status");
      return;
    }

    if (kycStatus === "needs_resubmission" || kycStatus === "rejected") {
      navigate("/app/account/verification/start");
      return;
    }
  };

  const shouldShowBecomeButton =
    !isAdminNavbar && !hasFreelancerRole && kycStatus !== "approved";

  const freelancerButtonLabel = loadingKycStatus
    ? t("freelancer.loading")
    : kycStatus === "under_review"
      ? t("freelancer.verificationInProgress")
      : kycStatus === "needs_resubmission" || kycStatus === "rejected"
        ? t("freelancer.completeVerification")
        : t("freelancer.become");
  const notificationLocale = i18n.language === "th" ? "th-TH" : "en-US";

  return (
    <header className="h-14 border-b border-border bg-surface flex items-center justify-between px-6">
      <div className="flex items-center gap-10">
        <Link
          to={isAdminNavbar ? "/admin" : "/app/dashboard"}
          onClick={() => {
            if (!isAdminNavbar) {
              setSection("dashboard");
            }
          }}
          className="text-xl font-bold tracking-tight text-blue-600 hover:opacity-90"
        >
          {isAdminNavbar ? t("nav.adminBrand") : "LanceFy"}
        </Link>

        {isAdminNavbar ? null : (
          <nav className="flex items-center gap-2">
            <Link
              to="/app/dashboard"
              className={`${mainNavBase} ${isDashboardActive ? mainNavActive : ""}`}
            >
              {t("nav.dashboard")}
            </Link>

            <Link
              to="/app/gallery"
              className={`${mainNavBase} ${isGalleryActive ? mainNavActive : ""}`}
            >
              {t("nav.gallery")}
            </Link>

            <div ref={exploreRef} className="relative">
              <button
                onClick={() => {
                  setSection("explore");
                  setOpenExplore((v) => !v);
                }}
                className={`flex items-center gap-1 ${mainNavBase} ${isExploreActive ? mainNavActive : ""}`}
              >
                {t("nav.explore")}
                <HiChevronDown
                  className={`w-4 h-4 transition-transform ${openExplore ? "rotate-180" : ""}`}
                />
              </button>

              {openExplore && (
                <div className="absolute left-0 mt-2 w-44 bg-surface border border-border rounded-md shadow-lg z-50">
                  <Link
                    to="/app/explore/jobs"
                    onClick={() => setOpenExplore(false)}
                    className="block px-4 py-2 text-sm text-text-secondary hover:bg-blue-50 hover:text-primary"
                  >
                    {t("nav.jobs")}
                  </Link>
                  <Link
                    to="/app/explore/freelancers"
                    onClick={() => setOpenExplore(false)}
                    className="block px-4 py-2 text-sm text-text-secondary hover:bg-blue-50 hover:text-primary"
                  >
                    {t("nav.freelancers")}
                  </Link>
                </div>
              )}
            </div>
          </nav>
        )}
      </div>

      <div className="flex items-center gap-3 relative">
        {!isAdminNavbar && shouldShowBecomeButton && (
          <button
            onClick={handleFreelancerClick}
            disabled={loadingKycStatus || isKycPage}
            className={`
              px-4 py-2 rounded-full
              text-sm font-semibold
              transition
              ${
                loadingKycStatus || isKycPage
                  ? "bg-neutral-300 text-neutral-600 cursor-default"
                  : kycStatus === "under_review"
                    ? "bg-amber-100 text-amber-800 hover:bg-amber-200"
                    : kycStatus === "needs_resubmission" || kycStatus === "rejected"
                      ? "bg-red-100 text-red-700 hover:bg-red-200"
                      : "bg-neutral-900 text-white hover:bg-neutral-800"
              }
            `}
          >
            {freelancerButtonLabel}
          </button>
        )}

        {!isAdminNavbar && (
          <>
            {/* Notification Bell (Section 12) */}
            <div ref={bellRef} className="relative">
          <button
            onClick={() => setOpenBell((v) => !v)}
            aria-label={t("nav.notifications")}
            className="relative p-2 rounded-md text-text-secondary hover:bg-blue-50 hover:text-primary"
          >
            <HiOutlineBell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center leading-none">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          {openBell && (
            <div className="absolute right-0 mt-2 w-80 bg-surface border border-border rounded-xl shadow-xl z-50 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <span className="text-sm font-semibold text-text-primary">{t("notifications.title")}</span>
                {unreadCount > 0 && (
                  <button
                    onClick={() => markAllAsRead()}
                    className="flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    <HiOutlineCheckCircle className="w-3.5 h-3.5" />
                    {t("notifications.markAll")}
                  </button>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-border">
                {notifications.length === 0 ? (
                  <div className="py-10 text-center text-sm text-text-muted">
                    {t("notifications.empty")}
                  </div>
                ) : (
                  notifications.slice(0, 20).map((n) => (
                    <div
                      key={n.id}
                      onClick={() => {
                        if (!n.is_read) markAsRead(n.id);
                        if (n.reference_type === "project" && n.reference_id) {
                          navigate(`/app/projects/${n.reference_id}/manage`);
                        } else if (n.reference_type === "proposal" && n.reference_id) {
                          navigate(`/app/proposals/${n.reference_id}`);
                        } else if (n.reference_type === "job" && n.reference_id) {
                          navigate(`/app/jobs/${n.reference_id}`);
                        } else if (n.reference_type === "dispute" && n.reference_id) {
                          navigate(`/app/disputes/${n.reference_id}`);
                        } else if (n.reference_type === "message" && n.reference_id) {
                          navigate(`/app/messages?roomId=${n.reference_id}`);
                        }
                        setOpenBell(false);
                      }}
                      className={`flex gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-blue-50/60 ${
                        !n.is_read ? "bg-blue-50/60" : ""
                      }`}
                    >
                      <div className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${
                        ["proposal_accepted", "work_approved", "kyc_approved", "deal_opened"].includes(n.type) ? "bg-lime-500" :
                        ["proposal_received", "message_received", "project_created"].includes(n.type) ? "bg-blue-500" :
                        ["payment_released", "payout_processed"].includes(n.type) ? "bg-lime-600" :
                        ["work_submitted", "payment_funded"].includes(n.type) ? "bg-yellow-500" :
                        ["proposal_rejected", "work_rejected", "dispute_opened", "kyc_rejected"].includes(n.type) ? "bg-red-400" :
                        "bg-gray-400"
                      }`} />
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm leading-snug ${!n.is_read ? "font-semibold text-text-primary" : "text-text-secondary"}`}>
                          {n.title}
                        </p>
                        {n.body && (
                          <p className="text-xs text-text-muted mt-0.5 line-clamp-2">{n.body}</p>
                        )}
                        <p className="text-[10px] text-text-subtle mt-1">
                          {new Date(n.created_at).toLocaleString(notificationLocale, {
                            day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="border-t border-border px-4 py-2">
                <Link
                  to="/app/notifications"
                  onClick={() => setOpenBell(false)}
                  className="block text-center text-xs text-primary hover:underline py-1"
                >
                  {t("notifications.viewAll")}
                </Link>
              </div>
            </div>
          )}
            </div>
          </>
        )}

        <div className="flex items-center rounded-md border border-border overflow-hidden text-xs font-semibold">
          <button
            onClick={() => changeLanguage("en")}
            className={`px-3 py-1 transition ${
              i18n.language === "en"
                ? "bg-blue-50 text-primary"
                : "bg-surface text-text-secondary hover:bg-blue-50"
            }`}
          >
            EN
          </button>
          <button
            onClick={() => changeLanguage("th")}
            className={`px-3 py-1 transition ${
              i18n.language === "th"
                ? "bg-blue-50 text-primary"
                : "bg-surface text-text-secondary hover:bg-blue-50"
            }`}
          >
            TH
          </button>
        </div>

        <div ref={userMenuRef} className="relative">
          <button
            onClick={() => setOpenUserMenu((v) => !v)}
            className="flex items-center gap-1 p-1 rounded-md text-text-secondary hover:bg-blue-50 hover:text-primary"
          >
            <HiMiniUserCircle className="w-8 h-8" />
            <HiChevronDown className="w-4 h-4" />
          </button>

          {openUserMenu && (
            <div className="absolute right-0 top-12 w-44 bg-surface border border-border rounded-md shadow-lg z-50">
              {!isAdminNavbar && (
                <>
                  <Link
                    to={currentUserId ? `/app/users/${currentUserId}` : "/app/profile"}
                    onClick={() => setOpenUserMenu(false)}
                    className="block px-4 py-2 text-sm text-text-secondary hover:bg-blue-50 hover:text-primary"
                  >
                    {t("nav.publicProfile")}
                  </Link>
                  <Link
                    to="/app/account/profile"
                    onClick={() => setOpenUserMenu(false)}
                    className="block px-4 py-2 text-sm text-text-secondary hover:bg-blue-50 hover:text-primary"
                  >
                    {t("accountSettings.title")}
                  </Link>
                  <Link
                    to="/app/account/portfolio"
                    onClick={() => setOpenUserMenu(false)}
                    className="block px-4 py-2 text-sm text-text-secondary hover:bg-blue-50 hover:text-primary"
                  >
                    {t("accountSettings.nav.portfolio")}
                  </Link>
                </>
              )}

              <button
                onClick={handleLogout}
                className="w-full text-left px-4 py-2 text-sm text-danger hover:bg-blue-50"
              >
                {t("nav.logout")}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
