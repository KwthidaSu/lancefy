import { useEffect, useState, useCallback } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import {
  Search, Images, X, Plus, Image as ImageIcon,
  Heart, MessageCircle, Share2, Send, Trash2, MoreHorizontal, Users,
  Loader2,
} from "lucide-react";
import {
  communityService,
  type CommunityPost,
  type CommunityComment,
  type CommunityAuthor,
  CATEGORY_LABELS,
} from "@/services/community.service";
import { authService } from "@/services/auth.service";
import { chatService } from "@/services/chat.service";
import type { CurrentUser } from "@/auth/auth.types";
import Modal from "@/components/ui/Modal";
import PostComposerModal from "./PostComposerModal";

/* ─── constants ─── */

const CATEGORIES = [
  { label: "ทั้งหมด", value: "" },
  ...Object.entries(CATEGORY_LABELS).map(([v, l]) => ({ label: l, value: v })),
];

const LIMIT = 10;

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

function AvatarCircle({
  user,
  size = "md",
}: {
  user?: Pick<CommunityAuthor, "username" | "firstname" | "avatar_url"> | CurrentUser | null;
  size?: "sm" | "md" | "lg";
}) {
  const sz =
    size === "sm" ? "w-7 h-7 text-xs" : size === "lg" ? "w-12 h-12 text-base" : "w-9 h-9 text-sm";
  if (user && "avatar_url" in user && user.avatar_url)
    return <img src={user.avatar_url} className={`${sz} rounded-full object-cover ring-2 ring-white flex-shrink-0`} />;
  const init = (
    (user && "firstname" in user ? user.firstname?.charAt(0) : undefined) ??
    (user && "username" in user ? user.username?.charAt(0) : undefined) ??
    "?"
  ).toUpperCase();
  return (
    <div className={`${sz} rounded-full bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-white font-bold ring-2 ring-white flex-shrink-0`}>
      {init}
    </div>
  );
}

/* ─── ImageGrid ─── */

function ImageGrid({ images }: { images: { url: string }[] }) {
  const srcs = images.map((i) => i.url);
  const n = srcs.length;

  if (n === 1)
    return (
      <div className="w-full aspect-video overflow-hidden bg-gray-100">
        <img src={srcs[0]} alt="" className="w-full h-full object-cover" />
      </div>
    );

  if (n === 2)
    return (
      <div className="grid grid-cols-2 gap-0.5 w-full aspect-[16/9]">
        {srcs.map((src, i) => (
          <div key={i} className="overflow-hidden bg-gray-100">
            <img src={src} alt="" className="w-full h-full object-cover" />
          </div>
        ))}
      </div>
    );

  if (n === 3)
    return (
      <div className="grid grid-cols-2 gap-0.5 w-full" style={{ gridTemplateRows: "1fr 1fr" }}>
        <div className="row-span-2 overflow-hidden bg-gray-100 aspect-[4/5]">
          <img src={srcs[0]} alt="" className="w-full h-full object-cover" />
        </div>
        {srcs.slice(1, 3).map((src, i) => (
          <div key={i} className="overflow-hidden bg-gray-100">
            <img src={src} alt="" className="w-full h-full object-cover" />
          </div>
        ))}
      </div>
    );

  const show = srcs.slice(0, 4);
  const extra = n - 4;
  return (
    <div className="grid grid-cols-2 gap-0.5 w-full aspect-square">
      {show.map((src, i) => (
        <div key={i} className="relative overflow-hidden bg-gray-100">
          <img src={src} alt="" className="w-full h-full object-cover" />
          {i === 3 && extra > 0 && (
            <div className="absolute inset-0 bg-black/55 flex items-center justify-center">
              <span className="text-white text-2xl font-bold">+{extra}</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/* ─── CommentsSection ─── */

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
  const [confirmId, setConfirmId] = useState<string | null>(null);

  useEffect(() => {
    communityService
      .getComments(postId)
      .then((r) => setComments(r.data))
      .catch(() => setComments([]))
      .finally(() => setLoading(false));
  }, [postId]);

  const handlePost = async () => {
    if (!newComment.trim() || posting) return;
    setPosting(true);
    try {
      const c = await communityService.addComment(postId, newComment.trim());
      setComments((p) => [...p, c]);
      setNewComment("");
      onCountChange(1);
    } catch {
      // silent
    } finally {
      setPosting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmId) return;
    try {
      await communityService.deleteComment(confirmId);
      setComments((p) => p.filter((c) => c.id !== confirmId));
      onCountChange(-1);
    } catch {
      // silent
    } finally {
      setConfirmId(null);
    }
  };

  const authorName = (c: CommunityComment) =>
    [c.author?.firstname, c.author?.lastname].filter(Boolean).join(" ") ||
    "@" + (c.author?.username ?? "?");

  return (
    <>
      <div className="border-t border-gray-100 bg-gray-50/50 px-4 pb-4 pt-3 space-y-3">
        {currentUser && (
          <div className="flex items-center gap-2">
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
              <button onClick={handlePost} disabled={!newComment.trim() || posting} className="text-blue-600 disabled:opacity-30">
                {posting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </div>
          </div>
        )}
        {loading ? (
          <div className="space-y-2">
            {[1, 2].map((i) => <div key={i} className="h-8 bg-gray-100 rounded-full animate-pulse" />)}
          </div>
        ) : comments.length === 0 ? (
          <p className="text-xs text-center text-gray-400 py-2">ยังไม่มีความเห็น</p>
        ) : (
          <div className="space-y-2.5">
            {comments.map((c) => (
              <div key={c.id} className="flex items-start gap-2">
                <AvatarCircle user={c.author} size="sm" />
                <div className="flex-1 bg-white rounded-2xl px-3 py-2">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-semibold text-gray-800 text-xs">{authorName(c)}</span>
                    <span className="text-[11px] text-gray-400 flex-shrink-0">{timeAgo(c.created_at)}</span>
                  </div>
                  <p className="text-gray-600 text-xs mt-0.5">{c.content}</p>
                </div>
                {currentUser?.id === c.user_id && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setConfirmId(c.id); }}
                    className="text-gray-300 hover:text-red-400 transition-colors mt-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal isOpen={!!confirmId} onClose={() => setConfirmId(null)} title="ลบความเห็น" size="sm">
        <p className="text-sm text-gray-600 mb-5">ต้องการลบความเห็นนี้ใช่ไหม? ไม่สามารถกู้คืนได้</p>
        <div className="flex justify-end gap-2">
          <button
            onClick={() => setConfirmId(null)}
            className="px-4 py-2 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition"
          >
            ยกเลิก
          </button>
          <button
            onClick={handleDelete}
            className="px-4 py-2 text-sm rounded-lg bg-red-500 text-white hover:bg-red-600 transition"
          >
            ลบ
          </button>
        </div>
      </Modal>
    </>
  );
}

/* ─── PostCard ─── */

function PostCard({
  post,
  currentUser,
  onNavigateToProfile,
  onStartChat,
  onDeleted,
}: {
  post: CommunityPost;
  currentUser: CurrentUser | null;
  onNavigateToProfile: (uid: string) => void;
  onStartChat: (uid: string) => void;
  onDeleted: (id: string) => void;
}) {
  const [liked, setLiked] = useState(post.liked_by_me);
  const [reactionCount, setReactionCount] = useState(post.reaction_count);
  const [commentCount, setCommentCount] = useState(post.comment_count);
  const [showComments, setShowComments] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [copied, setCopied] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isOwn = currentUser?.id === post.author_id;
  const authorName =
    [post.author?.firstname, post.author?.lastname].filter(Boolean).join(" ") ||
    "@" + (post.author?.username ?? "?");

  const handleLike = async () => {
    if (!currentUser) return;
    const prev = { liked, reactionCount };
    setLiked(!liked);
    setReactionCount((c) => c + (liked ? -1 : 1));
    try {
      const res = await communityService.toggleReaction(post.id);
      setLiked(res.liked);
      setReactionCount(res.reaction_count);
    } catch {
      setLiked(prev.liked);
      setReactionCount(prev.reactionCount);
    }
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/app/explore/freelancers/${post.author_id}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  const handleDeleteConfirmed = async () => {
    setDeleting(true);
    try {
      await communityService.deletePost(post.id);
      onDeleted(post.id);
    } catch {
      // silent
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  return (
    <article className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Author row */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-3">
        <button onClick={() => onNavigateToProfile(post.author_id)} className="flex-shrink-0">
          <AvatarCircle user={post.author} size="md" />
        </button>
        <div className="min-w-0 flex-1">
          <button
            onClick={() => onNavigateToProfile(post.author_id)}
            className="text-sm font-semibold text-gray-900 hover:text-blue-600 transition-colors"
          >
            {authorName}
          </button>
          <p className="text-[11px] text-gray-400">
            {timeAgo(post.created_at)}{post.edited_at ? " · แก้ไขแล้ว" : ""}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {post.category && post.category !== "general" && (
            <span className="px-2.5 py-0.5 text-xs rounded-full border border-gray-200 text-gray-600 bg-gray-50 font-medium">
              {CATEGORY_LABELS[post.category] ?? post.category}
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
                  onClick={() => { onNavigateToProfile(post.author_id); setShowMenu(false); }}
                  className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2 text-gray-700"
                >
                  <Users className="w-4 h-4" /> ดูโปรไฟล์
                </button>
                {!isOwn && (
                  <button
                    onClick={() => { onStartChat(post.author_id); setShowMenu(false); }}
                    className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2 text-gray-700"
                  >
                    <MessageCircle className="w-4 h-4" /> ส่งข้อความ
                  </button>
                )}
                {isOwn && (
                  <button
                    onClick={() => { setConfirmDelete(true); setShowMenu(false); }}
                    className="w-full text-left px-4 py-2 hover:bg-red-50 flex items-center gap-2 text-red-500"
                  >
                    <Trash2 className="w-4 h-4" /> ลบโพสต์
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      {post.content && (
        <div className="px-4 pb-3">
          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{post.content}</p>
        </div>
      )}

      {/* Images */}
      {post.images.length > 0 && <ImageGrid images={post.images} />}

      {/* Stats */}
      <div className="flex items-center justify-between px-4 py-2 text-xs text-gray-400">
        <span>{reactionCount > 0 ? `${reactionCount} ไลค์` : ""}</span>
        <span>{commentCount > 0 ? `${commentCount} ความเห็น` : ""}</span>
      </div>
      <div className="border-t border-gray-100" />

      {/* Action buttons */}
      <div className="flex items-center px-2 py-1">
        <button
          onClick={handleLike}
          className={`flex flex-1 items-center justify-center gap-1.5 py-2 text-sm font-medium rounded-lg transition-colors ${liked ? "text-blue-600 bg-blue-50" : "text-gray-500 hover:bg-gray-50"}`}
        >
          <Heart className={`w-4 h-4 ${liked ? "fill-blue-600" : ""}`} />
          ไลค์
        </button>
        <button
          onClick={() => setShowComments((s) => !s)}
          className="flex flex-1 items-center justify-center gap-1.5 py-2 text-sm font-medium rounded-lg text-gray-500 hover:bg-gray-50 transition-colors"
        >
          <MessageCircle className="w-4 h-4" />
          ความเห็น
        </button>
        <button
          onClick={handleShare}
          className={`flex flex-1 items-center justify-center gap-1.5 py-2 text-sm font-medium rounded-lg transition-colors ${copied ? "text-lime-600 bg-lime-50" : "text-gray-500 hover:bg-gray-50"}`}
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

      {/* Delete post modal */}
      <Modal isOpen={confirmDelete} onClose={() => setConfirmDelete(false)} title="ลบโพสต์" size="sm">
        <p className="text-sm text-gray-600 mb-5">ต้องการลบโพสต์นี้ใช่ไหม? ไม่สามารถกู้คืนได้</p>
        <div className="flex justify-end gap-2">
          <button
            onClick={() => setConfirmDelete(false)}
            className="px-4 py-2 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition"
          >
            ยกเลิก
          </button>
          <button
            onClick={handleDeleteConfirmed}
            disabled={deleting}
            className="px-4 py-2 text-sm rounded-lg bg-red-500 text-white hover:bg-red-600 transition disabled:opacity-50"
          >
            {deleting ? "กำลังลบ..." : "ลบ"}
          </button>
        </div>
      </Modal>
    </article>
  );
}

/* ─── Main page ─── */

export default function GalleryPage() {
  const navigate = useNavigate();

  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedCategory = searchParams.get("category") ?? "";
  const [page, setPage] = useState(1);
  const [showComposer, setShowComposer] = useState(false);

  useEffect(() => {
    authService.getCurrentUser().then(setCurrentUser).catch(() => {});
  }, []);

  const load = useCallback(() => {
    setLoading(true);
    communityService
      .getFeed({
        category: selectedCategory || undefined,
        search: search || undefined,
        page,
        limit: LIMIT,
      })
      .then((res) => {
        setPosts(res.data);
        setTotal(res.total);
      })
      .catch(() => { setPosts([]); setTotal(0); })
      .finally(() => setLoading(false));
  }, [selectedCategory, search, page]);

  useEffect(() => {
    const t = setTimeout(load, 200);
    return () => clearTimeout(t);
  }, [load]);

  useEffect(() => { setPage(1); }, [selectedCategory, search]);

  const handleStartChat = async (userId: string) => {
    try {
      const room = await chatService.createDM(userId);
      navigate(`/app/messages?roomId=${room.id}`);
    } catch {
      navigate("/app/messages");
    }
  };

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="min-h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <h1 className="text-lg font-bold text-gray-900">Freelance Community</h1>
        <button
          onClick={() => setShowComposer(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          โพสต์ใหม่
        </button>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 flex gap-6 items-start">
        {/* ── Sidebar ── */}
        <aside className="w-64 flex-shrink-0 space-y-4 sticky top-[73px]">
          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                className="w-full pl-9 pr-8 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-100"
                placeholder="ค้นหาโพสต์..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <h3 className="text-sm font-bold text-gray-700 mb-3">หมวดหมู่</h3>
            <ul className="space-y-0.5">
              {CATEGORIES.map((cat) => (
                <li key={cat.value}>
                  <button
                    onClick={() => {
                      const next = new URLSearchParams(searchParams);
                      if (cat.value) next.set("category", cat.value); else next.delete("category");
                      next.delete("page");
                      setSearchParams(next);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                      selectedCategory === cat.value
                        ? "bg-blue-600 text-white"
                        : "text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {cat.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <h3 className="text-sm font-bold text-gray-700 mb-3">สถิติ</h3>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">โพสต์ทั้งหมด</span>
              <span className="font-bold text-gray-900">{total.toLocaleString()}</span>
            </div>
          </div>

          <Link
            to="/app/gallery/mine"
            className="flex items-center gap-3 w-full bg-white rounded-2xl border border-gray-100 p-4 text-sm font-medium text-gray-700 hover:bg-blue-50 hover:border-blue-100 hover:text-blue-700 transition-colors"
          >
            <ImageIcon className="w-4 h-4 text-blue-600" />
            โพสต์ของฉัน
          </Link>
        </aside>

        {/* ── Feed ── */}
        <main className="flex-1 min-w-0 space-y-4">
          <div
            onClick={() => setShowComposer(true)}
            className="flex items-center gap-3 bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3 cursor-text hover:border-blue-200 transition-colors group"
          >
            <AvatarCircle user={currentUser} size="md" />
            <span className="text-sm text-gray-400 flex-1 group-hover:text-gray-500 transition-colors">
              แชร์ความคิด ผลงาน หรือ case study ของคุณ...
            </span>
            <ImageIcon className="w-5 h-5 text-gray-300 group-hover:text-blue-400 transition-colors" />
          </div>

          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="bg-white rounded-2xl border border-gray-100 overflow-hidden animate-pulse">
                  <div className="flex items-center gap-3 p-4">
                    <div className="w-10 h-10 rounded-full bg-gray-100" />
                    <div className="space-y-1.5 flex-1">
                      <div className="h-3 w-32 bg-gray-100 rounded" />
                      <div className="h-2.5 w-20 bg-gray-100 rounded" />
                    </div>
                  </div>
                  <div className="mx-4 mb-4 h-48 bg-gray-100 rounded-xl" />
                </div>
              ))}
            </div>
          ) : posts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center bg-white rounded-2xl border border-gray-100">
              <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
                <Images className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-gray-600 font-semibold">ยังไม่มีโพสต์</p>
              <p className="text-sm text-gray-400 mt-1 mb-4">
                {search || selectedCategory ? "ลองเปลี่ยน filter" : "เป็นคนแรกที่โพสต์!"}
              </p>
              {!search && !selectedCategory && (
                <button
                  onClick={() => setShowComposer(true)}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-4 h-4" /> โพสต์แรก
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
                  onNavigateToProfile={(uid) => navigate(`/app/explore/freelancers/${uid}`)}
                  onStartChat={handleStartChat}
                  onDeleted={(id) => setPosts((p) => p.filter((x) => x.id !== id))}
                />
              ))}
            </div>
          )}

          {!loading && totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 pt-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 text-sm rounded-xl border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                ← ก่อนหน้า
              </button>
              <span className="px-4 py-2 text-sm text-gray-500">{page} / {totalPages}</span>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= totalPages}
                className="px-4 py-2 text-sm rounded-xl border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                ถัดไป →
              </button>
            </div>
          )}
        </main>
      </div>

      {showComposer && currentUser && (
        <PostComposerModal
          currentUser={currentUser}
          onClose={() => setShowComposer(false)}
          onPosted={() => { setPage(1); load(); }}
        />
      )}
    </div>
  );
}
