import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useKeycloak } from "@react-keycloak/web";
import { useTranslation } from "react-i18next";
import {
  ChevronLeft,
  BadgeCheck,
  Star,
  ImageOff,
  Briefcase,
  X,
  Pencil,
  Globe,
  FolderOpen,
  MessageSquareText,
} from "lucide-react";
import {
  getFreelancerProfile,
  type FreelancerProfile,
} from "@/services/freelancer.service";
import {
  getUserPortfolios,
  type FreelancerPortfolio,
} from "@/services/portfolio.service";
import { authService } from "@/services/auth.service";
import type { CurrentUser } from "@/auth/auth.types";
import { getUserReviews, type ReviewResponse } from "@/services/review.service";
import { getUserDisplayName, getUserInitials } from "@/utils/user";

const surfaceClass =
  "rounded-[28px] border border-slate-200/80 bg-white shadow-[0_18px_40px_rgba(15,23,42,0.06)]";

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={`h-4 w-4 ${
            n <= rating
              ? "fill-amber-400 text-amber-400"
              : "fill-slate-200 text-slate-200"
          }`}
        />
      ))}
    </div>
  );
}

function Lightbox({ url, onClose }: { url: string; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute right-4 top-4 rounded-2xl bg-white/10 p-2 text-white/80 transition hover:bg-white/20 hover:text-white"
      >
        <X className="h-7 w-7" />
      </button>
      <img
        src={url}
        alt="Portfolio full view"
        className="max-h-[90vh] max-w-[90vw] rounded-[28px] object-contain shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}

export default function PublicUserProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { keycloak } = useKeycloak();
  const { t, i18n } = useTranslation("common");
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [currentUserResolved, setCurrentUserResolved] = useState(false);

  const [profile, setProfile] = useState<FreelancerProfile | null>(null);
  const [portfolios, setPortfolios] = useState<FreelancerPortfolio[]>([]);
  const [activeFolder, setActiveFolder] = useState(0);
  const [reviews, setReviews] = useState<ReviewResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    if (!keycloak.authenticated) {
      setCurrentUser(null);
      setCurrentUserResolved(true);
      return () => {
        cancelled = true;
      };
    }

    setCurrentUserResolved(false);
    authService
      .getCurrentUser()
      .then((u) => {
        if (cancelled) return;
        setCurrentUser(u);
      })
      .catch(() => {
        if (cancelled) return;
        setCurrentUser(null);
      })
      .finally(() => {
        if (cancelled) return;
        setCurrentUserResolved(true);
      });

    return () => {
      cancelled = true;
    };
  }, [keycloak.authenticated]);

  useEffect(() => {
    if (!id || !currentUserResolved) return;

    const isOwnProfile = currentUser?.id === id;
    const profileRequest =
      isOwnProfile && currentUser
        ? Promise.resolve(currentUser as FreelancerProfile)
        : getFreelancerProfile(id).then((res) => res.data);

    setLoading(true);
    setNotFound(false);

    Promise.all([
      profileRequest,
      getUserPortfolios(id).catch(() => ({ data: [] as FreelancerPortfolio[] })),
      getUserReviews(id).catch(() => ({ data: [] as ReviewResponse[] })),
    ])
      .then(([profileData, ports, reviewData]) => {
        setProfile(profileData);
        setPortfolios(ports.data);
        setReviews(reviewData.data);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [currentUser, currentUserResolved, id]);

  if (loading) {
    return (
      <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-6 px-6 pb-8 pt-8 sm:px-8 xl:px-10 2xl:px-12">
        <div className="h-44 animate-pulse rounded-[28px] bg-slate-200/70" />
        <div className="h-36 animate-pulse rounded-[28px] bg-slate-200/60" />
        <div className="h-80 animate-pulse rounded-[28px] bg-slate-200/60" />
      </div>
    );
  }

  if (notFound || !profile) {
    return (
      <div className="mx-auto flex w-full max-w-[900px] flex-col items-center px-6 pb-10 pt-12 text-center">
        <div className={`${surfaceClass} w-full px-8 py-14`}>
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[22px] bg-slate-100 text-slate-400">
            <Globe className="h-8 w-8" />
          </div>
          <h1 className="mt-5 text-2xl font-semibold text-slate-900">
            {t("publicProfilePage.notFound.title")}
          </h1>
          <p className="mt-2 text-sm leading-7 text-slate-500">
            {t("publicProfilePage.notFound.subtitle")}
          </p>
          <button
            onClick={() => navigate(-1)}
            className="mt-6 inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm shadow-slate-200/40 transition hover:bg-slate-50"
          >
            <ChevronLeft className="h-4 w-4" />
            {t("publicProfilePage.actions.back")}
          </button>
        </div>
      </div>
    );
  }

  const language = i18n.resolvedLanguage?.startsWith("th") ? "th-TH" : "en-US";
  const displayName = getUserDisplayName(profile, t("publicProfilePage.fallbacks.user"));
  const initials = getUserInitials(profile);
  const isOwnProfile = currentUser?.id === id;
  const avgRating =
    reviews.length > 0
      ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
      : null;
  const activePortfolio = portfolios[activeFolder] ?? null;

  return (
    <>
      {lightbox && <Lightbox url={lightbox} onClose={() => setLightbox(null)} />}

      <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-6 px-6 pb-8 pt-8 sm:px-8 xl:px-10 2xl:px-12">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 self-start text-sm font-medium text-slate-500 transition hover:text-slate-800"
          >
            <ChevronLeft className="h-4 w-4" />
            {t("publicProfilePage.actions.back")}
          </button>
          {isOwnProfile && (
            <Link
              to="/app/account/profile"
              className="inline-flex items-center gap-2 self-start rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm shadow-slate-200/40 transition hover:border-slate-300 hover:bg-slate-50"
            >
              <Pencil className="h-4 w-4" />
              {t("publicProfilePage.actions.editProfile")}
            </Link>
          )}
        </div>

        <section className={`${surfaceClass} overflow-hidden`}>
          <div className="flex flex-col gap-6 p-6 sm:p-8 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <span className="inline-flex items-center rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                {t("publicProfilePage.hero.eyebrow")}
              </span>
              <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 sm:text-[2.2rem]">
                {displayName}
              </h1>
              {profile.tagline && (
                <p className="mt-3 text-sm leading-7 text-slate-500 sm:text-base">
                  {profile.tagline}
                </p>
              )}
              {profile.username && (
                <p className="mt-2 text-sm font-medium text-slate-400">
                  @{profile.username}
                </p>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              {profile.kyc_status === "verified" && (
                <span className="inline-flex items-center gap-1 rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700">
                  <BadgeCheck className="h-3.5 w-3.5" />
                  {t("publicProfilePage.meta.verified")}
                </span>
              )}
              {profile.hourly_rate ? (
                <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700">
                  {t("publicProfilePage.meta.hourlyRate", {
                    value: profile.hourly_rate.toLocaleString(language),
                  })}
                </span>
              ) : null}
              <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700">
                {t("publicProfilePage.meta.foldersCount", { count: portfolios.length })}
              </span>
            </div>
          </div>

          <div className="border-t border-slate-200/80 px-6 py-6 sm:px-8">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={displayName}
                  className="h-24 w-24 rounded-[24px] object-cover ring-4 ring-slate-50 shadow-lg shadow-slate-200/60"
                />
              ) : (
                <div className="flex h-24 w-24 items-center justify-center rounded-[24px] bg-gradient-to-br from-blue-600 to-indigo-600 text-3xl font-bold text-white shadow-lg shadow-blue-200/40">
                  {initials}
                </div>
              )}

              <div className="min-w-0 flex-1">
                {avgRating !== null && (
                  <div className="mb-3 flex flex-wrap items-center gap-3">
                    <Stars rating={Math.round(avgRating)} />
                    <span className="text-sm font-semibold text-slate-800">
                      {avgRating.toFixed(1)}
                    </span>
                    <span className="text-sm text-slate-400">
                      {t("publicProfilePage.meta.reviewsCount", { count: reviews.length })}
                    </span>
                  </div>
                )}

                {profile.bio ? (
                  <p className="max-w-4xl whitespace-pre-line text-sm leading-7 text-slate-600">
                    {profile.bio}
                  </p>
                ) : (
                  <p className="text-sm leading-7 text-slate-400">
                    {t("publicProfilePage.emptyBio")}
                  </p>
                )}
              </div>
            </div>
          </div>
        </section>

        {profile.skills && profile.skills.length > 0 && (
          <section className={`${surfaceClass} p-6 sm:p-8`}>
            <div className="mb-4">
              <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                {t("publicProfilePage.sections.skills")}
              </h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {profile.skills.map((skill) => (
                <span
                  key={typeof skill === "string" ? skill : skill.id}
                  className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-semibold text-slate-700"
                >
                  {typeof skill === "string" ? skill : skill.name}
                </span>
              ))}
            </div>
          </section>
        )}

        <section className={`${surfaceClass} p-6 sm:p-8`}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
                <Briefcase className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
                  {t("publicProfilePage.sections.portfolio")}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {t("publicProfilePage.sections.portfolioSubtitle")}
                </p>
              </div>
            </div>
            {isOwnProfile && (
              <Link
                to="/app/account/portfolio"
                className="inline-flex items-center gap-2 self-start rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm shadow-slate-200/40 transition hover:border-slate-300 hover:bg-slate-50 sm:self-auto"
              >
                <Pencil className="h-4 w-4" />
                {t("publicProfilePage.actions.editPortfolio")}
              </Link>
            )}
          </div>

          {portfolios.length > 0 ? (
            <div className="mt-6 space-y-5">
              {portfolios.length > 1 && (
                <div className="flex flex-wrap gap-2">
                  {portfolios.map((portfolio, index) => (
                    <button
                      key={portfolio.id}
                      onClick={() => setActiveFolder(index)}
                      className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                        activeFolder === index
                          ? "border-blue-700 bg-blue-700 text-white shadow-[0_12px_24px_rgba(29,78,216,0.18)]"
                          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      {portfolio.title || t("publicProfilePage.fallbacks.portfolio", { number: index + 1 })}
                    </button>
                  ))}
                </div>
              )}

              {activePortfolio && (
                <div className="rounded-[24px] border border-slate-200/80 bg-slate-50/60 p-5 sm:p-6">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-slate-500 shadow-sm shadow-slate-200/50">
                          <FolderOpen className="h-5 w-5" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-slate-900">
                            {activePortfolio.title || t("publicProfilePage.fallbacks.portfolio", { number: activeFolder + 1 })}
                          </h3>
                          <p className="mt-1 text-xs font-medium text-slate-400">
                            {t("publicProfilePage.meta.filesCount", {
                              count: activePortfolio.files.length,
                            })}
                          </p>
                        </div>
                      </div>
                      {activePortfolio.description && (
                        <p className="mt-4 max-w-4xl text-sm leading-7 text-slate-600">
                          {activePortfolio.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {activePortfolio.files.length > 0 ? (
                    <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
                      {activePortfolio.files.map((file) => (
                        <button
                          key={file.id}
                          onClick={() => setLightbox(file.file_url)}
                          className="group relative aspect-square overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm shadow-slate-200/60 focus:outline-none"
                        >
                          <img
                            src={file.file_url}
                            alt={t("publicProfilePage.portfolioItemAlt")}
                            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                          />
                          <div className="absolute inset-0 bg-slate-900/0 transition group-hover:bg-slate-900/20" />
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-6 rounded-[24px] border border-dashed border-slate-200 bg-white px-6 py-12 text-center">
                      <ImageOff className="mx-auto mb-3 h-8 w-8 text-slate-300" />
                      <p className="text-sm font-medium text-slate-500">
                        {t("publicProfilePage.emptyPortfolioFolder")}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="mt-6 rounded-[24px] border border-dashed border-slate-200 bg-slate-50/70 px-6 py-14 text-center">
              <ImageOff className="mx-auto mb-3 h-10 w-10 text-slate-300" />
              <h3 className="text-lg font-semibold text-slate-900">
                {t("publicProfilePage.emptyPortfolio.title")}
              </h3>
              <p className="mt-2 text-sm leading-7 text-slate-500">
                {t("publicProfilePage.emptyPortfolio.subtitle")}
              </p>
            </div>
          )}
        </section>

        <section className={`${surfaceClass} p-6 sm:p-8`}>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
              <MessageSquareText className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
                {t("publicProfilePage.sections.reviews")}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {t("publicProfilePage.meta.reviewsCount", { count: reviews.length })}
              </p>
            </div>
          </div>

          {reviews.length === 0 ? (
            <div className="mt-6 rounded-[24px] border border-dashed border-slate-200 bg-slate-50/70 px-6 py-14 text-center">
              <MessageSquareText className="mx-auto mb-3 h-10 w-10 text-slate-300" />
              <h3 className="text-lg font-semibold text-slate-900">
                {t("publicProfilePage.emptyReviews.title")}
              </h3>
              <p className="mt-2 text-sm leading-7 text-slate-500">
                {t("publicProfilePage.emptyReviews.subtitle")}
              </p>
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              {reviews.slice(0, 6).map((review) => (
                <article
                  key={review.id}
                  className="rounded-[24px] border border-slate-200/80 bg-slate-50/60 p-5"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex items-center gap-3">
                        <Stars rating={review.rating} />
                        <span className="text-sm font-semibold text-slate-800">
                          {review.rating.toFixed(1)}
                        </span>
                      </div>
                      <p className="mt-2 text-xs font-medium text-slate-400">
                        {t("publicProfilePage.reviewBy", {
                          name:
                            review.reviewer_display_name ??
                            review.reviewer_username ??
                            `#${review.reviewer_id.slice(0, 8)}`,
                        })}
                      </p>
                    </div>
                    <span className="text-xs font-medium text-slate-400">
                      {new Date(review.created_at).toLocaleDateString(language)}
                    </span>
                  </div>
                  {review.comment && (
                    <p className="mt-4 text-sm leading-7 text-slate-600">
                      {review.comment}
                    </p>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  );
}
