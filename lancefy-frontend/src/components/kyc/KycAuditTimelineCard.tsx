import {
  HiCheckBadge,
  HiCheckCircle,
  HiClock,
  HiDocumentText,
  HiExclamationTriangle,
  HiShieldCheck,
  HiUser,
  HiXCircle,
} from "react-icons/hi2";

export type KycTimelineItem = {
  id: string;
  type:
    | "submitted"
    | "document"
    | "review"
    | "approved"
    | "rejected"
    | "warning"
    | "verified";
  title: string;
  description?: string;
  actor?: string;
  at?: string;
};

type Props = {
  items: KycTimelineItem[];
};

export default function KycAuditTimelineCard({ items }: Props) {
  return (
    <section className="rounded-[24px] border border-border bg-surface shadow-sm">
      <div className="border-b border-border px-6 py-4">
        <h2 className="text-lg font-semibold text-foreground">
          Review Timeline
        </h2>
      </div>

      <div className="p-6">
        <div className="space-y-0">
          {items.map((item, index) => {
            const isLast = index === items.length - 1;
            const styles = getTimelineStyles(item.type);
            const Icon = styles.icon;

            return (
              <div key={item.id} className="relative flex gap-4 pb-6 last:pb-0">
                {!isLast ? (
                  <div className="absolute left-[19px] top-11 bottom-0 w-px bg-border" />
                ) : null}

                <div
                  className={`relative z-10 mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border ${styles.iconWrapper}`}
                >
                  <Icon className={`h-5 w-5 ${styles.iconClass}`} />
                </div>

                <div className="min-w-0 flex-1 rounded-2xl border border-border bg-background px-4 py-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-foreground">
                        {item.title}
                      </div>
                      {item.description ? (
                        <div className="mt-1 text-sm leading-6 text-text-secondary">
                          {item.description}
                        </div>
                      ) : null}
                    </div>

                    {item.at ? (
                      <div className="shrink-0 text-xs font-medium text-text-secondary">
                        {item.at}
                      </div>
                    ) : null}
                  </div>

                  {item.actor ? (
                    <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-text-secondary">
                      <HiUser className="h-4 w-4" />
                      {item.actor}
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function getTimelineStyles(type: KycTimelineItem["type"]) {
  switch (type) {
    case "approved":
      return {
        icon: HiCheckCircle,
        iconWrapper: "border-lime-200 bg-lime-50",
        iconClass: "text-lime-600",
      };
    case "rejected":
      return {
        icon: HiXCircle,
        iconWrapper: "border-red-200 bg-red-50",
        iconClass: "text-red-600",
      };
    case "document":
      return {
        icon: HiDocumentText,
        iconWrapper: "border-blue-200 bg-blue-50",
        iconClass: "text-blue-600",
      };
    case "review":
      return {
        icon: HiClock,
        iconWrapper: "border-amber-200 bg-amber-50",
        iconClass: "text-amber-600",
      };
    case "warning":
      return {
        icon: HiExclamationTriangle,
        iconWrapper: "border-amber-200 bg-amber-50",
        iconClass: "text-amber-600",
      };
    case "verified":
      return {
        icon: HiCheckBadge,
        iconWrapper: "border-lime-200 bg-lime-50",
        iconClass: "text-lime-600",
      };
    case "submitted":
    default:
      return {
        icon: HiShieldCheck,
        iconWrapper: "border-slate-200 bg-slate-50",
        iconClass: "text-slate-600",
      };
  }
}