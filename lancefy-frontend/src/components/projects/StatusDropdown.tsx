import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Check } from "lucide-react";
import clsx from "clsx";

type Option<T extends string> = {
  value: T;
  label: string;
};

type Props<T extends string> = {
  value: T[];
  onChange: (value: T[]) => void;
  options: Option<T>[];
  allLabel?: string;
  labelPrefix?: string;
  selectedLabel?: string;
  clearLabel?: string;
  className?: string;
  triggerClassName?: string;
  panelClassName?: string;
};

export default function StatusDropdown<T extends string>({
  value,
  onChange,
  options,
  allLabel = "All",
  labelPrefix = "Status",
  selectedLabel = "selected",
  clearLabel = "Clear filter",
  className,
  triggerClassName,
  panelClassName,
}: Props<T>) {
  const [open, setOpen] = useState(false);
  const [align, setAlign] = useState<"left" | "right">("left");

  const triggerRef = useRef<HTMLButtonElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  /* =========================
     Close on outside click
  ========================= */

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        !containerRef.current?.contains(
          e.target as Node
        )
      ) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handler);
    return () =>
      document.removeEventListener(
        "mousedown",
        handler
      );
  }, []);

  /* =========================
     Auto align (prevent overflow)
  ========================= */

  useEffect(() => {
    if (!open || !triggerRef.current) return;

    const rect =
      triggerRef.current.getBoundingClientRect();
    const dropdownWidth = 192; // w-48
    const spaceRight =
      window.innerWidth - rect.left;
    const spaceLeft = rect.right;

    if (spaceRight < dropdownWidth && spaceLeft > dropdownWidth) {
      setAlign("right");
    } else {
      setAlign("left");
    }
  }, [open]);

  /* =========================
     Toggle option
  ========================= */

  const toggle = (status: T) => {
    if (value.includes(status)) {
      onChange(value.filter((s) => s !== status));
    } else {
      onChange([...value, status]);
    }
  };

  /* =========================
     Label
  ========================= */

  const label = useMemo(() => {
    if (value.length === 0) return `${labelPrefix}: ${allLabel}`;

    if (value.length === 1) {
      const found = options.find(
        (o) => o.value === value[0]
      );
      return found
        ? `${labelPrefix}: ${found.label}`
        : labelPrefix;
    }

    return `${labelPrefix}: ${value.length} ${selectedLabel}`;
  }, [allLabel, labelPrefix, options, selectedLabel, value]);

  /* =========================
     Render
  ========================= */

  return (
    <div
      ref={containerRef}
      className={clsx("relative inline-block", className)}
    >
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="listbox"
        className={clsx(
          "inline-flex items-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm text-text-muted hover:bg-gray-50",
          triggerClassName
        )}
      >
        {label}
        <ChevronDown className="w-4 h-4" />
      </button>

      {open && (
        <div
          role="listbox"
          aria-multiselectable="true"
          className={clsx(
            "absolute z-20 mt-2 w-48 rounded-lg border bg-white shadow-lg",
            align === "left"
              ? "left-0"
              : "right-0",
            panelClassName
          )}
        >
          <div className="p-2 space-y-1">
            {options.map((opt) => {
              const checked = value.includes(
                opt.value
              );

              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() =>
                    toggle(opt.value)
                  }
                  aria-selected={checked}
                  className={clsx(
                    "flex w-full items-center justify-between rounded px-2 py-2 text-sm transition",
                    checked
                      ? "bg-accent/10 text-text-primary"
                      : "hover:bg-gray-50"
                  )}
                >
                  <span>{opt.label}</span>
                  {checked && (
                    <Check className="w-4 h-4 text-primary-foreground" />
                  )}
                </button>
              );
            })}
          </div>

          {value.length > 0 && (
            <div className="border-t px-3 py-2">
              <button
                type="button"
                onClick={() => onChange([])}
                className="text-xs text-text-muted hover:text-text-primary"
              >
                {clearLabel}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
