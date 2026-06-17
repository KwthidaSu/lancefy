import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  X, Plus, Image as ImageIcon, Search,
  Heart, MessageCircle, Share2, Send, Trash2, MoreHorizontal, Users,
  Loader2, Globe, Lock, PenLine, LayoutGrid,
} from "lucide-react";
import {
  communityService,
  type CommunityPost,
  type CommunityImage,
  type CommunityComment,
  type CommunityAuthor,
} from "@/services/community.service";
import { authService } from "@/services/auth.service";
import { chatService } from "@/services/chat.service";
import type { CurrentUser } from "@/auth/auth.types";
import Modal from "@/components/ui/Modal";
import ImageLightbox from "@/components/ui/ImageLightbox";


/* ─── constants ─── */

const CATEGORIES = [
  { label: "ทั้งหมด", value: "" },
  { label: "ทั่วไป", value: "general" },
  { label: "Artwork", value: "artwork" },
  { label: "Coding", value: "coding" },
  { label: "Design", value: "design" },
  { label: "Writing", value: "writing" },
];

const LIMIT = 10;
const CATEGORY_LABEL_KEYS: Record<string, string> = {
  "": "communityPage.categories.all",
  general: "communityPage.categories.general",
  artwork: "communityPage.categories.artwork",
  coding: "communityPage.categories.coding",
  design: "communityPage.categories.design",
  writing: "communityPage.categories.writing",
};

const SORT_LABEL_KEYS: Record<string, string> = {
  latest: "communityPage.sort.latest",
  reactions: "communityPage.sort.reactions",
  views: "communityPage.sort.views",
};

/* ─── helpers ─── */

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "เมื่อกี้นี้";
  if (mins < 60) return `${mins} นาทีที่แล้ว`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} ชั่วโมงที่แล้ว`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} วันที่แล้ว`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} เดือนที่แล้ว`;
  return `${Math.floor(months / 12)} ปีที่แล้ว`;
}

function authorDisplayName(author: CommunityAuthor | CurrentUser | null | undefined): string {
  if (!author) return "Anonymous";
  return (
    ("display_name" in author ? author.display_name : undefined) ||
    [author.firstname, author.lastname].filter(Boolean).join(" ") ||
    `@${author.username}` ||
    "Anonymous"
  );
}

function AvatarCircle({
  user,
  size = "md",
}: {
  user?: CommunityAuthor | CurrentUser | null;
  size?: "sm" | "md" | "lg";
}) {
  const sz =
    size === "sm"
      ? "w-7 h-7 text-xs"
      : size === "lg"
      ? "w-12 h-12 text-base"
      : "w-9 h-9 text-sm";
  if (user?.avatar_url)
    return (
      <img
        src={user.avatar_url}
        className={`${sz} rounded-full object-cover ring-2 ring-white flex-shrink-0`}
      />
    );
  const init = (
    user?.firstname?.charAt(0) ??
    user?.username?.charAt(0) ??
    "?"
  ).toUpperCase();
  return (
    <div
      className={`${sz} rounded-full bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-white font-bold ring-2 ring-white flex-shrink-0`}
    >
      {init}
    </div>
  );
}

/* ─── ImageGrid ─── */

function ImageGrid({ images, onOpen }: { images: string[]; onOpen: (i: number) => void }) {
  const n = images.length;
  if (n === 0) return null;
  if (n === 1)
    return (
      <div className="aspect-video w-full cursor-pointer overflow-hidden rounded-[20px] bg-slate-100" onClick={() => onOpen(0)}>
        <img src={images[0]} alt="" className="w-full h-full object-cover hover:opacity-95 transition-opacity" />
      </div>
    );
  if (n === 2)
    return (
      <div className="grid aspect-[16/9] w-full grid-cols-2 gap-1 overflow-hidden rounded-[20px]">
        {images.map((src, i) => (
          <div key={i} className="overflow-hidden bg-gray-100 cursor-pointer" onClick={() => onOpen(i)}>
            <img src={src} alt="" className="w-full h-full object-cover hover:opacity-95 transition-opacity" />
          </div>
        ))}
      </div>
    );
  if (n === 3)
    return (
      <div className="grid w-full grid-cols-2 gap-1 overflow-hidden rounded-[20px]" style={{ gridTemplateRows: "1fr 1fr" }}>
        <div className="row-span-2 overflow-hidden bg-gray-100 aspect-[4/5] cursor-pointer" onClick={() => onOpen(0)}>
          <img src={images[0]} alt="" className="w-full h-full object-cover hover:opacity-95 transition-opacity" />
        </div>
        {images.slice(1, 3).map((src, i) => (
          <div key={i} className="overflow-hidden bg-gray-100 cursor-pointer" onClick={() => onOpen(i + 1)}>
            <img src={src} alt="" className="w-full h-full object-cover hover:opacity-95 transition-opacity" />
          </div>
        ))}
      </div>
    );
  const show = images.slice(0, 4);
  const extra = n - 4;
  return (
    <div className="grid aspect-square w-full grid-cols-2 gap-1 overflow-hidden rounded-[20px]">
      {show.map((src, i) => (
        <div key={i} className="relative overflow-hidden bg-gray-100 cursor-pointer" onClick={() => onOpen(i)}>
          <img src={src} alt="" className="w-full h-full object-cover hover:opacity-95 transition-opacity" />
          {i === 3 && extra > 0 && (
            <div className="absolute inset-0 bg-black/55 flex items-center justify-center pointer-events-none">
              <span className="text-white text-2xl font-bold">+{extra}</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/* ─── CommentsSection ─── */

function ReplyItem({
  reply,
  currentUser,
  onDelete,
}: {
  reply: CommunityComment;
  currentUser: CurrentUser | null;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="flex items-start gap-2 pl-8">
      <AvatarCircle user={reply.author} size="sm" />
      <div className="flex-1 bg-white rounded-2xl px-3 py-2">
        <div className="flex items-baseline justify-between gap-2">
          <span className="font-semibold text-gray-800 text-xs">{authorDisplayName(reply.author)}</span>
          <span className="text-[11px] text-gray-400 flex-shrink-0">{timeAgo(reply.created_at)}</span>
        </div>
        <p className="text-gray-600 text-xs mt-0.5">{reply.content}</p>
      </div>
      {currentUser?.id === reply.user_id && (
        <button onClick={(e) => { e.stopPropagation(); onDelete(reply.id); }} className="text-gray-300 hover:text-red-400 transition-colors mt-1.5">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

function CommentItem({
  comment,
  postId,
  currentUser,
  onDelete,
  onReplyAdded,
}: {
  comment: CommunityComment;
  postId: string;
  currentUser: CurrentUser | null;
  onDelete: (id: string) => void;
  onReplyAdded: () => void;
}) {
  const [showReplies, setShowReplies] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [posting, setPosting] = useState(false);
  const [replies, setReplies] = useState<CommunityComment[]>(comment.replies ?? []);
  const [confirmReplyId, setConfirmReplyId] = useState<string | null>(null);

  const handleReply = async () => {
    if (!replyText.trim() || posting || !currentUser) return;
    setPosting(true);
    try {
      const res = await communityService.addComment(postId, replyText.trim(), comment.id);
      setReplies((p) => [...p, res]);
      setReplyText("");
      setShowReplyInput(false);
      setShowReplies(true);
      onReplyAdded();
    } catch {
      // silent
    } finally {
      setPosting(false);
    }
  };

  const handleDeleteReply = (replyId: string) => {
    setConfirmReplyId(replyId);
  };

  const handleDeleteReplyConfirmed = async () => {
    if (!confirmReplyId) return;
    try {
      await communityService.deleteComment(confirmReplyId);
      setReplies((p) => p.filter((r) => r.id !== confirmReplyId));
    } catch {} finally {
      setConfirmReplyId(null);
    }
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-start gap-2">
        <AvatarCircle user={comment.author} size="sm" />
        <div className="flex-1 bg-white rounded-2xl px-3 py-2">
          <div className="flex items-baseline justify-between gap-2">
            <span className="font-semibold text-gray-800 text-xs">{authorDisplayName(comment.author)}</span>
            <span className="text-[11px] text-gray-400 flex-shrink-0">{timeAgo(comment.created_at)}</span>
          </div>
          <p className="text-gray-600 text-xs mt-0.5">{comment.content}</p>
          {currentUser && (
            <button
              onClick={() => setShowReplyInput((v) => !v)}
              className="text-[11px] text-blue-500 hover:underline mt-1 font-medium"
            >
              ตอบกลับ
            </button>
          )}
        </div>
        {currentUser?.id === comment.user_id && (
          <button onClick={(e) => { e.stopPropagation(); onDelete(comment.id); }} className="text-gray-300 hover:text-red-400 transition-colors mt-1.5">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Reply input */}
      {showReplyInput && currentUser && (
        <div className="flex items-center gap-2 pl-8">
          <AvatarCircle user={currentUser} size="sm" />
          <div className="flex-1 flex items-center gap-2 bg-white border border-gray-200 rounded-full px-3 py-1.5">
            <input
              type="text"
              value={replyText}
              autoFocus
              onChange={(e) => setReplyText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleReply()}
              placeholder={`ตอบกลับ ${authorDisplayName(comment.author)}...`}
              className="flex-1 text-xs bg-transparent outline-none"
              maxLength={500}
            />
            <button onClick={handleReply} disabled={!replyText.trim() || posting} className="text-blue-600 disabled:opacity-30">
              {posting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      )}

      {/* Show/hide replies */}
      {replies.length > 0 && (
        <div className="pl-8">
          <button
            onClick={() => setShowReplies((v) => !v)}
            className="text-[11px] text-blue-500 hover:underline font-medium"
          >
            {showReplies ? "ซ่อนการตอบกลับ" : `ดูการตอบกลับ ${replies.length} รายการ`}
          </button>
        </div>
      )}
      {showReplies && replies.map((r) => (
        <ReplyItem key={r.id} reply={r} currentUser={currentUser} onDelete={handleDeleteReply} />
      ))}
      <Modal isOpen={!!confirmReplyId} onClose={() => setConfirmReplyId(null)} title="ลบการตอบกลับ" size="sm">
        <p className="text-sm text-gray-600 mb-5">ต้องการลบการตอบกลับนี้ใช่ไหม? ไม่สามารถกู้คืนได้</p>
        <div className="flex justify-end gap-2">
          <button onClick={() => setConfirmReplyId(null)} className="px-4 py-2 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition">
            ยกเลิก
          </button>
          <button onClick={handleDeleteReplyConfirmed} className="px-4 py-2 text-sm rounded-lg bg-red-500 text-white hover:bg-red-600 transition">
            ลบ
          </button>
        </div>
      </Modal>
    </div>
  );
}

function CommentsSection({
  postId,
  currentUser,
  onCountChange,
}: {
  postId: string;
  currentUser: CurrentUser | null;
  onCountChange: (delta: number) => void;
}) {
  const [comments, setComments] = useState<CommunityComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [posting, setPosting] = useState(false);
  const [confirmCommentId, setConfirmCommentId] = useState<string | null>(null);

  useEffect(() => {
    communityService
      .getComments(postId)
      .then((r) => setComments(r.data))
      .catch(() => setComments([]))
      .finally(() => setLoading(false));
  }, [postId]);

  const handlePost = async () => {
    if (!newComment.trim() || posting || !currentUser) return;
    setPosting(true);
    try {
      const res = await communityService.addComment(postId, newComment.trim());
      setComments((p) => [...p, res]);
      setNewComment("");
      onCountChange(1);
    } catch {
      // silent
    } finally {
      setPosting(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    try {
      await communityService.deleteComment(commentId);
      setComments((p) => p.filter((c) => c.id !== commentId));
      onCountChange(-1);
    } catch {
      // silent
    } finally {
      setConfirmCommentId(null);
    }
  };

  return (
    <div className="border-t border-gray-100 bg-gray-50/50 px-4 pb-4 pt-3 space-y-3">
      {currentUser && (
        <div className="flex items-center gap-2 pl-8">
          <AvatarCircle user={currentUser} size="sm" />
          <div className="flex-1 flex items-center gap-2 bg-white border border-gray-200 rounded-full px-3 py-1.5">
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handlePost()}
              placeholder="เขียนความเห็น..."
              className="flex-1 text-sm bg-transparent outline-none"
              maxLength={500}
            />
            <button
              onClick={handlePost}
              disabled={!newComment.trim() || posting}
              className="text-blue-600 disabled:opacity-30"
            >
              {posting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
        </div>
      )}
      {loading ? (
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div key={i} className="h-8 bg-gray-100 rounded-full animate-pulse" />
          ))}
        </div>
      ) : comments.length === 0 ? (
        <p className="text-xs text-center text-gray-400 py-2">ยังไม่มีความเห็น</p>
      ) : (
        <div className="space-y-3">
          {comments.map((c) => (
            <CommentItem
              key={c.id}
              comment={c}
              postId={postId}
              currentUser={currentUser}
              onDelete={(id) => setConfirmCommentId(id)}
              onReplyAdded={() => onCountChange(1)}
            />
          ))}
        </div>
      )}
      <Modal isOpen={!!confirmCommentId} onClose={() => setConfirmCommentId(null)} title="ลบความเห็น" size="sm">
        <p className="text-sm text-gray-600 mb-5">ต้องการลบความเห็นนี้ใช่ไหม? ไม่สามารถกู้คืนได้</p>
        <div className="flex justify-end gap-2">
          <button onClick={() => setConfirmCommentId(null)} className="px-4 py-2 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition">
            ยกเลิก
          </button>
          <button onClick={() => confirmCommentId && handleDelete(confirmCommentId)} className="px-4 py-2 text-sm rounded-lg bg-red-500 text-white hover:bg-red-600 transition">
            ลบ
          </button>
        </div>
      </Modal>
    </div>
  );
}

/* ─── PostComposer ─── */

const ACCEPT_TYPES = "image/jpeg,image/png,image/gif,image/webp";
const MAX_IMAGES = 10;

interface UploadingImage {
  previewUrl: string;
  finalUrl?: string;
  uploading: boolean;
  error?: string;
}

function PostComposerModal({
  currentUser,
  onClose,
  onPosted,
  editPost,
}: {
  currentUser: CurrentUser;
  onClose: () => void;
  onPosted: (post: CommunityPost) => void;
  editPost?: CommunityPost;
}) {
  const { t } = useTranslation();
  const [content, setContent] = useState(editPost?.content ?? "");
  const [category, setCategory] = useState(editPost?.category ?? "general");
  const [isPublic, setIsPublic] = useState(editPost?.is_public ?? true);
  const [uploadingImages, setUploadingImages] = useState<UploadingImage[]>([]);
  const [existingImages, setExistingImages] = useState<CommunityImage[]>(editPost?.images ?? []);
  const [removedImageIds, setRemovedImageIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const totalImages = existingImages.length + uploadingImages.length;

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files) return;
      const candidates = Array.from(files).filter((f) => f.type.startsWith("image/"));
      const slots = MAX_IMAGES - existingImages.length - uploadingImages.length;
      if (slots <= 0) return;
      const toProcess = candidates.slice(0, slots);

      const initial: UploadingImage[] = toProcess.map((f) => ({
        previewUrl: URL.createObjectURL(f),
        uploading: true,
      }));
      setUploadingImages((prev) => [...prev, ...initial]);

      for (let i = 0; i < toProcess.length; i++) {
        const preview = initial[i].previewUrl;
        setUploadingImages((prev) =>
          prev.map((img) =>
            img.previewUrl === preview ? { ...img, _file: toProcess[i], uploading: false } : img
          ) as UploadingImage[]
        );
      }
    },
    [existingImages.length, uploadingImages.length]
  );

  const handleSubmit = async () => {
    if (!content.trim() && existingImages.length === 0 && uploadingImages.length === 0) {
      setError(t("communityPage.composer.validation.contentOrImage"));
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      let post: CommunityPost;
      if (editPost) {
        post = await communityService.updatePost(editPost.id, { content: content.trim(), category, is_public: isPublic });
        for (const imgId of removedImageIds) {
          try { await communityService.deleteImage(editPost.id, imgId); } catch {}
        }
        const newFiles = uploadingImages.map((img) => (img as any)._file as File | undefined).filter(Boolean) as File[];
        for (const file of newFiles) {
          try { await communityService.uploadImage(editPost.id, file); } catch {}
        }
        post = await communityService.getPost(editPost.id);
      } else {
        post = await communityService.createPost({ content: content.trim(), category, is_public: isPublic });
        const files = uploadingImages.map((img) => (img as any)._file as File | undefined).filter(Boolean) as File[];
        for (const file of files) {
          try { await communityService.uploadImage(post.id, file); } catch {}
        }
      }
      onPosted(post);
      onClose();
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? t("communityPage.composer.errorFallback"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/45 p-4 backdrop-blur-[5px] sm:items-center"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="flex max-h-[90vh] w-full max-w-[660px] flex-col overflow-hidden rounded-[30px] border border-slate-200/80 bg-white shadow-[0_32px_90px_rgba(15,23,42,0.24)]">
        <div className="flex items-center justify-between border-b border-slate-200/80 px-6 py-5 sm:px-8">
          <h2 className="text-[26px] font-semibold tracking-[-0.02em] text-slate-900">
            {editPost
              ? t("communityPage.composer.editTitle")
              : t("communityPage.composer.createTitle")}
          </h2>
          <button
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-transparent text-slate-400 transition hover:border-slate-200 hover:bg-slate-50 hover:text-slate-600"
            aria-label={t("common.close", "Close")}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-6 sm:px-8">
          <div className="flex items-start gap-4 rounded-[24px] border border-slate-200/80 bg-slate-50/70 px-4 py-4">
            <AvatarCircle user={currentUser} size="md" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900">{authorDisplayName(currentUser)}</p>
              <button
                onClick={() => setIsPublic((p) => !p)}
                className="mt-1 inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-500 transition hover:border-blue-200 hover:text-primary"
              >
                {isPublic ? (
                  <>
                    <Globe className="w-3.5 h-3.5" /> {t("communityPage.composer.visibility.public")}
                  </>
                ) : (
                  <>
                    <Lock className="w-3.5 h-3.5" /> {t("communityPage.composer.visibility.private")}
                  </>
                )}
              </button>
            </div>
          </div>

          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={t("communityPage.composer.placeholder")}
            className="min-h-[180px] w-full resize-none rounded-[24px] border border-transparent bg-white px-1 text-[18px] leading-8 text-slate-800 outline-none placeholder:text-slate-400 focus:border-transparent focus:ring-0"
            autoFocus
            maxLength={2000}
          />

          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              {t("communityPage.composer.categoryLabel")}
            </p>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.filter((c) => c.value).map((c) => (
                <button
                  key={c.value}
                  onClick={() => setCategory(c.value)}
                  className={
                    category === c.value
                      ? "rounded-full border border-primary/20 bg-primary px-3.5 py-2 text-sm font-medium text-white shadow-[0_12px_24px_rgba(37,99,235,0.22)] transition-colors"
                      : "rounded-full border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-600 transition-colors hover:border-blue-200 hover:text-primary"
                  }
                >
                  {t(CATEGORY_LABEL_KEYS[c.value] ?? c.label)}
                </button>
              ))}
            </div>
          </div>

          {existingImages.length > 0 && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {existingImages.map((img) => (
                <div key={img.id} className="relative aspect-square overflow-hidden rounded-[20px] bg-slate-100">
                  <img src={img.url} alt="" className="h-full w-full object-cover" />
                  <button
                    onClick={() => {
                      setRemovedImageIds((prev) => [...prev, img.id]);
                      setExistingImages((prev) => prev.filter((x) => x.id !== img.id));
                    }}
                    className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-slate-950/70 text-white transition hover:bg-slate-950/85"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {uploadingImages.length > 0 && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {uploadingImages.map((img, i) => (
                <div key={i} className="relative aspect-square overflow-hidden rounded-[20px] bg-slate-100">
                  <img src={img.previewUrl} alt="" className="h-full w-full object-cover" />
                  {img.uploading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/70">
                      <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                    </div>
                  )}
                  <button
                    onClick={() =>
                      setUploadingImages((prev) => prev.filter((_, j) => j !== i))
                    }
                    className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-slate-950/70 text-white transition hover:bg-slate-950/85"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div>
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                {t("communityPage.composer.imageLabel")}
              </p>
              <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-500">
                {totalImages}/{MAX_IMAGES}
              </span>
            </div>

            {totalImages < MAX_IMAGES && (
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
                onClick={() => fileInputRef.current?.click()}
                className={
                  dragOver
                    ? "cursor-pointer rounded-[24px] border-2 border-dashed border-blue-300 bg-blue-50/80 px-5 py-8 text-center transition-colors"
                    : "cursor-pointer rounded-[24px] border-2 border-dashed border-slate-200 bg-slate-50/55 px-5 py-8 text-center transition-colors hover:border-blue-200 hover:bg-blue-50/40"
                }
              >
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-slate-400 shadow-[0_12px_24px_rgba(15,23,42,0.06)]">
                  <ImageIcon className="h-5 w-5" />
                </div>
                <p className="text-sm font-medium text-slate-500">
                  {t("communityPage.composer.uploadHint")}
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ACCEPT_TYPES}
                  multiple
                  className="hidden"
                  onChange={(e) => handleFiles(e.target.files)}
                />
              </div>
            )}
          </div>

          {error && (
            <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
              {error}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-slate-200/80 px-6 py-5 sm:px-8">
          <button
            onClick={onClose}
            className="flex-1 rounded-[16px] border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
          >
            {t("common.cancel")}
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || (!content.trim() && existingImages.length === 0 && uploadingImages.length === 0)}
            className="flex flex-1 items-center justify-center gap-2 rounded-[16px] bg-primary px-5 py-3 text-sm font-semibold text-white shadow-[0_16px_32px_rgba(37,99,235,0.24)] transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {editPost ? t("communityPage.composer.save") : t("communityPage.composer.post")}
          </button>
        </div>
      </div>
    </div>
  );
}

function PostCard({
  post,
  currentUser,
  onNavigateToProfile,
  onStartChat,
  onDeleted,
}: {
  post: CommunityPost;
  currentUser: CurrentUser | null;
  onNavigateToProfile: (userId: string) => void;
  onStartChat: (userId: string) => void;
  onDeleted: (postId: string) => void;
}) {
  const [liked, setLiked] = useState(post.liked_by_me);
  const [likeCount, setLikeCount] = useState(post.reaction_count);
  const [commentCount, setCommentCount] = useState(post.comment_count);
  const [showComments, setShowComments] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [localPost, setLocalPost] = useState(post);
  const [copied, setCopied] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const isOwn = currentUser?.id === localPost.author_id;
  const images = localPost.images.map((img) => img.url);
  const catLabel = CATEGORIES.find((c) => c.value === localPost.category)?.label ?? localPost.category;

  const handleLike = async () => {
    if (!currentUser) return;
    const prev = { liked, likeCount };
    setLiked((l) => !l);
    setLikeCount((c) => (liked ? c - 1 : c + 1));
    try {
      const res = await communityService.toggleReaction(post.id);
      setLiked(res.liked);
      setLikeCount(res.reaction_count);
    } catch {
      setLiked(prev.liked);
      setLikeCount(prev.likeCount);
    }
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/app/community/posts/${post.id}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const handleDeleteConfirmed = async () => {
    if (!isOwn || deleting) return;
    setDeleting(true);
    try {
      await communityService.deletePost(post.id);
      onDeleted(post.id);
    } catch {
      setDeleting(false);
    } finally {
      setConfirmDelete(false);
    }
  };

  return (
    <article className="overflow-hidden rounded-[24px] border border-slate-200/80 bg-white shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
      {/* Author row */}
      <div className="flex items-start gap-4 px-5 pb-3 pt-5">
        <button onClick={() => onNavigateToProfile(localPost.author_id)} className="flex-shrink-0">
          <AvatarCircle user={localPost.author} size="md" />
        </button>
        <div className="min-w-0 flex-1">
          <button
            onClick={() => onNavigateToProfile(localPost.author_id)}
            className="text-[15px] font-semibold text-slate-900 hover:text-blue-600 transition-colors"
          >
            {authorDisplayName(localPost.author)}
          </button>
          <div className="mt-1 flex items-center gap-2">
            <span className="inline-flex items-center rounded-full border border-rose-100 bg-rose-50 px-2.5 py-0.5 text-[11px] font-semibold text-rose-500">
              {catLabel}
            </span>
            <p className="text-xs text-slate-400">{timeAgo(localPost.created_at)}</p>
            {localPost.edited_at && (
              <span className="text-[10px] text-gray-400 italic">· แก้ไขแล้ว</span>
            )}
          </div>
        </div>
        <div className="flex flex-shrink-0 items-center gap-2">
          <div className="relative">
            <button
              onClick={() => setShowMenu((s) => !s)}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-600"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
            {showMenu && (
              <div
                className="absolute right-0 top-12 z-20 w-44 rounded-2xl border border-slate-200 bg-white py-1 text-sm shadow-[0_20px_40px_rgba(15,23,42,0.12)]"
                onMouseLeave={() => setShowMenu(false)}
              >
                <button
                  onClick={() => { onNavigateToProfile(post.author_id); setShowMenu(false); }}
                  className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2 text-gray-700"
                >
                  <Users className="w-4 h-4" /> ดูโปรไฟล์
                </button>
                {currentUser && !isOwn && (
                  <button
                    onClick={() => { onStartChat(post.author_id); setShowMenu(false); }}
                    className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2 text-gray-700"
                  >
                    <MessageCircle className="w-4 h-4" /> ส่งข้อความ
                  </button>
                )}
                {isOwn && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setShowEdit(true); setShowMenu(false); }}
                    className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2 text-gray-700"
                  >
                    <PenLine className="w-4 h-4" /> แก้ไข
                  </button>
                )}
                {isOwn && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setConfirmDelete(true); setShowMenu(false); }}
                    className="w-full text-left px-4 py-2 hover:bg-red-50 flex items-center gap-2 text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                    ลบโพสต์
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      {localPost.content && (
        <div className="px-5 pb-4">
          <p className="whitespace-pre-wrap text-[15px] leading-7 text-slate-700">{localPost.content}</p>
        </div>
      )}

      {/* Images */}
      {images.length > 0 && (
        <div className="px-5 pb-5">
          <ImageGrid images={images} onOpen={(i) => setLightboxIndex(i)} />
        </div>
      )}

      {lightboxIndex !== null && (
        <ImageLightbox images={images} initialIndex={lightboxIndex} onClose={() => setLightboxIndex(null)} />
      )}

      {/* Stats */}
      <div className="flex items-center justify-between px-5 py-2 text-xs text-slate-400">
        <span>{likeCount > 0 ? `${likeCount} ไลค์` : ""}</span>
        <div className="flex gap-3">
          {commentCount > 0 && <span>{commentCount} ความเห็น</span>}
          {post.view_count > 0 && <span>{post.view_count} วิว</span>}
        </div>
      </div>
      <div className="border-t border-slate-200/80" />

      {/* Action buttons */}
      <div className="flex items-center px-3 py-2">
        <button
          onClick={handleLike}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-[14px] py-2.5 text-sm font-medium transition-colors ${
            liked ? "bg-blue-50 text-blue-600" : "text-slate-500 hover:bg-slate-50"
          }`}
        >
          <Heart className={`w-4 h-4 ${liked ? "fill-blue-600" : ""}`} />
          ไลค์
        </button>
        <button
          onClick={() => setShowComments((s) => !s)}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-[14px] py-2.5 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-50"
        >
          <MessageCircle className="w-4 h-4" />
          ความเห็น
        </button>
        <button
          onClick={handleShare}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-[14px] py-2.5 text-sm font-medium transition-colors ${
            copied ? "bg-lime-50 text-lime-600" : "text-slate-500 hover:bg-slate-50"
          }`}
        >
          <Share2 className="w-4 h-4" />
          {copied ? "คัดลอกแล้ว!" : "แชร์"}
        </button>
      </div>

      {showComments && (
        <CommentsSection
          postId={post.id}
          currentUser={currentUser}
          onCountChange={(delta) => setCommentCount((c) => c + delta)}
        />
      )}
      {showEdit && currentUser && (
        <PostComposerModal
          currentUser={currentUser}
          onClose={() => setShowEdit(false)}
          onPosted={(updated) => { setLocalPost(updated); setShowEdit(false); }}
          editPost={localPost}
        />
      )}
      <Modal isOpen={confirmDelete} onClose={() => setConfirmDelete(false)} title="ลบโพสต์" size="sm">
        <p className="text-sm text-gray-600 mb-5">ต้องการลบโพสต์นี้ใช่ไหม? ไม่สามารถกู้คืนได้</p>
        <div className="flex justify-end gap-2">
          <button onClick={() => setConfirmDelete(false)} className="px-4 py-2 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition">
            ยกเลิก
          </button>
          <button onClick={handleDeleteConfirmed} disabled={deleting} className="px-4 py-2 text-sm rounded-lg bg-red-500 text-white hover:bg-red-600 transition disabled:opacity-50">
            {deleting ? "กำลังลบ..." : "ลบ"}
          </button>
        </div>
      </Modal>
    </article>
  );
}

/* ─── Skeleton ─── */

function PostSkeleton() {
  return (
    <div className="animate-pulse overflow-hidden rounded-[24px] border border-slate-200/80 bg-white shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
      <div className="flex items-center gap-4 p-5">
        <div className="h-11 w-11 rounded-full bg-slate-100" />
        <div className="space-y-1.5 flex-1">
          <div className="h-3 w-32 rounded bg-slate-100" />
          <div className="h-2.5 w-20 rounded bg-slate-100" />
        </div>
      </div>
      <div className="mx-5 mb-4 h-24 rounded bg-slate-100" />
      <div className="mx-5 mb-5 h-48 rounded-[20px] bg-slate-100" />
    </div>
  );
}

/* ─── Main page ─── */

export default function CommunityPage() {
  const { t } = useTranslation("common");
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showComposer, setShowComposer] = useState(false);
  const [page, setPage] = useState(1);

  const search = searchParams.get("search") ?? "";
  const selectedCategory = searchParams.get("category") ?? "";
  const selectedSort =
    (searchParams.get("sort") as "latest" | "reactions" | "views") ?? "latest";

  const activeCategoryLabel = t(
    CATEGORY_LABEL_KEYS[selectedCategory] ?? "communityPage.categories.all",
    {
      defaultValue:
        CATEGORIES.find((category) => category.value === selectedCategory)?.label ??
        t("communityPage.categories.all"),
    }
  );

  const activeSortLabel = t(SORT_LABEL_KEYS[selectedSort] ?? "communityPage.sort.latest");

  const setCategory = (value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set("category", value);
    else next.delete("category");
    next.delete("page");
    setSearchParams(next);
  };

  const setSort = (value: "latest" | "reactions" | "views") => {
    const next = new URLSearchParams(searchParams);
    next.set("sort", value);
    setSearchParams(next);
  };

  const handleSearch = (value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set("search", value);
    else next.delete("search");
    next.delete("page");
    setSearchParams(next);
  };

  const clearFilters = () => {
    const next = new URLSearchParams(searchParams);
    next.delete("search");
    next.delete("category");
    next.set("sort", "latest");
    next.delete("page");
    setSearchParams(next);
  };

  useEffect(() => {
    authService.getCurrentUser().then(setCurrentUser).catch(() => {});
  }, []);

  const load = useCallback(() => {
    setLoading(true);

    communityService
      .getFeed({
        category: selectedCategory || undefined,
        sort: selectedSort,
        search: search || undefined,
        page,
        limit: LIMIT,
      })
      .then((res) => {
        setPosts(res.data);
        setTotal(res.total);
      })
      .catch(() => {
        setPosts([]);
        setTotal(0);
      })
      .finally(() => setLoading(false));
  }, [selectedCategory, selectedSort, search, page]);

  useEffect(() => {
    const timer = setTimeout(load, 200);
    return () => clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [selectedCategory, selectedSort, search]);

  const handleStartChat = async (userId: string) => {
    try {
      const room = await chatService.createDM(userId);
      navigate(`/app/messages?roomId=${room.id}`);
    } catch {
      navigate("/app/messages");
    }
  };

  const totalPages = Math.ceil(total / LIMIT);
  const hasActiveFilters = !!search || !!selectedCategory || selectedSort !== "latest";

  return (
    <div className="min-h-full w-full overflow-x-hidden bg-transparent">
      <div className="mx-auto w-full max-w-[1400px] px-6 pb-8 pt-8 sm:px-8 xl:px-10 2xl:px-12">
        {/* Header */}
        <section className="mb-5 rounded-[28px] border border-slate-200/80 bg-white px-6 py-7 shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <span className="mb-3 inline-flex h-7 items-center rounded-full border border-primary/10 bg-primary/10 px-3 text-xs font-semibold text-primary">
                Community
              </span>

              <h1 className="text-[2rem] font-bold leading-[1.15] tracking-[-0.01em] text-text-primary md:text-[2.2rem]">
                {t("communityPage.header.title")}
              </h1>

              <p className="mt-2 max-w-2xl text-[15px] font-medium leading-7 text-text-secondary">
                {t("communityPage.header.subtitle")}
              </p>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="inline-flex h-8 items-center rounded-full bg-slate-100 px-3 text-xs font-semibold text-slate-600">
                  {total.toLocaleString()} posts
                </span>

                {hasActiveFilters && (
                  <span className="inline-flex h-8 items-center rounded-full bg-blue-50 px-3 text-xs font-semibold text-blue-600">
                    {activeCategoryLabel} · {activeSortLabel}
                  </span>
                )}
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2.5">
              {currentUser && (
                <Link
                  to="/app/community/mine"
                  className="inline-flex h-11 items-center gap-2 rounded-[14px] border border-border bg-white px-5 text-sm font-semibold text-text-primary shadow-[0_10px_24px_rgba(15,23,42,0.05)] transition hover:bg-accent/40"
                >
                  <LayoutGrid className="h-4 w-4" />
                  {t("communityPage.actions.myPosts")}
                </Link>
              )}

              {currentUser && (
                <button
                  type="button"
                  onClick={() => setShowComposer(true)}
                  className="inline-flex h-11 items-center gap-2 rounded-[14px] bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-[0_14px_28px_rgba(37,99,235,0.22)] transition hover:bg-primary-hover"
                >
                  <Plus className="h-4 w-4" />
                  {t("communityPage.actions.createPost")}
                </button>
              )}
            </div>
          </div>
        </section>

        <section className="mb-5 rounded-[28px] border border-slate-200/80 bg-white px-5 py-5 shadow-[0_18px_40px_rgba(15,23,42,0.06)] sm:px-6">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
              <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  className="h-12 w-full rounded-[16px] border border-slate-200 bg-white py-3 pl-11 pr-10 text-sm text-slate-700 outline-none transition focus:border-blue-200 focus:ring-2 focus:ring-blue-100"
                  placeholder={t("communityPage.sidebar.searchPlaceholder")}
                  value={search}
                  onChange={(e) => handleSearch(e.target.value)}
                />
                {search ? (
                  <button
                    type="button"
                    onClick={() => handleSearch("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                    aria-label={t("communityPage.sidebar.clear")}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                ) : null}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {(["latest", "reactions", "views"] as const).map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setSort(option)}
                    className={`inline-flex h-11 items-center rounded-[14px] px-4 text-sm font-semibold transition ${
                      selectedSort === option
                        ? "bg-primary text-white shadow-[0_14px_28px_rgba(37,99,235,0.18)]"
                        : "border border-slate-200 bg-slate-50 text-slate-600 hover:border-blue-200 hover:text-primary"
                    }`}
                  >
                    {t(SORT_LABEL_KEYS[option])}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((category) => (
                  <button
                    key={category.value || "all"}
                    type="button"
                    onClick={() => setCategory(category.value)}
                    className={`inline-flex h-10 items-center rounded-full border px-4 text-sm font-medium transition ${
                      selectedCategory === category.value
                        ? "border-primary/15 bg-primary/10 text-primary"
                        : "border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:text-primary"
                    }`}
                  >
                    {t(CATEGORY_LABEL_KEYS[category.value] ?? category.label)}
                  </button>
                ))}
              </div>

              {hasActiveFilters ? (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="inline-flex h-10 items-center rounded-[14px] border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 transition hover:border-blue-200 hover:text-primary"
                >
                  {t("communityPage.sidebar.clear")}
                </button>
              ) : null}
            </div>
          </div>
        </section>

        {/* Composer prompt */}
        {currentUser && (
          <section
            onClick={() => setShowComposer(true)}
            className="group mb-5 flex cursor-text items-center gap-4 rounded-[24px] border border-slate-200/80 bg-white px-5 py-5 shadow-[0_18px_40px_rgba(15,23,42,0.06)] transition hover:border-blue-200"
          >
            <AvatarCircle user={currentUser} size="md" />

            <span className="flex-1 text-[15px] text-slate-400 transition-colors group-hover:text-slate-500">
              {t("communityPage.feedPrompt")}
            </span>
          </section>
        )}

        {/* Posts */}
        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <PostSkeleton key={i} />
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-[28px] border border-slate-200/80 bg-white px-8 py-20 text-center shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
            <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-[20px] bg-slate-100">
              <MessageCircle className="h-8 w-8 text-slate-400" />
            </div>

            <p className="font-semibold text-gray-600">ยังไม่มีโพสต์</p>

            <p className="mb-4 mt-1 text-sm text-gray-400">
              {search || selectedCategory
                ? "ลองเปลี่ยน filter"
                : "เป็นคนแรกที่โพสต์ในชุมชน!"}
            </p>

            {currentUser && !search && !selectedCategory && (
              <button
                type="button"
                onClick={() => setShowComposer(true)}
                className="mt-6 inline-flex h-12 items-center gap-2 rounded-[14px] bg-blue-600 px-5 text-sm font-semibold text-white shadow-[0_14px_28px_rgba(37,99,235,0.22)] transition hover:bg-blue-700"
              >
                <Plus className="h-4 w-4" />
                โพสต์แรกเลย
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                currentUser={currentUser}
                onNavigateToProfile={(uid) =>
                  navigate(`/app/explore/freelancers/${uid}`)
                }
                onStartChat={handleStartChat}
                onDeleted={(id) =>
                  setPosts((prev) => prev.filter((post) => post.id !== id))
                }
              />
            ))}
          </div>
        )}

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-6">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="rounded-[14px] border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-[0_10px_24px_rgba(15,23,42,0.05)] transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              ← ก่อนหน้า
            </button>

            <span className="px-4 py-2 text-sm text-slate-500">
              {page} / {totalPages}
            </span>

            <button
              type="button"
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= totalPages}
              className="rounded-[14px] border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-[0_10px_24px_rgba(15,23,42,0.05)] transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              ถัดไป →
            </button>
          </div>
        )}
      </div>

      {showComposer && currentUser && (
        <PostComposerModal
          currentUser={currentUser}
          onClose={() => setShowComposer(false)}
          onPosted={() => {
            setPage(1);
            load();
            setShowComposer(false);
          }}
        />
      )}
    </div>
  );
}
