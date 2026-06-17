export type StatusFilterValue =
  | "all"
  | "draft"
  | "open";

interface Props {
  value: StatusFilterValue;
  onChange: (value: StatusFilterValue) => void;
  labels: Record<StatusFilterValue, string>;
}

export default function StatusFilter({
  value,
  onChange,
  labels,
}: Props) {
  const items = Object.entries(labels) as [
    StatusFilterValue,
    string
  ][];

  return (
    <div className="inline-flex items-center rounded-xl bg-input p-1">
      {items.map(([key, label]) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          className={
            value === key
              ? "px-4 py-1.5 text-sm font-medium rounded-lg bg-white text-primary shadow-sm transition"
              : "px-4 py-1.5 text-sm font-medium rounded-lg text-text-muted hover:text-text-primary transition"
          }
        >
          {label}
        </button>
      ))}
    </div>
  );
}
