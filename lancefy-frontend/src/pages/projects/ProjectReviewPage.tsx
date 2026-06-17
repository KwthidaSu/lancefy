import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { enUS, th } from "date-fns/locale";

import CreateProjectLayout from "@/components/projects/CreateProjectLayout";
import Button from "@/components/ui/Button";
import { useProjectDraft } from "@/features/projects/useProjectDraft";
import type { ProjectDraft } from "@/features/projects/useProjectDraft";
import { createProject } from "@/services/projects/project";
import { useToast } from "@/components/ui/Toast";

function ReviewRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex justify-between border-b border-border pb-3">
      <span className="text-sm text-text-muted">
        {label}
      </span>
      <span className="text-sm font-medium text-text-primary">
        {value}
      </span>
    </div>
  );
}

export default function ProjectReviewPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { load, clear } = useProjectDraft();
  const { showToast } = useToast();

  const draft = load();
  if (!draft) {
    navigate("/app/projects/create");
    return null;
  }

  // 🌍 locale สำหรับ format วันที่
  const localeMap = {
    en: enUS,
    th: th,
  };
  const locale =
    localeMap[i18n.language as "en" | "th"] ?? enUS;

  async function onSaveDraft(d: ProjectDraft) {
    try {
      const res = await createProject({
        ...d,
        images: d.images ?? [],
        publish: false,
      });

      clear();

      showToast(
        t("project.saveDraftSuccess") ||
          "Draft saved successfully",
        "success"
      );

      navigate(`/app/projects/${res.data.id}`);
    } catch (error) {
      showToast(
        t("project.saveDraftError") ||
          "Failed to save draft",
        "error"
      );
    }
  }

  async function onPublish(d: ProjectDraft) {
    try {
      const res = await createProject({
        ...d,
        images: d.images ?? [],
        publish: true,
      });

      clear();

      showToast(
        t("project.publishSuccess") ||
          "Project published successfully",
        "success"
      );

      navigate(`/app/projects/${res.data.id}`);
    } catch (error) {
      showToast(
        t("project.publishError") ||
          "Failed to publish project",
        "error"
      );
    }
  }

  return (
    <CreateProjectLayout step={2}>
      <div className="space-y-8">
        <h2 className="text-lg font-semibold text-text-primary">
          {t("project.createPage.step.review")}
        </h2>

        <div className="space-y-4 rounded-xl border border-border bg-[rgb(var(--input))] p-6">
          <ReviewRow
            label={t("project.createPage.form.title")}
            value={draft.title}
          />

          <ReviewRow
            label={t("project.createPage.form.category")}
            value={draft.category_label}
          />

          {/* Deadline Date */}
          <ReviewRow
            label={t("project.createPage.form.deadlineDate")}
            value={
              draft.deadline_date
                ? format(
                    new Date(draft.deadline_date),
                    "d MMM yyyy",
                    { locale }
                  )
                : t("common.notSpecified")
            }
          />

          <div className="border-b border-border pb-3">
            <span className="text-sm text-text-muted">
              {t("project.createPage.form.scope")}
            </span>
            <div className="mt-2 text-sm text-text-primary leading-relaxed max-h-48 overflow-y-auto whitespace-pre-line">
              {draft.description ||
                t("common.notSpecified")}
            </div>
          </div>

          {/* Images preview */}
          {draft.images && draft.images.length > 0 && (
            <div className="border-b border-border pb-3">
              <span className="text-sm text-text-muted block mb-2">
                รูปภาพ ({draft.images.length} ภาพ)
              </span>
              <div className="flex gap-2 flex-wrap">
                {draft.images.map((url, i) => (
                  <div key={i} className="relative">
                    <img
                      src={url}
                      alt={`preview-${i}`}
                      className="w-20 h-20 object-cover rounded-lg border border-border"
                    />
                    {i === 0 && (
                      <span className="absolute top-1 left-1 text-[9px] font-bold bg-accent text-white px-1.5 py-0.5 rounded-full leading-none">
                        Cover
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-between">
            <span className="text-sm text-text-muted">
              {t("project.createPage.form.budget")}
            </span>
            <span className="text-sm font-medium text-text-primary">
              {draft.budget.toLocaleString()}{" "}
              {draft.currency}
            </span>
          </div>
        </div>

        <div className="flex justify-between pt-4">
          <Button
            variant="secondary"
            size="md"
            onClick={() =>
              navigate("/app/projects/create", {
                state: { fromReview: true },
              })
            }
          >
            {t("project.createPage.action.back")}
          </Button>

          <div className="flex gap-3">
            <Button
              variant="secondary"
              size="md"
              onClick={() => onSaveDraft(draft)}
            >
              {t("project.createPage.action.saveDraft")}
            </Button>

            <Button
              variant="primary"
              size="md"
              onClick={() => onPublish(draft)}
            >
              {t("project.createPage.action.publish")}
            </Button>
          </div>
        </div>
      </div>
    </CreateProjectLayout>
  );
}
