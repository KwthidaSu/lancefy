import { type ChangeEvent, type FormEvent, type KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useKeycloak } from "@react-keycloak/web";
import {
  AtSign,
  Briefcase,
  Camera,
  ExternalLink,
  Eye,
  EyeOff,
  Info,
  type LucideIcon,
  Loader2,
  Lock,
  Mail,
  ShieldCheck,
  X as XIcon,
} from "lucide-react";

import type { CurrentUser } from "@/auth/auth.types";
import type { SkillResponse } from "@/services/skills.service";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { SKILL_CATEGORIES } from "@/data/skills";
import { authService } from "@/services/auth.service";
import { uploadFile } from "@/services/files.service";
import {
  getMySkills,
  getOrCreateSkill,
  searchSkills,
  setMySkills,
} from "@/services/skills.service";

type ProfileFormState = {
  displayName: string;
  firstname: string;
  lastname: string;
  phone: string;
  tagline: string;
  hourlyRate: string;
  isPublic: boolean;
};

const INITIAL_FORM: ProfileFormState = {
  displayName: "",
  firstname: "",
  lastname: "",
  phone: "",
  tagline: "",
  hourlyRate: "",
  isPublic: false,
};

const pageTitleClassName =
  "text-3xl font-semibold tracking-tight text-text-primary";
const pageSubtitleClassName = "text-sm text-text-secondary";
const sectionCardClassName =
  "rounded-[20px] border border-border bg-card px-8 py-8 shadow-[0_14px_34px_rgba(15,23,42,0.06)]";
const sectionOverlineClassName =
  "text-xs font-semibold uppercase tracking-[0.18em] text-text-muted";
const sectionHelperTextClassName = "text-sm text-text-secondary";
const fieldLabelClassName =
  "mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted";
const fieldInputClassName =
  "h-12 rounded-2xl border-border bg-input px-4 py-3 text-sm text-text-primary placeholder:text-text-subtle";

function buildInitialForm(user: CurrentUser): ProfileFormState {
  return {
    displayName: user.display_name ?? "",
    firstname: user.firstname ?? "",
    lastname: user.lastname ?? "",
    phone: user.phone ?? "",
    tagline: user.tagline ?? "",
    hourlyRate: user.hourly_rate?.toString() ?? "",
    isPublic: user.is_public ?? false,
  };
}

function normalizeForm(form: ProfileFormState) {
  return {
    displayName: form.displayName.trim(),
    firstname: form.firstname.trim(),
    lastname: form.lastname.trim(),
    phone: form.phone.trim(),
    tagline: form.tagline.trim(),
    hourlyRate: form.hourlyRate.trim(),
    isPublic: form.isPublic,
  };
}

function prettyStatus(status?: string | null) {
  if (!status) return "Active";
  const normalized = status.toLowerCase();
  if (normalized === "approved" || normalized === "verified") {
    return "Verified";
  }

  return normalized
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function AccountIdentifierCard({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-4 rounded-2xl border border-border bg-input px-5 py-5">
      <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[rgb(var(--primary)/0.12)] bg-[rgb(var(--primary)/0.08)] text-primary">
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className={sectionOverlineClassName}>{label}</p>
        <p className="mt-1 truncate text-sm font-semibold text-text-primary">{value}</p>
      </div>
    </div>
  );
}

export default function ProfileSettingsPage() {
  const navigate = useNavigate();
  const { keycloak } = useKeycloak();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [form, setForm] = useState<ProfileFormState>(INITIAL_FORM);
  const [skills, setSkills] = useState<SkillResponse[]>([]);
  const [baselineSkills, setBaselineSkills] = useState<SkillResponse[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [customSkill, setCustomSkill] = useState("");
  const [customSkillLoading, setCustomSkillLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<SkillResponse[]>([]);
  const [suggestionIndex, setSuggestionIndex] = useState(-1);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const skillInputRef = useRef<HTMLInputElement>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let isMounted = true;

    Promise.all([
      authService.getCurrentUser(),
      getMySkills().catch(() => null),
    ]).then(([currentUser, skillsResponse]) => {
      if (!isMounted) return;

      const resolvedSkills =
        skillsResponse?.data?.data ??
        (currentUser.skills as SkillResponse[] | undefined) ??
        [];

      setUser({ ...currentUser, skills: resolvedSkills });
      setForm(buildInitialForm(currentUser));
      setSkills(resolvedSkills);
      setBaselineSkills(resolvedSkills);
    });

    return () => {
      isMounted = false;
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, []);

  const isVerified = useMemo(() => {
    const normalized = user?.kyc_status?.toLowerCase();
    return normalized === "approved" || normalized === "verified";
  }, [user]);

  const statusLabel = useMemo(
    () => prettyStatus(user?.kyc_status ?? user?.status),
    [user]
  );

  const initials = useMemo(() => {
    const source =
      form.displayName ||
      [form.firstname, form.lastname].filter(Boolean).join(" ") ||
      user?.display_name ||
      [user?.firstname, user?.lastname].filter(Boolean).join(" ") ||
      user?.username ||
      "?";

    return source.trim().charAt(0).toUpperCase();
  }, [form.displayName, form.firstname, form.lastname, user]);

  const profileName = useMemo(() => {
    if (!user) return "";
    return (
      form.displayName ||
      `${form.firstname} ${form.lastname}`.trim() ||
      user.display_name ||
      `${user.firstname} ${user.lastname}`.trim() ||
      user.username
    );
  }, [form.displayName, form.firstname, form.lastname, user]);

  const isDirty = useMemo(() => {
    if (!user) return false;
    const current = normalizeForm(form);
    const baseline = normalizeForm(buildInitialForm(user));
    const currentSkillIds = [...skills].map((skill) => skill.id).sort();
    const baselineSkillIds = [...baselineSkills].map((skill) => skill.id).sort();

    return (
      JSON.stringify(current) !== JSON.stringify(baseline) ||
      JSON.stringify(currentSkillIds) !== JSON.stringify(baselineSkillIds)
    );
  }, [baselineSkills, form, skills, user]);

  const handleChange =
    <K extends keyof ProfileFormState>(key: K) =>
    (value: ProfileFormState[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
      setError(null);
      setSuccess(null);
    };

  function handleDiscard() {
    if (!user) return;
    setForm(buildInitialForm(user));
    setSkills(baselineSkills);
    setCustomSkill("");
    setSuggestions([]);
    setShowSuggestions(false);
    setSuggestionIndex(-1);
    setError(null);
    setSuccess(null);
  }

  async function handleChipToggle(name: string) {
    const existing = skills.find((skill) => skill.name.toLowerCase() === name.toLowerCase());
    if (existing) {
      setSkills((prev) => prev.filter((skill) => skill.id !== existing.id));
      return;
    }

    setCustomSkillLoading(true);
    try {
      const response = await getOrCreateSkill(name);
      const skill = response.data;
      setSkills((prev) => (prev.some((item) => item.id === skill.id) ? prev : [...prev, skill]));
    } finally {
      setCustomSkillLoading(false);
    }
  }

  function handleSkillInputChange(value: string) {
    setCustomSkill(value);
    setSuggestionIndex(-1);

    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!value.trim()) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    searchTimer.current = setTimeout(async () => {
      try {
        const response = await searchSkills(value.trim(), 8);
        const next = Array.isArray(response.data) ? response.data : [];
        setSuggestions(next.filter((skill) => !skills.some((item) => item.id === skill.id)));
        setShowSuggestions(true);
      } catch {
        setSuggestions([]);
      }
    }, 200);
  }

  async function addSkillByName(name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (skills.some((skill) => skill.name.toLowerCase() === trimmed.toLowerCase())) {
      setCustomSkill("");
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setCustomSkillLoading(true);
    try {
      const response = await getOrCreateSkill(trimmed);
      const skill = response.data;
      setSkills((prev) => (prev.some((item) => item.id === skill.id) ? prev : [...prev, skill]));
      setCustomSkill("");
      setSuggestions([]);
      setShowSuggestions(false);
      setSuggestionIndex(-1);
    } finally {
      setCustomSkillLoading(false);
    }
  }

  function selectSuggestion(skill: SkillResponse) {
    setSkills((prev) => (prev.some((item) => item.id === skill.id) ? prev : [...prev, skill]));
    setCustomSkill("");
    setSuggestions([]);
    setShowSuggestions(false);
    setSuggestionIndex(-1);
  }

  function handleSkillKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setSuggestionIndex((index) => Math.min(index + 1, suggestions.length - 1));
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setSuggestionIndex((index) => Math.max(index - 1, -1));
      return;
    }

    if (event.key === "Enter" || event.key === "," || event.key === "Tab") {
      event.preventDefault();
      if (suggestionIndex >= 0 && suggestions[suggestionIndex]) {
        selectSuggestion(suggestions[suggestionIndex]);
      } else if (customSkill.trim()) {
        addSkillByName(customSkill);
      }
      return;
    }

    if (event.key === "Escape") {
      setShowSuggestions(false);
      setSuggestionIndex(-1);
      return;
    }

    if (event.key === "Backspace" && !customSkill && skills.length > 0) {
      setSkills((prev) => prev.slice(0, -1));
    }
  }

  function removeSkill(skillId: string) {
    setSkills((prev) => prev.filter((skill) => skill.id !== skillId));
  }

  async function handleAvatarChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    setAvatarUploading(true);
    setError(null);
    setSuccess(null);

    try {
      const { data } = await uploadFile(file, "avatar", user.id);
      const updated = await authService.updateCurrentUser({ avatar_url: data.file_url });
      setUser(updated);
      setForm(buildInitialForm(updated));
      setSuccess("Profile photo updated.");
    } catch {
      setError("Failed to upload profile photo. Please try again.");
    } finally {
      setAvatarUploading(false);
      if (avatarInputRef.current) {
        avatarInputRef.current.value = "";
      }
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const [updated] = await Promise.all([
        authService.updateCurrentUser({
          display_name: form.displayName.trim() || undefined,
          firstname: form.firstname.trim(),
          lastname: form.lastname.trim(),
          phone: form.phone.trim() || undefined,
          tagline: form.tagline.trim() || undefined,
          hourly_rate: form.hourlyRate.trim() ? Number(form.hourlyRate) : undefined,
          is_public: form.isPublic,
        }),
        setMySkills(skills.map((skill) => skill.id)),
      ]);

      const mergedUser = { ...updated, skills };
      setUser(mergedUser);
      setForm(buildInitialForm(mergedUser));
      setBaselineSkills(skills);
      setSuccess("Profile settings updated.");
    } catch {
      setError("Failed to save changes. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (!user) {
    return (
      <div className="-m-6 flex min-h-screen w-auto items-center justify-center bg-background p-6">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="-m-6 min-h-screen w-auto bg-background p-6">
      <form onSubmit={handleSubmit} className="flex w-full flex-col gap-6">
        <header className="space-y-2">
          <h1 className={pageTitleClassName}>Profile Settings</h1>
          <p className={pageSubtitleClassName}>Manage your account information and security settings</p>
        </header>

        {error ? (
          <div className="rounded-2xl border border-danger/20 bg-danger/5 px-4 py-3 text-sm text-danger">
            {error}
          </div>
        ) : null}

        {success ? (
          <div className="rounded-2xl border border-success/20 bg-success/5 px-4 py-3 text-sm text-success">
            {success}
          </div>
        ) : null}

        <section className="rounded-[20px] border border-border bg-card px-6 py-6 shadow-[0_14px_34px_rgba(15,23,42,0.06)]">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-5">
              <div className="relative h-16 w-16 shrink-0">
                {user.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt="Profile avatar"
                    className="h-16 w-16 rounded-full border border-border object-cover"
                  />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-full border border-border bg-accent text-xl font-semibold text-primary">
                    {initials}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={avatarUploading}
                  className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 transition-opacity hover:opacity-100 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {avatarUploading ? (
                    <Loader2 className="h-5 w-5 animate-spin text-white" />
                  ) : (
                    <Camera className="h-5 w-5 text-white" />
                  )}
                </button>

                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
              </div>

              <div className="space-y-1">
                <h2 className="text-base font-semibold tracking-tight text-text-primary">
                  {profileName}
                </h2>
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  className="text-sm font-medium text-primary hover:text-primary-hover"
                >
                  Upload photo | JPG, PNG, WEBP
                </button>
              </div>
            </div>

            <div className="inline-flex items-center gap-2 rounded-full border border-[rgb(var(--primary)/0.14)] bg-[rgb(var(--primary)/0.08)] px-3 py-1.5 text-xs font-medium text-primary">
              <ShieldCheck className="h-4 w-4" />
              {statusLabel || (isVerified ? "Verified" : "Active")}
            </div>
          </div>
        </section>

        <section className={sectionCardClassName}>
          <div className="space-y-6">
            <h2 className={sectionOverlineClassName}>Account Identifiers</h2>

            <div className="grid gap-4 lg:grid-cols-2">
              <AccountIdentifierCard
                icon={AtSign}
                label="Username"
                value={`@${user.username}`}
              />
              <AccountIdentifierCard icon={Mail} label="Email" value={user.email} />
            </div>
          </div>
        </section>

        <section className={sectionCardClassName}>
          <div className="space-y-8">
            <div className="space-y-2">
              <h2 className={sectionOverlineClassName}>Personal Information</h2>
              <p className={sectionHelperTextClassName}>
                These details are used across your account and profile surfaces.
              </p>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <Input
                label="Display Name"
                labelClassName={fieldLabelClassName}
                className={fieldInputClassName}
                value={form.displayName}
                onChange={(event) => handleChange("displayName")(event.target.value)}
                placeholder="Display name"
              />
              <Input
                label="Phone"
                labelClassName={fieldLabelClassName}
                className={fieldInputClassName}
                value={form.phone}
                onChange={(event) => handleChange("phone")(event.target.value)}
                placeholder="Add a contact number"
              />
              <Input
                label="First Name"
                labelClassName={fieldLabelClassName}
                className={fieldInputClassName}
                value={form.firstname}
                onChange={(event) => handleChange("firstname")(event.target.value)}
                placeholder="First name"
                required
              />
              <Input
                label="Last Name"
                labelClassName={fieldLabelClassName}
                className={fieldInputClassName}
                value={form.lastname}
                onChange={(event) => handleChange("lastname")(event.target.value)}
                placeholder="Last name"
                required
              />
            </div>
          </div>
        </section>

        <section className={sectionCardClassName}>
          <div className="space-y-8">
            <div className="space-y-2">
              <h2 className={sectionOverlineClassName}>Freelancer Settings</h2>
              <p className={sectionHelperTextClassName}>
                Configure how your freelancer profile appears in Explore and across the platform.
              </p>
            </div>

            <div className={`rounded-2xl border px-5 py-5 transition-colors ${
              form.isPublic
                ? "border-[rgb(var(--primary)/0.16)] bg-[rgb(var(--primary)/0.06)]"
                : "border-border bg-input"
            }`}>
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[rgb(var(--primary)/0.12)] bg-card text-primary">
                    {form.isPublic ? (
                      <Eye className="h-5 w-5" />
                    ) : isVerified ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Lock className="h-5 w-5" />
                    )}
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-text-primary">
                      {form.isPublic ? "Public freelancer profile is visible" : "Freelancer profile is hidden"}
                    </p>
                    <p className="text-sm text-text-secondary">
                      {form.isPublic
                        ? "Clients can discover your profile from Explore Freelancers."
                        : "Turn this on when you are ready to appear in Explore Freelancers."}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (!form.isPublic && !isVerified) return;
                    handleChange("isPublic")(!form.isPublic);
                  }}
                  title={!isVerified && !form.isPublic ? "KYC verification is required before enabling public mode" : undefined}
                  className={`relative inline-flex h-7 items-center rounded-full transition-colors ${
                    form.isPublic ? "bg-primary" : "bg-border"
                  } ${!isVerified && !form.isPublic ? "cursor-not-allowed opacity-50" : ""}`}
                  style={{ minWidth: "3.25rem" }}
                >
                  <span
                    className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${
                      form.isPublic ? "translate-x-7" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>

              {!isVerified ? (
                <div className="mt-4 flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  <Lock className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>
                    Complete KYC verification before showing your freelancer profile publicly.
                    <button
                      type="button"
                      onClick={() => navigate("/app/account/verification/start")}
                      className="ml-1 font-medium underline hover:text-amber-900"
                    >
                      Verify now
                    </button>
                  </p>
                </div>
              ) : null}
            </div>

            <div className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,0.7fr)]">
              <div className="space-y-6">
                <div className="grid gap-6 lg:grid-cols-2">
                  <Input
                    label="Tagline"
                    labelClassName={fieldLabelClassName}
                    className={fieldInputClassName}
                    value={form.tagline}
                    onChange={(event) => handleChange("tagline")(event.target.value)}
                    placeholder="Full-stack developer · React + FastAPI"
                    maxLength={100}
                  />

                  <div>
                    <label className={fieldLabelClassName}>Hourly Rate</label>
                    <div className="flex h-12 items-center gap-3 rounded-2xl border border-border bg-input px-4">
                      <span className="text-sm font-semibold text-text-secondary">THB</span>
                      <input
                        type="number"
                        min="0"
                        value={form.hourlyRate}
                        onChange={(event) => handleChange("hourlyRate")(event.target.value)}
                        placeholder="500"
                        className="h-full flex-1 bg-transparent text-sm text-text-primary outline-none placeholder:text-text-subtle"
                      />
                      <span className="text-sm text-text-muted">/ hr</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className={fieldLabelClassName}>Skills</label>
                    <p className={sectionHelperTextClassName}>
                      Pick the skills clients can use to discover you.
                    </p>
                  </div>

                  <div className="space-y-4">
                    {SKILL_CATEGORIES.map((category) => (
                      <div key={category.id} className="space-y-2">
                        <p className="text-xs font-semibold text-text-secondary">
                          {category.icon} {category.label}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {category.skills.map((skillName) => {
                            const active = skills.some((skill) => skill.name.toLowerCase() === skillName.toLowerCase());
                            return (
                              <button
                                key={skillName}
                                type="button"
                                onClick={() => handleChipToggle(skillName)}
                                disabled={customSkillLoading}
                                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors disabled:opacity-60 ${
                                  active
                                    ? "border-primary bg-primary text-white"
                                    : "border-border bg-card text-text-secondary hover:border-[rgb(var(--primary)/0.28)] hover:text-primary"
                                }`}
                              >
                                {active ? "✓ " : ""}
                                {skillName}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div
                    className="flex min-h-[52px] flex-wrap gap-2 rounded-2xl border border-border bg-input px-4 py-3 transition-colors focus-within:border-[rgb(var(--primary)/0.24)] focus-within:ring-4 focus-within:ring-[rgb(var(--primary)/0.08)]"
                    onClick={() => skillInputRef.current?.focus()}
                  >
                    {skills.map((skill) => (
                      <span
                        key={skill.id}
                        className="inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-xs font-medium text-white"
                      >
                        {skill.name}
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            removeSkill(skill.id);
                          }}
                          className="text-white/80 hover:text-white"
                        >
                          <XIcon className="h-3 w-3" />
                        </button>
                      </span>
                    ))}

                    <div className="relative min-w-[160px] flex-1">
                      <input
                        ref={skillInputRef}
                        value={customSkill}
                        onChange={(event) => handleSkillInputChange(event.target.value)}
                        onKeyDown={handleSkillKeyDown}
                        onFocus={() => customSkill.trim() && setShowSuggestions(true)}
                        onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                        placeholder={skills.length === 0 ? "Type a skill and press Enter" : "Add another skill"}
                        disabled={customSkillLoading}
                        className="w-full bg-transparent py-1 text-sm text-text-primary outline-none placeholder:text-text-subtle disabled:opacity-60"
                      />

                      {showSuggestions && suggestions.length > 0 ? (
                        <div className="absolute left-0 top-full z-30 mt-2 min-w-[220px] overflow-hidden rounded-2xl border border-border bg-card shadow-[0_16px_40px_rgba(15,23,42,0.12)]">
                          {suggestions.map((skill, index) => (
                            <button
                              key={skill.id}
                              type="button"
                              onMouseDown={() => selectSuggestion(skill)}
                              className={`block w-full px-4 py-2.5 text-left text-sm transition-colors ${
                                index === suggestionIndex
                                  ? "bg-accent text-accent-foreground"
                                  : "text-text-primary hover:bg-accent/60"
                              }`}
                            >
                              {skill.name}
                            </button>
                          ))}

                          {customSkill.trim() &&
                          !suggestions.some((skill) => skill.name.toLowerCase() === customSkill.trim().toLowerCase()) ? (
                            <button
                              type="button"
                              onMouseDown={() => addSkillByName(customSkill)}
                              className="block w-full border-t border-border px-4 py-2.5 text-left text-sm font-medium text-primary hover:bg-accent/60"
                            >
                              + Add “{customSkill.trim()}”
                            </button>
                          ) : null}
                        </div>
                      ) : null}

                      {showSuggestions && suggestions.length === 0 && customSkill.trim() && !customSkillLoading ? (
                        <div className="absolute left-0 top-full z-30 mt-2 min-w-[220px] overflow-hidden rounded-2xl border border-border bg-card shadow-[0_16px_40px_rgba(15,23,42,0.12)]">
                          <button
                            type="button"
                            onMouseDown={() => addSkillByName(customSkill)}
                            className="block w-full px-4 py-2.5 text-left text-sm font-medium text-primary hover:bg-accent/60"
                          >
                            + Add new skill “{customSkill.trim()}”
                          </button>
                        </div>
                      ) : null}
                    </div>

                    {customSkillLoading ? <Loader2 className="mt-1 h-4 w-4 animate-spin text-primary" /> : null}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-2xl border border-border bg-input px-5 py-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[rgb(var(--primary)/0.12)] bg-card text-primary">
                      <Briefcase className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-text-primary">Freelancer profile preview</p>
                      <p className="text-sm text-text-secondary">This is the information clients will see first.</p>
                    </div>
                  </div>

                  <div className="mt-5 rounded-2xl border border-border bg-card p-5 shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
                    <div className="flex items-start gap-4">
                      {user.avatar_url ? (
                        <img
                          src={user.avatar_url}
                          alt={profileName}
                          className="h-14 w-14 rounded-2xl border border-border object-cover"
                        />
                      ) : (
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-accent text-lg font-semibold text-primary">
                          {initials}
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-semibold text-text-primary">{profileName}</p>
                          {isVerified ? <ShieldCheck className="h-4 w-4 text-primary" /> : null}
                        </div>
                        <p className="mt-0.5 truncate text-xs text-text-muted">@{user.username}</p>
                        <p className="mt-1 text-sm text-text-secondary">
                          {form.tagline.trim() || "Add a short tagline to describe your specialty"}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {skills.length > 0 ? (
                        skills.slice(0, 4).map((skill) => (
                          <span
                            key={skill.id}
                            className="rounded-full border border-[rgb(var(--primary)/0.12)] bg-[rgb(var(--primary)/0.08)] px-2.5 py-1 text-xs font-medium text-primary"
                          >
                            {skill.name}
                          </span>
                        ))
                      ) : (
                        <span className="text-sm text-text-subtle">Add skills to strengthen your profile.</span>
                      )}
                    </div>

                    <div className="mt-4 flex items-center justify-between text-sm">
                      <span className="text-text-secondary">
                        {form.hourlyRate.trim() ? `THB ${Number(form.hourlyRate).toLocaleString()} / hr` : "Hourly rate not set"}
                      </span>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                        form.isPublic
                          ? "bg-success/10 text-success"
                          : "bg-accent text-text-secondary"
                      }`}>
                        {form.isPublic ? "Public" : "Hidden"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-border bg-card px-5 py-5">
                  <div className="flex items-start gap-3">
                    <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <div className="space-y-2 text-sm text-text-secondary">
                      <p>
                        Your name, photo, and phone are managed from the profile section above. Freelancer-specific visibility and skills are now saved here in the same settings page.
                      </p>
                      <button
                        type="button"
                        onClick={() => navigate("/app/explore/freelancers")}
                        className="inline-flex items-center gap-1 font-medium text-primary hover:text-primary-hover"
                      >
                        Open Explore Freelancers
                        <ExternalLink className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className={sectionCardClassName}>
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <h2 className={sectionOverlineClassName}>Password</h2>
              <p className={sectionHelperTextClassName}>
                Manage your password securely through Keycloak Account.
              </p>
            </div>

            <Button
              type="button"
              variant="secondary"
              className="h-11 rounded-2xl border-border bg-card px-5 text-sm text-text-primary hover:bg-[rgb(var(--primary)/0.08)] hover:text-primary"
              onClick={() => keycloak.accountManagement()}
            >
              <Lock className="mr-2 h-4 w-4" />
              Update Password
            </Button>
          </div>
        </section>

        {isDirty ? (
          <div className="sticky bottom-0 z-10 -mx-2 border-t border-border bg-card/95 px-2 py-4 backdrop-blur supports-[backdrop-filter]:bg-card/80 sm:-mx-1 sm:px-1">
            <div className="flex w-full items-center justify-between gap-4">
              <p className="text-sm text-text-secondary">You have unsaved changes</p>
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleDiscard}
                  disabled={saving}
                  className="rounded-2xl border-border px-5 text-sm"
                >
                  Discard
                </Button>
                <Button
                  type="submit"
                  isLoading={saving}
                  className="rounded-2xl px-6 text-sm"
                >
                  Save Changes
                </Button>
              </div>
            </div>
          </div>
        ) : null}
      </form>
    </div>
  );
}
