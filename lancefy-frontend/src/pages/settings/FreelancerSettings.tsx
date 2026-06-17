import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, CheckCircle2, Loader2, Check, ExternalLink, Info, Lock, AlertCircle, X as XIcon } from "lucide-react";
import { authService } from "@/services/auth.service";
import type { CurrentUser } from "@/auth/auth.types";
import { SKILL_CATEGORIES } from "@/data/skills";
import { getMySkills, setMySkills, getOrCreateSkill, searchSkills } from "@/services/skills.service";
import type { SkillResponse } from "@/services/skills.service";

// ─────────────────────────────────────────────────────────────────────────────
// Preview card - imitates how the freelancer looks on /explore/freelancers
// ─────────────────────────────────────────────────────────────────────────────
function PreviewCard({ user }: { user: CurrentUser }) {
  const displayName =
    user.display_name ||
    [user.firstname, user.lastname].filter(Boolean).join(" ") ||
    user.username;

  const label = (
    user.display_name?.charAt(0) ??
    user.firstname?.charAt(0) ??
    user.username?.charAt(0) ??
    "?"
  ).toUpperCase();

  return (
    <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden pointer-events-none select-none">
      <div className="p-5 flex items-start gap-4">
        {user.avatar_url ? (
          <img
            src={user.avatar_url}
            alt={displayName}
            className="w-16 h-16 rounded-2xl object-cover flex-shrink-0"
          />
        ) : (
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
            {label}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="font-bold text-gray-900 truncate">{displayName}</p>
            {user.kyc_status === "verified" && (
              <CheckCircle2 className="w-4 h-4 text-blue-500 flex-shrink-0" />
            )}
          </div>
          <p className="text-xs text-gray-400 truncate">@{user.username}</p>
          {user.tagline ? (
            <p className="text-sm text-gray-600 mt-0.5 truncate">{user.tagline}</p>
          ) : (
            <p className="text-sm text-gray-300 mt-0.5 italic">tagline ยังไม่ได้ตั้ง</p>
          )}
        </div>
      </div>

      {user.skills && user.skills.length > 0 && (
        <div className="px-5 pb-3 flex flex-wrap gap-1.5">
          {user.skills.slice(0, 4).map((s) => (
            <span
              key={s.id}
              className="px-2.5 py-0.5 text-xs rounded-full bg-blue-50 text-blue-700 font-medium border border-blue-100"
            >
              {s.name}
            </span>
          ))}
          {user.skills.length > 4 && (
            <span className="px-2.5 py-0.5 text-xs rounded-full bg-gray-50 text-gray-400 border border-gray-100">
              +{user.skills.length - 4} more
            </span>
          )}
        </div>
      )}

      <div className="px-5 pb-5 flex items-center justify-between">
        <span className="text-xs text-gray-400">
          {user.hourly_rate
            ? <span className="font-semibold text-blue-600 text-sm">฿{user.hourly_rate.toLocaleString()} / hr</span>
            : <span className="text-gray-300 italic">ยังไม่ได้ตั้ง hourly rate</span>
          }
        </span>
        <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-50 text-gray-400 border">
          View Profile
        </span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────
export default function FreelancerSettingsPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [tagline, setTagline] = useState("");
  const [skills, setSkills] = useState<SkillResponse[]>([]);
  const [hourlyRate, setHourlyRate] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [customSkill, setCustomSkill] = useState("");
  const [customSkillLoading, setCustomSkillLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<SkillResponse[]>([]);
  const [suggestionIndex, setSuggestionIndex] = useState(-1);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const skillInputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    Promise.all([
      authService.getCurrentUser(),
      getMySkills(),
    ]).then(([u, skillsRes]) => {
      setUser(u);
      setTagline(u.tagline ?? "");
      setSkills((skillsRes.data as unknown as { data: SkillResponse[] }).data ?? []);
      setHourlyRate(u.hourly_rate?.toString() ?? "");
      setIsPublic(u.is_public ?? false);
    }).finally(() => setLoading(false));
  }, []);

  async function handleChipToggle(name: string) {
    const existing = skills.find((s) => s.name.toLowerCase() === name.toLowerCase());
    if (existing) {
      setSkills((prev) => prev.filter((s) => s.id !== existing.id));
      return;
    }
    setCustomSkillLoading(true);
    try {
      const res = await getOrCreateSkill(name);
      const skill = res.data;
      setSkills((prev) => prev.some((s) => s.id === skill.id) ? prev : [...prev, skill]);
    } finally {
      setCustomSkillLoading(false);
    }
  }

  function handleSkillInputChange(val: string) {
    setCustomSkill(val);
    setSuggestionIndex(-1);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!val.trim()) { setSuggestions([]); setShowSuggestions(false); return; }
    searchTimer.current = setTimeout(async () => {
      try {
        const res = await searchSkills(val.trim(), 8);
        const data = Array.isArray(res.data) ? res.data : [];
        setSuggestions(data.filter((s) => !skills.some((sk) => sk.id === s.id)));
        setShowSuggestions(true);
      } catch { setSuggestions([]); }
    }, 200);
  }

  async function addSkillByName(name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (skills.some((s) => s.name.toLowerCase() === trimmed.toLowerCase())) {
      setCustomSkill(""); setSuggestions([]); setShowSuggestions(false); return;
    }
    setCustomSkillLoading(true);
    try {
      const res = await getOrCreateSkill(trimmed);
      const skill = res.data;
      setSkills((prev) => prev.some((s) => s.id === skill.id) ? prev : [...prev, skill]);
      setCustomSkill(""); setSuggestions([]); setShowSuggestions(false); setSuggestionIndex(-1);
    } finally { setCustomSkillLoading(false); }
  }

  function selectSuggestion(s: SkillResponse) {
    setSkills((prev) => prev.some((x) => x.id === s.id) ? prev : [...prev, s]);
    setCustomSkill(""); setSuggestions([]); setShowSuggestions(false); setSuggestionIndex(-1);
  }

  function handleSkillKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSuggestionIndex((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSuggestionIndex((i) => Math.max(i - 1, -1));
    } else if (e.key === "Enter" || e.key === "," || e.key === "Tab") {
      e.preventDefault();
      if (suggestionIndex >= 0 && suggestions[suggestionIndex]) {
        selectSuggestion(suggestions[suggestionIndex]);
      } else if (customSkill.trim()) {
        addSkillByName(customSkill);
      }
    } else if (e.key === "Escape") {
      setShowSuggestions(false); setSuggestionIndex(-1);
    } else if (e.key === "Backspace" && !customSkill && skills.length > 0) {
      setSkills((prev) => prev.slice(0, -1));
    }
  }

  function removeSkill(id: string) {
    setSkills((prev) => prev.filter((s) => s.id !== id));
  }

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    setSaveError(null);
    try {
      const [updated] = await Promise.all([
        authService.updateCurrentUser({
          tagline: tagline || undefined,
          hourly_rate: hourlyRate ? parseFloat(hourlyRate) : undefined,
          is_public: isPublic,
        }),
        setMySkills(skills.map((s) => s.id)),
      ]);
      setUser(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: unknown) {
      const detail =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setSaveError(detail || "บันทึกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6 space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 rounded-2xl bg-gray-100 animate-pulse" />
        ))}
      </div>
    );
  }

  if (!user) return null;

  // Live preview user data merged with current edits
  const previewUser: CurrentUser = {
    ...user,
    tagline: tagline || undefined,
    skills,
    hourly_rate: hourlyRate ? parseFloat(hourlyRate) : undefined,
    is_public: isPublic,
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">ตั้งค่า Freelancer Profile</h1>
        <p className="text-sm text-gray-500 mt-1">
          ข้อมูลนี้จะแสดงในหน้า{" "}
          <button
            onClick={() => navigate("/app/explore/freelancers")}
            className="text-blue-600 hover:underline inline-flex items-center gap-0.5"
          >
            Explore Freelancers <ExternalLink className="w-3 h-3" />
          </button>
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* ── Form (left 3/5) ──────────────────────────────────────────────── */}
        <div className="lg:col-span-3 space-y-5">

          {/* Visibility toggle */}
          {(() => {
            const kycVerified = user.kyc_status === "verified";
            const canToggleOn = kycVerified || !isPublic;
            return (
              <div className={`rounded-2xl border p-5 transition-colors ${
                isPublic ? "border-blue-200 bg-blue-50" : "border-gray-100 bg-white"
              }`}>
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    {isPublic
                      ? <Eye className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                      : kycVerified
                        ? <EyeOff className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                        : <Lock className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                    }
                    <div>
                      <p className={`text-sm font-semibold ${
                        isPublic ? "text-blue-700" : "text-gray-700"
                      }`}>
                        {isPublic ? "โปรไฟล์สาธารณะ — มองเห็นได้" : "โปรไฟล์ซ่อนอยู่"}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {isPublic
                          ? "ผู้ว่าจ้างสามารถค้นหาและติดต่อคุณได้จากหน้า Explore Freelancers"
                          : "เปิดสาธารณะเพื่อให้ผู้ว่าจ้างค้นหาเจอคุณใน Explore Freelancers"
                        }
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (!isPublic && !kycVerified) return;
                      setIsPublic((v) => !v);
                    }}
                    title={!kycVerified && !isPublic ? "ต้องยืนยันตัวตน (KYC) ก่อน" : undefined}
                    className={`relative inline-flex h-7 items-center rounded-full transition-colors flex-shrink-0 ${
                      isPublic ? "bg-blue-600" : "bg-gray-200"
                    } ${!canToggleOn ? "opacity-40 cursor-not-allowed" : ""}`}
                    style={{ minWidth: "3.25rem" }}
                  >
                    <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform ${
                      isPublic ? "translate-x-7" : "translate-x-1"
                    }`} />
                  </button>
                </div>
                {!kycVerified && (
                  <div className="mt-3 flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
                    <Lock className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>
                      ต้องยืนยันตัวตน (KYC) ก่อนจึงจะเปิดโปรไฟล์สาธารณะได้
                      {" "}
                      <button
                        type="button"
                        onClick={() => navigate("/app/kyc")}
                        className="underline hover:text-amber-900 font-medium"
                      >
                        ยืนยันตัวตนเลย →
                      </button>
                    </span>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Tagline */}
          <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-5">
            <label className="block text-sm font-semibold text-gray-700 mb-1">Tagline</label>
            <p className="text-xs text-gray-400 mb-3">ประโยคสั้นๆ แสดงความเชี่ยวชาญ — จะแสดงใต้ชื่อในการ์ด</p>
            <input
              type="text"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              maxLength={100}
              placeholder="เช่น Full-stack Developer · React + FastAPI · 5 ปีประสบการณ์"
              className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400 text-gray-800"
            />
            <p className="text-xs text-gray-300 mt-1.5 text-right">{tagline.length}/100</p>
          </div>

          {/* Hourly rate */}
          <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-5">
            <label className="block text-sm font-semibold text-gray-700 mb-1">Hourly Rate</label>
            <p className="text-xs text-gray-400 mb-3">อัตราค่าบริการต่อชั่วโมง (บาท) — จะแสดงในการ์ดและโปรไฟล์</p>
            <div className="flex items-center gap-2 max-w-xs">
              <span className="text-sm font-semibold text-gray-500">฿</span>
              <input
                type="number"
                min="0"
                value={hourlyRate}
                onChange={(e) => setHourlyRate(e.target.value)}
                placeholder="เช่น 500"
                className="flex-1 px-3 py-2 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400 text-gray-800"
              />
              <span className="text-sm text-gray-400">/ hr</span>
            </div>
          </div>

          {/* Skills */}
          <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-5">
            <label className="block text-sm font-semibold text-gray-700 mb-1">ทักษะ</label>
            <p className="text-xs text-gray-400 mb-4">เลือกทักษะที่คุณถนัด — ผู้ว่าจ้างจะใช้ filter ค้นหาจากทักษะเหล่านี้</p>

            {/* Grouped categories */}
            <div className="space-y-4">
              {SKILL_CATEGORIES.map((cat) => (
                <div key={cat.id}>
                  <p className="text-xs font-semibold text-gray-500 mb-2">
                    {cat.icon} {cat.label}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {cat.skills.map((s) => {
                      const active = skills.some((sk) => sk.name.toLowerCase() === s.toLowerCase());
                      return (
                        <button
                          key={s}
                          type="button"
                          onClick={() => handleChipToggle(s)}
                          disabled={customSkillLoading}
                          className={`px-2.5 py-1 text-xs rounded-full border font-medium transition-colors disabled:opacity-60 ${
                            active
                              ? "bg-blue-600 text-white border-blue-600"
                              : "bg-white text-gray-500 border-gray-200 hover:border-blue-400 hover:text-blue-600"
                          }`}
                        >
                          {active ? "✓ " : ""}{s}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Tag input area */}
            <div
              className="flex flex-wrap gap-1.5 mt-4 pt-4 border-t border-gray-100 min-h-[44px] px-3 py-2 rounded-xl border border-gray-200 cursor-text focus-within:ring-2 focus-within:ring-blue-400 focus-within:border-blue-400 transition-shadow bg-white"
              onClick={() => skillInputRef.current?.focus()}
            >
              {skills.map((s) => (
                <span key={s.id} className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs rounded-full bg-blue-600 text-white font-medium flex-shrink-0">
                  {s.name}
                  <button type="button" onClick={(e) => { e.stopPropagation(); removeSkill(s.id); }} className="hover:text-blue-200 leading-none">
                    <XIcon className="w-3 h-3" />
                  </button>
                </span>
              ))}
              <div className="relative flex-1 min-w-[140px]">
                <input
                  ref={skillInputRef}
                  value={customSkill}
                  onChange={(e) => handleSkillInputChange(e.target.value)}
                  onKeyDown={handleSkillKeyDown}
                  onFocus={() => customSkill.trim() && setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                  placeholder={skills.length === 0 ? "พิมพ์ทักษะ แล้วกด Enter หรือเลือกจากรายการด้านล่าง" : "เพิ่มทักษะ..."}
                  disabled={customSkillLoading}
                  className="w-full text-xs bg-transparent outline-none placeholder-gray-300 text-gray-800 py-0.5 disabled:opacity-60"
                />
                {showSuggestions && suggestions.length > 0 && (
                  <div
                    ref={suggestionsRef}
                    className="absolute left-0 top-full mt-1 z-30 bg-white border border-gray-200 rounded-xl shadow-lg py-1 min-w-[180px] max-h-48 overflow-y-auto"
                  >
                    {suggestions.map((s, i) => (
                      <button
                        key={s.id}
                        type="button"
                        onMouseDown={() => selectSuggestion(s)}
                        className={`w-full text-left px-3 py-1.5 text-xs hover:bg-blue-50 hover:text-blue-700 transition-colors ${
                          i === suggestionIndex ? "bg-blue-50 text-blue-700" : "text-gray-700"
                        }`}
                      >
                        {s.name}
                      </button>
                    ))}
                    {customSkill.trim() && !suggestions.some((s) => s.name.toLowerCase() === customSkill.trim().toLowerCase()) && (
                      <button
                        type="button"
                        onMouseDown={() => addSkillByName(customSkill)}
                        className="w-full text-left px-3 py-1.5 text-xs text-blue-600 hover:bg-blue-50 border-t border-gray-100 font-medium"
                      >
                        + เพิ่ม “{customSkill.trim()}”
                      </button>
                    )}
                  </div>
                )}
                {showSuggestions && suggestions.length === 0 && customSkill.trim() && !customSkillLoading && (
                  <div className="absolute left-0 top-full mt-1 z-30 bg-white border border-gray-200 rounded-xl shadow-lg py-1 min-w-[180px]">
                    <button
                      type="button"
                      onMouseDown={() => addSkillByName(customSkill)}
                      className="w-full text-left px-3 py-1.5 text-xs text-blue-600 hover:bg-blue-50 font-medium"
                    >
                      + เพิ่มทักษะใหม่ “{customSkill.trim()}”
                    </button>
                  </div>
                )}
              </div>
              {customSkillLoading && <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500 flex-shrink-0 self-center" />}
            </div>
            <p className="text-xs text-gray-300 mt-1.5">กด Enter, Tab, หรือ , เพื่อเพิ่ม · Backspace ลบทักษะสุดท้าย</p>
          </div>

          {/* Info banner */}
          <div className="flex items-start gap-2.5 p-4 rounded-xl bg-amber-50 border border-amber-100 text-xs text-amber-700">
            <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <p>
              ข้อมูลที่แสดงในการ์ด Freelancer ดึงมาจากหน้านี้เท่านั้น
              ข้อมูลอื่นๆ เช่น ชื่อ อีเมล Bio แก้ไขได้ที่{" "}
              <button onClick={() => navigate("/app/profile")} className="underline hover:text-amber-900">
                หน้า Profile
              </button>
            </p>
          </div>

          {/* Error banner */}
          {saveError && (
            <div className="flex items-start gap-2.5 p-4 rounded-xl bg-red-50 border border-red-100 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{saveError}</span>
            </div>
          )}

          {/* Save button */}
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 py-3 px-6 bg-gray-900 text-white text-sm font-semibold rounded-xl hover:bg-gray-700 disabled:opacity-60 transition-colors"
          >
            {saving ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> กำลังบันทึก...</>
            ) : saved ? (
              <><Check className="w-4 h-4" /> บันทึกแล้ว!</>
            ) : (
              "บันทึกการตั้งค่า"
            )}
          </button>
        </div>

        {/* ── Preview (right 2/5) ──────────────────────────────────────────── */}
        <div className="lg:col-span-2">
          <div className="sticky top-6">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5" /> ตัวอย่างการแสดงผล
            </p>
            <PreviewCard user={previewUser} />
            <p className="text-xs text-gray-300 mt-2 text-center">
              preview อัปเดตแบบ real-time ตามที่คุณแก้ไข
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
