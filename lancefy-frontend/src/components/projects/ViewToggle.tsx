import { cn } from "@/lib/utils";

interface Props {
  value: "card" | "table";
  onChange: (value: "card" | "table") => void;
  labels: {
    card: string;
    table: string;
  };
}

export default function ViewToggle({
  value,
  onChange,
  labels,
}: Props) {
  return (
    <div className="inline-flex rounded-lg border border-border bg-input p-1">
      <button
        onClick={() => onChange("card")}
        className={cn(
          "px-3 py-1.5 text-sm rounded-md transition-colors",
          value === "card"
            ? "bg-primary text-white"
            : "text-text-muted hover:bg-primary/10"
        )}
      >
        {labels.card}
      </button>
      <button
        onClick={() => onChange("table")}
        className={cn(
          "px-3 py-1.5 text-sm rounded-md transition-colors",
          value === "table"
            ? "bg-primary text-white"
            : "text-text-muted hover:bg-primary/10"
        )}
      >
        {labels.table}
      </button>
    </div>
  );
}
