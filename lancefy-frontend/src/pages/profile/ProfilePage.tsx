import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Pencil, Check, X, Loader2, FolderOpen, BadgeCheck,
  ShieldCheck, User, KeyRound, Camera,
} from "lucide-react";
import { useKeycloak } from "@react-keycloak/web";
import { authService } from "@/services/auth.service";
import type { CurrentUser } from "@/auth/auth.types";
import { uploadFile } from "@/services/files.service";
import { getUserDisplayName, getUserInitials } from "@/utils/user";

// ─────────────────────────────────────────────────────────────────────────────
// Small helper components
// ─────────────────────────────────────────────────────────────────────────────
function SectionCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-6">
      <div className="flex items-center gap-2 mb-5">
        <span className="text-gray-400">{icon}</span>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
          {title}
        </h2>
      </div>
      {children}
    </div>
  );
}

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-xs text-gray-400 mb-0.5">{label}</p>
      <p className="text-sm text-gray-800 font-medium">
        {value || <span className="text-gray-300 font-normal">—</span>}
      </p>
    </div>
  );
}

function EditField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  hint?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">
        {label}
        {hint && <span className="ml-1.5 text-gray-300 font-normal">{hint}</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white text-gray-800"
      />
    </div>
  );
}

function SaveBar({
  saving,
  onSave,
  onCancel,
}: {
  saving: boolean;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="flex gap-2 pt-1">
      <button
        onClick={onSave}
        disabled={saving}
        className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 disabled:opacity-60"
      >
        {saving ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <Check className="w-3.5 h-3.5" />
        )}
        {saving ? "กำลังบันทึก..." : "บันทึก"}
      </button>
      <button
        onClick={onCancel}
        className="px-4 py-2 text-sm text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50"
      >
        <X className="w-3.5 h-3.5 inline mr-1" />
        ยกเลิก
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────
export default function ProfilePage() {
  const navigate = useNavigate();
  const { keycloak } = useKeycloak();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);

  const [editSection, setEditSection] = useState<"personal" | "bio" | null>(null);
  const [saving, setSaving] = useState(false);

  const [editDisplayName, setEditDisplayName] = useState("");
  const [editFirstname, setEditFirstname] = useState("");
  const [editLastname, setEditLastname] = useState("");
  const [editUsername, setEditUsername] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editBio, setEditBio] = useState("");
  const [avatarUploading, setAvatarUploading] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarUploading(true);
    try {
      const { data } = await uploadFile(file, "avatar", user?.id);
      const updated = await authService.updateCurrentUser({ avatar_url: data.file_url });
      setUser(updated);
      syncStates(updated);
    } catch {
      // silent — could add toast here
    } finally {
      setAvatarUploading(false);
      if (avatarInputRef.current) avatarInputRef.current.value = "";
    }
  }

  useEffect(() => {
    authService
      .getCurrentUser()
      .then((u) => { setUser(u); syncStates(u); })
      .finally(() => setLoading(false));
  }, []);

  function syncStates(u: CurrentUser) {
    setEditDisplayName(u.display_name ?? "");
    setEditFirstname(u.firstname ?? "");
    setEditLastname(u.lastname ?? "");
    setEditUsername(u.username ?? "");
    setEditPhone(u.phone ?? "");
    setEditBio(u.bio ?? "");
  }

  function openEdit(section: typeof editSection) {
    if (user) syncStates(user);
    setEditSection(section);
  }

  async function save(payload: Partial<CurrentUser>) {
    setSaving(true);
    try {
      const updated = await authService.updateCurrentUser(payload);
      setUser(updated);
      syncStates(updated);
      setEditSection(null);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto p-6 space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 rounded-2xl bg-gray-100 animate-pulse" />
        ))}
      </div>
    );
  }

  if (!user) {
    return <div className="p-8 text-red-500">Failed to load profile.</div>;
  }

  const displayName = getUserDisplayName(user, "Unknown user");
  const initials = getUserInitials(user);

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-5">

      {/* Hero */}
      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-8 text-center">
        {/* Avatar with upload overlay */}
        <div className="relative mx-auto mb-4 h-20 w-20">
          {user.avatar_url ? (
            <img
              src={user.avatar_url}
              alt={displayName}
              className="h-20 w-20 rounded-full object-cover ring-4 ring-gray-50 shadow"
            />
          ) : (
            <div className="h-20 w-20 rounded-full bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center text-white text-2xl font-bold ring-4 ring-gray-50 shadow">
              {initials}
            </div>
          )}
          <button
            onClick={() => avatarInputRef.current?.click()}
            disabled={avatarUploading}
            className="absolute inset-0 rounded-full bg-black/40 opacity-0 hover:opacity-100 flex items-center justify-center transition-opacity disabled:opacity-60 cursor-pointer"
            title="เปลี่ยนรูปโปรไฟล์"
          >
            {avatarUploading ? (
              <Loader2 className="w-6 h-6 text-white animate-spin" />
            ) : (
              <Camera className="w-6 h-6 text-white" />
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

        <div className="flex items-center justify-center gap-2 flex-wrap">
          <h1 className="text-xl font-bold text-gray-900">{displayName}</h1>
          {user.kyc_status === "verified" && (
            <span className="inline-flex items-center gap-1 text-xs text-blue-600 font-medium bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
              <BadgeCheck className="w-3 h-3" /> Verified
            </span>
          )}
        </div>

        {user.tagline && <p className="text-sm text-gray-500 mt-1">{user.tagline}</p>}
        <p className="text-xs text-gray-400 mt-0.5">@{user.username}</p>

        <div className="mt-2 inline-flex items-center rounded-full px-3 py-1 text-xs font-medium bg-teal-50 text-teal-700 border border-teal-100">
          {user.status}
        </div>

        <div className="mt-5 flex items-center justify-center gap-3">
          <button
            onClick={() => openEdit("personal")}
            className="flex items-center gap-1.5 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-gray-700 transition-colors"
          >
            <Pencil className="w-3.5 h-3.5" /> แก้ไขโปรไฟล์
          </button>
        </div>
      </div>

      {/* Personal Info */}
      <SectionCard title="ข้อมูลส่วนตัว" icon={<User className="w-4 h-4" />}>
        {editSection === "personal" ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <EditField
                label="Display name"
                hint="(ชื่อที่แสดงหลัก)"
                value={editDisplayName}
                onChange={setEditDisplayName}
                placeholder="ชื่อที่ต้องการแสดง"
              />
              <EditField
                label="Username"
                value={editUsername}
                onChange={setEditUsername}
                placeholder="username"
              />
              <EditField
                label="First name"
                value={editFirstname}
                onChange={setEditFirstname}
                placeholder="ชื่อจริง"
              />
              <EditField
                label="Last name"
                value={editLastname}
                onChange={setEditLastname}
                placeholder="นามสกุล"
              />
              <EditField
                label="Phone"
                value={editPhone}
                onChange={setEditPhone}
                placeholder="+66 8x xxx xxxx"
                type="tel"
              />
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Email <span className="text-gray-300 font-normal">(แก้ไขไม่ได้)</span>
                </label>
                <input
                  disabled
                  value={user.email}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-gray-100 bg-gray-50 text-gray-400 cursor-not-allowed"
                />
              </div>
            </div>
            <SaveBar
              saving={saving}
              onSave={() =>
                save({
                  display_name: editDisplayName || undefined,
                  firstname: editFirstname || undefined,
                  lastname: editLastname || undefined,
                  username: editUsername || undefined,
                  phone: editPhone || undefined,
                })
              }
              onCancel={() => setEditSection(null)}
            />
          </div>
        ) : (
          <div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <Field label="Display name" value={user.display_name} />
              <Field label="Username" value={user.username ? `@${user.username}` : null} />
              <Field label="First name" value={user.firstname} />
              <Field label="Last name" value={user.lastname} />
              <Field label="Email" value={user.email} />
              <Field label="Phone" value={user.phone} />
            </div>
            <div className="mt-4 flex items-center gap-2">
              <span className={`inline-block w-2 h-2 rounded-full ${user.kyc_status === "verified" ? "bg-lime-500" : "bg-yellow-400"}`} />
              <span className="text-xs text-gray-500">
                KYC: <span className="font-medium">{user.kyc_status ?? "ยังไม่ยืนยัน"}</span>
              </span>
            </div>
            <button onClick={() => openEdit("personal")} className="mt-4 flex items-center gap-1.5 text-sm text-gray-400 hover:text-blue-600 transition-colors">
              <Pencil className="w-3.5 h-3.5" /> แก้ไข
            </button>
          </div>
        )}
      </SectionCard>

      {/* Bio */}
      <SectionCard title="เกี่ยวกับฉัน" icon={<User className="w-4 h-4" />}>
        {editSection === "bio" ? (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Bio</label>
              <textarea
                value={editBio}
                onChange={(e) => setEditBio(e.target.value)}
                rows={4}
                placeholder="แนะนำตัวเองสั้นๆ เช่น สิ่งที่ถนัด ประสบการณ์ สิ่งที่สนใจ..."
                className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none text-gray-800"
              />
            </div>
            <SaveBar saving={saving} onSave={() => save({ bio: editBio || undefined })} onCancel={() => setEditSection(null)} />
          </div>
        ) : (
          <div>
            {user.bio ? (
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{user.bio}</p>
            ) : (
              <p className="text-sm text-gray-300 italic">ยังไม่มีข้อความแนะนำตัว</p>
            )}
            <button onClick={() => openEdit("bio")} className="mt-4 flex items-center gap-1.5 text-sm text-gray-400 hover:text-blue-600 transition-colors">
              <Pencil className="w-3.5 h-3.5" /> แก้ไข
            </button>
          </div>
        )}
      </SectionCard>

      {/* Account & Security */}
      <SectionCard title="บัญชี และ ความปลอดภัย" icon={<KeyRound className="w-4 h-4" />}>
        <div className="space-y-3">
          <div className="flex items-center justify-between py-2 border-b border-gray-50">
            <div>
              <p className="text-sm font-medium text-gray-700">เปลี่ยนรหัสผ่าน</p>
              <p className="text-xs text-gray-400 mt-0.5">จัดการผ่าน Keycloak Account</p>
            </div>
            <button
              onClick={() => keycloak.accountManagement()}
              className="text-sm text-blue-600 hover:underline font-medium"
            >
              จัดการ
            </button>
          </div>
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-medium text-gray-700">การยืนยันตัวตน (KYC)</p>
              <p className="text-xs text-gray-400 mt-0.5">
                สถานะ:{" "}
                <span className={`font-medium ${user.kyc_status === "verified" ? "text-lime-600" : user.kyc_status === "pending" ? "text-yellow-600" : user.kyc_status === "rejected" ? "text-red-500" : "text-gray-500"}`}>
                  {user.kyc_status ?? "ยังไม่ยืนยัน"}
                </span>
              </p>
            </div>
            {user.kyc_status !== "verified" && (
              <button onClick={() => navigate("/app/kyc")} className="flex items-center gap-1.5 text-sm text-blue-600 hover:underline font-medium">
                <ShieldCheck className="w-4 h-4" /> ยืนยันตัวตน
              </button>
            )}
          </div>
          <div className="flex items-center justify-between py-2 border-t border-gray-50">
            <div>
              <p className="text-sm font-medium text-gray-700">การแจ้งเตือน</p>
              <p className="text-xs text-gray-400 mt-0.5">เลือกประเภทและช่องทางแจ้งเตือน</p>
            </div>
            <button
              onClick={() => navigate("/app/settings/notifications")}
              className="text-sm text-blue-600 hover:underline font-medium"
            >
              ตั้งค่า
            </button>
          </div>
        </div>
      </SectionCard>

      {/* Portfolio shortcut */}
      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-6 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-gray-700">Portfolio ผลงาน</h2>
          <p className="text-xs text-gray-400 mt-0.5">อัปโหลดและจัดการตัวอย่างผลงานของคุณ</p>
        </div>
        <button onClick={() => navigate("/app/portfolio")} className="flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:underline">
          <FolderOpen className="w-4 h-4" /> จัดการ Portfolio
        </button>
      </div>
    </div>
  );
}
