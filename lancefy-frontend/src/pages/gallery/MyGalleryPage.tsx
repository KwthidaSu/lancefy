import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Plus, Pencil, Trash2, Heart, MessageCircle, Globe, Lock, ChevronLeft, Images, Loader2,
} from "lucide-react";
import {
  communityService,
  type CommunityPost,
  CATEGORY_LABELS,
} from "@/services/community.service";
import { authService } from "@/services/auth.service";
import type { CurrentUser } from "@/auth/auth.types";
import PostComposerModal from "./PostComposerModal";
import Modal from "@/components/ui/Modal";

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

export default function MyGalleryPage() {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [editPost, setEditPost] = useState<CommunityPost | null>(null);
  const [showComposer, setShowComposer] = useState(false);
  const [confirmPost, setConfirmPost] = useState<CommunityPost | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    authService.getCurrentUser().then(setCurrentUser).catch(() => {});
  }, []);

  const load = () => {
    setLoading(true);
    // ดึง feed ของตัวเองโดย filter ด้วย userId
    authService
      .getCurrentUser()
      .then((u) =>
        communityService.getFeed({ limit: 50 }).then((res) => {
          // filter เฉพาะของตัวเอง (backend ยังไม่มี /community/mine)
          setPosts(res.data.filter((p) => p.author_id === u?.id));
        })
      )
      .catch(() => setPosts([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async () => {
    if (!confirmPost) return;
    setDeleting(true);
    try {
      await communityService.deletePost(confirmPost.id);
      setPosts((p) => p.filter((x) => x.id !== confirmPost.id));
    } catch {
      // silent
    } finally {
      setDeleting(false);
      setConfirmPost(null);
    }
  };

  return (
    <div className="min-h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Link
            to="/app/gallery"
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            กลับ
          </Link>
          <div className="w-px h-4 bg-gray-200" />
          <h1 className="text-lg font-bold text-gray-900">โพสต์ของฉัน</h1>
        </div>
        <button
          onClick={() => { setEditPost(null); setShowComposer(true); }}
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          โพสต์ใหม่
        </button>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6">
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          </div>
        ) : posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center bg-white rounded-2xl border border-gray-100">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
              <Images className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-600 font-semibold">ยังไม่มีโพสต์</p>
            <p className="text-sm text-gray-400 mt-1 mb-4">โพสต์ความคิด ผลงาน หรือ case study ของคุณ</p>
            <button
              onClick={() => setShowComposer(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" /> โพสต์แรก
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {posts.map((post) => (
              <article
                key={post.id}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex gap-4"
              >
                {/* Thumbnail */}
                {post.images.length > 0 && (
                  <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100">
                    <img src={post.images[0].url} alt="" className="w-full h-full object-cover" />
                  </div>
                )}
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-bold text-gray-900 text-sm leading-snug line-clamp-2">
                      {post.content?.slice(0, 80) ?? "(ไม่มีเนื้อหา)"}
                    </p>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => { setEditPost(post); setShowComposer(true); }}
                        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-blue-50 text-blue-500 transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setConfirmPost(post)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 text-red-400 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  {post.category && post.category !== "general" && (
                    <span className="inline-block mt-1 px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-500 font-medium">
                      {CATEGORY_LABELS[post.category] ?? post.category}
                    </span>
                  )}
                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                    <span className="flex items-center gap-1">
                      <Heart className="w-3 h-3" /> {post.reaction_count}
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageCircle className="w-3 h-3" /> {post.comment_count}
                    </span>
                    <span className="flex items-center gap-1">
                      {post.is_public ? (
                        <><Globe className="w-3 h-3 text-lime-500" /> สาธารณะ</>
                      ) : (
                        <><Lock className="w-3 h-3" /> ส่วนตัว</>
                      )}
                    </span>
                    <span className="ml-auto">{timeAgo(post.created_at)}</span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      {showComposer && currentUser && (
        <PostComposerModal
          currentUser={currentUser}
          editPost={editPost ?? undefined}
          onClose={() => { setShowComposer(false); setEditPost(null); }}
          onPosted={() => { setShowComposer(false); setEditPost(null); load(); }}
        />
      )}

      <Modal isOpen={!!confirmPost} onClose={() => setConfirmPost(null)} title="ลบโพสต์" size="sm">
        <p className="text-sm text-gray-600 mb-5">ต้องการลบโพสต์นี้ใช่ไหม? ไม่สามารถกู้คืนได้</p>
        <div className="flex justify-end gap-2">
          <button
            onClick={() => setConfirmPost(null)}
            className="px-4 py-2 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition"
          >
            ยกเลิก
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="px-4 py-2 text-sm rounded-lg bg-red-500 text-white hover:bg-red-600 transition disabled:opacity-50"
          >
            {deleting ? "กำลังลบ..." : "ลบ"}
          </button>
        </div>
      </Modal>
    </div>
  );
}
