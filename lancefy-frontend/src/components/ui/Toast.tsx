import {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from "react";
import { createPortal } from "react-dom";
import {
  HiOutlineCheckCircle,
  HiOutlineXCircle,
  HiOutlineExclamationTriangle,
  HiOutlineInformationCircle,
} from "react-icons/hi2";

export type ToastType =
  | "success"
  | "error"
  | "info"
  | "warning";

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  leaving?: boolean;
}

interface ToastContextType {
  showToast: (
    message: unknown,
    type?: ToastType
  ) => void;
}

const ToastContext =
  createContext<ToastContextType | undefined>(
    undefined
  );

const DISPLAY_DURATION = 3000; // แสดง 3 วิ
const EXIT_DURATION = 500; // animation ออก 0.5 วิ

export function ToastProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [toasts, setToasts] = useState<Toast[]>(
    []
  );

  const normalizeToastMessage = (
    message: unknown
  ): string => {
    if (
      typeof message === "string" ||
      typeof message === "number" ||
      typeof message === "boolean"
    ) {
      return String(message);
    }

    if (Array.isArray(message)) {
      const msgItems = message
        .map((item) => {
          if (
            item &&
            typeof item === "object" &&
            "msg" in item &&
            typeof (
              item as {
                msg?: unknown;
              }
            ).msg === "string"
          ) {
            return (
              item as {
                msg: string;
              }
            ).msg;
          }
          return normalizeToastMessage(item);
        })
        .filter(Boolean);

      return msgItems.join(", ");
    }

    if (
      message &&
      typeof message === "object"
    ) {
      const rec = message as Record<
        string,
        unknown
      >;

      if (typeof rec.msg === "string") {
        return rec.msg;
      }

      if (typeof rec.detail === "string") {
        return rec.detail;
      }

      if (rec.detail) {
        const nested = normalizeToastMessage(
          rec.detail
        );
        if (nested) return nested;
      }

      try {
        return JSON.stringify(message);
      } catch {
        return "Unexpected error";
      }
    }

    return "Unexpected error";
  };

  const showToast = useCallback(
    (
      message: unknown,
      type: ToastType = "info"
    ) => {
      const safeMessage =
        normalizeToastMessage(message);
      const id = Math.random()
        .toString(36)
        .slice(2);

      setToasts((prev) => [
        ...prev,
        { id, type, message: safeMessage },
      ]);

      // ⏱ เริ่ม animation ออก
      setTimeout(() => {
        setToasts((prev) =>
          prev.map((t) =>
            t.id === id
              ? { ...t, leaving: true }
              : t
          )
        );
      }, DISPLAY_DURATION);

      // 🧹 ลบออกจาก state หลัง animation จบ
      setTimeout(() => {
        setToasts((prev) =>
          prev.filter((t) => t.id !== id)
        );
      }, DISPLAY_DURATION + EXIT_DURATION);
    },
    []
  );

  const removeToast = (id: string) => {
    // กดปิด → เล่น animation ออกเหมือนกัน
    setToasts((prev) =>
      prev.map((t) =>
        t.id === id
          ? { ...t, leaving: true }
          : t
      )
    );

    setTimeout(() => {
      setToasts((prev) =>
        prev.filter((t) => t.id !== id)
      );
    }, EXIT_DURATION);
  };

  const typeConfig = {
    success: {
      icon: (
        <HiOutlineCheckCircle className="w-6 h-6 text-lime-600" />
      ),
      container:
        "bg-lime-50 border-lime-200",
    },
    error: {
      icon: (
        <HiOutlineXCircle className="w-6 h-6 text-red-600" />
      ),
      container:
        "bg-red-50 border-red-200",
    },
    warning: {
      icon: (
        <HiOutlineExclamationTriangle className="w-6 h-6 text-amber-600" />
      ),
      container:
        "bg-amber-50 border-amber-200",
    },
    info: {
      icon: (
        <HiOutlineInformationCircle className="w-6 h-6 text-blue-600" />
      ),
      container:
        "bg-blue-50 border-blue-200",
    },
  };

  return (
    <ToastContext.Provider
      value={{ showToast }}
    >
      {children}

      {createPortal(
        <div className="fixed bottom-6 right-6 z-50 space-y-4">
          {toasts.map((toast) => {
            const cfg =
              typeConfig[toast.type];

            return (
              <div
                key={toast.id}
                className={`
                  flex items-start gap-4
                  rounded-2xl border px-5 py-4
                  shadow-xl min-w-[340px] max-w-sm
                  transition-all duration-500 ease-in-out
                  ${
                    toast.leaving
                      ? "opacity-0 translate-x-6"
                      : "opacity-100 translate-x-0"
                  }
                  ${cfg.container}
                `}
              >
                <div className="mt-0.5">
                  {cfg.icon}
                </div>

                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">
                    {toast.message}
                  </p>
                </div>

                <button
                  onClick={() =>
                    removeToast(toast.id)
                  }
                  className="opacity-40 hover:opacity-80 transition"
                  aria-label="Close"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            );
          })}
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context =
    useContext(ToastContext);
  if (!context) {
    throw new Error(
      "useToast must be used within ToastProvider"
    );
  }
  return context;
}
