import { useEffect, useRef, useState } from "react";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "@/utils/cn";

type Option = { value: string; label: string };

type DropdownProps = {
  value: string;
  options: Option[];
  placeholder?: string;
  disabled?: boolean;
  onChange: (value: string) => void;
  className?: string;  
};

export default function Dropdown({
  value,
  options,
  placeholder = "Select option",
  disabled = false,
  onChange,
  className,  
}: DropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  const selected = options.find((o) => o.value === value);

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
    <div ref={ref} className={`relative w-full ${className}`}> 
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((v) => !v)}
        className={cn(
          "flex h-12 w-full items-center justify-between px-4 text-sm rounded-lg border transition-colors",
          "bg-input border-border text-foreground",
          disabled
            ? "opacity-50 cursor-not-allowed"
            : open
            ? "border-accent ring-2 ring-accent/20"
            : "hover:border-accent"
        )}
      >
        <span
          className={cn(
            "truncate",
            selected ? "text-foreground" : "text-text-muted"
          )}
        >
          {selected?.label || placeholder}
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-text-muted transition-transform",
            open && "rotate-180"
          )}
        />
      </button>

      {open && !disabled && (
        <div className="absolute z-50 mt-2 w-full rounded-lg border border-border bg-surface shadow-lg p-2">
          <div className="space-y-1">
            {options.map((opt) => {
              const active = opt.value === value;
              return (
                <div
                  key={opt.value}
                  onClick={() => {
                    onChange(opt.value);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex items-center justify-between rounded-md px-4 py-2 text-sm cursor-pointer transition-colors",
                    active
                      ? "bg-accent text-primary-foreground font-medium"
                      : "hover:bg-accent/50"
                  )}
                >
                  <span>{opt.label}</span>
                  {active && (
                    <Check className="h-4 w-4 text-current" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
