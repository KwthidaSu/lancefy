import { useNavigate } from "react-router-dom";
import { HiCheckCircle } from "react-icons/hi2";
import { useTranslation } from "react-i18next";

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function KycStartModal({ open, onClose }: Props) {
  const navigate = useNavigate();
  const { t } = useTranslation("common");

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="relative w-[420px] rounded-xl border border-border bg-surface p-6 shadow-lg">
        <button
          onClick={onClose}
          aria-label={t("kycStartModal.close")}
          className="absolute right-4 top-4 text-text-secondary hover:text-text-primary"
        >
          ×
        </button>

        <div className="flex flex-col items-center gap-4 text-center">
          <div className="rounded-full bg-accent/10 p-4">
            <HiCheckCircle className="h-8 w-8 text-primary-foreground" />
          </div>

          <h2 className="text-lg font-semibold">
            {t("kycStartModal.title")}
          </h2>

          <p className="text-sm text-text-secondary">
            {t("kycStartModal.description")}
          </p>

          <button
            onClick={() => {
              onClose();
              navigate("/app/kyc");
            }}
            className="w-full rounded-md bg-accent py-2 font-medium text-primary-foreground hover:opacity-90"
          >
            {t("kycStartModal.start")}
          </button>
        </div>
      </div>
    </div>
  );
}