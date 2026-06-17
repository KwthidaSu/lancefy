import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft, Plus, Image as ImageIcon,
  Heart, MessageCircle, Share2, Send, Trash2, MoreHorizontal, Users,
  Loader2, Globe, Lock, X, PenLine,
} from "lucide-react";
import {
  communityService,
  type CommunityPost,
  type CommunityImage,
  type CommunityComment,
  type CommunityAuthor,
  CATEGORY_LABELS,
} from "@/services/community.service";
import { authService } from "@/services/auth.service";
import type { CurrentUser } from "@/auth/auth.types";
import Modal from "@/components/ui/Modal";
import ImageLightbox from "@/components/ui/ImageLightbox";

/* ─── constants ─── */

const LIMIT = 12;
const ACCEPT_TYPES = "image/jpeg,image/png,image/gif,image/webp";
const MAX_IMAGES = 10;

const CATEGORIES = [
  { label: "ทั่วไป", value: "general" },
  { label: "Artwork", value: "artwork" },
  { label: "Coding", value: "coding" },
  { label: "Design", value: "design" },
  { label: "Writing", value: "writing" },
];

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
    size === "sm" ? "w-7 h-7 text-xs" : size === "lg" ? "w-12 h-12 text-base" : "w-9 h-9 text-sm";
  if (user?.avatar_url)
    return (
      <img src={user.avatar_url} className={`${sz} rounded-full object-cover ring-2 ring-white flex-shrink-0`} />
    );
  const init = (
    user?.firstname?.charAt(0) ?? user?.username?.charAt(0) ?? "?"
  ).toUpperCase();
  return (
    <div className={`${sz} rounded-full bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-white font-bold ring-2 ring-white flex-shrink-0`}>
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
      <div className="w-full aspect-video overflow-hidden bg-gray-100 cursor-pointer" onClick={() => onOpen(0)}>
        <img src={images[0]} alt="" className="w-full h-full object-cover hover:opacity-95 transition-opacity" />
      </div>
    );
  if (n === 2)
    return (
      <div className="grid grid-cols-2 gap-0.5 w-full aspect-[16/9]">
        {images.map((src, i) => (
          <div key={i} className="overflow-hidden bg-gray-100 cursor-pointer" onClick={() => onOpen(i)}>
            <img src={src} alt="" className="w-full h-full object-cover hover:opacity-95 transition-opacity" />
          </div>
        ))}
      </div>
    );
  if (n === 3)
    return (
      <div className="grid grid-cols-2 gap-0.5 w-full" style={{ gridTemplateRows: "1fr 1fr" }}>
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
    <div className="grid grid-cols-2 gap-0.5 w-full aspect-square">
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

/* ─── PostComposerModal ─── */

interface UploadingImage {
  previewUrl: string;
  uploading: boolean;
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

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files) return;
      const candidates = Array.from(files).filter((f) => f.type.startsWith("image/"));
      const totalSlots = MAX_IMAGES - existingImages.length - uploadingImages.length;
      if (totalSlots <= 0) return;
      const toProcess = candidates.slice(0, totalSlots);
      const initial: UploadingImage[] = toProcess.map((f) => ({
        previewUrl: URL.createObjectURL(f),
        uploading: false,
      }));
      setUploadingImages((prev) => [
        ...prev,
        ...initial.map((img, i) => ({ ...img, _file: toProcess[i] })),
      ] as UploadingImage[]);
    },
    [existingImages.length, uploadingImages.length]
  );

  const handleSubmit = async () => {
    if (!content.trim() && existingImages.length === 0 && uploadingImages.length === 0) {
      setError("กรุณาใส่ข้อความหรือรูปภาพ");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      let post: CommunityPost;
      if (editPost) {
        post = await communityService.updatePost(editPost.id, {
          content: content.trim(),
          category,
          is_public: isPublic,
        });
        // delete removed images
        for (const imgId of removedImageIds) {
          try { await communityService.deleteImage(editPost.id, imgId); } catch {}
        }
        // upload new images
        const newFiles = uploadingImages
          .map((img) => (img as any)._file as File | undefined)
          .filter(Boolean) as File[];
        for (const file of newFiles) {
          try { await communityService.uploadImage(editPost.id, file); } catch {}
        }
        // re-fetch updated post with new images
        post = await communityService.getPost(editPost.id);
      } else {
        post = await communityService.createPost({ content: content.trim(), category, is_public: isPublic });
        const files = uploadingImages
          .map((img) => (img as any)._file as File | undefined)
          .filter(Boolean) as File[];
        for (const file of files) {
          try { await communityService.uploadImage(post.id, file); } catch {}
        }
      }
      onPosted(post);
      onClose();
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? "เกิดข้อผิดพลาด กรุณาลองใหม่");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-gray-100">
          <h2 className="font-bold text-gray-900">{editPost ? "แก้ไขโพสต์" : "สร้างโพสต์ใหม่"}</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="flex items-center gap-3">
            <AvatarCircle user={currentUser} size="md" />
            <div>
              <p className="font-semibold text-sm text-gray-900">{authorDisplayName(currentUser)}</p>
              <button
                onClick={() => setIsPublic((p) => !p)}
                className="flex items-center gap-1 text-xs text-gray-500 hover:text-blue-600 transition-colors mt-0.5"
              >
                {isPublic ? <><Globe className="w-3.5 h-3.5" /> สาธารณะ</> : <><Lock className="w-3.5 h-3.5" /> เฉพาะตัวเอง</>}
              </button>
            </div>
          </div>

          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="แชร์ผลงาน, โปรเจกต์, หรือ case study ของคุณ..."
            className="w-full resize-none min-h-[120px] text-sm bg-transparent outline-none placeholder-gray-400 text-gray-800"
            autoFocus
            maxLength={2000}
          />

          <div>
            <p className="text-xs font-semibold text-gray-500 mb-2">หมวดหมู่</p>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORIES.map((c) => (
                <button
                  key={c.value}
                  onClick={() => setCategory(c.value)}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                    category === c.value ? "bg-blue-600 text-white border-blue-600" : "border-gray-200 text-gray-600 hover:border-blue-300"
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Existing images (edit mode) */}
          {existingImages.length > 0 && (
            <div className="grid grid-cols-4 gap-2">
              {existingImages.map((img) => (
                <div key={img.id} className="relative aspect-square rounded-xl overflow-hidden bg-gray-100">
                  <img src={img.url} alt="" className="w-full h-full object-cover" />
                  <button
                    onClick={() => {
                      setRemovedImageIds((prev) => [...prev, img.id]);
                      setExistingImages((prev) => prev.filter((x) => x.id !== img.id));
                    }}
                    className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 flex items-center justify-center text-white hover:bg-black/80"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* New images to upload */}
          {uploadingImages.length > 0 && (
            <div className="grid grid-cols-4 gap-2">
              {uploadingImages.map((img, i) => (
                <div key={i} className="relative aspect-square rounded-xl overflow-hidden bg-gray-100">
                  <img src={img.previewUrl} alt="" className="w-full h-full object-cover" />
                  <button
                    onClick={() => setUploadingImages((prev) => prev.filter((_, j) => j !== i))}
                    className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 flex items-center justify-center text-white hover:bg-black/80"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {existingImages.length + uploadingImages.length < MAX_IMAGES && (
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-4 flex flex-col items-center gap-2 cursor-pointer transition-colors text-center ${
                dragOver ? "border-blue-400 bg-blue-50" : "border-gray-200 hover:border-blue-300 hover:bg-blue-50/30"
              }`}
            >
              <ImageIcon className="w-6 h-6 text-gray-400" />
              <p className="text-xs text-gray-500">คลิกหรือลากรูปมาวางที่นี่</p>
              <input ref={fileInputRef} type="file" accept={ACCEPT_TYPES} multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} />
            </div>
          )}

          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>

        <div className="px-5 pb-5 pt-3 border-t border-gray-100 flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 text-sm font-semibold rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">
            ยกเลิก
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || (!content.trim() && existingImages.length === 0 && uploadingImages.length === 0)}
            className="flex-1 py-2.5 text-sm font-semibold rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {editPost ? "บันทึก" : "โพสต์"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── CommentsSection (minimal for my-posts view) ─── */

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
    communityService.getComments(postId)
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
    } catch {} finally { setPosting(false); }
  };

  const handleDeleteComment = async () => {
    if (!confirmCommentId) return;
    try {
      await communityService.deleteComment(confirmCommentId);
      setComments((p) => p.filter((c) => c.id !== confirmCommentId));
      onCountChange(-1);
    } catch {} finally { setConfirmCommentId(null); }
  };

  return (
    <div className="border-t border-gray-100 bg-gray-50/50 px-4 pb-4 pt-3 space-y-3">
      {currentUser && (
        <div className="flex items-center gap-2">
          <AvatarCircle user={currentUser} size="sm" />
          <div className="flex-1 flex items-center gap-2 bg-white border border-gray-200 rounded-full px-3 py-1.5">
            <input
              type="text" value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handlePost()}
              placeholder="เขียนความเห็น..." className="flex-1 text-sm bg-transparent outline-none" maxLength={500}
            />
            <button onClick={handlePost} disabled={!newComment.trim() || posting} className="text-blue-600 disabled:opacity-30">
              {posting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
        </div>
      )}
      {loading ? (
        <div className="space-y-2">{[1, 2].map((i) => <div key={i} className="h-8 bg-gray-100 rounded-full animate-pulse" />)}</div>
      ) : comments.length === 0 ? (
        <p className="text-xs text-center text-gray-400 py-2">ยังไม่มีความเห็น</p>
      ) : (
        <div className="space-y-2.5">
          {comments.map((c) => {
            const name = [c.author?.firstname, c.author?.lastname].filter(Boolean).join(" ") || `@${c.author?.username ?? "?"}`;
            return (
              <div key={c.id} className="flex items-start gap-2">
                <AvatarCircle user={c.author} size="sm" />
                <div className="flex-1 bg-white rounded-2xl px-3 py-2">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-semibold text-gray-800 text-xs">{name}</span>
                    <span className="text-[11px] text-gray-400 flex-shrink-0">{timeAgo(c.created_at)}</span>
                  </div>
                  <p className="text-gray-600 text-xs mt-0.5">{c.content}</p>
                </div>
                {currentUser?.id === c.user_id && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setConfirmCommentId(c.id); }}
                    className="text-gray-300 hover:text-red-400 transition-colors mt-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
      <Modal isOpen={!!confirmCommentId} onClose={() => setConfirmCommentId(null)} title="ลบความเห็น" size="sm">
        <p className="text-sm text-gray-600 mb-5">ต้องการลบความเห็นนี้ใช่ไหม? ไม่สามารถกู้คืนได้</p>
        <div className="flex justify-end gap-2">
          <button onClick={() => setConfirmCommentId(null)} className="px-4 py-2 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition">ยกเลิก</button>
          <button onClick={handleDeleteComment} className="px-4 py-2 text-sm rounded-lg bg-red-500 text-white hover:bg-red-600 transition">ลบ</button>
        </div>
      </Modal>
    </div>
  );
}

/* ─── PostCard (my posts variant — edit + delete) ─── */

function MyPostCard({
  post,
  currentUser,
  onDeleted,
  onEdited,
}: {
  post: CommunityPost;
  currentUser: CurrentUser;
  onDeleted: (id: string) => void;
  onEdited: (updated: CommunityPost) => void;
}) {
  const navigate = useNavigate();
  const [liked, setLiked] = useState(post.liked_by_me);
  const [likeCount, setLikeCount] = useState(post.reaction_count);
  const [commentCount, setCommentCount] = useState(post.comment_count);
  const [showComments, setShowComments] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [copied, setCopied] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const images = post.images.map((img) => img.url);
  const catLabel = CATEGORY_LABELS[post.category] ?? post.category;

  const handleLike = async () => {
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
    <article className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Author row */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-3">
        <AvatarCircle user={currentUser} size="md" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-gray-900">{authorDisplayName(currentUser)}</p>
          <div className="flex items-center gap-2">
            <p className="text-[11px] text-gray-400">{timeAgo(post.created_at)}</p>
            {post.edited_at && <span className="text-[10px] text-gray-400 italic">· แก้ไขแล้ว</span>}
            {!post.is_public && (
              <span className="flex items-center gap-0.5 text-[10px] text-gray-400">
                <Lock className="w-2.5 h-2.5" /> เฉพาะตัวเอง
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {post.category && post.category !== "general" && (
            <span className="px-2.5 py-0.5 text-xs rounded-full border border-gray-200 text-gray-600 bg-gray-50 font-medium">
              {catLabel}
            </span>
          )}
          <div className="relative">
            <button
              onClick={() => setShowMenu((s) => !s)}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 transition-colors"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
            {showMenu && (
              <div
                className="absolute right-0 top-9 bg-white border border-gray-100 rounded-xl shadow-lg z-20 py-1 w-44 text-sm"
                onMouseLeave={() => setShowMenu(false)}
              >
                <button
                  onClick={() => { navigate(`/app/community/posts/${post.id}`); setShowMenu(false); }}
                  className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2 text-gray-700"
                >
                  <Users className="w-4 h-4" /> ดูโพสต์
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setShowEdit(true); setShowMenu(false); }}
                  className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2 text-gray-700"
                >
                  <PenLine className="w-4 h-4" /> แก้ไข
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setConfirmDelete(true); setShowMenu(false); }}
                  className="w-full text-left px-4 py-2 hover:bg-red-50 flex items-center gap-2 text-red-600"
                >
                  <Trash2 className="w-4 h-4" /> ลบโพสต์
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      {post.content && (
        <div className="px-4 pb-3">
          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{post.content}</p>
        </div>
      )}

      {/* Images */}
      {images.length > 0 && <ImageGrid images={images} onOpen={(i) => setLightboxIndex(i)} />}

      {lightboxIndex !== null && (
        <ImageLightbox images={images} initialIndex={lightboxIndex} onClose={() => setLightboxIndex(null)} />
      )}

      {/* Stats */}
      <div className="flex items-center justify-between px-4 py-2 text-xs text-gray-400">
        <span>{likeCount > 0 ? `${likeCount} ไลค์` : ""}</span>
        <div className="flex gap-3">
          {commentCount > 0 && <span>{commentCount} ความเห็น</span>}
          {post.view_count > 0 && <span>{post.view_count} วิว</span>}
        </div>
      </div>
      <div className="border-t border-gray-100" />

      {/* Action buttons */}
      <div className="flex items-center px-2 py-1">
        <button
          onClick={handleLike}
          className={`flex flex-1 items-center justify-center gap-1.5 py-2 text-sm font-medium rounded-lg transition-colors ${liked ? "text-blue-600 bg-blue-50" : "text-gray-500 hover:bg-gray-50"}`}
        >
          <Heart className={`w-4 h-4 ${liked ? "fill-blue-600" : ""}`} /> ไลค์
        </button>
        <button
          onClick={() => setShowComments((s) => !s)}
          className="flex flex-1 items-center justify-center gap-1.5 py-2 text-sm font-medium rounded-lg text-gray-500 hover:bg-gray-50 transition-colors"
        >
          <MessageCircle className="w-4 h-4" /> ความเห็น
        </button>
        <button
          onClick={handleShare}
          className={`flex flex-1 items-center justify-center gap-1.5 py-2 text-sm font-medium rounded-lg transition-colors ${copied ? "text-lime-600 bg-lime-50" : "text-gray-500 hover:bg-gray-50"}`}
        >
          <Share2 className="w-4 h-4" /> {copied ? "คัดลอกแล้ว!" : "แชร์"}
        </button>
      </div>

      {showComments && (
        <CommentsSection
          postId={post.id}
          currentUser={currentUser}
          onCountChange={(delta) => setCommentCount((c) => c + delta)}
        />
      )}

      {/* Edit modal */}
      {showEdit && (
        <PostComposerModal
          currentUser={currentUser}
          onClose={() => setShowEdit(false)}
          onPosted={(updated) => { onEdited(updated); setShowEdit(false); }}
          editPost={post}
        />
      )}

      {/* Delete confirm */}
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

/* ─── Main page ─── */

export default function CommunityMyPostsPage() {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [showComposer, setShowComposer] = useState(false);

  useEffect(() => {
    authService.getCurrentUser().then(setCurrentUser).catch(() => {});
  }, []);

  const load = useCallback(() => {
    if (!currentUser) return;
    setLoading(true);
    communityService
      .getFeed({ author_id: currentUser.id, page, limit: LIMIT })
      .then((res) => {
        setPosts(res.data);
        setTotal(res.total);
      })
      .catch(() => { setPosts([]); setTotal(0); })
      .finally(() => setLoading(false));
  }, [currentUser, page]);

  useEffect(() => {
    const t = setTimeout(load, 100);
    return () => clearTimeout(t);
  }, [load]);

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="min-h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center gap-4 sticky top-0 z-10">
        <Link to="/app/community" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Community
        </Link>
        <h1 className="text-lg font-bold text-gray-900 flex-1">โพสต์ของฉัน</h1>
        {currentUser && (
          <button
            onClick={() => setShowComposer(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" /> โพสต์ใหม่
          </button>
        )}
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {/* Stats bar */}
        {!loading && (
          <p className="text-sm text-gray-500">
            {total > 0 ? `${total} โพสต์ทั้งหมด` : "ยังไม่มีโพสต์"}
          </p>
        )}

        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 overflow-hidden animate-pulse">
                <div className="flex items-center gap-3 p-4">
                  <div className="w-9 h-9 rounded-full bg-gray-100" />
                  <div className="space-y-1.5 flex-1">
                    <div className="h-3 w-32 bg-gray-100 rounded" />
                    <div className="h-2.5 w-20 bg-gray-100 rounded" />
                  </div>
                </div>
                <div className="mx-4 mb-4 h-40 bg-gray-100 rounded-xl" />
              </div>
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center bg-white rounded-2xl border border-gray-100">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
              <ImageIcon className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-600 font-semibold">ยังไม่มีโพสต์</p>
            <p className="text-sm text-gray-400 mt-1 mb-5">แชร์ผลงาน, โปรเจกต์ หรือไอเดียของคุณ</p>
            {currentUser && (
              <button
                onClick={() => setShowComposer(true)}
                className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4" /> สร้างโพสต์แรก
              </button>
            )}
          </div>
        ) : (
          <>
            {posts.map((post) =>
              currentUser ? (
                <MyPostCard
                  key={post.id}
                  post={post}
                  currentUser={currentUser}
                  onDeleted={(id) => {
                    setPosts((p) => p.filter((x) => x.id !== id));
                    setTotal((t) => t - 1);
                  }}
                  onEdited={(updated) =>
                    setPosts((p) => p.map((x) => (x.id === updated.id ? { ...x, ...updated } : x)))
                  }
                />
              ) : null
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 text-sm font-medium rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition"
                >
                  ก่อนหน้า
                </button>
                <span className="text-sm text-gray-500">
                  {page} / {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-4 py-2 text-sm font-medium rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition"
                >
                  ถัดไป
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* New post composer */}
      {showComposer && currentUser && (
        <PostComposerModal
          currentUser={currentUser}
          onClose={() => setShowComposer(false)}
          onPosted={(post) => {
            setPosts((p) => [post, ...p]);
            setTotal((t) => t + 1);
            setShowComposer(false);
          }}
        />
      )}
    </div>
  );
}
