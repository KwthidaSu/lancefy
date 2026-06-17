import { useEffect, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Banknote,
  CalendarDays,
  ChevronLeft,
  Clock,
  Layers,
  UserRound,
} from "lucide-react";

import { authService } from "@/services/auth.service";
import {
  fetchProject,
} from "@/services/projects/project";
import type {
  Project,
} from "@/services/projects/project.types";
import type { CurrentUser } from "@/auth/auth.types";
import { formatDbDate } from "@/utils/date";
import { sanitizeHtml, htmlToText } from "@/utils/html";

export default function ExploreJobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t, i18n } = useTranslation();

  const [project, setProject] = useState<Project | null>(null);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  useEffect(() => {
    let mounted = true;
    if (!id) return;

    Promise.all([fetchProject(id), authService.getCurrentUser()])
      .then(([projectRes, user]) => {
        if (!mounted) return;
        setProject(projectRes.data);
        setCurrentUser(user);
      })
      .catch(() => {
        if (!mounted) return;
        setProject(null);
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [id]);

  useEffect(() => {
    setActiveImageIndex(0);
  }, [project?.id]);

  const isOwner =
    !!project &&
    !!currentUser &&
    !!project.owner_id &&
    project.owner_id === currentUser.id;

  const postedAt = project?.published_at ?? project?.created_at;
  const locale = i18n.language?.startsWith("th") ? "th" : "en";
  const postedLabel = formatDbDate(postedAt, locale);
  const deadlineLabel = formatDbDate(project?.deadline_date, locale);
  const categoryLabel = project?.categories?.[0]?.label ?? "-";
  const projectImages = (project?.images ?? []).filter(Boolean);
  const activeImage = projectImages[activeImageIndex] ?? projectImages[0];
  const clientDisplayName = [
    project?.owner_firstname ?? "",
    project?.owner_lastname ?? "",
  ]
    .join(" ")
    .trim() || (project?.owner_username ? `@${project.owner_username}` : "");
  const safeProjectDescription = sanitizeHtml(project?.description ?? "");
  const hasProjectDescription = htmlToText(safeProjectDescription).length > 0;

  if (loading) {
    return <div className="p-6 text-sm text-text-muted">{t("loading")}</div>;
  }

  if (!project) {
    return <div className="p-6 text-sm text-danger">{t("project.exploreJobDetailPage.notFound")}</div>;
  }

  if (isOwner) {
    return <Navigate to={`/app/projects/${id}/manage`} replace />;
  }

  return (
    <>
      <div className="p-6">
        <div className="mb-5">
          <Link
            to="/app/explore/jobs"
            className="inline-flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary"
          >
            <ChevronLeft className="w-4 h-4" />
            {t("project.exploreJobDetailPage.backToBoard")}
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl border border-border p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold text-text-primary leading-tight">
                    {project.title}
                  </h1>
                  <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-text-secondary">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {t("project.exploreJobDetailPage.postedAt", { date: postedLabel })}
                    </span>
                    <span>•</span>
                    <span>{categoryLabel}</span>
                  </div>
                  <div className="mt-2 inline-flex items-center gap-1 text-sm text-text-secondary">
                    <CalendarDays className="w-4 h-4" />
                    {t("project.exploreJobDetailPage.deadline", { date: deadlineLabel })}
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-2xl font-bold text-primary">
                    {project.budget.toLocaleString()}
                  </div>
                  <div className="text-sm text-text-muted">
                    {t("project.exploreJobDetailPage.budgetWithCurrency", { currency: project.currency })}
                  </div>
                </div>
              </div>

              {activeImage && (
                <div className="mt-6 space-y-3">
                  <div className="overflow-hidden rounded-xl border border-border bg-surface">
                    <img
                      src={activeImage}
                      alt={project.title}
                      className="w-full h-[280px] object-cover"
                    />
                  </div>
                  {projectImages.length > 1 && (
                    <div className="grid grid-cols-4 gap-2">
                      {projectImages.map((image, index) => (
                        <button
                          key={`${image}-${index}`}
                          type="button"
                          onClick={() => setActiveImageIndex(index)}
                          className={[
                            "overflow-hidden rounded-lg border",
                            activeImageIndex === index
                              ? "border-primary ring-2 ring-primary/20"
                              : "border-border",
                          ].join(" ")}
                        >
                          <img
                            src={image}
                            alt={`preview-${index + 1}`}
                            className="w-full h-16 object-cover"
                          />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="mt-8">
                <h2 className="text-lg font-semibold text-text-primary mb-3">
                  {t("project.exploreJobDetailPage.jobDetails")}
                </h2>
                {hasProjectDescription ? (
                  <div
                    className="text-base leading-relaxed text-text-secondary [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5"
                    dangerouslySetInnerHTML={{ __html: safeProjectDescription }}
                  />
                ) : (
                  <p className="text-base leading-relaxed text-text-secondary">
                    {t("project.exploreJobDetailPage.noDescription")}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-border p-6">
              <h3 className="text-xl font-semibold text-text-primary mb-5">
                {t("project.exploreJobDetailPage.clientInfoTitle")}
              </h3>
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-full bg-surface border border-border flex items-center justify-center">
                  <UserRound className="w-6 h-6 text-text-muted" />
                </div>
                <div>
                  <div className="text-base font-semibold text-text-primary">
                    {clientDisplayName ||
                      t("project.exploreJobDetailPage.clientPrefix", {
                        id: project.owner_id?.slice(0, 6) ?? "-",
                      })}
                  </div>
                  <div className="text-sm text-text-secondary">
                    {t("project.exploreJobDetailPage.projectOwner")}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-border p-6">
              <h3 className="text-xl font-semibold text-text-primary mb-4">
                {t("project.exploreJobDetailPage.statsTitle")}
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-text-secondary inline-flex items-center gap-1">
                    <Banknote className="w-4 h-4" />
                    {t("project.exploreJobDetailPage.budget")}
                  </span>
                  <span className="font-semibold text-text-primary">
                    {project.budget.toLocaleString()} {project.currency}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-text-secondary inline-flex items-center gap-1">
                    <Layers className="w-4 h-4" />
                    {t("project.exploreJobDetailPage.status")}
                  </span>
                  <span className="font-semibold text-text-primary">
                    {t(`project.status.${project.status}`, {
                      defaultValue: project.status,
                    })}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-text-secondary">{t("project.exploreJobDetailPage.postedAtLabel")}</span>
                  <span className="font-semibold text-text-primary">{postedLabel}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-text-secondary">{t("project.exploreJobDetailPage.deadlineLabel")}</span>
                  <span className="font-semibold text-text-primary">{deadlineLabel}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </>
  );
}
