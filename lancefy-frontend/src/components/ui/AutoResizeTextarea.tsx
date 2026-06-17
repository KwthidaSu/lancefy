import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

type AutoResizeTextareaProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  maxLength?: number;
  minRows?: number;
  maxHeight?: number;
  className?: string;
  disabled?: boolean;
};

export default function AutoResizeTextarea({
  value,
  onChange,
  placeholder,
  maxLength = 1200,
  minRows = 4,
  maxHeight = 240,
  className,
  disabled = false,
}: AutoResizeTextareaProps) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!ref.current) return;

    ref.current.style.height = "auto";
    const nextHeight = Math.min(ref.current.scrollHeight, maxHeight);
    ref.current.style.height = `${nextHeight}px`;
    ref.current.style.overflowY =
      ref.current.scrollHeight > maxHeight ? "auto" : "hidden";
  }, [value, maxHeight]);

  return (
    <div className="space-y-1.5">
      <textarea
        ref={ref}
        rows={minRows}
        maxLength={maxLength}
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        onChange={(e) => {
          if (disabled) return;
          onChange(e.target.value);
        }}
        className={cn(
          `
          w-full resize-none
          rounded-[var(--radius)]
          border border-border

          bg-[rgb(var(--input))]   /* ✅ ใช้ token เดียวกับ Input */
          px-4 py-3

          text-sm text-foreground
          placeholder:text-text-muted

          focus:outline-none
          focus:border-primary
          focus:ring-2
          focus:ring-primary/20

          transition-colors transition-shadow duration-150 ease-out
          `,
          className
        )}
      />

      {/* Character Counter */}
      <div className="text-right text-xs text-text-muted">
        {value.length} / {maxLength}
      </div>
    </div>
  );
}
