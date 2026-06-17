import { useEffect, useState } from "react";
import {
  useNavigate,
  useLocation,
  useParams,
} from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ArrowRight,
  Save,
  Briefcase,
  FileText,
  DollarSign,
  ImageIcon,
  Tag,
} from "lucide-react";

import CreateProjectLayout from "@/components/projects/CreateProjectLayout";
import FormField from "@/components/projects/FormField";
import Dropdown from "@/components/ui/Dropdown";
import MultiSelectDropdown from "@/components/ui/MultiSelectDropdown";
import RichTextEditor from "@/components/ui/RichTextEditor";
import ImageUploader, { type ImageItem } from "@/components/ui/ImageUploader";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import DeadlineDatePicker from "@/components/ui/DeadlineDatePicker";
import { useToast } from "@/components/ui/Toast";

import { useProjectDraft } from "@/features/projects/useProjectDraft";
import {
  fetchCategories,
  fetchProject,
  updateProject,
  uploadProjectImage,
} from "@/services/projects/project";
import type { Project } from "@/services/projects/project.types";

type Option = { value: string; label: string };
type Mode = "create" | "edit";

// ───── Section wrapper ─────────────────────────────────────────────────────
function Section({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] items-start gap-6 py-7 border-b border-border last:border-0">
      <div className="space-y-0.5">
        <div className="flex items-start gap-2 text-foreground font-semibold text-sm leading-5">
          <span className="text-primary">{icon}</span>
          {title}
        </div>
        {description && (
          <p className="pl-6 text-xs text-text-muted leading-relaxed">{description}</p>
        )}
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
export default function CreateProjectPage({
  mode = "create",
}: {
  mode?: Mode;
}) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams<{ id: string }>();
  const { save, load, clear } = useProjectDraft();
  const { showToast } = useToast();

  const isEdit = mode === "edit";
  const fromReview = location.state?.fromReview === true;

  const [form, setForm] = useState({
    title: "",
    description: "", // HTML
    budget: "",
    currency: "THB",
    deadline_date: "",
    category_codes: [] as string[],
    category_code: "",
    category_label: "",
  });

  const [images, setImages] = useState<ImageItem[]>([]);
  const [categories, setCategories] = useState<Option[]>([]);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);

  const currencies: Option[] = [
    { value: "USD", label: "USD" },
    { value: "THB", label: "THB" },
  ];

  useEffect(() => {
    const lang = i18n.language === "th" ? "th" : "en";
    fetchCategories(lang).then((res) =>
      setCategories(res.data.map((c) => ({ value: c.code, label: c.name })))
    );
  }, [i18n.language]);

  useEffect(() => {
    if (isEdit && id) {
      fetchProject(id).then((res) => {
        const p: Project = res.data;
        const category = p.categories?.[0];
        setForm({
          title: p.title,
          description: p.description ?? "",
          budget: String(p.budget),
          currency: p.currency,
          deadline_date: p.deadline_date ?? "",
          category_codes: category?.code ? [category.code] : [],
          category_code: category?.code ?? "",
          category_label: category?.label ?? "",
        });
        setLoading(false);
      });
      return;
    }

    if (!fromReview) { clear(); return; }

    const draft = load();
    if (draft) {
      setForm({
        title: draft.title,
        description: draft.description ?? "",
        budget: String(draft.budget),
        currency: draft.currency,
        deadline_date: draft.deadline_date ?? "",
        category_codes: draft.category_codes ?? (draft.category_code ? [draft.category_code] : []),
        category_code: draft.category_code,
        category_label: draft.category_label,
      });
    }
  }, []);

  useEffect(() => {
    if (isEdit || !form.title) return;
    save({
      title: form.title,
      description: form.description || undefined,
      budget: Number(form.budget || 0),
      currency: form.currency,
      deadline_date: form.deadline_date || undefined,
      category_code: form.category_code,
      category_label: form.category_label,
      category_codes: form.category_codes,
    });
  }, [form]);

  const handleCategoryChange = (values: string[], primaryLabel: string) => {
    const primaryCode = values.find((v) => !v.startsWith("other:")) ?? values[0] ?? "";
    setForm((prev) => ({
      ...prev,
      category_codes: values,
      category_code: primaryCode,
      category_label: primaryLabel,
    }));
  };

  const canContinue =
    form.title &&
    form.category_codes.length > 0 &&
    form.currency &&
    Number(form.budget) > 0;

  const handleSaveEdit = async () => {
    if (!id || saving) return;
    try {
      setSaving(true);
      await updateProject(id, {
        title: form.title,
        description: form.description || undefined,
        budget: Number(form.budget),
        currency: form.currency,
        deadline_date: form.deadline_date || undefined,
        category_code: form.category_code,
      });
      showToast(t("project.saveDraftSuccess"), "success");
      navigate(`/app/projects/${id}`);
    } catch {
      showToast(t("project.saveDraftError"), "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return null;

  return (
    <CreateProjectLayout step={1} mode={mode}>
      {/* Page intro */}
      <div className="mb-2 pb-6 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
            <Briefcase className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground">
              {isEdit
                ? t("project.createPage.intro.editTitle")
                : t("project.createPage.intro.createTitle")}
            </h2>
            <p className="text-xs text-text-muted mt-0.5">
              {t("project.createPage.intro.subtitle")}
            </p>
          </div>
        </div>
      </div>

      {/* ── Title ── */}
      <Section
        icon={<FileText className="w-4 h-4" />}
        title={t("project.createPage.sections.title.title")}
        description={t("project.createPage.sections.title.description")}
      >
        <FormField label={t("project.createPage.form.title")} required>
          <Input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder={t("project.createPage.form.titlePlaceholder")}
            className="h-12 w-full text-base"
          />
        </FormField>
      </Section>

      {/* ── Category ── */}
      <Section
        icon={<Tag className="w-4 h-4" />}
        title={t("project.createPage.sections.category.title")}
        description={t("project.createPage.sections.category.description")}
      >
        <FormField label={t("project.createPage.form.category")} required>
          <MultiSelectDropdown
            values={form.category_codes}
            options={categories}
            placeholder={t("project.createPage.form.categoryPlaceholder")}
            onChange={handleCategoryChange}
            className="w-full"
          />
        </FormField>
      </Section>

      {/* ── Description / Rich Text ── */}
      <Section
        icon={<FileText className="w-4 h-4" />}
        title={t("project.createPage.sections.description.title")}
        description={t("project.createPage.sections.description.description")}
      >
        <RichTextEditor
          value={form.description}
          onChange={(html) => setForm({ ...form, description: html })}
          placeholder={t("project.createPage.form.scopePlaceholder")}
        />
      </Section>

      {/* ── Images ── */}
      <Section
        icon={<ImageIcon className="w-4 h-4" />}
        title={t("project.createPage.sections.images.title")}
        description={t("project.createPage.sections.images.description")}
      >
        <div className="flex items-start gap-1.5 text-xs text-text-muted bg-accent/5 border border-accent/20 rounded-lg px-3 py-2 mb-3">
          <ImageIcon className="w-3.5 h-3.5 mt-0.5 shrink-0 text-primary" />
          <span>
            <span className="font-semibold text-primary">
              {t("project.createPage.sections.images.coverTipStrong")}
            </span>{" "}
            {t("project.createPage.sections.images.coverTip")}
          </span>
        </div>
        <ImageUploader images={images} onChange={setImages} maxFiles={5} />
      </Section>

      {/* ── Budget + Deadline ── */}
      <Section
        icon={<DollarSign className="w-4 h-4" />}
        title={t("project.createPage.sections.budget.title")}
        description={t("project.createPage.sections.budget.description")}
      >
        <FormField label={t("project.createPage.form.budget")} required>
          <div className="flex gap-3 flex-col sm:flex-row">
            <Input
              type="number"
              value={form.budget}
              onChange={(e) => setForm({ ...form, budget: e.target.value })}
              placeholder={t("project.createPage.form.budgetPlaceholder")}
              className="h-12 flex-1"
            />
            <div className="w-full sm:w-32">
              <Dropdown
                value={form.currency}
                onChange={(v) => setForm({ ...form, currency: v })}
                options={currencies}
                placeholder={t("project.createPage.form.currency")}
                className="w-full"
              />
            </div>
          </div>
        </FormField>

        <FormField label={t("project.createPage.form.deadlineDate")}>
          <DeadlineDatePicker
            value={form.deadline_date}
            onChange={(date) => setForm({ ...form, deadline_date: date ?? "" })}
          />
        </FormField>
      </Section>

      {/* ── Actions ── */}
      <div className="pt-4 flex items-center justify-between">
        <p className="text-xs text-text-muted">
          {!isEdit && t("project.createPage.autosave")}
        </p>
        <Button
          disabled={!canContinue || saving}
          onClick={async () => {
            if (isEdit) {
              handleSaveEdit();
            } else {
              setSaving(true);
              try {
                const imageUrls = images.length > 0
                  ? await Promise.all(images.map((img) => uploadProjectImage(img.file)))
                  : [];
                save({
                  title: form.title,
                  description: form.description || undefined,
                  images: imageUrls,
                  budget: Number(form.budget || 0),
                  currency: form.currency,
                  deadline_date: form.deadline_date || undefined,
                  category_code: form.category_code,
                  category_label: form.category_label,
                  category_codes: form.category_codes,
                });
                navigate("review");
              } catch {
                showToast(t("project.createPage.imageUploadError"), "error");
              } finally {
                setSaving(false);
              }
            }
          }}
          isLoading={saving}
          className="h-12 px-8 font-semibold"
        >
          {isEdit ? (
            <>{t("common.save")}<Save className="ml-2 h-4 w-4" /></>
          ) : (
            <>{t("project.createPage.action.next")}<ArrowRight className="ml-2 h-4 w-4" /></>
          )}
        </Button>
      </div>
    </CreateProjectLayout>
  );
}
