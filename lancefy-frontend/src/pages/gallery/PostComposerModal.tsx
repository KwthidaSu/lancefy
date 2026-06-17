import { useCallback, useRef, useState } from "react";
import {
  X, Globe, Lock, Loader2, ChevronDown, ImageIcon, Trash2,
} from "lucide-react";
import {
  communityService,
  type CommunityPost,
  COMMUNITY_CATEGORIES,
  CATEGORY_LABELS,
} from "@/services/community.service";
import type { CurrentUser } from "@/auth/auth.types";

const ACCEPT_TYPES = "image/jpeg,image/png,image/gif,image/webp";
const MAX_IMAGES = 10;

// exported for use in GalleryPage category list
export { COMMUNITY_CATEGORIES as GALLERY_CATEGORIES };

function AvatarCircle({ user }: { user?: { username?: string; firstname?: string; avatar_url?: string } | null }) {
  if (user?.avatar_url)
    return <img src={user.avatar_url} className="w-10 h-10 rounded-full object-cover ring-2 ring-white" />;
  const initial = (user?.firstname?.charAt(0) ?? user?.username?.charAt(0) ?? "U").toUpperCase();
  return (
    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-white font-bold flex-shrink-0">
      {initial}
    </div>
  );
}

interface UploadingImage {
  previewUrl: string;
  finalUrl?: string;
  uploading: boolean;
  error?: string;
}

interface PostComposerModalProps {
  currentUser: CurrentUser;
  onClose: () => void;
  onPosted: () => void;
  editPost?: CommunityPost;
}

export default function PostComposerModal({ currentUser, onClose, onPosted, editPost }: PostComposerModalProps) {
  const [content, setContent] = useState(editPost?.content ?? "");
  const [category, setCategory] = useState<string>(editPost?.category ?? "general");
  const [isPublic, setIsPublic] = useState(editPost?.is_public ?? true);
  // For edit mode: show existing images as done entries
  const [uploadingImages, setUploadingImages] = useState<UploadingImage[]>(
    (editPost?.images ?? []).map((img) => ({ previewUrl: img.url, finalUrl: img.url, uploading: false }))
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const displayName =
    [currentUser.firstname, currentUser.lastname].filter(Boolean).join(" ") ||
    currentUser.username || "คุณ";

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files) return;
      const candidates = Array.from(files).filter((f) => f.type.startsWith("image/"));
      const slots = MAX_IMAGES - uploadingImages.length;
      if (slots <= 0) return;
      const toProcess = candidates.slice(0, slots);

      // We need postId to upload images — so we create the post first on submit.
      // For preview, just store local object URLs.
      const initial: UploadingImage[] = toProcess.map((f) => ({
        previewUrl: URL.createObjectURL(f),
        uploading: false,
        _file: f,
      }));
      setUploadingImages((prev) => [...prev, ...initial]);
    },
    [uploadingImages.length]
  );

  const removeImage = (previewUrl: string) => {
    setUploadingImages((prev) => {
      const removed = prev.find((img) => img.previewUrl === previewUrl);
      if (removed && !removed.finalUrl) URL.revokeObjectURL(removed.previewUrl);
      return prev.filter((img) => img.previewUrl !== previewUrl);
    });
  };

  const isUploading = uploadingImages.some((img) => img.uploading);

  const handleSubmit = async () => {
    if (!content.trim() && uploadingImages.length === 0) {
      setError("กรุณาเขียนเนื้อหาหรืออัปโหลดรูปภาพ");
      return;
    }
    if (isUploading) { setError("รอให้อัปโหลดรูปเสร็จก่อน"); return; }
    setError("");
    setSubmitting(true);
    try {
      let post: CommunityPost;
      if (editPost) {
        post = await communityService.updatePost(editPost.id, {
          content: content.trim() || undefined,
          category,
          is_public: isPublic,
        });
      } else {
        post = await communityService.createPost({
          content: content.trim() || undefined,
          category,
          is_public: isPublic,
        });
      }

      // Upload new images (those without finalUrl, i.e. local files)
      const newFiles = uploadingImages.filter((img) => !img.finalUrl && (img as any)._file);
      if (newFiles.length > 0) {
        // Mark uploading
        setUploadingImages((prev) =>
          prev.map((img) => (!(img as any)._file ? img : { ...img, uploading: true }))
        );
        for (const img of newFiles) {
          try {
            await communityService.uploadImage(post.id, (img as any)._file);
          } catch {
            // non-fatal
          }
        }
      }

      onPosted();
      onClose();
    } catch {
      setError("เกิดข้อผิดพลาด กรุณาลองใหม่");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-900">
            {editPost ? "แก้ไขโพสต์" : "โพสต์ใหม่"}
          </h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Author + visibility */}
          <div className="flex items-center gap-3">
            <AvatarCircle user={currentUser} />
            <div>
              <p className="font-semibold text-sm text-gray-900">{displayName}</p>
              <button
                onClick={() => setIsPublic((p) => !p)}
                className="flex items-center gap-1 text-xs text-gray-500 bg-gray-100 hover:bg-gray-200 rounded-md px-2 py-0.5 transition-colors"
              >
                {isPublic ? <><Globe className="w-3 h-3" /> สาธารณะ</> : <><Lock className="w-3 h-3" /> ส่วนตัว</>}
                <ChevronDown className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Content */}
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="แชร์ความคิด ผลงาน หรือ case study ของคุณ..."
            rows={4}
            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-200"
            maxLength={2000}
          />

          {/* Category */}
          <div>
            <label className="text-xs font-semibold text-gray-700 mb-1.5 block">หมวดหมู่</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 bg-white"
            >
              {COMMUNITY_CATEGORIES.map((c) => (
                <option key={c} value={c}>{CATEGORY_LABELS[c] ?? c}</option>
              ))}
            </select>
          </div>

          {/* Image Upload */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 mb-2">
              <ImageIcon className="w-3.5 h-3.5" /> รูปภาพ ({uploadingImages.length}/{MAX_IMAGES})
            </label>

            {uploadingImages.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mb-2">
                {uploadingImages.map((img) => (
                  <div key={img.previewUrl} className="relative aspect-square rounded-xl overflow-hidden bg-gray-100 group">
                    <img src={img.previewUrl} alt="" className="w-full h-full object-cover" />
                    {img.uploading && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <Loader2 className="w-5 h-5 text-white animate-spin" />
                      </div>
                    )}
                    {!img.uploading && (
                      <button
                        onClick={() => removeImage(img.previewUrl)}
                        className="absolute top-1 right-1 w-5 h-5 bg-black/60 hover:bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="w-3 h-3 text-white" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {uploadingImages.length < MAX_IMAGES && (
              <div
                className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors ${
                  dragOver ? "border-blue-400 bg-blue-50" : "border-gray-200 hover:border-blue-300"
                }`}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
              >
                <ImageIcon className="w-6 h-6 text-gray-300 mx-auto mb-1" />
                <p className="text-xs text-gray-400">คลิกหรือลากไฟล์รูปภาพมาวาง</p>
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

          {error && <p className="text-sm text-red-500 bg-red-50 rounded-xl px-3 py-2">{error}</p>}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-100 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
          >
            ยกเลิก
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || isUploading}
            className="px-5 py-2 text-sm font-semibold bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {editPost ? "บันทึก" : "โพสต์"}
          </button>
        </div>
      </div>
    </div>
  );
}
