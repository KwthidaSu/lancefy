import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ChevronLeft, ImageOff, X, ChevronRight, ChevronLeft as ChevLeft, FolderOpen } from "lucide-react";
import { getUserPortfolios, type FreelancerPortfolio, type PortfolioFile } from "@/services/portfolio.service";
import { getFreelancerProfile, type FreelancerProfile } from "@/services/freelancer.service";

/* ── Lightbox ── */
function Lightbox({
  files,
  index,
  onClose,
}: {
  files: PortfolioFile[];
  index: number;
  onClose: () => void;
}) {
  const [cur, setCur] = useState(index);
  const prev = () => setCur((i) => (i - 1 + files.length) % files.length);
  const next = () => setCur((i) => (i + 1) % files.length);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <button onClick={onClose} className="absolute top-4 right-4 text-white/70 hover:text-white z-10">
        <X className="w-7 h-7" />
      </button>
      <span className="absolute top-4 left-1/2 -translate-x-1/2 text-white/50 text-sm">{cur + 1} / {files.length}</span>

      {files.length > 1 && (
        <>
          <button onClick={(e) => { e.stopPropagation(); prev(); }} className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors">
            <ChevLeft className="w-6 h-6" />
          </button>
          <button onClick={(e) => { e.stopPropagation(); next(); }} className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors">
            <ChevronRight className="w-6 h-6" />
          </button>
        </>
      )}

      <img
        src={files[cur].file_url}
        alt=""
        className="max-h-[85vh] max-w-[90vw] rounded-2xl shadow-2xl object-contain"
        onClick={(e) => e.stopPropagation()}
      />

      {files.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
          {files.map((_, i) => (
            <button
              key={i}
              onClick={(e) => { e.stopPropagation(); setCur(i); }}
              className={`w-1.5 h-1.5 rounded-full transition-colors ${i === cur ? "bg-white" : "bg-white/30"}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Portfolio folder card ── */
function PortfolioCard({
  portfolio,
  onOpenImage,
}: {
  portfolio: FreelancerPortfolio;
  onOpenImage: (files: PortfolioFile[], index: number) => void;
}) {
  const preview = portfolio.files.slice(0, 4);
  const extra = portfolio.files.length - 4;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Card header */}
      <div className="px-5 pt-5 pb-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="font-semibold text-gray-900 text-base leading-snug">
              {portfolio.title || "Untitled"}
            </h3>
            {portfolio.description && (
              <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{portfolio.description}</p>
            )}
          </div>
          <span className="flex-shrink-0 text-xs text-gray-400 bg-gray-50 border border-gray-100 rounded-full px-2.5 py-0.5 mt-0.5">
            {portfolio.files.length} ไฟล์
          </span>
        </div>
      </div>

      {/* Image preview grid */}
      {portfolio.files.length === 0 ? (
        <div className="mx-5 mb-5 rounded-xl bg-gray-50 border border-dashed border-gray-200 py-8 flex flex-col items-center gap-2 text-gray-300">
          <ImageOff className="w-8 h-8" />
          <span className="text-xs">ยังไม่มีไฟล์</span>
        </div>
      ) : (
        <div className="px-5 pb-5">
          {preview.length === 1 ? (
            <button
              onClick={() => onOpenImage(portfolio.files, 0)}
              className="group relative w-full rounded-xl overflow-hidden aspect-video border border-gray-100"
            >
              <img src={preview[0].file_url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/15 transition-colors" />
            </button>
          ) : preview.length === 2 ? (
            <div className="grid grid-cols-2 gap-2">
              {preview.map((f, i) => (
                <button key={f.id} onClick={() => onOpenImage(portfolio.files, i)} className="group relative aspect-square rounded-xl overflow-hidden border border-gray-100">
                  <img src={f.file_url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/15 transition-colors" />
                </button>
              ))}
            </div>
          ) : preview.length === 3 ? (
            <div className="grid grid-cols-3 gap-2">
              {preview.map((f, i) => (
                <button key={f.id} onClick={() => onOpenImage(portfolio.files, i)} className="group relative aspect-square rounded-xl overflow-hidden border border-gray-100">
                  <img src={f.file_url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/15 transition-colors" />
                </button>
              ))}
            </div>
          ) : (
            /* 4 or more: 2-col masonry style */
            <div className="grid grid-cols-2 gap-2">
              {preview.map((f, i) => (
                <button
                  key={f.id}
                  onClick={() => onOpenImage(portfolio.files, i)}
                  className="group relative aspect-square rounded-xl overflow-hidden border border-gray-100"
                >
                  <img src={f.file_url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/15 transition-colors" />
                  {/* show "+N" overlay on last tile if more exist */}
                  {i === 3 && extra > 0 && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-xl">
                      <span className="text-white font-bold text-xl">+{extra}</span>
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Page ── */
export default function FreelancerPortfolioPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [portfolios, setPortfolios] = useState<FreelancerPortfolio[]>([]);
  const [profile, setProfile] = useState<FreelancerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [lightbox, setLightbox] = useState<{ files: PortfolioFile[]; index: number } | null>(null);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      getFreelancerProfile(id),
      getUserPortfolios(id).catch(() => ({ data: [] as FreelancerPortfolio[] })),
    ])
      .then(([p, ports]) => {
        setProfile(p.data);
        setPortfolios(ports.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  const displayName =
    profile?.display_name ||
    [profile?.firstname, profile?.lastname].filter(Boolean).join(" ") ||
    profile?.username || "";

  const initials = (
    profile?.display_name?.charAt(0) ??
    profile?.firstname?.charAt(0) ??
    profile?.username?.charAt(0) ??
    "?"
  ).toUpperCase();

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6 space-y-4">
        <div className="h-8 w-32 rounded bg-gray-100 animate-pulse" />
        <div className="h-24 rounded-2xl bg-gray-100 animate-pulse" />
        {[1, 2].map((i) => <div key={i} className="h-72 rounded-2xl bg-gray-100 animate-pulse" />)}
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-5">
      {/* Back */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700"
      >
        <ChevronLeft className="w-4 h-4" /> Back
      </button>

      {/* Freelancer identity bar */}
      {profile && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt={displayName} className="w-12 h-12 rounded-xl object-cover" />
            ) : (
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold">
                {initials}
              </div>
            )}
            <div>
              <p className="font-semibold text-gray-900">{displayName}</p>
              {profile.tagline && <p className="text-xs text-gray-500">{profile.tagline}</p>}
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-xs text-gray-400">Portfolio</p>
            <p className="text-sm font-semibold text-gray-700">{portfolios.length} โฟลเดอร์</p>
          </div>
        </div>
      )}

      {/* Empty state */}
      {portfolios.length === 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-14 text-center">
          <FolderOpen className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">ยังไม่มี portfolio</p>
          <p className="text-sm text-gray-400 mt-1">Freelancer นี้ยังไม่ได้อัปโหลดผลงาน</p>
        </div>
      )}

      {/* Portfolio cards */}
      {portfolios.map((pf) => (
        <PortfolioCard
          key={pf.id}
          portfolio={pf}
          onOpenImage={(files, index) => setLightbox({ files, index })}
        />
      ))}

      {/* Lightbox */}
      {lightbox && (
        <Lightbox
          files={lightbox.files}
          index={lightbox.index}
          onClose={() => setLightbox(null)}
        />
      )}
    </div>
  );
}
