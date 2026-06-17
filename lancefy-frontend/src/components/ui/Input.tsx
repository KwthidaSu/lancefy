import { InputHTMLAttributes, forwardRef } from "react";
import { cn } from "@/utils/cn";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: React.ReactNode;
  error?: string;
  labelClassName?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, labelClassName, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label
            className={cn(
              "mb-1 block text-sm font-medium text-text-secondary",
              labelClassName
            )}
          >
            {label}
          </label>
        )}

        <input
          ref={ref}
          className={cn(
            // layout
            "flex h-12 w-full px-4 py-3 text-sm",
            "rounded-[var(--radius)]",

            // 🔥 colors (design token)
            "bg-[rgb(var(--input))] text-foreground",
            "placeholder:text-text-muted",
            "border border-border",

            // focus
            "focus:outline-none",
            "focus:border-primary",
            "focus:ring-2 focus:ring-primary/20",

            // animation
            "transition-colors transition-shadow duration-150 ease-out",

            // disabled
            "disabled:cursor-not-allowed disabled:opacity-50",

            // error
            error &&
              "border-[rgb(var(--danger))] focus:border-[rgb(var(--danger))] focus:ring-[rgb(var(--danger))]/30",

            className
          )}
          {...props}
        />

        {error && (
          <p className="mt-1 text-sm text-[rgb(var(--danger))]">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
export default Input;
