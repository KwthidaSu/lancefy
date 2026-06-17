"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { HiOutlineExclamationTriangle, HiOutlineRocketLaunch } from "react-icons/hi2";
import { useTranslation } from "react-i18next";
import Button from "@/components/ui/Button";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description?: string;
  confirmText: string;
  cancelText?: string;
  loading?: boolean;
  variant?: "default" | "danger";
  onConfirm: () => void;
  onCancel: () => void;
};

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmText,
  cancelText,
  loading = false,
  variant = "default",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const { t } = useTranslation();

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onCancel();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () =>
      window.removeEventListener("keydown", handleKeyDown);
  }, [open, onCancel]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-lg rounded-2xl bg-white p-7 shadow-xl animate-in fade-in zoom-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col items-center text-center">
          <div
            className={[
              "mb-4 flex h-12 w-12 items-center justify-center rounded-full",
              variant === "danger" ? "bg-red-100" : "bg-primary/10",
            ].join(" ")}
          >
            {variant === "danger" ? (
              <HiOutlineExclamationTriangle className="h-6 w-6 text-red-600" />
            ) : (
              <HiOutlineRocketLaunch className="h-6 w-6 text-primary" />
            )}
          </div>

          <h2 className="text-lg font-semibold text-gray-900">
            {title}
          </h2>

          {description && (
            <p className="mt-2 text-sm text-gray-500">
              {description}
            </p>
          )}
        </div>

        <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)]">
          <Button
            variant="secondary"
            onClick={onCancel}
            disabled={loading}
            size="lg"
            className="w-full"
          >
            {cancelText ?? t("cancel")}
          </Button>

          <Button
            onClick={onConfirm}
            isLoading={loading}
            size="lg"
            variant={variant === "danger" ? "danger" : "primary"}
            className="w-full whitespace-normal px-5 text-center leading-snug"
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}
