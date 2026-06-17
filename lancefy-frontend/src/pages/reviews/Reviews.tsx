import { useEffect, useState } from "react";
import { authService } from "@/services/auth.service";
import type { CurrentUser } from "@/auth/auth.types";
import { getUserReviews } from "@/services/review.service";
import type { ReviewResponse } from "@/services/review.service";

function StarRow({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          className={`w-4 h-4 ${star <= rating ? "text-yellow-400 fill-current" : "text-gray-300"}`}
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

export default function Reviews() {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [reviews, setReviews] = useState<ReviewResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    authService.getCurrentUser().then(setCurrentUser).catch(() => null);
  }, []);

  useEffect(() => {
    if (!currentUser?.id) return;
    setLoading(true);
    setError(null);
    getUserReviews(currentUser.id)
      .then((res) => setReviews(res.data ?? []))
      .catch(() => setError("โหลด Review ไม่สำเร็จ"))
      .finally(() => setLoading(false));
  }, [currentUser]);

  const avgRating =
    reviews.length > 0
      ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
      : "—";

  if (loading) {
    return <div className="p-6 text-sm text-text-muted">กำลังโหลด...</div>;
  }

  if (error) {
    return <div className="p-6 text-sm text-danger">{error}</div>;
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Reviews ที่ได้รับ</h1>
        <p className="text-sm text-text-muted">รีวิวจากผู้ร่วมงาน</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-xl border border-border bg-white p-5">
          <div className="text-xs text-text-muted">Rating เฉลี่ย</div>
          <div className="text-4xl font-bold text-yellow-500 mt-1">{avgRating}</div>
          <div className="text-xs text-text-muted mt-1">จาก {reviews.length} รีวิว</div>
        </div>
        <div className="rounded-xl border border-border bg-white p-5">
          <div className="text-xs text-text-muted">รีวิวทั้งหมด</div>
          <div className="text-4xl font-bold text-text-primary mt-1">{reviews.length}</div>
        </div>
      </div>

      {reviews.length === 0 ? (
        <div className="rounded-xl border border-border bg-white p-10 text-center text-sm text-text-muted">
          ยังไม่มี Review
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-white divide-y divide-border">
          {reviews.map((review) => (
            <div key={review.id} className="p-5 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {review.reviewer_avatar_url ? (
                    <img
                      src={review.reviewer_avatar_url}
                      alt=""
                      className="w-7 h-7 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-xs text-gray-500">
                      {(review.reviewer_display_name ?? review.reviewer_username ?? "?")[0].toUpperCase()}
                    </div>
                  )}
                  <span className="text-sm font-medium text-text-primary">
                    {review.reviewer_display_name ?? review.reviewer_username ?? `#${review.reviewer_id.slice(0, 8)}`}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <StarRow rating={review.rating} />
                  <span className="text-sm font-semibold text-text-primary">
                    {review.rating}
                  </span>
                </div>
              </div>
              {review.comment && (
                <p className="text-sm text-text-primary whitespace-pre-wrap">{review.comment}</p>
              )}
              <div className="text-xs text-text-muted">
                {new Date(review.created_at).toLocaleDateString("th-TH", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
