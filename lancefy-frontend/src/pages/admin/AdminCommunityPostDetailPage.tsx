import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  HiMiniFlag,
  HiOutlineArrowLeft,
  HiOutlineArrowPath,
  HiOutlineCalendar,
  HiOutlineChatBubbleLeftEllipsis,
  HiOutlineExclamationTriangle,
  HiOutlineEye,
  HiOutlineEye as HiOutlineEyeOpen,
  HiOutlineEyeSlash,
  HiOutlineHeart,
  HiOutlinePhoto,
  HiOutlineTrash,
  HiOutlineUser,
  HiOutlineXMark,
} from "react-icons/hi2";

import { useToast } from "@/components/ui/Toast";
import { authHttp } from "@/lib/authHttp";

interface PostAuthor {
  id: string;
  username: string;
  display_name?: string;
  avatar_url?: string;
}

interface PostDetail {
  id: string;
  author: PostAuthor | null;
  category: string;
  content: string | null;
  is_public: boolean;
  view_count: number;
  reaction_count: number;
  comment_count: number;
  images: { id: string; url: string }[];
  created_at: string;
  deleted_at?: string | null;
}

interface Comment {
  id: string;
  content: string;
  author: PostAuthor | null;
  parent_comment_id: string | null;
  created_at: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  general: "General",
  artwork: "Artwork",
  coding: "Coding",
  design: "Design",
  writing: "Writing",
};

const CATEGORY_COLORS: Record<string, string> = {
  general: "border border-slate-200 bg-slate-100 text-slate-700",
  artwork: "border border-purple-200 bg-purple-50 text-purple-700",
  coding: "border border-blue-200 bg-blue-50 text-blue-700",
  design: "border border-pink-200 bg-pink-50 text-pink-700",
  writing: "border border-amber-200 bg-amber-50 text-amber-700",
};

const VIOLATION_REASONS = [
  "Inappropriate or explicit content",
  "Spam or excessive promotion",
  "Misleading content or scam",
  "Harassment or hate speech",
  "Copyright or ownership violation",
  "Off-topic content",
  "Other",
];

const surfaceClass =
  "rounded-[28px] border border-slate-200/80 bg-white shadow-[0_18px_40px_rgba(15,23,42,0.06)]";

function Avatar({
  src,
  name,
  size = "md",
}: {
  src?: string;
  name?: string;
  size?: "sm" | "md" | "lg";
}) {
  const cls =
    size === "lg"
      ? "h-12 w-12 text-base"
      : size === "sm"
      ? "h-7 w-7 text-xs"
      : "h-9 w-9 text-sm";
  const letter = (name || "?")[0].toUpperCase();

  return (
    <div
      className={`${cls} flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 font-bold text-white`}
    >
      {src ? (
        <img src={src} alt="" className="h-full w-full object-cover" />
      ) : (
        letter
      )}
    </div>
  );
}

interface ReasonModalProps {
  title: string;
  description?: string;
  actionLabel: string;
  actionClass: string;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}

function ReasonModal({
  title,
  description,
  actionLabel,
  actionClass,
  onConfirm,
  onCancel,
}: ReasonModalProps) {
  const [selected, setSelected] = useState("");
  const [custom, setCustom] = useState("");
  const reason = selected === "Other" ? custom : selected;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-[28px] border border-slate-200/80 bg-white shadow-[0_24px_60px_rgba(15,23,42,0.18)]">
        <div className="flex items-start gap-3 border-b border-slate-200/80 p-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
            <HiOutlineExclamationTriangle className="h-5 w-5 text-red-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-slate-900">{title}</h3>
            {description ? (
              <p className="mt-0.5 text-sm text-slate-500">{description}</p>
            ) : null}
          </div>
          <button
            onClick={onCancel}
            className="rounded-xl p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <HiOutlineXMark className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-3 p-5">
          <p className="text-sm font-medium text-slate-900">
            Reason{" "}
            <span className="font-normal text-slate-400">
              (used in the owner notification)
            </span>
          </p>
          <div className="space-y-2">
            {VIOLATION_REASONS.map((reasonOption) => (
              <label
                key={reasonOption}
                className="group flex cursor-pointer items-center gap-2.5"
              >
                <div
                  className={`flex h-4 w-4 items-center justify-center rounded-full border-2 transition-colors ${
                    selected === reasonOption
                      ? "border-blue-700 bg-blue-700"
                      : "border-slate-300 group-hover:border-blue-400"
                  }`}
                >
                  {selected === reasonOption && (
                    <div className="h-1.5 w-1.5 rounded-full bg-white" />
                  )}
                </div>
                <input
                  type="radio"
                  className="sr-only"
                  value={reasonOption}
                  checked={selected === reasonOption}
                  onChange={() => setSelected(reasonOption)}
                />
                <span className="text-sm text-slate-600 transition group-hover:text-slate-900">
                  {reasonOption}
                </span>
              </label>
            ))}
          </div>
          {selected === "Other" && (
            <textarea
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              placeholder="Add more details..."
              rows={2}
              className="mt-1 w-full resize-none rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
            />
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-5 pb-5">
          <button
            onClick={onCancel}
            className="rounded-2xl border border-slate-200 px-4 py-2 text-sm text-slate-600 transition hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(reason)}
            className={`rounded-2xl px-4 py-2 text-sm font-medium transition-colors ${actionClass}`}
          >
            {actionLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function Lightbox({
  images,
  index,
  onClose,
}: {
  images: string[];
  index: number;
  onClose: () => void;
}) {
  const [current, setCurrent] = useState(index);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") {
        setCurrent((prev) => Math.min(prev + 1, images.length - 1));
      }
      if (e.key === "ArrowLeft") {
        setCurrent((prev) => Math.max(prev - 1, 0));
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [images.length, onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90"
      onClick={onClose}
    >
      <button className="absolute right-4 top-4 rounded-2xl bg-white/10 p-2 text-white/80 transition hover:bg-white/20 hover:text-white">
        <HiOutlineXMark className="h-7 w-7" />
      </button>
      <img
        src={images[current]}
        className="max-h-[90vh] max-w-[90vw] rounded-[24px] object-contain"
        onClick={(e) => e.stopPropagation()}
      />
      {images.length > 1 && (
        <div className="absolute bottom-4 flex gap-2">
          {images.map((_, i) => (
            <button
              key={i}
              onClick={(e) => {
                e.stopPropagation();
                setCurrent(i);
              }}
              className={`h-2 w-2 rounded-full transition-colors ${
                i === current ? "bg-white" : "bg-white/40"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function AdminCommunityPostDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [post, setPost] = useState<PostDetail | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [cmtLoading] = useState(false);
  const [acting, setActing] = useState(false);
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);

  type ModalState =
    | { kind: "hide" }
    | { kind: "delete-post" }
    | { kind: "delete-comment"; commentId: string; excerpt: string }
    | null;
  const [modal, setModal] = useState<ModalState>(null);

  const loadPost = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [postRes, cmtRes] = await Promise.all([
        authHttp.get<PostDetail>(`/community/admin/posts/${id}`),
        authHttp.get<{ data: Comment[] }>(
          `/community/admin/posts/${id}/comments?limit=100`
        ),
      ]);
      setPost(postRes.data);
      setComments(cmtRes.data.data);
    } catch {
      showToast("Unable to load the post detail.", "error");
    } finally {
      setLoading(false);
    }
  }, [id, showToast]);

  useEffect(() => {
    loadPost();
  }, [loadPost]);

  const doHide = async (reason: string) => {
    setModal(null);
    setActing(true);
    try {
      await authHttp.patch(`/community/admin/posts/${id}/close`, {
        reason: reason || null,
      });
      showToast("Post hidden and owner notified.", "success");
      setPost((prev) => (prev ? { ...prev, is_public: false } : prev));
    } catch {
      showToast("Unable to update the post status.", "error");
    } finally {
      setActing(false);
    }
  };

  const doReopen = async () => {
    setActing(true);
    try {
      await authHttp.patch(`/community/admin/posts/${id}/reopen`);
      showToast("Post restored to the feed and owner notified.", "success");
      setPost((prev) => (prev ? { ...prev, is_public: true } : prev));
    } catch {
      showToast("Unable to restore this post.", "error");
    } finally {
      setActing(false);
    }
  };

  const doDeletePost = async (reason: string) => {
    setModal(null);
    setActing(true);
    try {
      const q = reason ? `?reason=${encodeURIComponent(reason)}` : "";
      await authHttp.delete(`/community/admin/posts/${id}${q}`);
      showToast("Post deleted and owner notified.", "success");
      navigate("/admin/community", { replace: true });
    } catch {
      showToast("Unable to delete this post.", "error");
    } finally {
      setActing(false);
    }
  };

  const doDeleteComment = async (commentId: string, reason: string) => {
    setModal(null);
    try {
      const q = reason ? `?reason=${encodeURIComponent(reason)}` : "";
      await authHttp.delete(`/community/admin/comments/${commentId}${q}`);
      showToast("Comment deleted and owner notified.", "success");
      setComments((prev) => prev.filter((comment) => comment.id !== commentId));
      setPost((prev) =>
        prev ? { ...prev, comment_count: Math.max(0, prev.comment_count - 1) } : prev
      );
    } catch {
      showToast("Unable to delete this comment.", "error");
    }
  };

  const fmt = (date: string) =>
    new Date(date).toLocaleString("en-US", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  if (loading) {
    return (
      <div className="flex min-h-64 items-center justify-center gap-3 text-slate-400">
        <HiOutlineArrowPath className="h-6 w-6 animate-spin" />
        <span>Loading post detail...</span>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="flex min-h-64 flex-col items-center justify-center gap-3 text-slate-400">
        <HiMiniFlag className="h-10 w-10 opacity-20" />
        <span>Post not found.</span>
      </div>
    );
  }

  const imageUrls = post.images.map((image) => image.url);
  const isDeleted = !!post.deleted_at;

  return (
    <>
      {modal?.kind === "hide" && (
        <ReasonModal
          title="Hide post from feed"
          actionLabel="Hide and notify owner"
          actionClass="bg-amber-500 text-white hover:bg-amber-600"
          onConfirm={doHide}
          onCancel={() => setModal(null)}
        />
      )}
      {modal?.kind === "delete-post" && (
        <ReasonModal
          title="Delete post permanently"
          description="This action cannot be undone."
          actionLabel="Delete and notify owner"
          actionClass="bg-red-600 text-white hover:bg-red-700"
          onConfirm={doDeletePost}
          onCancel={() => setModal(null)}
        />
      )}
      {modal?.kind === "delete-comment" && (
        <ReasonModal
          title="Delete comment"
          description={`"${modal.excerpt}"`}
          actionLabel="Delete and notify owner"
          actionClass="bg-red-600 text-white hover:bg-red-700"
          onConfirm={(reason) => doDeleteComment(modal.commentId, reason)}
          onCancel={() => setModal(null)}
        />
      )}
      {lightboxIdx !== null && (
        <Lightbox
          images={imageUrls}
          index={lightboxIdx}
          onClose={() => setLightboxIdx(null)}
        />
      )}

      <div className="mx-auto w-full max-w-[1400px] space-y-6">
        <section
          className={`${surfaceClass} flex flex-col gap-5 p-6 sm:flex-row sm:items-start sm:justify-between sm:p-8`}
        >
          <div className="max-w-3xl">
            <button
              onClick={() => navigate("/admin/community")}
              className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-800"
            >
              <HiOutlineArrowLeft className="h-4 w-4" />
              Back to moderation
            </button>

            <span className="mt-4 inline-flex items-center rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
              Admin
            </span>
            <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-900">
              Community Post Review
            </h1>
            <p className="mt-3 text-sm leading-7 text-slate-500">
              Inspect the content, attachments, comment thread, and moderation
              status before taking any final action on this post.
            </p>
          </div>

          {!isDeleted && (
            <div className="flex flex-wrap gap-2">
              {post.is_public ? (
                <button
                  disabled={acting}
                  onClick={() => setModal({ kind: "hide" })}
                  className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-700 transition hover:bg-amber-100 disabled:opacity-50"
                >
                  <span className="inline-flex items-center gap-2">
                    <HiOutlineEyeSlash className="h-4 w-4" />
                    Hide post
                  </span>
                </button>
              ) : (
                <button
                  disabled={acting}
                  onClick={doReopen}
                  className="rounded-2xl border border-lime-200 bg-lime-50 px-4 py-2.5 text-sm font-semibold text-lime-700 transition hover:bg-lime-100 disabled:opacity-50"
                >
                  <span className="inline-flex items-center gap-2">
                    <HiOutlineEye className="h-4 w-4" />
                    Restore to feed
                  </span>
                </button>
              )}
              <button
                disabled={acting}
                onClick={() => setModal({ kind: "delete-post" })}
                className="rounded-2xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:opacity-50"
              >
                <span className="inline-flex items-center gap-2">
                  <HiOutlineTrash className="h-4 w-4" />
                  Delete permanently
                </span>
              </button>
            </div>
          )}
        </section>

        {!post.is_public && !isDeleted && (
          <div className="rounded-[24px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 shadow-sm shadow-amber-100/60">
            <div className="flex items-center gap-2">
              <HiOutlineEyeSlash className="h-4 w-4 shrink-0" />
              <span>
                This post is hidden from the public feed and is only visible in
                moderation tools.
              </span>
            </div>
          </div>
        )}
        {isDeleted && (
          <div className="rounded-[24px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 shadow-sm shadow-red-100/60">
            <div className="flex items-center gap-2">
              <HiOutlineTrash className="h-4 w-4 shrink-0" />
              <span>This post has already been deleted.</span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-6">
            <section className={`${surfaceClass} overflow-hidden`}>
              <div className="border-b border-slate-200/80 p-5 sm:p-6">
                <div className="flex items-start gap-4">
                  <Avatar
                    src={post.author?.avatar_url}
                    name={post.author?.display_name || post.author?.username}
                    size="lg"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-slate-900">
                        {post.author?.display_name ||
                          post.author?.username ||
                          "Unknown user"}
                      </span>
                      <span className="text-sm text-slate-400">
                        @{post.author?.username}
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                          CATEGORY_COLORS[post.category] ??
                          "border border-slate-200 bg-slate-100 text-slate-700"
                        }`}
                      >
                        {CATEGORY_LABELS[post.category] ?? post.category}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-1 text-xs text-slate-400">
                      <HiOutlineCalendar className="h-3.5 w-3.5" />
                      {fmt(post.created_at)}
                    </div>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                      post.is_public
                        ? "border border-lime-200 bg-lime-50 text-lime-700"
                        : "border border-amber-200 bg-amber-50 text-amber-700"
                    }`}
                  >
                    {post.is_public ? "Visible" : "Hidden"}
                  </span>
                </div>
              </div>

              <div className="p-5 sm:p-6">
                {post.content ? (
                  <p className="whitespace-pre-wrap text-base leading-8 text-slate-700">
                    {post.content}
                  </p>
                ) : (
                  <p className="text-sm italic text-slate-400">
                    [No text content]
                  </p>
                )}
              </div>

              {imageUrls.length > 0 && (
                <div className="px-5 pb-5 sm:px-6 sm:pb-6">
                  <div
                    className={`grid gap-2 ${
                      imageUrls.length === 1
                        ? ""
                        : imageUrls.length === 2
                        ? "grid-cols-2"
                        : "grid-cols-2 lg:grid-cols-3"
                    }`}
                  >
                    {imageUrls.map((url, index) => (
                      <button
                        key={index}
                        onClick={() => setLightboxIdx(index)}
                        className={`overflow-hidden rounded-[22px] border border-slate-200 bg-slate-50 transition hover:opacity-90 ${
                          imageUrls.length === 1 ? "" : "aspect-square"
                        }`}
                      >
                        <img
                          src={url}
                          alt=""
                          className={`w-full object-cover ${
                            imageUrls.length === 1
                              ? "max-h-[520px] object-contain"
                              : "h-full"
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                  <p className="mt-3 flex items-center gap-1 text-xs text-slate-400">
                    <HiOutlinePhoto className="h-3.5 w-3.5" />
                    {imageUrls.length} image{imageUrls.length > 1 ? "s" : ""} —
                    click to view larger
                  </p>
                </div>
              )}
            </section>

            <section className={`${surfaceClass} overflow-hidden`}>
              <div className="flex items-center gap-2 border-b border-slate-200/80 px-5 py-4 sm:px-6">
                <HiOutlineChatBubbleLeftEllipsis className="h-5 w-5 text-blue-700" />
                <h2 className="font-semibold text-slate-900">
                  Comments
                  <span className="ml-2 text-sm font-normal text-slate-400">
                    ({comments.length})
                  </span>
                </h2>
              </div>

              {cmtLoading ? (
                <div className="flex items-center gap-2 p-5 text-sm text-slate-400 sm:p-6">
                  <HiOutlineArrowPath className="h-4 w-4 animate-spin" />
                  Loading comments...
                </div>
              ) : comments.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 py-12 text-slate-400">
                  <HiOutlineChatBubbleLeftEllipsis className="h-8 w-8 opacity-20" />
                  <span className="text-sm">No comments</span>
                </div>
              ) : (
                <div className="divide-y divide-slate-200/70">
                  {comments.map((comment) => (
                    <div
                      key={comment.id}
                      className="group flex items-start gap-3 px-5 py-4 transition hover:bg-slate-50 sm:px-6"
                    >
                      {comment.parent_comment_id && <div className="w-4 shrink-0" />}
                      <Avatar
                        src={comment.author?.avatar_url}
                        name={comment.author?.display_name || comment.author?.username}
                        size="sm"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold text-slate-900">
                            {comment.author?.display_name ||
                              comment.author?.username ||
                              "Unknown"}
                          </span>
                          <span className="text-xs text-slate-400">
                            @{comment.author?.username}
                          </span>
                          {comment.parent_comment_id && (
                            <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-400">
                              ↳ reply
                            </span>
                          )}
                          <span className="ml-auto text-xs text-slate-400">
                            {fmt(comment.created_at)}
                          </span>
                        </div>
                        <p className="break-words text-sm leading-relaxed text-slate-600">
                          {comment.content}
                        </p>
                      </div>
                      <button
                        onClick={() =>
                          setModal({
                            kind: "delete-comment",
                            commentId: comment.id,
                            excerpt:
                              comment.content.length > 60
                                ? `${comment.content.slice(0, 60)}...`
                                : comment.content,
                          })
                        }
                        className="mt-0.5 shrink-0 rounded-xl p-1.5 text-red-400 opacity-0 transition hover:bg-red-50 group-hover:opacity-100"
                        title="Delete comment"
                      >
                        <HiOutlineTrash className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          <aside className="space-y-4">
            <section className={`${surfaceClass} p-5`}>
              <h3 className="mb-3 text-sm font-semibold text-slate-900">
                Engagement
              </h3>
              <div className="space-y-3">
                {[
                  {
                    icon: <HiOutlineEyeOpen className="h-4 w-4" />,
                    label: "Views",
                    value: post.view_count.toLocaleString(),
                  },
                  {
                    icon: <HiOutlineHeart className="h-4 w-4" />,
                    label: "Reactions",
                    value: post.reaction_count,
                  },
                  {
                    icon: <HiOutlineChatBubbleLeftEllipsis className="h-4 w-4" />,
                    label: "Comments",
                    value: comments.length,
                  },
                  {
                    icon: <HiOutlinePhoto className="h-4 w-4" />,
                    label: "Images",
                    value: post.images.length,
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="flex items-center gap-2 text-slate-500">
                      <span className="text-slate-400">{item.icon}</span>
                      {item.label}
                    </span>
                    <span className="font-semibold text-slate-900">
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            <section className={`${surfaceClass} p-5`}>
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
                <HiOutlineUser className="h-4 w-4 text-slate-400" />
                Author
              </h3>
              <div className="flex items-center gap-3">
                <Avatar
                  src={post.author?.avatar_url}
                  name={post.author?.display_name || post.author?.username}
                  size="md"
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900">
                    {post.author?.display_name || post.author?.username}
                  </p>
                  <p className="truncate text-xs text-slate-400">
                    @{post.author?.username}
                  </p>
                </div>
              </div>
              {post.author?.id && (
                <button
                  onClick={() =>
                    navigate(`/admin/users?search=${post.author?.username}`)
                  }
                  className="mt-4 w-full rounded-2xl border border-slate-200 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
                >
                  Open in admin users
                </button>
              )}
            </section>

            <section className={`${surfaceClass} p-5`}>
              <h3 className="mb-3 text-sm font-semibold text-slate-900">
                Post info
              </h3>
              <div className="space-y-2 text-xs text-slate-500">
                <div className="flex justify-between gap-2">
                  <span>Post ID</span>
                  <span
                    className="max-w-32 truncate font-mono text-[11px] text-slate-900"
                    title={post.id}
                  >
                    {post.id.slice(0, 8)}...
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span>Category</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                      CATEGORY_COLORS[post.category] ??
                      "border border-slate-200 bg-slate-100 text-slate-700"
                    }`}
                  >
                    {CATEGORY_LABELS[post.category] ?? post.category}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span>Status</span>
                  <span
                    className={`font-medium ${
                      post.is_public ? "text-lime-700" : "text-amber-700"
                    }`}
                  >
                    {post.is_public ? "Visible" : "Hidden"}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span>Created</span>
                  <span className="text-right text-[11px] text-slate-900">
                    {fmt(post.created_at)}
                  </span>
                </div>
              </div>
            </section>

            {!isDeleted && (
              <section className={`${surfaceClass} p-5`}>
                <h3 className="mb-3 text-sm font-semibold text-slate-900">
                  Quick actions
                </h3>
                <div className="space-y-2">
                  {post.is_public ? (
                    <button
                      disabled={acting}
                      onClick={() => setModal({ kind: "hide" })}
                      className="w-full rounded-2xl border border-amber-200 bg-amber-50 py-2.5 text-sm font-semibold text-amber-700 transition hover:bg-amber-100 disabled:opacity-50"
                    >
                      <span className="inline-flex items-center gap-2">
                        <HiOutlineEyeSlash className="h-4 w-4" />
                        Hide from feed
                      </span>
                    </button>
                  ) : (
                    <button
                      disabled={acting}
                      onClick={doReopen}
                      className="w-full rounded-2xl border border-lime-200 bg-lime-50 py-2.5 text-sm font-semibold text-lime-700 transition hover:bg-lime-100 disabled:opacity-50"
                    >
                      <span className="inline-flex items-center gap-2">
                        <HiOutlineEye className="h-4 w-4" />
                        Restore to feed
                      </span>
                    </button>
                  )}
                  <button
                    disabled={acting}
                    onClick={() => setModal({ kind: "delete-post" })}
                    className="w-full rounded-2xl border border-red-200 bg-red-50 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:opacity-50"
                  >
                    <span className="inline-flex items-center gap-2">
                      <HiOutlineTrash className="h-4 w-4" />
                      Delete permanently
                    </span>
                  </button>
                </div>
              </section>
            )}
          </aside>
        </div>
      </div>
    </>
  );
}
