import { useTranslation } from "react-i18next";
import { HiArrowLeft } from "react-icons/hi2";
import { Link } from "react-router-dom";

import StatusBadge from "@/components/ui/StatusBadge";

type Props = {
  status: string;
};

export default function KycDetailHeader({ status }: Props) {
  const { t } = useTranslation();

  return (
    <section className="rounded-[24px] border border-border bg-surface shadow-sm">
      <div className="flex flex-col gap-4 px-6 py-5 sm:px-7 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <h1 className="text-[28px] font-bold tracking-tight text-foreground">
            {t("adminKyc.detail.header.title")}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-text-secondary">
            {t("adminKyc.detail.header.subtitle")}
          </p>
        </div>

        <div className="flex items-center gap-3 self-start">
          <StatusBadge status={status} className="px-3 py-1 text-xs" />

          <div className="hidden h-5 w-px bg-border sm:block" />

          <Link
            to="/admin/kyc"
            className="inline-flex items-center gap-2 text-sm font-medium text-text-secondary transition hover:text-foreground"
          >
            <HiArrowLeft className="h-4 w-4" />
            {t("adminKyc.detail.actions.backToQueue")}
          </Link>
        </div>
      </div>
    </section>
  );
}