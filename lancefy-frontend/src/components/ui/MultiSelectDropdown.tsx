import { useEffect, useRef, useState } from "react";
import { ChevronDown, X, Check, Plus } from "lucide-react";
import { cn } from "@/utils/cn";

type Option = { value: string; label: string };

const OTHER_PREFIX = "other:";

type MultiSelectDropdownProps = {
  values: string[];
  options: Option[];
  placeholder?: string;
  onChange: (values: string[], primaryLabel: string) => void;
  className?: string;
};

function getLabel(value: string, options: Option[]) {
  if (value.startsWith(OTHER_PREFIX)) {
    return value.replace(OTHER_PREFIX, "");
  }

  return options.find((option) => option.value === value)?.label ?? value;
}

export default function MultiSelectDropdown({
  values,
  options,
  placeholder = "เลือกหมวดหมู่...",
  onChange,
  className,
}: MultiSelectDropdownProps) {
  const [open, setOpen] = useState(false);
  const [showOther, setShowOther] = useState(false);
  const [otherText, setOtherText] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const emitChange = (next: string[]) => {
    const primaryLabel =
      options.find((option) => next.includes(option.value))?.label ??
      (next[0]?.startsWith(OTHER_PREFIX)
        ? next[0].replace(OTHER_PREFIX, "")
        : "");

    onChange(next, primaryLabel);
  };

  const toggle = (value: string) => {
    const next = values.includes(value)
      ? values.filter((currentValue) => currentValue !== value)
      : [...values, value];

    emitChange(next);
  };

  const removeChip = (value: string, event: React.MouseEvent) => {
    event.stopPropagation();
    emitChange(values.filter((currentValue) => currentValue !== value));
  };

  const handleOtherAdd = () => {
    const trimmed = otherText.trim();
    if (!trimmed) return;

    const key = `${OTHER_PREFIX}${trimmed}`;
    if (!values.includes(key)) {
      emitChange([...values, key]);
    }

    setOtherText("");
  };

  return (
    <div ref={ref} className={cn("relative w-full", className)}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={cn(
          "min-h-12 w-full flex items-center flex-wrap gap-1.5 px-3 py-2 text-sm rounded-lg border transition-colors text-left",
          "bg-input border-border text-foreground",
          open ? "border-accent ring-2 ring-accent/20" : "hover:border-accent"
        )}
      >
        {values.length === 0 ? (
          <span className="text-text-muted flex-1">{placeholder}</span>
        ) : (
          <>
            {values.map((value) => (
              <span
                key={value}
                onClick={(event) => removeChip(value, event)}
                className="flex items-center gap-1 bg-accent/15 text-primary-foreground px-2 py-0.5 rounded-md text-xs font-medium cursor-pointer hover:bg-red-50 hover:text-red-600 transition-colors"
              >
                {getLabel(value, options)}
                <X className="w-3 h-3 shrink-0" />
              </span>
            ))}
            <span className="flex-1" />
          </>
        )}
        <ChevronDown
          className={cn(
            "ml-auto h-4 w-4 text-text-muted transition-transform shrink-0",
            open && "rotate-180"
          )}
        />
      </button>

      {open && (
        <div className="absolute z-50 mt-2 w-full rounded-lg border border-border bg-surface shadow-lg p-2 max-h-72 overflow-y-auto">
          <div className="space-y-0.5">
            {options.map((option) => {
              const active = values.includes(option.value);

              return (
                <div
                  key={option.value}
                  onClick={() => toggle(option.value)}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm cursor-pointer transition-colors select-none",
                    active
                      ? "bg-accent/15 text-primary-foreground font-medium"
                      : "hover:bg-accent/10 text-foreground"
                  )}
                >
                  <div
                    className={cn(
                      "w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors",
                      active ? "bg-accent border-accent" : "border-border"
                    )}
                  >
                    {active && <Check className="w-2.5 h-2.5 text-white" />}
                  </div>
                  <span>{option.label}</span>
                </div>
              );
            })}

            <div className="pt-1 mt-1 border-t border-border">
              <div
                onClick={() => setShowOther((current) => !current)}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm cursor-pointer transition-colors select-none",
                  showOther ? "bg-accent/10" : "hover:bg-accent/10"
                )}
              >
                <div className="w-4 h-4 rounded border-2 border-dashed border-border flex items-center justify-center shrink-0">
                  <Plus className="w-2.5 h-2.5 text-text-muted" />
                </div>
                <span className="text-text-muted">อื่นๆ (Other)</span>
              </div>

              {showOther && (
                <div className="px-3 pb-2 flex gap-2 mt-1">
                  <input
                    type="text"
                    value={otherText}
                    onChange={(event) => setOtherText(event.target.value)}
                    onKeyDown={(event) => event.key === "Enter" && handleOtherAdd()}
                    placeholder="ระบุหมวดหมู่..."
                    className="flex-1 h-8 px-2.5 text-xs border border-border rounded-md bg-input focus:outline-none focus:ring-1 focus:ring-accent"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={handleOtherAdd}
                    className="h-8 px-3 text-xs bg-accent text-white rounded-md hover:opacity-90 transition-opacity"
                  >
                    เพิ่ม
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
