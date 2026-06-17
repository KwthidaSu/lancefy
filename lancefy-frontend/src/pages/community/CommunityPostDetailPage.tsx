import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, Heart, Share2, CheckCircle2,
  Loader2, Send, Trash2,
} from "lucide-react";
import {
  communityService,
  type CommunityPost,
  type CommunityComment,
  type CommunityAuthor,
} from "@/services/community.service";
import { authService } from "@/services/auth.service";
import type { CurrentUser } from "@/auth/auth.types";
import Modal from "@/components/ui/Modal";
import ImageLightbox from "@/components/ui/ImageLightbox";

/* ─── helpers (duplicated to keep page self-contained) ─── */

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "เมื่อกี้นี้";
  if (mins < 60) return `${mins} นาทีที่แล้ว`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} ชั่วโมงที่แล้ว`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} วันที่แล้ว`;
  return `${Math.floor(days / 30)} เดือนที่แล้ว`;
}

function authorName(author: CommunityAuthor | CurrentUser | null | undefined) {
  if (!author) return "Anonymous";
  return (
    ("display_name" in author ? author.display_name : undefined) ||
    [author.firstname, author.lastname].filter(Boolean).join(" ") ||
    `@${author.username}` ||
    "Anonymous"
  );
}

function Avatar({ user, size = "md" }: { user?: CommunityAuthor | CurrentUser | null; size?: "sm" | "md" | "lg" }) {
  const sz = size === "sm" ? "w-7 h-7 text-xs" : size === "lg" ? "w-14 h-14 text-lg" : "w-9 h-9 text-sm";
  if (user?.avatar_url)
    return <img src={user.avatar_url} className={`${sz} rounded-full object-cover ring-2 ring-white flex-shrink-0`} />;
  const init = (user?.firstname?.charAt(0) ?? user?.username?.charAt(0) ?? "?").toUpperCase();
  return (
    <div className={`${sz} rounded-full bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-white font-bold ring-2 ring-white flex-shrink-0`}>
      {init}
    </div>
  );
}

/* ─── Image grid ─── */
function ImageGrid({ images, onOpen }: { images: string[]; onOpen: (i: number) => void }) {
  const n = images.length;
  if (n === 0) return null;
  if (n === 1)
    return (
      <div className="w-full overflow-hidden rounded-xl bg-gray-100 cursor-pointer" onClick={() => onOpen(0)}>
        <img src={images[0]} alt="" className="w-full max-h-[600px] object-contain" />
      </div>
    );
  return (
    <div className={`grid gap-1 rounded-xl overflow-hidden ${n === 2 ? "grid-cols-2" : "grid-cols-2"}`}>
      {images.slice(0, 4).map((src, i) => (
        <div key={i} className="overflow-hidden bg-gray-100 aspect-square cursor-pointer" onClick={() => onOpen(i)}>
          <img src={src} alt="" className="w-full h-full object-cover" />
        </div>
      ))}
    </div>
  );
}

/* ─── Comment with reply support ─── */
function ReplyBubble({ reply, currentUser, onDelete }: { reply: CommunityComment; currentUser: CurrentUser | null; onDelete: (id: string) => void }) {
  return (
    <div className="flex items-start gap-2 pl-10">
      <Avatar user={reply.author} size="sm" />
      <div className="flex-1 bg-gray-50 rounded-2xl px-3 py-2">
        <div className="flex items-baseline justify-between">
          <span className="font-semibold text-gray-800 text-xs">{authorName(reply.author)}</span>
          <span className="text-[11px] text-gray-400">{timeAgo(reply.created_at)}</span>
        </div>
        <p className="text-gray-700 text-sm mt-0.5">{reply.content}</p>
      </div>
      {currentUser?.id === reply.user_id && (
        <button onClick={(e) => { e.stopPropagation(); onDelete(reply.id); }} className="text-gray-300 hover:text-red-400 mt-1.5">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

function CommentBubble({
  comment, postId, currentUser, onDelete, onReplyAdded,
}: {
  comment: CommunityComment;
  postId: string;
  currentUser: CurrentUser | null;
  onDelete: (id: string) => void;
  onReplyAdded: () => void;
}) {
  const [showReplies, setShowReplies] = useState(false);
  const [showInput, setShowInput] = useState(false);
  const [text, setText] = useState("");
  const [posting, setPosting] = useState(false);
  const [replies, setReplies] = useState<CommunityComment[]>(comment.replies ?? []);
  const [confirmReplyId, setConfirmReplyId] = useState<string | null>(null);

  const submit = async () => {
    if (!text.trim() || posting || !currentUser) return;
    setPosting(true);
    try {
      const res = await communityService.addComment(postId, text.trim(), comment.id);
      setReplies((p) => [...p, res]);
      setText("");
      setShowInput(false);
      setShowReplies(true);
      onReplyAdded();
    } catch {} finally { setPosting(false); }
  };

  const deleteReply = (id: string) => {
    setConfirmReplyId(id);
  };

  const deleteReplyConfirmed = async () => {
    if (!confirmReplyId) return;
    try {
      await communityService.deleteComment(confirmReplyId);
      setReplies((p) => p.filter((r) => r.id !== confirmReplyId));
    } catch {} finally {
      setConfirmReplyId(null);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-start gap-3">
        <Avatar user={comment.author} size="md" />
        <div className="flex-1 bg-gray-50 rounded-2xl px-4 py-3">
          <div className="flex items-baseline justify-between">
            <span className="font-semibold text-gray-900 text-sm">{authorName(comment.author)}</span>
            <span className="text-xs text-gray-400">{timeAgo(comment.created_at)}</span>
          </div>
          <p className="text-gray-700 text-sm mt-1 leading-relaxed">{comment.content}</p>
          {currentUser && (
            <button onClick={() => setShowInput((v) => !v)} className="text-xs text-blue-500 hover:underline mt-1.5 font-medium">
              ตอบกลับ
            </button>
          )}
        </div>
        {currentUser?.id === comment.user_id && (
          <button onClick={(e) => { e.stopPropagation(); onDelete(comment.id); }} className="text-gray-300 hover:text-red-400 mt-2">
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {showInput && currentUser && (
        <div className="flex items-center gap-2 pl-10">
          <Avatar user={currentUser} size="sm" />
          <div className="flex-1 flex items-center gap-2 bg-white border border-gray-200 rounded-full px-3 py-1.5">
            <input
              autoFocus type="text" value={text} maxLength={500}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              placeholder={`ตอบกลับ ${authorName(comment.author)}...`}
              className="flex-1 text-sm bg-transparent outline-none"
            />
            <button onClick={submit} disabled={!text.trim() || posting} className="text-blue-600 disabled:opacity-30">
              {posting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      )}

      {replies.length > 0 && (
        <div className="pl-10">
          <button onClick={() => setShowReplies((v) => !v)} className="text-xs text-blue-500 hover:underline font-medium">
            {showReplies ? "ซ่อนการตอบกลับ" : `ดูการตอบกลับ ${replies.length} รายการ`}
          </button>
        </div>
      )}
      {showReplies && replies.map((r) => (
        <ReplyBubble key={r.id} reply={r} currentUser={currentUser} onDelete={deleteReply} />
      ))}
      <Modal isOpen={!!confirmReplyId} onClose={() => setConfirmReplyId(null)} title="ลบการตอบกลับ" size="sm">
        <p className="text-sm text-gray-600 mb-5">ต้องการลบการตอบกลับนี้ใช่ไหม? ไม่สามารถกู้คืนได้</p>
        <div className="flex justify-end gap-2">
          <button onClick={() => setConfirmReplyId(null)} className="px-4 py-2 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition">
            ยกเลิก
          </button>
          <button onClick={deleteReplyConfirmed} className="px-4 py-2 text-sm rounded-lg bg-red-500 text-white hover:bg-red-600 transition">
            ลบ
          </button>
        </div>
      </Modal>
    </div>
  );
}

/* ─── Main page ─── */
const CATEGORIES: Record<string, string> = {
  general: "ทั่วไป", artwork: "Artwork", coding: "Coding", design: "Design", writing: "Writing",
};

export default function CommunityPostDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [post, setPost] = useState<CommunityPost | null>(null);
  const [comments, setComments] = useState<CommunityComment[]>([]);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);

  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [commentCount, setCommentCount] = useState(0);
  const [newComment, setNewComment] = useState("");
  const [posting, setPosting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [confirmCommentId, setConfirmCommentId] = useState<string | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  useEffect(() => {
    authService.getCurrentUser().then(setCurrentUser).catch(() => {});
  }, []);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      communityService.getPost(id),
      communityService.getComments(id),
    ]).then(([p, c]) => {
      setPost(p);
      setLiked(p.liked_by_me);
      setLikeCount(p.reaction_count);
      setCommentCount(p.comment_count);
      setComments(c.data);
    }).catch(() => navigate("/app/community"))
      .finally(() => setLoading(false));
  }, [id]);

  const handleLike = async () => {
    if (!currentUser || !post) return;
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
    const url = `${window.location.origin}/app/community/posts/${id}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const handlePostComment = async () => {
    if (!newComment.trim() || posting || !currentUser || !post) return;
    setPosting(true);
    try {
      const res = await communityService.addComment(post.id, newComment.trim());
      setComments((p) => [...p, res]);
      setNewComment("");
      setCommentCount((c) => c + 1);
    } catch {} finally { setPosting(false); }
  };

  const handleDeleteComment = async () => {
    if (!confirmCommentId) return;
    try {
      await communityService.deleteComment(confirmCommentId);
      setComments((p) => p.filter((c) => c.id !== confirmCommentId));
      setCommentCount((c) => c - 1);
    } catch {} finally {
      setConfirmCommentId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-gray-300" />
      </div>
    );
  }
  if (!post) return null;

  const images = post.images.map((img) => img.url);
  const catLabel = CATEGORIES[post.category] ?? post.category;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
      {/* Back */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> กลับ
      </button>

      {/* Post card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Author row */}
        <div className="flex items-center gap-3 px-5 pt-5 pb-3">
          <button onClick={() => navigate(`/app/users/${post.author_id}`)}>
            <Avatar user={post.author} size="lg" />
          </button>
          <div className="flex-1 min-w-0">
            <button
              onClick={() => navigate(`/app/users/${post.author_id}`)}
              className="font-bold text-gray-900 hover:text-blue-600 transition-colors flex items-center gap-1"
            >
              {authorName(post.author)}
              {post.author && (
                <CheckCircle2 className="w-4 h-4 text-blue-500 flex-shrink-0" />
              )}
            </button>
            <p className="text-xs text-gray-400">{timeAgo(post.created_at)}{post.edited_at ? " · แก้ไขแล้ว" : ""}</p>
          </div>
          <span className="px-2.5 py-0.5 text-xs rounded-full border border-gray-200 text-gray-600 bg-gray-50 font-medium">
            {catLabel}
          </span>
        </div>

        {/* Content */}
        {post.content && (
          <p className="px-5 pb-3 text-gray-800 text-sm leading-relaxed whitespace-pre-wrap">{post.content}</p>
        )}

        {/* Images */}
        {images.length > 0 && (
          <div className="px-5 pb-4">
            <ImageGrid images={images} onOpen={(i) => setLightboxIndex(i)} />
          </div>
        )}
        {lightboxIndex !== null && (
          <ImageLightbox images={images} initialIndex={lightboxIndex} onClose={() => setLightboxIndex(null)} />
        )}

        {/* Stats */}
        <div className="flex items-center justify-between px-5 py-2 text-xs text-gray-400 border-t border-gray-50">
          <span>{likeCount > 0 ? `${likeCount} ไลค์` : ""}</span>
          <div className="flex gap-3">
            {commentCount > 0 && <span>{commentCount} ความเห็น</span>}
            {post.view_count > 0 && <span>{post.view_count} วิว</span>}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center px-3 pb-1 border-t border-gray-100">
          <button
            onClick={handleLike}
            className={`flex flex-1 items-center justify-center gap-1.5 py-2.5 text-sm font-medium rounded-xl transition-colors ${liked ? "text-blue-600 bg-blue-50" : "text-gray-500 hover:bg-gray-50"}`}
          >
            <Heart className={`w-4 h-4 ${liked ? "fill-blue-600" : ""}`} />
            ไลค์
          </button>
          <button
            onClick={handleShare}
            className={`flex flex-1 items-center justify-center gap-1.5 py-2.5 text-sm font-medium rounded-xl transition-colors ${copied ? "text-lime-600 bg-lime-50" : "text-gray-500 hover:bg-gray-50"}`}
          >
            <Share2 className="w-4 h-4" />
            {copied ? "คัดลอกแล้ว!" : "คัดลอกลิ้งก์"}
          </button>
        </div>
      </div>

      {/* Comment composer */}
      {currentUser && (
        <div className="flex items-center gap-3 bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3">
          <Avatar user={currentUser} size="md" />
          <div className="flex-1 flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-full px-4 py-2">
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handlePostComment()}
              placeholder="เขียนความเห็น..."
              className="flex-1 text-sm bg-transparent outline-none"
              maxLength={500}
            />
            <button onClick={handlePostComment} disabled={!newComment.trim() || posting} className="text-blue-600 disabled:opacity-30">
              {posting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
        </div>
      )}

      {/* Comments list */}
      {comments.length === 0 ? (
        <p className="text-center text-sm text-gray-400 py-6">ยังไม่มีความเห็น — เป็นคนแรกที่แสดงความเห็น!</p>
      ) : (
        <div className="space-y-3">
          {comments.map((c) => (
            <div key={c.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-4">
              <CommentBubble
                comment={c}
                postId={post.id}
                currentUser={currentUser}
                onDelete={(id) => setConfirmCommentId(id)}
                onReplyAdded={() => setCommentCount((n) => n + 1)}
              />
            </div>
          ))}
        </div>
      )}
      <Modal isOpen={!!confirmCommentId} onClose={() => setConfirmCommentId(null)} title="ลบความเห็น" size="sm">
        <p className="text-sm text-gray-600 mb-5">ต้องการลบความเห็นนี้ใช่ไหม? ไม่สามารถกู้คืนได้</p>
        <div className="flex justify-end gap-2">
          <button onClick={() => setConfirmCommentId(null)} className="px-4 py-2 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition">
            ยกเลิก
          </button>
          <button onClick={handleDeleteComment} className="px-4 py-2 text-sm rounded-lg bg-red-500 text-white hover:bg-red-600 transition">
            ลบ
          </button>
        </div>
      </Modal>
    </div>
  );
}
