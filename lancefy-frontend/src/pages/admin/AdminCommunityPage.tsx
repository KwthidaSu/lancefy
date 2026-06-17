import { useCallback, useEffect, useRef, useState, type ElementType } from "react";
import { useNavigate } from "react-router-dom";
import {
  HiMiniFlag,
  HiOutlineArrowPath,
  HiOutlineArrowTopRightOnSquare,
  HiOutlineChatBubbleLeftEllipsis,
  HiOutlineCheckCircle,
  HiOutlineChevronDown,
  HiOutlineChevronRight,
  HiOutlineEllipsisVertical,
  HiOutlineExclamationTriangle,
  HiOutlineEye,
  HiOutlineEyeSlash,
  HiOutlineFunnel,
  HiOutlineMagnifyingGlass,
  HiOutlinePhoto,
  HiOutlineTrash,
  HiOutlineXMark,
} from "react-icons/hi2";

import { useToast } from "@/components/ui/Toast";
import { authHttp } from "@/lib/authHttp";
import { cn } from "@/lib/utils";

interface PostAuthor {
  id: string;
  username: string;
  display_name?: string;
  avatar_url?: string;
}

interface AdminPost {
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
}

interface Comment {
  id: string;
  content: string;
  author: PostAuthor | null;
  parent_comment_id: string | null;
  created_at: string;
}

type StatusFilter = "all" | "active" | "hidden";

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

const ADMIN_TYPE = {
  pageTitle:
    "text-4xl font-bold tracking-tight text-text-primary md:text-[3.15rem]",
  pageSubtitle: "text-base font-medium leading-7 text-text-secondary",
  sectionTitle:
    "text-[1.6rem] font-semibold tracking-tight text-text-primary md:text-[1.75rem]",
  statLabel: "text-base font-medium text-text-secondary",
  statValue: "mt-3 text-[2.35rem] font-bold leading-none text-text-primary",
  cardTitle: "text-[1.05rem] font-semibold leading-6 text-text-primary",
  body: "text-[0.95rem] leading-7 text-text-secondary",
  meta: "text-[0.82rem] font-medium leading-5 text-text-muted",
  micro: "text-[0.75rem] font-medium leading-5 text-text-muted",
};

const inputClass =
  "w-full rounded-[14px] border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-text-primary shadow-[0_10px_24px_rgba(15,23,42,0.04)] outline-none transition placeholder:text-text-muted focus:border-blue-300 focus:ring-4 focus:ring-blue-100";

function Avatar({
  src,
  name,
  size = "sm",
}: {
  src?: string;
  name?: string;
  size?: "sm" | "md";
}) {
  const sizeClass = size === "md" ? "h-11 w-11 text-sm" : "h-9 w-9 text-xs";
  const letter = (name || "?")[0].toUpperCase();

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary font-bold text-primary-foreground shadow-sm",
        sizeClass,
      )}
    >
      {src ? (
        <img src={src} alt="" className="h-full w-full object-cover" />
      ) : (
        letter
      )}
    </div>
  );
}

function PageHero({
  refreshing,
  onRefresh,
}: {
  refreshing: boolean;
  onRefresh: () => void;
}) {
  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
      <div>
        <div className="mb-4 inline-flex items-center rounded-full border border-blue-100 bg-blue-50/80 px-3.5 py-1.5 text-xs font-semibold text-primary shadow-[0_10px_24px_rgba(37,99,235,0.05)]">
          Admin Console
        </div>

        <h1 className={ADMIN_TYPE.pageTitle}>Community Moderation</h1>

        <p className={cn("mt-2 max-w-3xl", ADMIN_TYPE.pageSubtitle)}>
          Review posts and comments, take moderation actions, and keep the
          community aligned with platform standards.
        </p>
      </div>

      <button
        onClick={onRefresh}
        disabled={refreshing}
        className="inline-flex shrink-0 items-center gap-2 self-start rounded-[14px] bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-[0_14px_28px_rgba(37,99,235,0.22)] transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
      >
        <HiOutlineArrowPath
          className={cn("h-4 w-4", refreshing ? "animate-spin" : "")}
        />
        Refresh
      </button>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  bgClass,
  iconClass,
}: {
  label: string;
  value: number;
  icon: ElementType;
  bgClass: string;
  iconClass: string;
}) {
  return (
    <div className="group relative overflow-hidden rounded-[24px] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,1),rgba(248,250,255,0.98))] px-6 py-6 shadow-[0_18px_40px_rgba(15,23,42,0.06)] transition-transform duration-200 hover:-translate-y-0.5">
      <div className="pointer-events-none absolute right-6 top-6 hidden grid-cols-4 gap-2 opacity-50 lg:grid">
        {Array.from({ length: 12 }).map((_, index) => (
          <span key={index} className="h-1 w-1 rounded-full bg-blue-200" />
        ))}
      </div>

      <div className="pointer-events-none absolute inset-x-6 -bottom-10 h-24 rounded-full bg-[radial-gradient(circle_at_18%_100%,rgba(96,165,250,0.06),transparent_34%),radial-gradient(circle_at_82%_100%,rgba(191,219,254,0.14),transparent_30%)] blur-2xl" />

      <div className="relative flex items-start gap-5">
        <div
          className={cn(
            "flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-[18px] shadow-sm",
            bgClass,
          )}
        >
          <Icon className={cn("h-7 w-7", iconClass)} />
        </div>

        <div className="min-w-0">
          <p className={ADMIN_TYPE.statLabel}>{label}</p>
          <p className={ADMIN_TYPE.statValue}>{value.toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
}

function ReasonModal({
  title,
  description,
  actionLabel,
  actionClass,
  onConfirm,
  onCancel,
}: {
  title: string;
  description: string;
  actionLabel: string;
  actionClass: string;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}) {
  const [selected, setSelected] = useState("");
  const [custom, setCustom] = useState("");
  const reason = selected === "Other" ? custom : selected;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-[24px] border border-slate-200/80 bg-white shadow-[0_24px_60px_rgba(15,23,42,0.18)]">
        <div className="flex items-start gap-4 border-b border-slate-100 px-6 py-5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-rose-50 text-rose-600">
            <HiOutlineExclamationTriangle className="h-5 w-5" />
          </div>

          <div className="min-w-0 flex-1">
            <h3 className={ADMIN_TYPE.cardTitle}>{title}</h3>
            <p className={cn("mt-1 line-clamp-2", ADMIN_TYPE.meta)}>
              {description}
            </p>
          </div>

          <button
            onClick={onCancel}
            className="rounded-[12px] p-1.5 text-text-muted transition-colors hover:bg-slate-100 hover:text-text-primary"
            type="button"
          >
            <HiOutlineXMark className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 p-6">
          <p className="text-sm font-semibold text-text-primary">
            Reason{" "}
            <span className="font-medium text-text-muted">
              (used in the owner notification)
            </span>
          </p>

          <div className="space-y-2.5">
            {VIOLATION_REASONS.map((reasonOption) => (
              <label
                key={reasonOption}
                className="group flex cursor-pointer items-center gap-3 rounded-[14px] px-2 py-1.5 transition-colors hover:bg-slate-50"
              >
                <span
                  className={cn(
                    "flex h-4 w-4 items-center justify-center rounded-full border-2 transition-colors",
                    selected === reasonOption
                      ? "border-primary bg-primary"
                      : "border-slate-300 group-hover:border-blue-400",
                  )}
                >
                  {selected === reasonOption ? (
                    <span className="h-1.5 w-1.5 rounded-full bg-white" />
                  ) : null}
                </span>

                <input
                  type="radio"
                  className="sr-only"
                  value={reasonOption}
                  checked={selected === reasonOption}
                  onChange={() => setSelected(reasonOption)}
                />

                <span className="text-sm font-medium text-text-secondary transition-colors group-hover:text-text-primary">
                  {reasonOption}
                </span>
              </label>
            ))}
          </div>

          {selected === "Other" ? (
            <textarea
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              placeholder="Add more details..."
              rows={3}
              className="w-full resize-none rounded-[16px] border border-slate-200 bg-white px-4 py-3 text-sm text-text-primary outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
            />
          ) : null}
        </div>

        <div className="flex items-center justify-end gap-2 px-6 pb-6">
          <button
            onClick={onCancel}
            className="rounded-[14px] border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-text-secondary transition-colors hover:bg-slate-50 hover:text-text-primary"
            type="button"
          >
            Cancel
          </button>

          <button
            onClick={() => onConfirm(reason)}
            className={cn(
              "rounded-[14px] px-4 py-2.5 text-sm font-semibold transition-colors",
              actionClass,
            )}
            type="button"
          >
            {actionLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function ActionMenu({
  post,
  onHide,
  onReopen,
  onDelete,
  onViewComments,
  onViewDetail,
}: {
  post: AdminPost;
  onHide: () => void;
  onReopen: () => void;
  onDelete: () => void;
  onViewComments: () => void;
  onViewDetail: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((value) => !value)}
        className="rounded-[12px] p-2 text-text-muted transition-colors hover:bg-slate-100 hover:text-text-primary"
        title="Actions"
        type="button"
      >
        <HiOutlineEllipsisVertical className="h-5 w-5" />
      </button>

      {open ? (
        <div className="absolute right-0 top-11 z-30 w-56 overflow-hidden rounded-[18px] border border-slate-200/80 bg-white py-1 text-sm shadow-[0_18px_40px_rgba(15,23,42,0.14)]">
          <button
            onClick={() => {
              setOpen(false);
              onViewDetail();
            }}
            className="flex w-full items-center gap-2.5 px-4 py-2.5 font-semibold text-text-primary transition-colors hover:bg-slate-50"
            type="button"
          >
            <HiOutlineArrowTopRightOnSquare className="h-4 w-4" />
            View detail
          </button>

          <button
            onClick={() => {
              setOpen(false);
              onViewComments();
            }}
            className="flex w-full items-center gap-2.5 px-4 py-2.5 font-medium text-text-secondary transition-colors hover:bg-slate-50"
            type="button"
          >
            <HiOutlineChatBubbleLeftEllipsis className="h-4 w-4" />
            View comments ({post.comment_count})
          </button>

          <div className="my-1 border-t border-slate-100" />

          {post.is_public ? (
            <button
              onClick={() => {
                setOpen(false);
                onHide();
              }}
              className="flex w-full items-center gap-2.5 px-4 py-2.5 font-medium text-amber-700 transition-colors hover:bg-amber-50"
              type="button"
            >
              <HiOutlineEyeSlash className="h-4 w-4" />
              Hide from feed
            </button>
          ) : (
            <button
              onClick={() => {
                setOpen(false);
                onReopen();
              }}
              className="flex w-full items-center gap-2.5 px-4 py-2.5 font-medium text-lime-700 transition-colors hover:bg-lime-50"
              type="button"
            >
              <HiOutlineEye className="h-4 w-4" />
              Restore to feed
            </button>
          )}

          <div className="my-1 border-t border-slate-100" />

          <button
            onClick={() => {
              setOpen(false);
              onDelete();
            }}
            className="flex w-full items-center gap-2.5 px-4 py-2.5 font-medium text-rose-700 transition-colors hover:bg-rose-50"
            type="button"
          >
            <HiOutlineTrash className="h-4 w-4" />
            Delete permanently
          </button>
        </div>
      ) : null}
    </div>
  );
}

export default function AdminCommunityPage() {
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [posts, setPosts] = useState<AdminPost[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState({ total: 0, active: 0, hidden: 0 });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [activeStatus, setActiveStatus] = useState<StatusFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [comments, setComments] = useState<Record<string, Comment[]>>({});
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [acting, setActing] = useState<string | null>(null);

  type ModalState =
    | { kind: "hide"; postId: string; excerpt: string }
    | { kind: "delete-post"; postId: string; excerpt: string }
    | {
        kind: "delete-comment";
        commentId: string;
        postId: string;
        excerpt: string;
      }
    | null;

  const [modal, setModal] = useState<ModalState>(null);

  const pageSize = 20;

  const loadPosts = useCallback(
    async (targetPage = page, isRefresh = false) => {
      isRefresh ? setRefreshing(true) : setLoading(true);

      try {
        const params = new URLSearchParams({
          page: String(targetPage),
          limit: String(pageSize),
        });

        if (search) params.set("search", search);
        if (activeStatus !== "all") params.set("status", activeStatus);
        if (categoryFilter !== "all") params.set("category", categoryFilter);

        const [postsRes, allRes, activeRes] = await Promise.all([
          authHttp.get<{ data: AdminPost[]; total: number }>(
            `/community/admin/posts?${params}`,
          ),
          authHttp.get<{ total: number }>(
            "/community/admin/posts?page=1&limit=1",
          ),
          authHttp.get<{ total: number }>(
            "/community/admin/posts?page=1&limit=1&status=active",
          ),
        ]);

        setPosts(postsRes.data.data);
        setTotal(postsRes.data.total);

        const totalPosts = allRes.data.total;
        const activePosts = activeRes.data.total;

        setStats({
          total: totalPosts,
          active: activePosts,
          hidden: Math.max(0, totalPosts - activePosts),
        });
      } catch {
        showToast("Unable to load moderation data.", "error");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [activeStatus, categoryFilter, page, search, showToast],
  );

  useEffect(() => {
    loadPosts(page);
  }, [page, search, activeStatus, categoryFilter, loadPosts]);

  const loadComments = async (postId: string) => {
    if (expandedId === postId) {
      setExpandedId(null);
      return;
    }

    setExpandedId(postId);

    if (comments[postId]) return;

    setCommentsLoading(true);

    try {
      const res = await authHttp.get<{ data: Comment[] }>(
        `/community/admin/posts/${postId}/comments?limit=100`,
      );

      setComments((prev) => ({ ...prev, [postId]: res.data.data }));
    } catch {
      showToast("Unable to load comments.", "error");
    } finally {
      setCommentsLoading(false);
    }
  };

  const doHide = async (postId: string, reason: string) => {
    setModal(null);
    setActing(postId);

    try {
      await authHttp.patch(`/community/admin/posts/${postId}/close`, {
        reason: reason || null,
      });

      showToast("Post hidden and owner notified.", "success");

      setPosts((prev) =>
        prev.map((post) =>
          post.id === postId ? { ...post, is_public: false } : post,
        ),
      );

      setStats((prev) => ({
        ...prev,
        active: Math.max(0, prev.active - 1),
        hidden: prev.hidden + 1,
      }));
    } catch {
      showToast("Unable to update the post status.", "error");
    } finally {
      setActing(null);
    }
  };

  const doReopen = async (postId: string) => {
    setActing(postId);

    try {
      await authHttp.patch(`/community/admin/posts/${postId}/reopen`);

      showToast("Post restored to the feed and owner notified.", "success");

      setPosts((prev) =>
        prev.map((post) =>
          post.id === postId ? { ...post, is_public: true } : post,
        ),
      );

      setStats((prev) => ({
        ...prev,
        active: prev.active + 1,
        hidden: Math.max(0, prev.hidden - 1),
      }));
    } catch {
      showToast("Unable to restore this post.", "error");
    } finally {
      setActing(null);
    }
  };

  const doDeletePost = async (postId: string, reason: string) => {
    setModal(null);
    setActing(postId);

    try {
      const q = reason ? `?reason=${encodeURIComponent(reason)}` : "";

      await authHttp.delete(`/community/admin/posts/${postId}${q}`);

      showToast("Post deleted and owner notified.", "success");

      setPosts((prev) => prev.filter((post) => post.id !== postId));
      setTotal((prev) => Math.max(0, prev - 1));

      setStats((prev) => ({
        total: Math.max(0, prev.total - 1),
        active:
          prev.active -
          (posts.find((post) => post.id === postId)?.is_public ? 1 : 0),
        hidden:
          prev.hidden -
          (posts.find((post) => post.id === postId)?.is_public ? 0 : 1),
      }));

      if (expandedId === postId) setExpandedId(null);
    } catch {
      showToast("Unable to delete this post.", "error");
    } finally {
      setActing(null);
    }
  };

  const doDeleteComment = async (
    commentId: string,
    postId: string,
    reason: string,
  ) => {
    setModal(null);

    try {
      const q = reason ? `?reason=${encodeURIComponent(reason)}` : "";

      await authHttp.delete(`/community/admin/comments/${commentId}${q}`);

      showToast("Comment deleted and owner notified.", "success");

      setComments((prev) => ({
        ...prev,
        [postId]: (prev[postId] ?? []).filter(
          (comment) => comment.id !== commentId,
        ),
      }));

      setPosts((prev) =>
        prev.map((post) =>
          post.id === postId
            ? { ...post, comment_count: Math.max(0, post.comment_count - 1) }
            : post,
        ),
      );
    } catch {
      showToast("Unable to delete this comment.", "error");
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  const totalPages = Math.ceil(total / pageSize);

  const fmt = (date: string) =>
    new Date(date).toLocaleString("en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const excerpt = (content: string | null) =>
    content
      ? content.length > 80
        ? `${content.slice(0, 80)}...`
        : content
      : "";

  return (
    <>
      {modal?.kind === "hide" ? (
        <ReasonModal
          title="Hide post from feed"
          description={`"${modal.excerpt}"`}
          actionLabel="Hide and notify owner"
          actionClass="bg-amber-500 text-white hover:bg-amber-600"
          onConfirm={(reason) => doHide(modal.postId, reason)}
          onCancel={() => setModal(null)}
        />
      ) : null}

      {modal?.kind === "delete-post" ? (
        <ReasonModal
          title="Delete post permanently"
          description={`"${modal.excerpt}"`}
          actionLabel="Delete and notify owner"
          actionClass="bg-rose-600 text-white hover:bg-rose-700"
          onConfirm={(reason) => doDeletePost(modal.postId, reason)}
          onCancel={() => setModal(null)}
        />
      ) : null}

      {modal?.kind === "delete-comment" ? (
        <ReasonModal
          title="Delete comment"
          description={`"${modal.excerpt}"`}
          actionLabel="Delete and notify owner"
          actionClass="bg-rose-600 text-white hover:bg-rose-700"
          onConfirm={(reason) =>
            doDeleteComment(modal.commentId, modal.postId, reason)
          }
          onCancel={() => setModal(null)}
        />
      ) : null}

      <div className="min-h-full w-full overflow-x-hidden bg-[linear-gradient(180deg,#f8fbff_0%,#f5f8fc_100%)]">
        <div className="relative w-full overflow-hidden px-8 pb-10 pt-10 sm:px-8 xl:px-10 xl:pt-12 2xl:px-12">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-[radial-gradient(circle_at_top_right,rgba(96,165,250,0.10),transparent_24%),radial-gradient(circle_at_20%_0%,rgba(255,255,255,0.96),transparent_32%)]" />

          <div className="relative space-y-7">
            <PageHero
              refreshing={refreshing}
              onRefresh={() => loadPosts(page, true)}
            />

            <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <StatCard
                label="Total posts"
                value={stats.total}
                icon={HiMiniFlag}
                bgClass="bg-primary"
                iconClass="text-primary-foreground"
              />
              <StatCard
                label="Visible in feed"
                value={stats.active}
                icon={HiOutlineCheckCircle}
                bgClass="bg-lime-50"
                iconClass="text-lime-600"
              />
              <StatCard
                label="Hidden from feed"
                value={stats.hidden}
                icon={HiOutlineEyeSlash}
                bgClass="bg-amber-50"
                iconClass="text-amber-600"
              />
            </section>

            <section className="overflow-hidden rounded-[24px] border border-slate-200/80 bg-white shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
              <div className="flex flex-col gap-4 p-5 xl:flex-row xl:items-center xl:justify-between">
                <form
                  onSubmit={handleSearch}
                  className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-center"
                >
                  <div className="relative min-w-0 flex-1">
                    <HiOutlineMagnifyingGlass className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />

                    <input
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      placeholder="Search posts..."
                      className={cn(inputClass, "pl-10")}
                    />
                  </div>

                  <button
                    type="submit"
                    className="inline-flex items-center justify-center rounded-[14px] bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-[0_14px_28px_rgba(37,99,235,0.18)] transition-colors hover:bg-primary-hover"
                  >
                    Search
                  </button>
                </form>

                <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                  <div className="inline-flex items-center rounded-[16px] border border-slate-200 bg-white p-1.5 shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
                    {(["all", "active", "hidden"] as StatusFilter[]).map(
                      (status) => (
                        <button
                          key={status}
                          onClick={() => {
                            setActiveStatus(status);
                            setPage(1);
                          }}
                          className={cn(
                            "rounded-[10px] px-5 py-2.5 text-sm font-semibold transition-colors",
                            activeStatus === status
                              ? "bg-primary text-primary-foreground shadow-sm"
                              : "text-text-secondary hover:text-text-primary",
                          )}
                          type="button"
                        >
                          {status === "all"
                            ? "All"
                            : status === "active"
                              ? "Visible"
                              : "Hidden"}
                        </button>
                      ),
                    )}
                  </div>

                  <div className="flex items-center gap-2 rounded-[14px] border border-slate-200 bg-white px-3 py-2.5 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
                    <HiOutlineFunnel className="h-4 w-4 text-text-muted" />

                    <select
                      value={categoryFilter}
                      onChange={(e) => {
                        setCategoryFilter(e.target.value);
                        setPage(1);
                      }}
                      className="cursor-pointer bg-transparent text-sm font-semibold text-text-secondary outline-none"
                    >
                      <option value="all">All categories</option>
                      {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                        <option key={key} value={key}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <span className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-semibold text-text-muted">
                    {total.toLocaleString()} posts
                  </span>
                </div>
              </div>
            </section>

            {loading ? (
              <div className="flex min-h-[360px] flex-col items-center justify-center gap-4 rounded-[24px] border border-slate-200/80 bg-white shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
                <div className="flex h-20 w-20 items-center justify-center rounded-full border border-blue-100 bg-blue-50/70 shadow-[0_12px_26px_rgba(96,165,250,0.12)]">
                  <HiOutlineArrowPath className="h-8 w-8 animate-spin text-blue-400" />
                </div>

                <p className={ADMIN_TYPE.body}>Loading moderation posts...</p>
              </div>
            ) : posts.length === 0 ? (
              <div className="flex min-h-[360px] flex-col items-center justify-center rounded-[24px] border border-slate-200/80 bg-white px-6 py-16 text-center shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
                <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-full border border-blue-100 bg-blue-50/70 shadow-[0_12px_26px_rgba(96,165,250,0.12)]">
                  <HiMiniFlag className="h-8 w-8 text-blue-400" />
                </div>

                <p className={ADMIN_TYPE.cardTitle}>
                  No posts matched the current filters.
                </p>
                <p className={cn("mt-2", ADMIN_TYPE.body)}>
                  Try adjusting the search, status, or category filter.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {posts.map((post) => {
                  const isBusy = acting === post.id;
                  const isExpanded = expandedId === post.id;
                  const postComments = comments[post.id] ?? [];

                  return (
                    <article
                      key={post.id}
                      className={cn(
                        "overflow-hidden rounded-[24px] border border-slate-200/80 bg-white shadow-[0_18px_40px_rgba(15,23,42,0.06)]",
                        isBusy ? "pointer-events-none opacity-50" : "",
                      )}
                    >
                      <div
                        className={cn(
                          "p-5 sm:p-6",
                          !post.is_public ? "bg-amber-50/45" : "",
                        )}
                      >
                        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className={cn(
                                  "rounded-full px-2.5 py-1 text-[11px] font-semibold",
                                  CATEGORY_COLORS[post.category] ??
                                    "border border-slate-200 bg-slate-100 text-slate-700",
                                )}
                              >
                                {CATEGORY_LABELS[post.category] ??
                                  post.category}
                              </span>

                              {post.images.length > 0 ? (
                                <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-text-muted">
                                  <HiOutlinePhoto className="h-3.5 w-3.5" />
                                  {post.images.length}
                                </span>
                              ) : null}

                              <span
                                className={cn(
                                  "rounded-full px-2.5 py-1 text-[11px] font-semibold",
                                  post.is_public
                                    ? "border border-lime-200 bg-lime-50 text-lime-700"
                                    : "border border-amber-200 bg-amber-50 text-amber-700",
                                )}
                              >
                                {post.is_public ? "Visible" : "Hidden"}
                              </span>
                            </div>

                            <button
                              onClick={() =>
                                navigate(`/admin/community/posts/${post.id}`)
                              }
                              className={cn(
                                "mt-4 block w-full text-left transition-colors hover:text-primary",
                                ADMIN_TYPE.cardTitle,
                              )}
                              type="button"
                            >
                              {post.content || (
                                <span className="text-sm font-normal italic text-text-muted">
                                  [No text content]
                                </span>
                              )}
                            </button>

                            <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center">
                              <div className="flex min-w-0 items-center gap-3">
                                <Avatar
                                  src={post.author?.avatar_url}
                                  name={
                                    post.author?.display_name ||
                                    post.author?.username
                                  }
                                  size="md"
                                />

                                <div className="min-w-0">
                                  <p className="truncate text-sm font-semibold text-text-primary">
                                    {post.author?.display_name ||
                                      post.author?.username ||
                                      "Unknown user"}
                                  </p>
                                  <p className="truncate text-xs font-medium text-text-muted">
                                    @{post.author?.username}
                                  </p>
                                </div>
                              </div>

                              <div className="flex flex-wrap items-center gap-3 text-xs font-medium text-text-muted">
                                <span className="inline-flex items-center gap-1.5">
                                  <HiOutlineEye className="h-3.5 w-3.5" />
                                  {post.view_count.toLocaleString()}
                                </span>

                                <span className="inline-flex items-center gap-1.5">
                                  <span className="text-rose-400">♥</span>
                                  {post.reaction_count}
                                </span>

                                <span className="inline-flex items-center gap-1.5">
                                  <HiOutlineChatBubbleLeftEllipsis className="h-3.5 w-3.5" />
                                  {post.comment_count}
                                </span>

                                <span>{fmt(post.created_at)}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center justify-between gap-2 lg:flex-col lg:items-end">
                            <div className="flex items-center gap-2">
                              {post.comment_count > 0 ? (
                                <button
                                  onClick={() => loadComments(post.id)}
                                  className={cn(
                                    "rounded-[12px] p-2 transition-colors",
                                    isExpanded
                                      ? "bg-blue-50 text-primary"
                                      : "text-text-muted hover:bg-slate-100 hover:text-primary",
                                  )}
                                  title={
                                    isExpanded
                                      ? "Hide comments"
                                      : "View comments"
                                  }
                                  type="button"
                                >
                                  {isExpanded ? (
                                    <HiOutlineChevronDown className="h-4 w-4" />
                                  ) : (
                                    <HiOutlineChevronRight className="h-4 w-4" />
                                  )}
                                </button>
                              ) : null}

                              <ActionMenu
                                post={post}
                                onViewDetail={() =>
                                  navigate(`/admin/community/posts/${post.id}`)
                                }
                                onViewComments={() => loadComments(post.id)}
                                onHide={() =>
                                  setModal({
                                    kind: "hide",
                                    postId: post.id,
                                    excerpt: excerpt(post.content),
                                  })
                                }
                                onReopen={() => doReopen(post.id)}
                                onDelete={() =>
                                  setModal({
                                    kind: "delete-post",
                                    postId: post.id,
                                    excerpt: excerpt(post.content),
                                  })
                                }
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {isExpanded ? (
                        <div className="border-t border-slate-100 bg-[linear-gradient(180deg,rgba(248,250,255,0.95),rgba(255,255,255,1))] px-5 py-4 sm:px-6">
                          <div className="mb-3 flex items-center justify-between">
                            <span className="inline-flex items-center gap-2 text-xs font-semibold text-text-secondary">
                              <HiOutlineChatBubbleLeftEllipsis className="h-4 w-4 text-primary" />
                              Comments
                              <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                                {postComments.length}
                              </span>
                            </span>

                            <button
                              onClick={() => setExpandedId(null)}
                              className="inline-flex items-center gap-1 text-xs font-semibold text-text-muted transition-colors hover:text-text-primary"
                              type="button"
                            >
                              <HiOutlineXMark className="h-3.5 w-3.5" />
                              Close
                            </button>
                          </div>

                          {commentsLoading ? (
                            <div className="flex items-center gap-2 py-5 text-sm font-medium text-text-muted">
                              <HiOutlineArrowPath className="h-4 w-4 animate-spin" />
                              Loading comments...
                            </div>
                          ) : postComments.length === 0 ? (
                            <p className="py-5 text-center text-sm font-medium text-text-muted">
                              No comments
                            </p>
                          ) : (
                            <div className="overflow-hidden rounded-[20px] border border-slate-200/80 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
                              {postComments.map((comment, index) => (
                                <div
                                  key={comment.id}
                                  className={cn(
                                    "group flex items-start gap-3 px-4 py-3 transition-colors hover:bg-slate-50",
                                    index !== 0
                                      ? "border-t border-slate-100"
                                      : "",
                                  )}
                                >
                                  <Avatar
                                    src={comment.author?.avatar_url}
                                    name={
                                      comment.author?.display_name ||
                                      comment.author?.username
                                    }
                                  />

                                  <div className="min-w-0 flex-1">
                                    <div className="mb-1 flex flex-wrap items-center gap-2">
                                      <span className="text-xs font-semibold text-text-primary">
                                        {comment.author?.display_name ||
                                          comment.author?.username ||
                                          "Unknown"}
                                      </span>

                                      <span className="text-[11px] font-medium text-text-muted">
                                        @{comment.author?.username}
                                      </span>

                                      {comment.parent_comment_id ? (
                                        <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-text-muted">
                                          ↳ reply
                                        </span>
                                      ) : null}

                                      <span className="ml-auto text-[11px] font-medium text-text-muted">
                                        {fmt(comment.created_at)}
                                      </span>
                                    </div>

                                    <p className="break-words text-sm leading-7 text-text-secondary">
                                      {comment.content}
                                    </p>
                                  </div>

                                  <button
                                    onClick={() =>
                                      setModal({
                                        kind: "delete-comment",
                                        commentId: comment.id,
                                        postId: post.id,
                                        excerpt: excerpt(comment.content),
                                      })
                                    }
                                    className="shrink-0 rounded-[12px] p-1.5 text-rose-400 opacity-0 transition hover:bg-rose-50 group-hover:opacity-100"
                                    title="Delete comment"
                                    type="button"
                                  >
                                    <HiOutlineTrash className="h-4 w-4" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : null}
                    </article>
                  );
                })}
              </div>
            )}

            {totalPages > 1 ? (
              <div className="flex flex-wrap items-center justify-center gap-1.5 pb-1 pt-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage(1)}
                  className="rounded-[14px] border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-text-secondary transition-colors hover:bg-slate-50 disabled:opacity-30"
                  type="button"
                >
                  «
                </button>

                <button
                  disabled={page <= 1}
                  onClick={() => setPage((prev) => prev - 1)}
                  className="rounded-[14px] border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-text-secondary transition-colors hover:bg-slate-50 disabled:opacity-30"
                  type="button"
                >
                  ← Previous
                </button>

                {Array.from({ length: Math.min(5, totalPages) }, (_, index) => {
                  const start = Math.max(
                    1,
                    Math.min(page - 2, totalPages - 4),
                  );
                  const current = start + index;

                  return (
                    <button
                      key={current}
                      onClick={() => setPage(current)}
                      className={cn(
                        "h-10 w-10 rounded-[14px] border text-sm font-semibold transition-colors",
                        current === page
                          ? "border-primary bg-primary text-primary-foreground shadow-sm"
                          : "border-slate-200 bg-white text-text-secondary hover:bg-slate-50",
                      )}
                      type="button"
                    >
                      {current}
                    </button>
                  );
                })}

                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage((prev) => prev + 1)}
                  className="rounded-[14px] border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-text-secondary transition-colors hover:bg-slate-50 disabled:opacity-30"
                  type="button"
                >
                  Next →
                </button>

                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage(totalPages)}
                  className="rounded-[14px] border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-text-secondary transition-colors hover:bg-slate-50 disabled:opacity-30"
                  type="button"
                >
                  »
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </>
  );
}