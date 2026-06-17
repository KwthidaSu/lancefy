import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { createReview } from "@/services/review.service";
import { useToast } from "@/components/ui/Toast";

export default function CreateReview() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { showToast } = useToast();

  const projectId = searchParams.get("projectId") ?? "";
  const revieweeId = searchParams.get("revieweeId") ?? "";
  const revieweeName = searchParams.get("revieweeName") ?? "ผู้ใช้";
  const projectTitle = searchParams.get("projectTitle") ?? "";

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [hoveredStar, setHoveredStar] = useState(0);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (rating === 0 || !projectId || !revieweeId) return;

    try {
      setLoading(true);
      await createReview({
        project_id: projectId,
        reviewee_id: revieweeId,
        rating,
        comment: comment.trim() || undefined,
      });
      showToast("ส่ง Review เรียบร้อย", "success");
      navigate("/app/reviews");
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        "ส่ง Review ไม่สำเร็จ";
      showToast(message, "error");
    } finally {
      setLoading(false);
    }
  };

  if (!projectId || !revieweeId) {
    return (
      <div className="p-6 text-sm text-text-muted">
        ข้อมูลไม่ครบ — กรุณาเข้าผ่านหน้าโปรเจกต์
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="text-sm text-text-muted hover:text-primary-foreground"
      >
        ← กลับ
      </button>

      <div className="rounded-xl border border-border bg-white p-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary mb-1">
            เขียน Review
          </h1>
          {projectTitle && (
            <p className="text-text-muted text-sm">
              โปรเจกต์: <span className="font-semibold">{projectTitle}</span>
            </p>
          )}
          <p className="text-text-muted text-sm">
            สำหรับ: <span className="font-semibold">{revieweeName}</span>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              คะแนน
            </label>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  className="focus:outline-none"
                  onMouseEnter={() => setHoveredStar(star)}
                  onMouseLeave={() => setHoveredStar(0)}
                  onClick={() => setRating(star)}
                >
                  <svg
                    className={`w-8 h-8 transition-colors ${
                      star <= (hoveredStar || rating)
                        ? "text-yellow-400 fill-current"
                        : "text-gray-300"
                    }`}
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                </button>
              ))}
            </div>
            <p className="text-sm text-text-muted mt-2">
              {rating === 0 ? "เลือกคะแนน" : `คุณให้ ${rating} ดาว`}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              ความคิดเห็น
            </label>
            <textarea
              className="w-full p-3 rounded-lg border border-border bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-accent-foreground/30 h-32"
              placeholder="แบ่งปันประสบการณ์การทำงาน..."
              value={comment}
              onChange={(event) => setComment(event.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => navigate(-1)}
              disabled={loading}
              className="px-4 py-2 rounded-lg border border-border text-sm font-medium text-text-primary"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={rating === 0 || loading}
              className="px-4 py-2 rounded-lg bg-accent-foreground text-white text-sm font-semibold disabled:opacity-60"
            >
              {loading ? "กำลังส่ง..." : "ส่ง Review"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
