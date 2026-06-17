import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ChevronLeft, Star, CheckCircle2, ArrowRight } from "lucide-react";
import { getFreelancerProfile, type FreelancerProfile } from "@/services/freelancer.service";
import { getUserReviews, type ReviewResponse } from "@/services/review.service";

function Avatar({ user }: { user: FreelancerProfile }) {
  const label = (
    user.display_name?.charAt(0) ?? user.firstname?.charAt(0) ?? user.username?.charAt(0) ?? "?"
  ).toUpperCase();
  if (user.avatar_url) {
    return <img src={user.avatar_url} alt={user.username} className="w-24 h-24 rounded-2xl object-cover ring-4 ring-white shadow-lg" />;
  }
  return (
    <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 ring-4 ring-white shadow-lg flex items-center justify-center text-white text-3xl font-bold flex-shrink-0">
      {label}
    </div>
  );
}

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} className={`w-4 h-4 ${n <= rating ? "text-yellow-400 fill-yellow-400" : "text-gray-200 fill-gray-200"}`} />
      ))}
    </div>
  );
}

export default function FreelancerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<FreelancerProfile | null>(null);
  const [reviews, setReviews] = useState<ReviewResponse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      getFreelancerProfile(id),
      getUserReviews(id),
    ])
      .then(([p, r]) => {
        setProfile(p.data);
        setReviews(r.data);
      })
      .catch(() => setProfile(null))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto p-6 space-y-4">
        {[1, 2, 3].map((i) => <div key={i} className="h-32 rounded-2xl bg-gray-100 animate-pulse" />)}
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-500">User not found.</p>
        <button onClick={() => navigate(-1)} className="mt-3 text-sm text-blue-600 hover:underline">&larr; Back</button>
      </div>
    );
  }

  const displayName =
    profile.display_name ||
    [profile.firstname, profile.lastname].filter(Boolean).join(" ") ||
    profile.username;

  const avgRating = profile.avg_rating ?? null;
  const reviewCount = profile.review_count ?? reviews.length;

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-5">
      {/* Back */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700"
      >
        <ChevronLeft className="w-4 h-4" /> Back
      </button>

      {/* �� Section 1: Identity ����������������������������������������������� */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex flex-col sm:flex-row items-start gap-5">
          <Avatar user={profile} />
          <div className="flex-1 space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold text-gray-900">{displayName}</h1>
              {profile.kyc_status === "verified" && (
                <span className="inline-flex items-center gap-1 text-xs text-blue-600 font-medium bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                  <CheckCircle2 className="w-3 h-3" /> Verified
                </span>
              )}
            </div>
            {profile.tagline && <p className="text-gray-600">{profile.tagline}</p>}
            {profile.username && <p className="text-sm text-gray-400">@{profile.username}</p>}

            <div className="flex flex-wrap items-center gap-4 pt-1 text-sm text-gray-500">
              {avgRating !== null && (
                <span className="flex items-center gap-1.5">
                  <Stars rating={Math.round(avgRating)} />
                  <span className="font-medium text-gray-700">{avgRating.toFixed(1)}</span>
                  <span className="text-gray-400">({reviewCount} reviews)</span>
                </span>
              )}
            </div>
          </div>

          {/* Hourly rate */}
          {profile.hourly_rate && (
            <div className="text-right flex-shrink-0">
              <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">Hourly rate</p>
              <p className="text-2xl font-extrabold text-blue-600">฿{profile.hourly_rate.toLocaleString()}</p>
            </div>
          )}
        </div>
      </div>

      {/* �� Section 2: About �������������������������������������������������� */}
      {profile.bio && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">About</h2>
          <p className="text-gray-700 leading-relaxed">{profile.bio}</p>
        </div>
      )}

      {/* �� Section 3: Skills ������������������������������������������������� */}
      {profile.skills && profile.skills.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">Skills</h2>
          <div className="flex flex-wrap gap-2">
            {profile.skills.map((s) => (
              <span key={s.id} className="px-3 py-1 text-sm rounded-full bg-blue-50 text-blue-700 font-medium border border-blue-100">
                {s.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* �� Section 4: Portfolio CTA ������������������������������������������� */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 flex items-center justify-between text-white">
        <div>
          <p className="font-semibold text-lg">Portfolio</p>
          <p className="text-blue-100 text-sm mt-0.5">Browse past work and projects</p>
        </div>
        <button
          onClick={() => navigate(`/app/explore/freelancers/${id}/portfolio`)}
          className="flex items-center gap-2 bg-white text-blue-600 font-semibold px-5 py-2.5 rounded-xl hover:bg-blue-50 transition-colors"
        >
          View Portfolio <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* �� Section 5: Reviews ������������������������������������������������ */}
      {reviews.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">
            Reviews ({reviews.length})
          </h2>
          <div className="space-y-4">
            {reviews.slice(0, 5).map((r) => (
              <div key={r.id} className="pb-4 border-b border-gray-50 last:border-0 last:pb-0">
                <div className="flex items-center justify-between mb-1">
                  <Stars rating={r.rating} />
                  <span className="text-xs text-gray-400">
                    {new Date(r.created_at).toLocaleDateString("th-TH")}
                  </span>
                </div>
                {r.comment && <p className="text-sm text-gray-600 leading-relaxed">{r.comment}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
