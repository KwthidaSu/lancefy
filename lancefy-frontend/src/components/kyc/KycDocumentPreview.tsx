import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { HiArrowTopRightOnSquare } from "react-icons/hi2";

type Props = {
  title: string;
  imageUrl: string | null;
};

export default function KycDocumentPreview({ title, imageUrl }: Props) {
  const { t } = useTranslation();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [imageUrl]);

  if (!imageUrl) {
    return (
      <div className="flex h-full min-h-[320px] flex-col rounded-2xl border border-dashed border-border bg-background p-5 text-sm text-text-secondary">
        <div className="text-sm font-semibold text-foreground">{title}</div>
        <div className="mt-2">{t("adminKyc.detail.documents.noDocument")}</div>
      </div>
    );
  }

  if (failed) {
    return (
      <div className="flex h-full min-h-[320px] flex-col rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-danger">
        <div className="text-sm font-semibold text-red-700">{title}</div>
        <div className="mt-2">{t("adminKyc.detail.documents.loadFailed")}</div>
        <div className="mt-2 break-all text-xs text-text-secondary">
          {imageUrl}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-[320px] flex-col overflow-hidden rounded-2xl border border-border bg-background">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div className="text-sm font-semibold text-foreground">{title}</div>

        <a
          href={imageUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-xs font-medium text-text-secondary transition hover:text-foreground"
        >
          {t("adminKyc.detail.documents.open")}
          <HiArrowTopRightOnSquare className="h-4 w-4" />
        </a>
      </div>

      <div className="flex flex-1 items-center justify-center bg-white p-4">
        <img
          src={imageUrl}
          alt={title}
          onError={() => setFailed(true)}
          className="h-[220px] w-full object-contain"
        />
      </div>
    </div>
  );
}