import { useEffect, useState } from "react";
import { Bell, Check, Loader2, Mail, Smartphone } from "lucide-react";
import { useTranslation } from "react-i18next";

import {
  notificationService,
  TYPE_LABELS,
  type NotificationSettingItem,
  type NotificationSettings,
} from "@/services/notification.service";

const GROUPS: { labelKey: string; types: string[] }[] = [
  {
    labelKey: "proposals",
    types: [
      "proposal_received",
      "proposal_accepted",
      "proposal_rejected",
      "proposal_withdrawn",
    ],
  },
  {
    labelKey: "jobsProjects",
    types: [
      "job_expired",
      "deal_opened",
      "project_created",
      "work_submitted",
      "work_approved",
      "work_rejected",
    ],
  },
  {
    labelKey: "payments",
    types: ["payment_funded", "payment_released", "payout_processed"],
  },
  {
    labelKey: "messages",
    types: ["message_received"],
  },
  {
    labelKey: "kycDisputes",
    types: ["kyc_approved", "kyc_rejected", "dispute_opened", "dispute_resolved"],
  },
];

function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-40 ${
        checked ? "bg-blue-600" : "bg-gray-200"
      }`}
    >
      <span
        className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
          checked ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}

export default function NotificationSettingsPage() {
  const { t } = useTranslation("common");
  const [settings, setSettings] = useState<NotificationSettings>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    notificationService
      .getSettings()
      .then(setSettings)
      .catch(() => setError(t("notificationSettings.errors.load")))
      .finally(() => setLoading(false));
  }, [t]);

  function toggle(
    type: string,
    channel: "in_app_enabled" | "email_enabled",
    val: boolean
  ) {
    setSettings((prev) => ({
      ...prev,
      [type]: { ...prev[type], notification_type: type, [channel]: val },
    }));
    setSaved(false);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const updates: NotificationSettingItem[] = Object.values(settings);
      const updated = await notificationService.updateSettings(updates);
      setSettings(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      setError(t("notificationSettings.errors.save"));
    } finally {
      setSaving(false);
    }
  }

  const setAllChannels = (enabled: boolean) => {
    const next: NotificationSettings = {};
    Object.keys(settings).forEach((type) => {
      next[type] = {
        notification_type: type,
        in_app_enabled: enabled,
        email_enabled: enabled,
      };
    });
    setSettings(next);
    setSaved(false);
  };

  if (loading) {
    return (
      <div className="-m-6 min-h-screen w-auto bg-background p-6">
        <div className="rounded-3xl border border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50">
            <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
          </div>
          <p className="mt-4 text-sm text-gray-500">
            {t("notificationSettings.loading")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="-m-6 min-h-screen w-auto space-y-6 bg-background p-6">
      <section className="space-y-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-2">
              <span className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                {t("nav.account")}
              </span>

              <div>
                <h1 className="text-2xl font-semibold text-gray-900">
                  {t("notificationSettings.title")}
                </h1>
                <p className="mt-1 text-sm text-gray-500">
                  {t("notificationSettings.subtitle")}
                </p>
              </div>
            </div>

            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : saved ? (
                <Check className="h-4 w-4" />
              ) : null}
              {saving
                ? t("notificationSettings.actions.saving")
                : saved
                  ? t("notificationSettings.actions.saved")
                  : t("notificationSettings.actions.save")}
            </button>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-gray-900">
                  {t("notificationSettings.preferenceTitle")}
                </p>
                <p className="text-sm text-gray-500">
                  {t("notificationSettings.preferenceSubtitle")}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setAllChannels(true)}
                  className="inline-flex h-10 items-center rounded-lg border border-gray-200 bg-white px-4 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                >
                  {t("notificationSettings.actions.enableAll")}
                </button>
                <button
                  type="button"
                  onClick={() => setAllChannels(false)}
                  className="inline-flex h-10 items-center rounded-lg border border-red-200 bg-white px-4 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
                >
                  {t("notificationSettings.actions.disableAll")}
                </button>
              </div>
            </div>
          </div>
      </section>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 shadow-sm">
          {error}
        </div>
      )}

      <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="hidden items-center border-b border-slate-200 bg-slate-50 px-6 py-3.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-text-muted sm:grid sm:grid-cols-[minmax(0,1fr)_88px_88px] sm:gap-4">
          <span>{t("notificationSettings.headers.type")}</span>
          <span className="flex items-center justify-center gap-1">
            <Smartphone className="h-3.5 w-3.5" />
            {t("notificationSettings.headers.inApp")}
          </span>
          <span className="flex items-center justify-center gap-1">
            <Mail className="h-3.5 w-3.5" />
            {t("notificationSettings.headers.email")}
          </span>
        </div>

        <div className="space-y-4 p-4 sm:p-6">
            {GROUPS.map((group) => (
              <section
                key={group.labelKey}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white"
              >
                <div className="border-b border-slate-200 bg-slate-50 px-5 py-3.5">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                    {t(`notificationSettings.groups.${group.labelKey}`)}
                  </p>
                </div>

                <div className="divide-y divide-slate-200">
                  {group.types.map((type) => {
                    const current =
                      settings[type] ?? {
                        notification_type: type,
                        in_app_enabled: true,
                        email_enabled: true,
                      };

                    return (
                      <div
                        key={type}
                        className="grid gap-4 px-5 py-4 sm:grid-cols-[minmax(0,1fr)_88px_88px] sm:items-center"
                      >
                        <div className="min-w-0">
                          <div className="flex items-start gap-3">
                            <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                              <Bell className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-gray-900">
                                {TYPE_LABELS[type] ?? type}
                              </p>
                              <div className="mt-2 flex items-center gap-4 text-xs text-gray-500 sm:hidden">
                                <span className="flex items-center gap-1">
                                  <Smartphone className="h-3.5 w-3.5" />
                                  {t("notificationSettings.headers.inApp")}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Mail className="h-3.5 w-3.5" />
                                  {t("notificationSettings.headers.email")}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-center">
                          <span className="text-xs font-medium text-gray-500 sm:hidden">
                            {t("notificationSettings.headers.inApp")}
                          </span>
                          <Toggle
                            checked={current.in_app_enabled}
                            onChange={(value) =>
                              toggle(type, "in_app_enabled", value)
                            }
                          />
                        </div>

                        <div className="flex items-center justify-between sm:justify-center">
                          <span className="text-xs font-medium text-gray-500 sm:hidden">
                            {t("notificationSettings.headers.email")}
                          </span>
                          <Toggle
                            checked={current.email_enabled}
                            onChange={(value) =>
                              toggle(type, "email_enabled", value)
                            }
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}
        </div>
      </section>
    </div>
  );
}
