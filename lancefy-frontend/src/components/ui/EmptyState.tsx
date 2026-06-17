import { ReactNode } from "react";

import { cn } from "@/utils/cn";

export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  illustrationSrc?: string;
  illustrationAlt?: string;
  className?: string;
  imageClassName?: string;
  titleClassName?: string;
  descriptionClassName?: string;
}

export default function EmptyState({
  icon,
  title,
  description,
  action,
  illustrationSrc,
  illustrationAlt,
  className,
  imageClassName,
  titleClassName,
  descriptionClassName,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center px-4 py-12 text-center",
        className
      )}
    >
      {illustrationSrc ? (
        <img
          src={illustrationSrc}
          alt={illustrationAlt ?? title}
          className={cn(
            "mb-8 w-full max-w-[340px]",
            imageClassName
          )}
        />
      ) : icon ? (
        <div className="mb-4 text-gray-400">{icon}</div>
      ) : null}

      <h3
        className={cn(
          "mb-1 text-lg font-medium text-gray-900",
          titleClassName
        )}
      >
        {title}
      </h3>

      {description ? (
        <p
          className={cn(
            "mb-6 max-w-sm text-sm text-gray-500",
            descriptionClassName
          )}
        >
          {description}
        </p>
      ) : null}

      {action}
    </div>
  );
}
