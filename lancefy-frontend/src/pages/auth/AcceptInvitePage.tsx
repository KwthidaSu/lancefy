import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";
import { useSearchParams } from "react-router-dom";
import { useKeycloak } from "@react-keycloak/web";
import { useTranslation } from "react-i18next";
import {
  HiOutlineCalendarDays,
  HiOutlineCheckCircle,
  HiOutlineEnvelope,
  HiOutlineEye,
  HiOutlineEyeSlash,
  HiOutlineLockClosed,
  HiOutlineShieldCheck,
  HiOutlineUserCircle,
} from "react-icons/hi2";

import {
  acceptInvitation,
  fetchInvitationPreview,
} from "@/services/users/adminUsers";
import { cn } from "@/lib/utils";

const USERNAME_PATTERN = /^[a-z0-9._-]{3,30}$/;
const PASSWORD_UPPERCASE_PATTERN = /[A-Z]/;

const INVITE_PARTICLES = [
  { left: "10%", top: "12%", size: 2, delay: "0s", duration: "7s" },
  { left: "18%", top: "68%", size: 2, delay: "1.2s", duration: "8.2s" },
  { left: "28%", top: "24%", size: 1.6, delay: "0.6s", duration: "7.8s" },
  { left: "35%", top: "82%", size: 2.4, delay: "2.1s", duration: "9.4s" },
  { left: "44%", top: "16%", size: 1.8, delay: "0.9s", duration: "8.6s" },
  { left: "52%", top: "60%", size: 2, delay: "2.4s", duration: "7.4s" },
  { left: "61%", top: "28%", size: 1.8, delay: "1.1s", duration: "8.8s" },
  { left: "70%", top: "76%", size: 2.2, delay: "0.4s", duration: "9.1s" },
  { left: "78%", top: "18%", size: 2, delay: "1.8s", duration: "7.2s" },
  { left: "86%", top: "56%", size: 1.8, delay: "2.8s", duration: "8.5s" },
  { left: "92%", top: "30%", size: 1.4, delay: "0.2s", duration: "7.6s" },
  { left: "14%", top: "88%", size: 1.6, delay: "1.5s", duration: "8.9s" },
];

const pageShellClass =
  "relative flex min-h-screen items-center justify-center overflow-hidden bg-[radial-gradient(ellipse_at_top,#f8fbff_0%,#edf5ff_44%,#e8f0f9_100%)] px-4 py-8 sm:px-6 lg:px-8";

const cardClass =
  "relative z-10 w-full max-w-[720px] overflow-hidden rounded-[32px] border border-slate-200/80 bg-white shadow-[0_34px_110px_rgba(15,23,42,0.14)]";

const inputClass =
  "h-[52px] w-full rounded-[16px] border border-slate-200 bg-white px-4 text-sm font-medium text-text-primary shadow-[0_10px_24px_rgba(15,23,42,0.04)] outline-none transition placeholder:text-text-muted focus:border-blue-300 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-60";

type InviteForm = {
  firstname: string;
  lastname: string;
  username: string;
  password: string;
  confirmPassword: string;
};

export default function AcceptInvitePage() {
  const { t, i18n } = useTranslation("common");
  const { keycloak } = useKeycloak();
  const [searchParams] = useSearchParams();

  const token = searchParams.get("token") || "";

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [accepted, setAccepted] = useState(false);

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [form, setForm] = useState<InviteForm>({
    firstname: "",
    lastname: "",
    username: "",
    password: "",
    confirmPassword: "",
  });

  useEffect(() => {
    if (!token) {
      setErrorMessage(t("inviteFlow.errors.missingToken"));
      setLoading(false);
      return;
    }

    fetchInvitationPreview(token)
      .then((res) => {
        setInviteEmail(res.data.email);
        setInviteRole(res.data.role);
        setExpiresAt(res.data.expires_at);

        setForm((prev) =>
          prev.username
            ? prev
            : {
                ...prev,
                username: buildSuggestedUsername(res.data.email),
              },
        );
      })
      .catch((error) => {
        setErrorMessage(
          error?.response?.data?.detail || t("inviteFlow.errors.loadFailed"),
        );
      })
      .finally(() => {
        setLoading(false);
      });
  }, [t, token]);

  const formattedExpiry = useMemo(() => {
    if (!expiresAt) return "-";

    try {
      return new Intl.DateTimeFormat(
        i18n.language === "th" ? "th-TH" : "en-US",
        {
          dateStyle: "medium",
          timeStyle: "short",
        },
      ).format(new Date(expiresAt));
    } catch {
      return expiresAt;
    }
  }, [expiresAt, i18n.language]);

  const passwordChecks = useMemo(
    () => ({
      length: form.password.length > 8,
      uppercase: PASSWORD_UPPERCASE_PATTERN.test(form.password),
      match:
        form.confirmPassword.length > 0 &&
        form.password === form.confirmPassword,
    }),
    [form.confirmPassword, form.password],
  );

  const isSubmitDisabled =
    submitting ||
    !form.firstname.trim() ||
    !form.lastname.trim() ||
    !form.username.trim() ||
    !form.password ||
    !form.confirmPassword;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (submitting) return;

    const firstname = form.firstname.trim();
    const lastname = form.lastname.trim();
    const username = normalizeUsernameInput(form.username.trim());

    if (!firstname || !lastname) {
      setErrorMessage(t("inviteFlow.errors.nameRequired"));
      return;
    }

    if (!username) {
      setErrorMessage(t("inviteFlow.errors.usernameRequired"));
      return;
    }

    if (!USERNAME_PATTERN.test(username)) {
      setErrorMessage(t("inviteFlow.errors.usernameFormat"));
      return;
    }

    if (form.password.length <= 8) {
      setErrorMessage(t("inviteFlow.errors.passwordLength"));
      return;
    }

    if (!PASSWORD_UPPERCASE_PATTERN.test(form.password)) {
      setErrorMessage(t("inviteFlow.errors.passwordUppercase"));
      return;
    }

    if (form.password !== form.confirmPassword) {
      setErrorMessage(t("inviteFlow.errors.passwordMismatch"));
      return;
    }

    setSubmitting(true);
    setErrorMessage("");
    setForm((prev) => ({ ...prev, username }));

    try {
      await acceptInvitation(token, {
        firstname,
        lastname,
        username,
        password: form.password,
      });

      setAccepted(true);
    } catch (error: any) {
      setErrorMessage(
        error?.response?.data?.detail || t("inviteFlow.errors.acceptFailed"),
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <InvitePageShell>
        <div className="relative z-10 flex w-full max-w-md flex-col items-center rounded-[28px] border border-slate-200/80 bg-white px-8 py-10 text-center shadow-[0_28px_80px_rgba(15,23,42,0.12)]">
          <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-full border border-blue-100 bg-blue-50/70 shadow-[0_12px_26px_rgba(96,165,250,0.12)]">
            <HiOutlineShieldCheck className="h-8 w-8 animate-pulse text-blue-500" />
          </div>
          <p className="text-sm font-medium text-text-secondary">
            {t("inviteFlow.states.loading")}
          </p>
        </div>
      </InvitePageShell>
    );
  }

  return (
    <InvitePageShell>
      <div className={cardClass}>
        <InviteHeader accepted={accepted} t={t} />

        <div className="border-t border-slate-100 px-6 py-7 sm:px-10 sm:py-9">
          <div className="mx-auto max-w-[520px]">
            {accepted ? (
              <SuccessState
                email={inviteEmail}
                username={form.username}
                onSignIn={() =>
                  keycloak.login({
                    redirectUri: `${window.location.origin}/app/dashboard`,
                  })
                }
                t={t}
              />
            ) : errorMessage && !inviteEmail ? (
              <ErrorPanel message={errorMessage} />
            ) : (
              <form className="space-y-7" onSubmit={handleSubmit}>
                <InviteInfoCard
                  email={inviteEmail}
                  role={inviteRole}
                  expiresAt={formattedExpiry}
                  t={t}
                />

                <section className="border-t border-slate-100 pt-7">
                  <SectionTitle title={t("inviteFlow.sections.identity")} />

                  <div className="mt-5 grid gap-5 md:grid-cols-2">
                    <Field
                      label={t("inviteFlow.form.firstname")}
                      value={form.firstname}
                      onChange={(value) =>
                        setForm((prev) => ({ ...prev, firstname: value }))
                      }
                      placeholder="John"
                      autoComplete="given-name"
                    />

                    <Field
                      label={t("inviteFlow.form.lastname")}
                      value={form.lastname}
                      onChange={(value) =>
                        setForm((prev) => ({ ...prev, lastname: value }))
                      }
                      placeholder="Doe"
                      autoComplete="family-name"
                    />
                  </div>

                  <div className="mt-5">
                    <Field
                      label={t("inviteFlow.form.username")}
                      value={form.username}
                      onChange={(value) =>
                        setForm((prev) => ({
                          ...prev,
                          username: normalizeUsernameInput(value),
                        }))
                      }
                      placeholder={t("inviteFlow.form.usernamePlaceholder")}
                      autoComplete="username"
                      maxLength={30}
                      inputMode="text"
                      icon={
                        <span className="text-base font-semibold text-text-muted">
                          @
                        </span>
                      }
                    />
                  </div>
                </section>

                <section className="border-t border-slate-100 pt-7">
                  <SectionTitle title={t("inviteFlow.sections.security")} />

                  <div className="mt-5 space-y-5">
                    <Field
                      label={t("inviteFlow.form.password")}
                      type={showPassword ? "text" : "password"}
                      value={form.password}
                      onChange={(value) =>
                        setForm((prev) => ({ ...prev, password: value }))
                      }
                      placeholder={t("inviteFlow.form.passwordPlaceholder")}
                      autoComplete="new-password"
                      icon={<HiOutlineLockClosed className="h-5 w-5" />}
                      rightAdornment={
                        <ToggleVisibilityButton
                          visible={showPassword}
                          onClick={() => setShowPassword((prev) => !prev)}
                        />
                      }
                    />

                    <Field
                      label={t("inviteFlow.form.confirmPassword")}
                      type={showConfirmPassword ? "text" : "password"}
                      value={form.confirmPassword}
                      onChange={(value) =>
                        setForm((prev) => ({
                          ...prev,
                          confirmPassword: value,
                        }))
                      }
                      placeholder={t("inviteFlow.form.confirmPasswordPlaceholder")}
                      autoComplete="new-password"
                      icon={<HiOutlineLockClosed className="h-5 w-5" />}
                      rightAdornment={
                        <ToggleVisibilityButton
                          visible={showConfirmPassword}
                          onClick={() =>
                            setShowConfirmPassword((prev) => !prev)
                          }
                        />
                      }
                    />
                  </div>

                  <PasswordChecklist
                    checks={passwordChecks}
                    hint={t("inviteFlow.form.passwordHint")}
                  />
                </section>

                {errorMessage ? <ErrorPanel message={errorMessage} /> : null}

                <div className="space-y-4 pt-2 text-center">
                  <button
                    type="submit"
                    disabled={isSubmitDisabled}
                    className="inline-flex h-12 w-full max-w-[280px] items-center justify-center rounded-[14px] bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-[0_14px_28px_rgba(37,99,235,0.22)] transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {submitting
                      ? t("inviteFlow.actions.processing")
                      : t("inviteFlow.actions.complete")}
                  </button>

                  <p className="text-center text-xs font-medium text-text-muted">
                    LanceFy Secure Access
                  </p>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </InvitePageShell>
  );
}

function InvitePageShell({ children }: { children: ReactNode }) {
  return (
    <div className={pageShellClass}>
      <InviteDecorations />
      {children}
    </div>
  );
}

function InviteHeader({
  accepted,
  t,
}: {
  accepted: boolean;
  t: (key: string) => string;
}) {
  return (
    <div className="relative overflow-hidden px-6 py-8 sm:px-10 sm:py-10">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[260px] bg-[radial-gradient(circle_at_top_right,rgba(96,165,250,0.16),transparent_28%),radial-gradient(circle_at_20%_0%,rgba(255,255,255,0.96),transparent_34%)]" />

      <div className="relative mx-auto flex max-w-[520px] items-start justify-between gap-6">
        <div className="min-w-0">
          <div className="mb-4 inline-flex items-center rounded-full border border-blue-100 bg-blue-50/80 px-3.5 py-1.5 text-xs font-semibold text-primary shadow-[0_10px_24px_rgba(37,99,235,0.05)]">
            LanceFy Secure Access
          </div>

          <h1 className="text-[2.15rem] font-bold tracking-tight text-text-primary sm:text-[2.45rem]">
            {accepted ? t("inviteFlow.success.title") : t("inviteFlow.page.title")}
          </h1>

          <p className="mt-3 text-base font-medium leading-7 text-text-secondary">
            {accepted
              ? t("inviteFlow.success.subtitle")
              : t("inviteFlow.page.subtitle")}
          </p>
        </div>

        <div className="flex h-[66px] w-[66px] shrink-0 items-center justify-center rounded-[22px] bg-primary text-primary-foreground shadow-[0_14px_28px_rgba(37,99,235,0.22)]">
          <HiOutlineShieldCheck className="h-8 w-8" />
        </div>
      </div>
    </div>
  );
}

function InviteInfoCard({
  email,
  role,
  expiresAt,
  t,
}: {
  email: string;
  role: string;
  expiresAt: string;
  t: (key: string) => string;
}) {
  return (
    <div className="rounded-[24px] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(248,250,255,0.95),rgba(255,255,255,1))] p-5 shadow-[0_12px_32px_rgba(15,23,42,0.05)] sm:p-6">
      <div className="space-y-4">
        <InviteInfoRow
          icon={<HiOutlineEnvelope className="h-5 w-5" />}
          label={t("inviteFlow.form.email")}
          value={email}
        />

        <InviteInfoRow
          icon={<HiOutlineUserCircle className="h-5 w-5" />}
          label={t("inviteFlow.form.role")}
          value={formatRole(role)}
        />

        <InviteInfoRow
          icon={<HiOutlineCalendarDays className="h-5 w-5" />}
          label={t("inviteFlow.form.expiresAt")}
          value={expiresAt}
        />
      </div>
    </div>
  );
}

function SuccessState({
  email,
  username,
  onSignIn,
  t,
}: {
  email: string;
  username: string;
  onSignIn: () => void;
  t: (key: string) => string;
}) {
  return (
    <div className="flex flex-col items-center space-y-6 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full border border-lime-100 bg-lime-50 text-lime-600 shadow-[0_12px_26px_rgba(132,204,22,0.12)]">
        <HiOutlineCheckCircle className="h-9 w-9" />
      </div>

      <div className="w-full rounded-[24px] border border-lime-200 bg-lime-50/70 px-6 py-5 text-lime-900">
        <div className="flex items-start justify-center gap-3 text-left">
          <HiOutlineCheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-lime-600" />

          <div className="w-full max-w-[380px] space-y-3">
            <div className="font-semibold">
              {t("inviteFlow.success.emailVerified")}
            </div>

            <div className="space-y-2 text-sm">
              <InfoPair label={t("inviteFlow.form.email")} value={email} />
              <InfoPair
                label={t("inviteFlow.form.username")}
                value={`@${username}`}
              />
            </div>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={onSignIn}
        className="inline-flex h-12 w-full max-w-[240px] items-center justify-center rounded-[14px] bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-[0_14px_28px_rgba(37,99,235,0.22)] transition hover:bg-primary-hover"
      >
        {t("inviteFlow.success.signIn")}
      </button>
    </div>
  );
}

function InfoPair({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-t border-white/70 pt-3">
      <span className="font-medium text-lime-800">{label}</span>
      <span className="break-all text-right font-semibold text-lime-950">
        {value}
      </span>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  description,
  autoComplete,
  maxLength,
  inputMode,
  icon,
  rightAdornment,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: string;
  description?: string;
  autoComplete?: string;
  maxLength?: number;
  inputMode?: InputHTMLAttributes<HTMLInputElement>["inputMode"];
  icon?: ReactNode;
  rightAdornment?: ReactNode;
}) {
  return (
    <label className="block space-y-2.5">
      <span className="text-sm font-semibold text-text-primary">{label}</span>

      <div className="relative">
        {icon ? (
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-text-muted">
            {icon}
          </span>
        ) : null}

        {rightAdornment ? (
          <span className="absolute right-4 top-1/2 -translate-y-1/2">
            {rightAdornment}
          </span>
        ) : null}

        <input
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          maxLength={maxLength}
          inputMode={inputMode}
          className={cn(
            inputClass,
            icon ? "pl-12" : "",
            rightAdornment ? "pr-12" : "",
          )}
        />
      </div>

      {description ? (
        <p className="text-xs leading-5 text-text-muted">{description}</p>
      ) : null}
    </label>
  );
}

function PasswordChecklist({
  checks,
  hint,
}: {
  checks: {
    length: boolean;
    uppercase: boolean;
    match: boolean;
  };
  hint: string;
}) {
  return (
    <div className="mt-4 rounded-[18px] border border-blue-100 bg-blue-50/60 px-4 py-3">
      <div className="mb-2 flex items-center gap-2 text-sm font-medium text-blue-700">
        <HiOutlineCheckCircle className="h-4 w-4" />
        <span>{hint}</span>
      </div>

      <div className="grid gap-2 text-xs font-medium text-text-secondary sm:grid-cols-3">
        <PasswordRule active={checks.length} label="8+ characters" />
        <PasswordRule active={checks.uppercase} label="Uppercase letter" />
        <PasswordRule active={checks.match} label="Passwords match" />
      </div>
    </div>
  );
}

function PasswordRule({ active, label }: { active: boolean; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          active ? "bg-lime-500" : "bg-slate-300",
        )}
      />
      <span className={active ? "text-lime-700" : ""}>{label}</span>
    </div>
  );
}

function InviteInfoRow({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="grid grid-cols-[24px_72px_minmax(0,1fr)] items-start gap-4 text-sm sm:grid-cols-[24px_96px_minmax(0,1fr)]">
      <div className="pt-0.5 text-primary">{icon}</div>
      <div className="font-medium text-text-muted">{label}</div>
      <div className="min-w-0 break-all font-semibold text-text-primary">
        {value || "-"}
      </div>
    </div>
  );
}

function SectionTitle({ title }: { title: string }) {
  return (
    <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary">
      {title}
    </div>
  );
}

function ToggleVisibilityButton({
  visible,
  onClick,
}: {
  visible: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-8 w-8 items-center justify-center rounded-full text-text-muted transition hover:bg-slate-100 hover:text-text-primary"
      aria-label={visible ? "Hide password" : "Show password"}
    >
      {visible ? (
        <HiOutlineEyeSlash className="h-5 w-5" />
      ) : (
        <HiOutlineEye className="h-5 w-5" />
      )}
    </button>
  );
}

function ErrorPanel({ message }: { message: string }) {
  return (
    <div className="rounded-[18px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
      {message}
    </div>
  );
}

function InviteDecorations() {
  return (
    <>
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[520px] bg-[radial-gradient(circle_at_top_right,rgba(96,165,250,0.16),transparent_26%),radial-gradient(circle_at_15%_0%,rgba(255,255,255,0.95),transparent_34%)]" />

      <div className="pointer-events-none absolute right-[8%] top-[12%] hidden grid-cols-4 gap-2 opacity-60 lg:grid">
        {Array.from({ length: 20 }).map((_, index) => (
          <span key={index} className="h-1 w-1 rounded-full bg-blue-200" />
        ))}
      </div>

      <div className="pointer-events-none absolute left-[8%] bottom-[14%] hidden h-44 w-44 rounded-full border border-blue-100/80 lg:block" />

      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {INVITE_PARTICLES.map((particle, index) => (
          <span
            key={`${particle.left}-${particle.top}-${index}`}
            className="absolute rounded-full bg-blue-300/70 shadow-[0_0_10px_rgba(96,165,250,0.35)] animate-[invite-float_8s_ease-in-out_infinite]"
            style={{
              left: particle.left,
              top: particle.top,
              width: `${particle.size}px`,
              height: `${particle.size}px`,
              animationDelay: particle.delay,
              animationDuration: particle.duration,
            }}
          />
        ))}
      </div>

      <style>{`
        @keyframes invite-float {
          0%, 100% {
            transform: translate3d(0, 0, 0);
            opacity: 0.18;
          }
          50% {
            transform: translate3d(0, -10px, 0);
            opacity: 0.42;
          }
        }
      `}</style>
    </>
  );
}

function normalizeUsernameInput(value: string) {
  return value.toLowerCase().replace(/\s+/g, "").slice(0, 30);
}

function buildSuggestedUsername(email: string) {
  const localPart = email.split("@")[0] || "lancefy.user";

  const suggested = localPart
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, ".")
    .replace(/[._-]{2,}/g, ".")
    .replace(/^[._-]+|[._-]+$/g, "")
    .slice(0, 30);

  if (suggested.length >= 3) return suggested;
  return "lancefy.user";
}

function formatRole(role: string) {
  if (role === "platform_admin") return "Admin";
  if (role === "staff") return "Staff";

  return role
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}