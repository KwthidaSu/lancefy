import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  Briefcase,
  CalendarDays,
  DollarSign,
  FileText,
  ImageIcon,
  Search,
  Send,
  Sparkles,
  Tag,
} from "lucide-react";

import { Calendar } from "@/components/ui/Calendar";
import ImageUploader, { type ImageItem } from "@/components/ui/ImageUploader";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/Popover";
import { useToast } from "@/components/ui/Toast";
import { createJob } from "@/services/jobs.service";
import { uploadProjectImage } from "@/services/projects/project";
import {
  listCategories,
  searchSkills,
  type CategoryResponse,
  type SkillResponse,
  type SubcategoryResponse,
} from "@/services/skills.service";
import { cn } from "@/utils/cn";

type JobType = "hire" | "service";

const PAGE_TYPE = {
  pageTitle:
    "text-[2.35rem] font-bold tracking-tight text-text-primary md:text-[2.6rem]",
  pageSubtitle: "text-base font-medium leading-7 text-text-secondary",
  sectionTitle: "text-lg font-semibold tracking-tight text-text-primary",
  sectionDescription: "text-sm leading-6 text-text-secondary",
  label: "text-sm font-semibold text-text-primary",
  meta: "text-xs font-medium text-text-muted",
  micro:
    "text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-text-muted",
};

const inputClass =
  "h-12 w-full rounded-[16px] border border-slate-200 bg-white px-4 text-sm font-medium text-text-primary shadow-[0_10px_24px_rgba(15,23,42,0.04)] outline-none transition placeholder:text-text-muted focus:border-blue-300 focus:ring-4 focus:ring-blue-100";

const textareaClass =
  "min-h-[150px] w-full resize-none rounded-[16px] border border-slate-200 bg-white px-4 py-3 text-sm font-medium leading-7 text-text-primary shadow-[0_10px_24px_rgba(15,23,42,0.04)] outline-none transition placeholder:text-text-muted focus:border-blue-300 focus:ring-4 focus:ring-blue-100";

function formatIsoDate(iso?: string): string {
  if (!iso) return "";

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return "";

  const [, yyyy, mm, dd] = match;
  return `${dd}/${mm}/${yyyy}`;
}

function parseIsoDate(iso?: string): Date | undefined {
  if (!iso) return undefined;

  const date = new Date(`${iso}T00:00:00`);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function toIsoDate(date: Date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");

  return `${yyyy}-${mm}-${dd}`;
}

export default function CreateJobPage() {
  const navigate = useNavigate();
  const { t } = useTranslation("common");
  const { showToast } = useToast();

  const submitLockRef = useRef(false);

  const [categories, setCategories] = useState<CategoryResponse[]>([]);
  const [categoryId, setCategoryId] = useState("");
  const [subcategoryId, setSubcategoryId] = useState("");

  const [skillSearch, setSkillSearch] = useState("");
  const [skillResults, setSkillResults] = useState<SkillResponse[]>([]);
  const [selectedSkills, setSelectedSkills] = useState<SkillResponse[]>([]);

  const [customTags, setCustomTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [images, setImages] = useState<ImageItem[]>([]);

  const [jobType, setJobType] = useState<JobType>("hire");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [budget, setBudget] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    listCategories()
      .then((res) => setCategories(res.data))
      .catch(() => undefined);
  }, []);

  const selectedCategory = useMemo(
    () => categories.find((category) => category.id === categoryId),
    [categories, categoryId],
  );

  const subcategoryOptions: SubcategoryResponse[] =
    selectedCategory?.subcategories ?? [];

  const selectedSubcategory = useMemo(
    () => subcategoryOptions.find((subcategory) => subcategory.id === subcategoryId),
    [subcategoryOptions, subcategoryId],
  );

  useEffect(() => {
    if (!skillSearch.trim()) return;

    const timer = window.setTimeout(() => {
      searchSkills(skillSearch, 10)
        .then((res) => setSkillResults(res.data))
        .catch(() => undefined);
    }, 300);

    return () => window.clearTimeout(timer);
  }, [skillSearch]);

  const completion = useMemo(() => {
    const checks = [
      Boolean(title.trim()),
      Boolean(description.trim()),
      Boolean(budget && Number(budget) > 0),
      Boolean(categoryId),
      selectedSkills.length > 0 || customTags.length > 0,
      Boolean(deliveryDate),
    ];

    const completed = checks.filter(Boolean).length;
    return Math.round((completed / checks.length) * 100);
  }, [
    budget,
    categoryId,
    customTags.length,
    deliveryDate,
    description,
    selectedSkills.length,
    title,
  ]);

  const addSkill = (skill: SkillResponse) => {
    if (selectedSkills.some((selected) => selected.id === skill.id)) return;

    setSelectedSkills((prev) => [...prev, skill]);
    setSkillSearch("");

    searchSkills("", 20)
      .then((res) => setSkillResults(res.data))
      .catch(() => undefined);
  };

  const removeSkill = (skillId: string) => {
    setSelectedSkills((prev) => prev.filter((skill) => skill.id !== skillId));
  };

  const addTag = (tag: string) => {
    const trimmed = tag.trim();
    if (!trimmed) return;
    if (customTags.includes(trimmed)) return;

    const matchesKnownSkill = skillResults.some(
      (skill) => skill.name.toLowerCase() === trimmed.toLowerCase(),
    );

    if (matchesKnownSkill) return;

    setCustomTags((prev) => [...prev, trimmed]);
    setTagInput("");
  };

  const removeTag = (tag: string) => {
    setCustomTags((prev) => prev.filter((item) => item !== tag));
  };

  const handleSkillFocus = () => {
    if (skillSearch.trim()) return;

    searchSkills("", 20)
      .then((res) => setSkillResults(res.data))
      .catch(() => undefined);
  };

  const handleSkillBlur = () => {
    window.setTimeout(() => setSkillResults([]), 150);
  };

  const handleTagKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      addTag(tagInput);
      return;
    }

    if (event.key === "Backspace" && !tagInput && customTags.length > 0) {
      setCustomTags((prev) => prev.slice(0, -1));
    }
  };

  const handleCategoryChange = (nextCategoryId: string) => {
    setCategoryId(nextCategoryId);
    setSubcategoryId("");
  };

  const handleSubmit = async (event: React.FormEvent, publish = false) => {
    event.preventDefault();

    if (submitLockRef.current || submitting) return;

    if (!title.trim()) {
      showToast(t("jobs.createPage.toast.titleRequired"), "error");
      return;
    }

    try {
      submitLockRef.current = true;
      setSubmitting(true);

      const uploadedImageUrls =
        images.length > 0
          ? await Promise.all(images.map((image) => uploadProjectImage(image.file)))
          : [];

      await createJob({
        job_type: jobType,
        title: title.trim(),
        description: description.trim() || undefined,
        budget: budget ? parseFloat(budget) : undefined,
        category_id: categoryId || undefined,
        subcategory_id: subcategoryId || undefined,
        skill_ids: selectedSkills.map((skill) => skill.id),
        tags: customTags.length > 0 ? customTags : undefined,
        images: uploadedImageUrls.length > 0 ? uploadedImageUrls : undefined,
        delivery_date: deliveryDate || undefined,
        expires_at: expiresAt ? new Date(expiresAt).toISOString() : undefined,
      });

      showToast(
        publish
          ? t("jobs.createPage.toast.publishSuccess")
          : t("jobs.createPage.toast.draftSuccess"),
        "success",
      );

      navigate("/app/projects");
    } catch (error: unknown) {
      const detail = (error as { response?: { data?: { detail?: string } } })
        ?.response?.data?.detail;

      showToast(detail ?? t("jobs.createPage.toast.error"), "error");
    } finally {
      submitLockRef.current = false;
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-full w-full overflow-x-hidden bg-[linear-gradient(180deg,#f8fbff_0%,#f5f8fc_100%)]">
      <div className="relative w-full overflow-hidden px-8 pb-10 pt-10 sm:px-8 xl:px-10 xl:pt-12 2xl:px-12">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-[radial-gradient(circle_at_top_right,rgba(96,165,250,0.10),transparent_24%),radial-gradient(circle_at_20%_0%,rgba(255,255,255,0.96),transparent_32%)]" />

        <div className="relative space-y-7">
          <Breadcrumb />

          <PageHero completion={completion} />

          <form
            onSubmit={(event) => handleSubmit(event, true)}
            className="overflow-hidden rounded-[28px] border border-slate-200/80 bg-white shadow-[0_18px_40px_rgba(15,23,42,0.06)]"
          >
            <div className="px-6 py-2 sm:px-8">
              <JobSection
                icon={<Sparkles className="h-5 w-5" />}
                title={t("jobs.createPage.sections.postType.title")}
                description={t("jobs.createPage.sections.postType.description")}
              >
                <JobTypeSelector value={jobType} onChange={setJobType} t={t} />
              </JobSection>

              <JobSection
                icon={<FileText className="h-5 w-5" />}
                title={t("jobs.createPage.sections.details.title")}
                description={t("jobs.createPage.sections.details.description")}
              >
                <div className="space-y-5">
                  <FieldLabel label={t("jobs.createPage.fields.title")} required>
                    <input
                      required
                      value={title}
                      onChange={(event) => setTitle(event.target.value)}
                      placeholder={t("jobs.createPage.fields.titlePlaceholder")}
                      className={inputClass}
                    />
                  </FieldLabel>

                  <FieldLabel label={t("jobs.createPage.fields.description")}>
                    <textarea
                      rows={6}
                      value={description}
                      onChange={(event) => setDescription(event.target.value)}
                      placeholder={t("jobs.createPage.fields.descriptionPlaceholder")}
                      className={textareaClass}
                    />
                  </FieldLabel>
                </div>
              </JobSection>

              <JobSection
                icon={<DollarSign className="h-5 w-5" />}
                title={t("jobs.createPage.sections.budget.title")}
                description={t("jobs.createPage.sections.budget.description")}
              >
                <FieldLabel label={t("jobs.createPage.fields.budget")}>
                  <input
                    type="number"
                    min="0"
                    value={budget}
                    onChange={(event) => setBudget(event.target.value)}
                    placeholder={t("jobs.createPage.fields.budgetPlaceholder")}
                    className={inputClass}
                  />
                </FieldLabel>
              </JobSection>

              <JobSection
                icon={<ImageIcon className="h-5 w-5" />}
                title={t("jobs.createPage.sections.images.title")}
                description={t("jobs.createPage.sections.images.description")}
              >
                <div className="mb-4 flex items-start gap-2 rounded-[18px] border border-blue-100 bg-blue-50/70 px-4 py-3 text-sm text-blue-700">
                  <ImageIcon className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>
                    <span className="font-semibold">
                      {t("jobs.createPage.sections.images.coverTipStrong")}
                    </span>{" "}
                    {t("jobs.createPage.sections.images.coverTip")}
                  </span>
                </div>

                <div className="rounded-[20px] border border-slate-200/80 bg-white p-4 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
                  <ImageUploader images={images} onChange={setImages} maxFiles={5} />
                </div>
              </JobSection>

              <JobSection
                icon={<Tag className="h-5 w-5" />}
                title={t("jobs.createPage.sections.categorySkills.title")}
                description={t("jobs.createPage.sections.categorySkills.description")}
              >
                <div className="space-y-5">
                  <div className="grid gap-5 lg:grid-cols-2">
                    <FieldLabel label={t("jobs.createPage.fields.category")}>
                      <select
                        value={categoryId}
                        onChange={(event) => handleCategoryChange(event.target.value)}
                        className={cn(inputClass, "cursor-pointer")}
                      >
                        <option value="">
                          {t("jobs.createPage.fields.categoryPlaceholder")}
                        </option>
                        {categories.map((category) => (
                          <option key={category.id} value={category.id}>
                            {category.name}
                          </option>
                        ))}
                      </select>
                    </FieldLabel>

                    {subcategoryOptions.length > 0 ? (
                      <FieldLabel label="หมวดย่อย">
                        <select
                          value={subcategoryId}
                          onChange={(event) => setSubcategoryId(event.target.value)}
                          className={cn(inputClass, "cursor-pointer")}
                        >
                          <option value="">เลือกหมวดย่อย (ไม่บังคับ)</option>
                          {subcategoryOptions.map((subcategory) => (
                            <option key={subcategory.id} value={subcategory.id}>
                              {subcategory.name}
                            </option>
                          ))}
                        </select>
                      </FieldLabel>
                    ) : null}
                  </div>

                  <SkillsPicker
                    selectedSubcategory={selectedSubcategory}
                    skillSearch={skillSearch}
                    skillResults={skillResults}
                    selectedSkills={selectedSkills}
                    onSkillSearchChange={setSkillSearch}
                    onSkillFocus={handleSkillFocus}
                    onSkillBlur={handleSkillBlur}
                    onAddSkill={addSkill}
                    onRemoveSkill={removeSkill}
                  />

                  <SelectedSkillList
                    selectedSkills={selectedSkills}
                    onRemoveSkill={removeSkill}
                  />

                  <CustomTagInput
                    tags={customTags}
                    value={tagInput}
                    onChange={setTagInput}
                    onAddTag={addTag}
                    onRemoveTag={removeTag}
                    onKeyDown={handleTagKeyDown}
                  />
                </div>
              </JobSection>

              <JobSection
                icon={<CalendarDays className="h-5 w-5" />}
                title={t("jobs.createPage.sections.timeline.title")}
                description={t("jobs.createPage.sections.timeline.description")}
              >
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <FieldLabel label={t("jobs.createPage.fields.deliveryDate")}>
                    <DatePickerInput
                      value={deliveryDate}
                      onChange={(next) => setDeliveryDate(next ?? "")}
                      placeholder={t("jobs.createPage.fields.datePlaceholder")}
                      openCalendarLabel={t("jobs.createPage.fields.openCalendar")}
                    />
                  </FieldLabel>

                  <FieldLabel label={t("jobs.createPage.fields.expiresAt")}>
                    <DatePickerInput
                      value={expiresAt}
                      onChange={(next) => setExpiresAt(next ?? "")}
                      placeholder={t("jobs.createPage.fields.datePlaceholder")}
                      openCalendarLabel={t("jobs.createPage.fields.openCalendar")}
                    />

                    {!expiresAt ? (
                      <p className="mt-2 rounded-[14px] border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700">
                        ⚠️ ถ้าไม่กำหนดวันหมดอายุ ระบบจะตั้งค่าให้อัตโนมัติ 30
                        วันนับจากวันโพส
                      </p>
                    ) : null}
                  </FieldLabel>
                </div>
              </JobSection>
            </div>

            <div className="sticky bottom-0 z-20 border-t border-slate-100 bg-white/92 px-6 py-5 backdrop-blur-xl sm:px-8">
              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={(event) => handleSubmit(event, false)}
                  className="inline-flex h-12 w-full items-center justify-center rounded-[14px] border border-slate-200 bg-white px-5 text-sm font-semibold text-text-secondary transition hover:bg-slate-50 hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                >
                  {t("jobs.createPage.actions.saveDraft")}
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-[14px] bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-[0_14px_28px_rgba(37,99,235,0.22)] transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                >
                  {submitting
                    ? t("jobs.createPage.actions.saving")
                    : t("jobs.createPage.actions.publishNow")}
                  {!submitting ? <Send className="h-4 w-4" /> : null}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function Breadcrumb() {
  const { t } = useTranslation("common");

  return (
    <div className="flex items-center gap-2 text-sm">
      <Link
        to="/app/projects"
        className="inline-flex items-center gap-1 font-semibold text-text-secondary transition hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("dashboard.projects")}
      </Link>
      <span className="text-text-muted">›</span>
      <span className="font-semibold text-text-primary">
        {t("jobs.createPage.pageTitle")}
      </span>
    </div>
  );
}

function PageHero({ completion }: { completion: number }) {
  const { t } = useTranslation("common");

  return (
    <section className="relative overflow-hidden rounded-[28px] border border-slate-200/80 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] px-6 py-7 shadow-[0_18px_40px_rgba(15,23,42,0.06)] sm:px-8">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[300px] bg-[radial-gradient(circle_at_top_right,rgba(96,165,250,0.12),transparent_28%),radial-gradient(circle_at_18%_0%,rgba(255,255,255,0.98),transparent_34%)]" />

      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="mb-4 inline-flex items-center rounded-full border border-blue-100 bg-blue-50/80 px-3.5 py-1.5 text-xs font-semibold text-primary shadow-[0_10px_24px_rgba(37,99,235,0.05)]">
            Job Builder
          </div>

          <h1 className={PAGE_TYPE.pageTitle}>
            {t("jobs.createPage.pageTitle")}
          </h1>

          <p className={cn("mt-2 max-w-3xl", PAGE_TYPE.pageSubtitle)}>
            {t("jobs.createPage.pageSubtitle")}
          </p>
        </div>

        <ProgressCard completion={completion} />
      </div>
    </section>
  );
}

function ProgressCard({ completion }: { completion: number }) {
  return (
    <div className="w-full max-w-sm rounded-[24px] border border-slate-200/80 bg-white/86 p-5 shadow-[0_18px_40px_rgba(15,23,42,0.06)] backdrop-blur">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className={PAGE_TYPE.micro}>Progress</p>
          <p className="mt-2 text-2xl font-bold text-text-primary">
            {completion}%
          </p>
        </div>

        <div className="flex h-12 w-12 items-center justify-center rounded-[16px] bg-blue-50 text-primary">
          <Briefcase className="h-6 w-6" />
        </div>
      </div>

      <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-[linear-gradient(90deg,#3b82f6,#1d4ed8)] transition-all duration-300"
          style={{ width: `${completion}%` }}
        />
      </div>

      <p className="mt-3 text-xs font-medium text-text-muted">
        Fill in the details to publish or save this job.
      </p>
    </div>
  );
}

function JobSection({
  icon,
  title,
  description,
  children,
}: {
  icon: ReactNode;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="grid grid-cols-1 gap-5 border-b border-slate-100 py-7 last:border-0 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-8">
      <div className="lg:sticky lg:top-6 lg:self-start">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[16px] bg-blue-50 text-primary shadow-sm">
            {icon}
          </div>

          <div className="min-w-0">
            <h3 className={PAGE_TYPE.sectionTitle}>{title}</h3>
            {description ? (
              <p className={cn("mt-1", PAGE_TYPE.sectionDescription)}>
                {description}
              </p>
            ) : null}
          </div>
        </div>
      </div>

      <div className="min-w-0 space-y-5">{children}</div>
    </section>
  );
}

function FieldLabel({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-2">
      <span className={PAGE_TYPE.label}>
        {label}
        {required ? <span className="text-rose-500"> *</span> : null}
      </span>
      {children}
    </label>
  );
}

function JobTypeSelector({
  value,
  onChange,
  t,
}: {
  value: JobType;
  onChange: (value: JobType) => void;
  t: (key: string) => string;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {(["hire", "service"] as const).map((option) => {
        const active = value === option;

        return (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            className={cn(
              "rounded-[20px] border px-5 py-4 text-left transition",
              active
                ? "border-primary bg-blue-50/80 shadow-[0_10px_24px_rgba(37,99,235,0.08)]"
                : "border-slate-200 bg-white hover:border-blue-200 hover:bg-slate-50",
            )}
          >
            <p
              className={cn(
                "text-sm font-semibold",
                active ? "text-primary" : "text-text-primary",
              )}
            >
              {option === "hire"
                ? t("jobs.createPage.jobType.hire")
                : t("jobs.createPage.jobType.service")}
            </p>

            <p className="mt-1 text-xs leading-5 text-text-muted">
              {option === "hire"
                ? t("jobs.createPage.jobType.hireHint")
                : t("jobs.createPage.jobType.serviceHint")}
            </p>
          </button>
        );
      })}
    </div>
  );
}

function SkillsPicker({
  selectedSubcategory,
  skillSearch,
  skillResults,
  selectedSkills,
  onSkillSearchChange,
  onSkillFocus,
  onSkillBlur,
  onAddSkill,
  onRemoveSkill,
}: {
  selectedSubcategory?: SubcategoryResponse;
  skillSearch: string;
  skillResults: SkillResponse[];
  selectedSkills: SkillResponse[];
  onSkillSearchChange: (value: string) => void;
  onSkillFocus: () => void;
  onSkillBlur: () => void;
  onAddSkill: (skill: SkillResponse) => void;
  onRemoveSkill: (skillId: string) => void;
}) {
  if (selectedSubcategory && selectedSubcategory.skills.length > 0) {
    return (
      <div className="space-y-3">
        <p className="text-xs font-medium text-text-muted">
          ทักษะในหมวด{" "}
          <span className="font-semibold text-text-primary">
            {selectedSubcategory.name}
          </span>{" "}
          — คลิกเพื่อเลือก/ยกเลิก
        </p>

        <div className="flex flex-wrap gap-2">
          {selectedSubcategory.skills.map((skill) => {
            const selected = selectedSkills.some((item) => item.id === skill.id);

            return (
              <button
                key={skill.id}
                type="button"
                onClick={() =>
                  selected ? onRemoveSkill(skill.id) : onAddSkill(skill)
                }
                className={cn(
                  "inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-semibold transition",
                  selected
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-slate-200 bg-white text-text-secondary hover:border-primary hover:text-primary",
                )}
              >
                {selected ? <span className="text-[10px]">✓</span> : null}
                {skill.name}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <FieldLabel label="Skills">
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <input
            value={skillSearch}
            onChange={(event) => onSkillSearchChange(event.target.value)}
            onFocus={onSkillFocus}
            onBlur={onSkillBlur}
            placeholder="ค้นหาทักษะ เช่น React, Figma..."
            className={cn(inputClass, "pl-11")}
          />

          {skillResults.length > 0 ? (
            <div className="absolute z-30 mt-2 max-h-56 w-full overflow-y-auto rounded-[18px] border border-slate-200/80 bg-white py-1 shadow-[0_18px_40px_rgba(15,23,42,0.14)]">
              {!skillSearch.trim() ? (
                <div className="border-b border-slate-100 px-4 py-2 text-[11px] font-semibold text-text-muted">
                  ทักษะยอดนิยม
                </div>
              ) : null}

              {skillResults.map((skill) => {
                const selected = selectedSkills.some(
                  (item) => item.id === skill.id,
                );

                return (
                  <button
                    key={skill.id}
                    type="button"
                    onMouseDown={(event) => {
                      event.preventDefault();
                      onAddSkill(skill);
                    }}
                    className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm font-medium text-text-secondary transition hover:bg-slate-50 hover:text-text-primary"
                  >
                    <span>{skill.name}</span>
                    {selected ? (
                      <span className="text-xs font-semibold text-primary">✓</span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>
      </FieldLabel>
    </div>
  );
}

function SelectedSkillList({
  selectedSkills,
  onRemoveSkill,
}: {
  selectedSkills: SkillResponse[];
  onRemoveSkill: (skillId: string) => void;
}) {
  if (selectedSkills.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {selectedSkills.map((skill) => (
        <span
          key={skill.id}
          className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-primary"
        >
          {skill.name}
          <button
            type="button"
            onClick={() => onRemoveSkill(skill.id)}
            className="ml-0.5 rounded-full text-primary transition hover:text-rose-500"
          >
            ×
          </button>
        </span>
      ))}
    </div>
  );
}

function CustomTagInput({
  tags,
  value,
  onChange,
  onAddTag,
  onRemoveTag,
  onKeyDown,
}: {
  tags: string[];
  value: string;
  onChange: (value: string) => void;
  onAddTag: (tag: string) => void;
  onRemoveTag: (tag: string) => void;
  onKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => void;
}) {
  return (
    <div className="space-y-2 pt-1">
      <label className="text-xs font-semibold text-text-muted">
        ทักษะเพิ่มเติม (tag อิสระ) — กด Enter หรือ , เพื่อเพิ่ม
      </label>

      <div
        className={cn(
          "flex min-h-[52px] flex-wrap gap-2 rounded-[16px] border border-slate-200 bg-white px-3 py-2 text-sm shadow-[0_10px_24px_rgba(15,23,42,0.04)] transition focus-within:border-blue-300 focus-within:ring-4 focus-within:ring-blue-100",
          tags.length > 0 ? "items-center" : "items-start",
        )}
      >
        {tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700"
          >
            {tag}
            <button
              type="button"
              onClick={() => onRemoveTag(tag)}
              className="transition hover:text-rose-500"
            >
              ×
            </button>
          </span>
        ))}

        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={onKeyDown}
          onBlur={() => {
            if (value.trim()) onAddTag(value);
          }}
          placeholder={tags.length === 0 ? "เช่น ด่วน, remote ok, ภาษาไทย..." : ""}
          className="min-w-[140px] flex-1 bg-transparent text-sm outline-none placeholder:text-text-muted"
        />
      </div>
    </div>
  );
}

function DatePickerInput({
  value,
  onChange,
  placeholder,
  openCalendarLabel,
}: {
  value?: string;
  onChange: (next?: string) => void;
  placeholder: string;
  openCalendarLabel: string;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={openCalendarLabel}
          title={openCalendarLabel}
          className={cn(
            "flex h-12 w-full items-center justify-between gap-2 rounded-[16px] border border-slate-200 bg-white px-4 text-left text-sm font-medium shadow-[0_10px_24px_rgba(15,23,42,0.04)] transition",
            "focus:outline-none focus:ring-4 focus:ring-blue-100",
          )}
        >
          <span className={value ? "text-text-primary" : "text-text-muted"}>
            {value ? formatIsoDate(value) : placeholder}
          </span>
          <CalendarDays className="h-4 w-4 text-text-muted" />
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        className="border-none bg-transparent p-0 shadow-none"
      >
        <Calendar
          mode="single"
          selected={parseIsoDate(value)}
          onSelect={(date) => {
            if (!date) return;
            onChange(toIsoDate(date));
          }}
        />
      </PopoverContent>
    </Popover>
  );
}