import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { HiOutlineExclamationTriangle } from "react-icons/hi2";
import { useTranslation } from "react-i18next";
import Input from "@/components/ui/Input";

type ConfirmDeleteModalProps = {
  open: boolean;
  title: string;
  description: string;
  requireExactText?: string;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function ConfirmDeleteModal({
  open,
  title,
  description,
  requireExactText,
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDeleteModalProps) {
  const { t } = useTranslation();
  const [confirmText, setConfirmText] = useState("");

  // ⌨️ Close on ESC
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onCancel();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onCancel]);

  useEffect(() => {
    if (!open) {
      setConfirmText("");
    }
  }, [open]);

  if (!open) return null;

  const needsExactText = !!requireExactText;
  const isExactTextMatched = !needsExactText || confirmText === requireExactText;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onCancel} 
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl animate-in fade-in zoom-in"
        onClick={(e) => e.stopPropagation()} 
      >
        <div className="flex flex-col items-center text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <HiOutlineExclamationTriangle className="h-6 w-6 text-red-600" />
          </div>

          <h2 className="text-lg font-semibold text-gray-900">
            {title}
          </h2>

          <p className="mt-2 text-sm text-gray-500">
            {description}
          </p>

          {needsExactText && (
            <div className="mt-4 w-full text-left">
              <p className="mb-2 text-xs text-gray-500">
                {t("common.typeToConfirm", {
                  defaultValue: `Type "${requireExactText}" to confirm deletion.`,
                })}
              </p>
              <Input
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder={requireExactText}
                disabled={loading}
              />
            </div>
          )}
        </div>

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            {t("cancel")}
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={loading || !isExactTextMatched}
            className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            {loading
              ? t("common.deleting") || "Deleting..."
              : t("common.delete")}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
