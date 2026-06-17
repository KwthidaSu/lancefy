import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import { useTranslation } from "react-i18next";

export default function EmptyProjectsState({
  onCreate,
}: {
  onCreate: () => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="rounded-[28px] border border-slate-200/80 bg-white/95 p-6 shadow-[0_18px_40px_rgba(15,23,42,0.06)] sm:p-10">
      <EmptyState
        illustrationSrc="/images/empty-projects.png"
        illustrationAlt={t("project.firstEmpty.title")}
        title={t("project.firstEmpty.title")}
        description={t("project.firstEmpty.subtitle")}
        className="min-h-[480px] py-4"
        imageClassName="mx-auto w-full max-w-[420px] opacity-95"
        titleClassName="text-[1.8rem] font-semibold text-slate-900"
        descriptionClassName="max-w-md text-[0.95rem] leading-7 text-slate-500"
        action={
          <Button
            className="mt-2 h-12 rounded-[14px] px-5 shadow-[0_14px_28px_rgba(37,99,235,0.22)]"
            onClick={onCreate}
          >
            {t("project.create")}
          </Button>
        }
      />
    </div>
  );
}
