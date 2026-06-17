import type { IconType } from "react-icons";

type Props = {
  label: string;
  value?: string | null;
  icon?: IconType;
};

export default function KycInfoItem({
  label,
  value,
  icon: Icon,
}: Props) {
  return (
    <div className="rounded-2xl border border-border bg-background px-4 py-4">
      <div className="flex items-start gap-3">
        {Icon ? (
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent/60 text-foreground">
            <Icon className="h-4 w-4" />
          </div>
        ) : null}

        <div className="min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-secondary">
            {label}
          </div>
          <div className="mt-2 break-words text-sm font-medium leading-6 text-foreground">
            {value || "-"}
          </div>
        </div>
      </div>
    </div>
  );
}