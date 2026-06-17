import { useTranslation } from "react-i18next";
import { HiMapPin } from "react-icons/hi2";

import KycInfoItem from "@/components/kyc/KycInfoItem";

type Profile = {
  full_name?: string | null;
  citizen_id?: string | null;
  date_of_birth?: string | null;
  country?: string | null;
  address?: string | null;
};

type Props = {
  profile?: Profile | null;
  submittedAt: string;
  reviewedAt: string;
  locale: string;
  reason?: string | null;
};

export default function KycProfileCard({
  profile,
  submittedAt,
  reviewedAt,
  locale,
  reason,
}: Props) {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <section className="rounded-[24px] border border-border bg-surface shadow-sm">
        <div className="border-b border-border px-6 py-4">
          <h2 className="text-lg font-semibold text-foreground">
            {t("adminKyc.detail.profile.title")}
          </h2>
        </div>

        <div className="space-y-6 p-6">
          <div>
            <SectionHeading title={t("adminKyc.detail.sections.identity.title")} />
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <KycInfoItem
                label={t("adminKyc.detail.fields.fullName")}
                value={profile?.full_name}
              />
              <KycInfoItem
                label={t("adminKyc.detail.fields.citizenId")}
                value={profile?.citizen_id}
              />
              <KycInfoItem
                label={t("adminKyc.detail.fields.dateOfBirth")}
                value={formatDate(profile?.date_of_birth, locale)}
              />
              <KycInfoItem
                label={t("adminKyc.detail.fields.country")}
                value={profile?.country}
              />
            </div>
          </div>

          <div>
            <SectionHeading title={t("adminKyc.detail.sections.timeline.title")} />
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <KycInfoItem
                label={t("adminKyc.detail.fields.submittedAt")}
                value={submittedAt}
              />
              <KycInfoItem
                label={t("adminKyc.detail.fields.reviewedAt")}
                value={reviewedAt}
              />
            </div>
          </div>

          <div>
            <SectionHeading title={t("adminKyc.detail.sections.address.title")} />
            <div className="mt-4">
              <KycInfoItem
                label={t("adminKyc.detail.fields.address")}
                value={profile?.address}
                icon={HiMapPin}
              />
            </div>
          </div>
        </div>
      </section>

      {reason ? (
        <section className="rounded-[24px] border border-amber-200 bg-amber-50/80 p-5 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">
            {t("adminKyc.detail.review.noteTitle")}
          </div>
          <div className="mt-2 text-sm leading-6 text-amber-900">{reason}</div>
        </section>
      ) : null}
    </div>
  );
}

function SectionHeading({ title }: { title: string }) {
  return (
    <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-foreground">
      {title}
    </h3>
  );
}

function formatDate(value: string | null | undefined, locale: string) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}