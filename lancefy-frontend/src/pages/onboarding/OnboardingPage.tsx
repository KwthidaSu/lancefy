import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Briefcase,
  User,
  Check,
  ChevronRight,
  ShieldCheck,
  Globe,
  DollarSign,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { authService } from "@/services/auth.service";

// ─── Constants ────────────────────────────────────────────────────────────────

type Role = "employer" | "freelancer" | null;

const SKILLS = [
  "React", "Next.js", "TypeScript", "Node.js", "Python", "Django", "FastAPI",
  "UI/UX Design", "Figma", "Video Editing", "Copywriting", "SEO",
  "Content Strategy", "Google Ads", "Data Science", "Machine Learning",
  "PostgreSQL", "DevOps", "Docker",
];

const CATEGORIES = [
  "Web Development", "Mobile Apps", "UI/UX Design", "Graphic Design",
  "Content Writing", "Digital Marketing", "Data & Analytics",
  "Video & Animation", "DevOps & Cloud", "AI & Machine Learning",
];

const EXP_LEVELS = [
  { value: "entry",  label: "Entry",  desc: "< 2 yrs" },
  { value: "mid",    label: "Mid",    desc: "2–5 yrs" },
  { value: "senior", label: "Senior", desc: "5–10 yrs" },
  { value: "expert", label: "Expert", desc: "10+ yrs" },
];

// ─── Step 0: Role Select ──────────────────────────────────────────────────────

function RoleSelect({ onSelect }: { onSelect: (r: Role) => void }) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-center text-text-muted">
        Choose how you'd like to use Lancefy. You can always switch roles later.
      </p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {(["employer", "freelancer"] as const).map((role) => {
          const isEmp = role === "employer";
          return (
            <button
              key={role}
              onClick={() => onSelect(role)}
              className="flex flex-col items-start gap-4 rounded-xl border-2 border-border p-6 text-left transition-all hover:border-primary hover:bg-accent/30"
            >
              <div className={cn(
                "flex h-12 w-12 items-center justify-center rounded-xl",
                isEmp ? "bg-primary/10" : "bg-violet-100",
              )}>
                {isEmp
                  ? <Briefcase className="h-6 w-6 text-primary" />
                  : <User className="h-6 w-6 text-violet-600" />}
              </div>
              <div>
                <h3 className="text-base font-bold text-text-primary font-ui">
                  {isEmp ? "I want to hire" : "I want to freelance"}
                </h3>
                <p className="mt-1 text-xs text-text-muted leading-relaxed">
                  {isEmp
                    ? "Post projects, receive offers, and manage freelancers with escrow-protected payments."
                    : "Browse jobs, submit offers, deliver by milestone, and get paid securely."}
                </p>
              </div>
              <div className="flex flex-col gap-1.5 text-xs text-text-muted">
                {(isEmp
                  ? ["Post unlimited jobs", "Escrow payment protection", "Milestone-based delivery"]
                  : ["Browse 1,000+ active jobs", "Guaranteed milestone payments", "Build your portfolio"]
                ).map((f) => (
                  <span key={f} className="flex items-center gap-1.5">
                    <Check className="h-3 w-3 text-lime-600" />
                    {f}
                  </span>
                ))}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Step 1: Employer Profile ─────────────────────────────────────────────────

function EmployerProfile() {
  const [selCats, setSelCats] = useState<string[]>([]);
  const toggle = (c: string) =>
    setSelCats((p) => p.includes(c) ? p.filter((x) => x !== c) : [...p, c]);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <label className="block text-xs font-semibold text-text-primary mb-1">Company / Brand Name</label>
        <input className="w-full h-10 rounded-lg border border-border bg-gray-50 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" placeholder="e.g. TechVentures Co." />
      </div>
      <div>
        <label className="block text-xs font-semibold text-text-primary mb-1">Industry</label>
        <select className="w-full h-10 rounded-lg border border-border bg-gray-50 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
          <option value="">Select industry…</option>
          {["Technology","E-Commerce","Finance & FinTech","Healthcare","Media","Education","Real Estate","Other"].map((i) => (
            <option key={i} value={i}>{i}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-xs font-semibold text-text-primary mb-1">What are you looking to build?</label>
        <textarea
          rows={3}
          className="w-full rounded-lg border border-border bg-gray-50 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
          placeholder="Briefly describe your upcoming project needs…"
        />
      </div>
      <div>
        <label className="block text-xs font-semibold text-text-primary mb-2">Categories you hire for</label>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => toggle(c)}
              className={cn(
                "px-3 py-1 text-xs rounded-full border transition-colors font-ui",
                selCats.includes(c) ? "bg-primary text-white border-primary" : "border-border text-text-muted hover:border-primary",
              )}
            >
              {c}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Step 1: Freelancer Profile ───────────────────────────────────────────────

function FreelancerProfile() {
  const [selSkills, setSelSkills] = useState<string[]>([]);
  const [expLevel, setExpLevel] = useState("");
  const toggle = (s: string) =>
    setSelSkills((p) => p.includes(s) ? p.filter((x) => x !== s) : [...p, s]);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <label className="block text-xs font-semibold text-text-primary mb-1">Professional Headline</label>
        <input className="w-full h-10 rounded-lg border border-border bg-gray-50 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" placeholder="e.g. Full-Stack Developer specializing in React & Node.js" />
      </div>
      <div>
        <label className="block text-xs font-semibold text-text-primary mb-1">Experience Level</label>
        <div className="grid grid-cols-4 gap-2">
          {EXP_LEVELS.map((l) => (
            <button
              key={l.value}
              onClick={() => setExpLevel(l.value)}
              className={cn(
                "flex flex-col items-center gap-0.5 rounded-lg border px-3 py-2.5 text-center transition-colors",
                expLevel === l.value ? "border-primary bg-primary/10 text-primary" : "border-border text-text-muted hover:border-primary",
              )}
            >
              <span className="text-xs font-semibold font-ui">{l.label}</span>
              <span className="text-[10px]">{l.desc}</span>
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="block text-xs font-semibold text-text-primary mb-1">Hourly Rate (฿/hr)</label>
        <div className="relative w-40">
          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-muted" />
          <input type="number" className="w-full h-10 rounded-lg border border-border bg-gray-50 pl-8 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" placeholder="e.g. 500" />
        </div>
      </div>
      <div>
        <label className="block text-xs font-semibold text-text-primary mb-1">Preferred Language</label>
        <div className="relative">
          <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-muted" />
          <select className="w-full h-10 rounded-lg border border-border bg-gray-50 pl-8 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
            <option value="">Select language…</option>
            <option>Thai</option>
            <option>English</option>
            <option>Both</option>
          </select>
        </div>
      </div>
      <div>
        <label className="block text-xs font-semibold text-text-primary mb-2">
          Skills <span className="text-text-muted font-normal">(select all that apply)</span>
        </label>
        <div className="flex flex-wrap gap-2">
          {SKILLS.map((s) => (
            <button
              key={s}
              onClick={() => toggle(s)}
              className={cn(
                "px-3 py-1 text-xs rounded-full border transition-colors font-ui",
                selSkills.includes(s) ? "bg-primary text-white border-primary" : "border-border text-text-muted hover:border-primary",
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const STEPS = [
  { id: 0, label: "Choose Role" },
  { id: 1, label: "Profile Setup" },
  { id: 2, label: "Done" },
];

export default function OnboardingPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [role, setRole] = useState<Role>(null);
  const [saving, setSaving] = useState(false);

  async function handleFinish() {
    if (!role || saving) return;
    setSaving(true);
    try {
      await authService.updateCurrentUser({ role, onboarding_completed: true } as never);
    } catch {
      // non-critical
    } finally {
      setSaving(false);
      navigate("/app/dashboard");
    }
  }

  return (
    <div className="min-h-screen bg-[#f8f9fb] flex items-start justify-center py-12 px-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
            <ShieldCheck className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-text-primary font-ui">Welcome to Lancefy</h1>
          <p className="mt-2 text-sm text-text-muted">Let's set up your account in just 2 quick steps.</p>
        </div>

        {/* Progress */}
        <div className="mb-8 flex items-center gap-2">
          {STEPS.map((s, idx) => (
            <div key={s.id} className="flex flex-1 items-center gap-2">
              <div className={cn(
                "flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold font-ui transition-colors",
                step > s.id ? "border-lime-500 bg-lime-500 text-white"
                : step === s.id ? "border-primary bg-primary text-white"
                : "border-border bg-white text-text-muted",
              )}>
                {step > s.id ? <Check className="h-4 w-4" /> : s.id + 1}
              </div>
              <span className={cn(
                "hidden text-xs font-semibold sm:block",
                step === s.id ? "text-primary" : step > s.id ? "text-lime-600" : "text-text-muted",
              )}>
                {s.label}
              </span>
              {idx < STEPS.length - 1 && (
                <div className={cn("flex-1 h-0.5", step > s.id ? "bg-lime-400" : "bg-border")} />
              )}
            </div>
          ))}
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-border bg-white shadow-sm p-8">
          {step === 0 && (
            <RoleSelect onSelect={(r) => { setRole(r); setStep(1); }} />
          )}

          {step === 1 && role && (
            <>
              <h2 className="text-base font-semibold text-text-primary mb-5 font-ui">
                {role === "employer" ? "Employer Profile" : "Freelancer Profile"}
              </h2>
              {role === "employer" ? <EmployerProfile /> : <FreelancerProfile />}
              <div className="mt-6 flex items-center justify-between border-t border-border pt-5">
                <button
                  onClick={() => setStep(0)}
                  className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-text-primary hover:bg-gray-50 transition-colors font-ui"
                >
                  Back
                </button>
                <button
                  onClick={handleFinish}
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-white hover:bg-primary-hover transition-colors disabled:opacity-50 font-ui"
                >
                  {saving ? "Saving…" : "Finish Setup"}
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
