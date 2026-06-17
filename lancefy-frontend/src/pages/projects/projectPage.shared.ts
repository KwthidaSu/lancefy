import { fetchMilestoneSubmissions } from "@/services/projects/project";
import type { MilestoneBoardItem } from "@/services/projects/project.types";
import type { CurrentUser } from "@/auth/auth.types";
import type { Message } from "@/types/chat.types";

const CHAT_TIME_ZONE = "Asia/Bangkok";
const IMAGE_FILE_PATTERN = /\.(png|jpe?g|gif|webp|bmp|svg)(\?|$)/i;

export type ProjectPageUserLike = Pick<
  CurrentUser,
  "id" | "firstname" | "lastname" | "username" | "email" | "avatar_url"
>;

type MilestoneSubmissionPayload = {
  id: string;
  submitted_by?: string;
  message?: string;
  status?: string;
  attachments?: string[];
  submitted_at?: string;
  reviewed_at?: string;
};

export type AttachmentItem = {
  id: string;
  type: "file" | "image";
  url: string;
  filename: string;
  sender: string;
  created_at?: string;
  source: "chat" | "milestone";
  sourceLabel?: string;
};

export type MilestoneSubmissionLog = {
  id: string;
  milestone_id: string;
  milestone_title: string;
  submitted_by?: string;
  message?: string;
  status?: string;
  submitted_at?: string;
  reviewed_at?: string;
  attachments_count: number;
};

export type ActivityItem = {
  id: string;
  at?: string;
  title: string;
  detail?: string;
  tone?: "info" | "success" | "warning" | "danger" | "neutral";
  actorId?: string;
};

function formatBangkokDayKey(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: CHAT_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function isImageFileUrl(url?: string) {
  return url ? IMAGE_FILE_PATTERN.test(url) : false;
}

export function resolveDisplayUserName(
  user: ProjectPageUserLike | null | undefined,
  unknownLabel: string
) {
  if (!user) {
    return unknownLabel;
  }

  const name = `${user.firstname ?? ""} ${user.lastname ?? ""}`.trim();
  return name || user.username || user.email || unknownLabel;
}

export function resolveChatPeer(
  participants: ProjectPageUserLike[],
  currentUserId?: string | null
) {
  return participants.find((participant) => participant.id !== currentUserId) ?? null;
}

export function parseProjectPageDate(value?: string) {
  if (!value) return null;

  const hasTimeZone = /(?:Z|[-+]\d{2}:\d{2})$/.test(value);
  const normalized = hasTimeZone ? value : `${value}Z`;
  const parsedDate = new Date(normalized);

  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
}

export function formatProjectChatTime(
  value: string | undefined,
  language: string
) {
  const parsedDate = parseProjectPageDate(value);
  if (!parsedDate) return "";

  const locale = language === "th" ? "th-TH" : "en-GB";
  return parsedDate.toLocaleTimeString(locale, {
    timeZone: CHAT_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function isSameProjectDay(a?: string, b?: string) {
  if (!a || !b) return false;

  const firstDate = parseProjectPageDate(a);
  const secondDate = parseProjectPageDate(b);
  if (!firstDate || !secondDate) return false;

  return formatBangkokDayKey(firstDate) === formatBangkokDayKey(secondDate);
}

export function formatProjectDaySeparator(
  value: string | undefined,
  language: string,
  labels: {
    today: string;
    yesterday: string;
  }
) {
  const parsedDate = parseProjectPageDate(value);
  if (!parsedDate) return "";

  const todayKey = formatBangkokDayKey(new Date());
  const targetKey = formatBangkokDayKey(parsedDate);

  const parseDayKeyUtc = (dayKey: string) => {
    const [year, month, day] = dayKey.split("-").map(Number);
    return Date.UTC(year, month - 1, day);
  };

  const diffDays = Math.round(
    (parseDayKeyUtc(targetKey) - parseDayKeyUtc(todayKey)) / 86400000
  );

  if (diffDays === 0) return labels.today;
  if (diffDays === -1) return labels.yesterday;

  const locale = language === "th" ? "th-TH" : "en-GB";
  return parsedDate.toLocaleDateString(locale, {
    timeZone: CHAT_TIME_ZONE,
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function resolveMessageFileMeta(
  content: string,
  fallbackFileLabel: string
) {
  try {
    const meta = JSON.parse(content) as {
      url?: string;
      filename?: string;
    };

    return {
      url: meta.url ?? content,
      filename: meta.filename ?? fallbackFileLabel,
    };
  } catch {
    return {
      url: content,
      filename: fallbackFileLabel,
    };
  }
}

export function buildChatAttachmentItems(params: {
  messages: Message[];
  imageLabel: string;
  fileLabel: string;
  resolveSenderLabel: (senderId: string) => string;
}) {
  const { messages, imageLabel, fileLabel, resolveSenderLabel } = params;

  return messages
    .filter((message) => message.message_type === "file" || message.message_type === "image")
    .map((message): AttachmentItem => {
      if (message.message_type === "image") {
        return {
          id: message.id,
          type: "image",
          url: message.content,
          filename: imageLabel,
          sender: resolveSenderLabel(message.sender_id),
          created_at: message.created_at,
          source: "chat",
        };
      }

      const fileMeta = resolveMessageFileMeta(message.content, fileLabel);
      return {
        id: message.id,
        type: "file",
        url: fileMeta.url,
        filename: fileMeta.filename,
        sender: resolveSenderLabel(message.sender_id),
        created_at: message.created_at,
        source: "chat",
      };
    });
}

export function sortByOccurredAtDesc<T>(
  items: T[],
  getTimestamp: (item: T) => string | undefined
) {
  return [...items].sort((left, right) => {
    const leftTime = parseProjectPageDate(getTimestamp(left))?.getTime() ?? 0;
    const rightTime = parseProjectPageDate(getTimestamp(right))?.getTime() ?? 0;
    return rightTime - leftTime;
  });
}

export function getActivityToneClass(tone?: ActivityItem["tone"]) {
  if (tone === "success") return "bg-lime-500";
  if (tone === "warning") return "bg-amber-500";
  if (tone === "danger") return "bg-rose-500";
  if (tone === "info") return "bg-blue-500";
  return "bg-slate-400";
}

export async function buildMilestoneArtifacts(params: {
  projectId: string;
  milestones: MilestoneBoardItem[];
  currentUserId?: string | null;
  participants: ProjectPageUserLike[];
  meLabel: string;
  fileLabel: string;
  imageLabel: string;
  fromMilestoneLabel: (title: string) => string;
}) {
  const {
    projectId,
    milestones,
    currentUserId,
    participants,
    meLabel,
    fileLabel,
    imageLabel,
    fromMilestoneLabel,
  } = params;

  const getSenderName = (submittedBy?: string) => {
    if (!submittedBy) return "";
    if (submittedBy === currentUserId) return meLabel;

    const participant = participants.find((candidate) => candidate.id === submittedBy);
    if (!participant) return "";

    return (
      `${participant.firstname ?? ""} ${participant.lastname ?? ""}`.trim() ||
      participant.username ||
      participant.email ||
      ""
    );
  };

  const batches = await Promise.all(
    milestones.map(async (milestone) => {
      try {
        const response = await fetchMilestoneSubmissions(projectId, milestone.id);
        return {
          milestone,
          submissions: (response.data || []) as MilestoneSubmissionPayload[],
        };
      } catch {
        return {
          milestone,
          submissions: [] as MilestoneSubmissionPayload[],
        };
      }
    })
  );

  const items: AttachmentItem[] = [];
  const logs: MilestoneSubmissionLog[] = [];

  for (const batch of batches) {
    for (const submission of batch.submissions) {
      const milestoneTitle =
        batch.milestone.title || `#${batch.milestone.sequence ?? "-"}`;

      logs.push({
        id: submission.id,
        milestone_id: batch.milestone.id,
        milestone_title: milestoneTitle,
        submitted_by: submission.submitted_by,
        message: submission.message,
        status: submission.status,
        submitted_at: submission.submitted_at,
        reviewed_at: submission.reviewed_at,
        attachments_count: (submission.attachments || []).length,
      });

      for (const url of submission.attachments || []) {
        items.push({
          id: `ms-${submission.id}-${url}`,
          type: isImageFileUrl(url) ? "image" : "file",
          url,
          filename: isImageFileUrl(url) ? imageLabel : getFileNameFromUrl(url, fileLabel),
          sender: getSenderName(submission.submitted_by),
          created_at: submission.submitted_at,
          source: "milestone",
          sourceLabel: fromMilestoneLabel(milestoneTitle),
        });
      }
    }
  }

  return { items, logs };
}

function getFileNameFromUrl(url: string | undefined, fallbackFileLabel: string) {
  if (!url) return fallbackFileLabel;

  try {
    const cleanUrl = url.split("?")[0];
    const rawFileName = cleanUrl.substring(cleanUrl.lastIndexOf("/") + 1);
    return decodeURIComponent(rawFileName || fallbackFileLabel);
  } catch {
    return fallbackFileLabel;
  }
}
