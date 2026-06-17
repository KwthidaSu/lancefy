import { type FormEvent, useEffect, useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  BadgeCheck,
  CreditCard,
  Landmark,
  Loader2,
  Plus,
  RefreshCw,
  ShieldCheck,
  Trash2,
  Wallet,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";

import type { CurrentUser } from "@/auth/auth.types";
import { createOmiseCardToken } from "@/lib/omise";
import {
  createSavedPaymentMethod,
  deleteSavedPaymentMethod,
  getPaymentSetup,
  getMyPayoutAccount,
  listSavedPaymentMethods,
  listTransactions,
  type PaymentSetup,
  type PayoutAccount,
  type SavedPaymentMethod,
  upsertMyPayoutAccount,
} from "@/services/payments.service";
import { authService } from "@/services/auth.service";
import type { PaymentTransaction } from "@/types";
import { clsx } from "clsx";

type CardFormState = {
  holderName: string;
  number: string;
  expMonth: string;
  expYear: string;
  cvc: string;
  setAsDefault: boolean;
};

const INITIAL_FORM: CardFormState = {
  holderName: "",
  number: "",
  expMonth: "",
  expYear: "",
  cvc: "",
  setAsDefault: true,
};

type PayoutFormState = {
  bankCode: string;
  accountName: string;
  accountNumber: string;
  consentGiven: boolean;
};

const INITIAL_PAYOUT_FORM: PayoutFormState = {
  bankCode: "",
  accountName: "",
  accountNumber: "",
  consentGiven: false,
};

const TH_BANK_OPTIONS = [
  { code: "bbl", name: "Bangkok Bank" },
  { code: "bay", name: "Bank of Ayudhya" },
  { code: "kbank", name: "Kasikornbank" },
  { code: "ktb", name: "Krungthai Bank" },
  { code: "scb", name: "Siam Commercial Bank" },
  { code: "ttb", name: "TMBThanachart Bank" },
  { code: "gsb", name: "Government Savings Bank" },
  { code: "uob", name: "United Overseas Bank" },
  { code: "cimb", name: "CIMB Thai" },
  { code: "kk", name: "Kiatnakin Phatra Bank" },
  { code: "tisco", name: "TISCO Bank" },
  { code: "lhb", name: "LH Bank" },
];

const TYPE_STYLE: Record<string, { labelKey: string; tone: string }> = {
  charge: {
    labelKey: "paymentsPage.transactions.types.charge",
    tone: "text-sky-700",
  },
  transfer: {
    labelKey: "paymentsPage.transactions.types.transfer",
    tone: "text-primary",
  },
  refund: {
    labelKey: "paymentsPage.transactions.types.refund",
    tone: "text-amber-700",
  },
  reversal: {
    labelKey: "paymentsPage.transactions.types.reversal",
    tone: "text-rose-700",
  },
};

function maskCardNumber(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 16);
  return digits.replace(/(\d{4})(?=\d)/g, "$1 ").trim();
}

function digitsOnly(value: string, max: number) {
  return value.replace(/\D/g, "").slice(0, max);
}

function formatAmount(value: number | string) {
  return Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatExpiry(method: SavedPaymentMethod) {
  const month = method.exp_month ? String(method.exp_month).padStart(2, "0") : "--";
  const year = method.exp_year ? String(method.exp_year).slice(-2) : "--";
  return `${month}/${year}`;
}

function detectCardBrand(value: string) {
  const digits = value.replace(/\D/g, "");
  if (!digits) return null;
  if (/^4/.test(digits)) return "Visa";
  if (/^(5[1-5]|2(2[2-9]|[3-6]\d|7[01]|720))/.test(digits)) return "Mastercard";
  if (/^3[47]/.test(digits)) return "Amex";
  if (/^35/.test(digits)) return "JCB";
  if (/^(6011|65|64[4-9])/.test(digits)) return "Discover";
  return "Card";
}

function getPreviewNumber(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 16);

  if (!digits) {
    return ".... .... ....";
  }

  const padded = digits.padEnd(16, ".");
  const groups = padded.match(/.{1,4}/g) ?? [];

  return groups
    .map((group, index) => (index === groups.length - 1 ? group : group.replace(/\d/g, ".")))
    .join(" ");
}

function isIncomingTransaction(type: string) {
  return type === "refund" || type === "transfer";
}

function normalizePayoutAccountNumber(value: string) {
  return value.replace(/[^0-9A-Za-z]/g, "").slice(0, 32);
}

export default function PaymentsPage() {
  const { t, i18n } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [setup, setSetup] = useState<PaymentSetup | null>(null);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [methods, setMethods] = useState<SavedPaymentMethod[]>([]);
  const [payoutAccount, setPayoutAccount] = useState<PayoutAccount | null>(null);
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [savingPayout, setSavingPayout] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [selectedMethodId, setSelectedMethodId] = useState<string | null>(null);
  const [showComposer, setShowComposer] = useState(false);
  const [form, setForm] = useState<CardFormState>(INITIAL_FORM);
  const [payoutForm, setPayoutForm] = useState<PayoutFormState>(INITIAL_PAYOUT_FORM);

  const LIMIT = 20;
  const activeTabParam = searchParams.get("tab");
  const activeTab =
    activeTabParam === "transactions" || activeTabParam === "payout"
      ? activeTabParam
      : "methods";
  const isThai = i18n.language.toLowerCase().startsWith("th");
  const payoutCopy = isThai
    ? {
        tab: "บัญชีรับเงิน",
        panelTitle: "ตั้งค่าบัญชีรับเงิน",
        panelSubtitle: "ใช้รับเงินหลังปล่อย escrow",
        kycTitle: "สถานะ KYC",
        kycVerified: "พร้อมใช้งาน",
        kycPending: "ยืนยันตัวตนก่อนเปิดรับเงิน",
        statusTitle: "สถานะบัญชีรับเงิน",
        recipientTitle: "สถานะ Recipient",
        recipientPending: "รอเปิดใช้งาน",
        bankLabel: "ธนาคาร",
        bankPlaceholder: "เลือกธนาคาร",
        accountNameLabel: "ชื่อบัญชี",
        accountNamePlaceholder: "ชื่อเจ้าของบัญชี",
        accountNumberLabel: "เลขบัญชี",
        accountNumberPlaceholder: "กรอกเลขบัญชีสำหรับรับเงิน",
        keepExistingNumber: "ใช้เลขเดิมได้",
        currentAccount: "บัญชีเดิม",
        consent: "ฉันยืนยันว่าบัญชีนี้ใช้รับเงินได้",
        save: "บันทึกบัญชีรับเงิน",
        update: "อัปเดตบัญชีรับเงิน",
        saving: "กำลังบันทึก...",
        noAccountTitle: "ยังไม่ได้ตั้งค่าบัญชีรับเงิน",
        noAccountSubtitle: "ยังไม่มี recipient",
        recipientId: "Recipient ID",
        lastSynced: "ซิงก์ล่าสุด",
        gatewayNote: "จะสร้าง recipient ให้อัตโนมัติหลังบันทึก",
        rejectedLabel: "เหตุผลล่าสุด",
        status: {
          pending_verification: "รอตรวจสอบ",
          active: "พร้อมใช้งาน",
          inactive: "ปิดใช้งาน",
          rejected: "มีปัญหา",
        },
        recipientStatus: {
          pending: "รอดำเนินการ",
          active: "พร้อมโอน",
          disabled: "ปิดใช้งาน",
          failed: "ซิงก์ไม่สำเร็จ",
        },
      }
    : {
        tab: "Payout Setup",
        panelTitle: "Set up your payout account",
        panelSubtitle: "Use this to receive released payouts.",
        kycTitle: "KYC Status",
        kycVerified: "Ready",
        kycPending: "Verify KYC to activate payouts.",
        statusTitle: "Payout Account Status",
        recipientTitle: "Recipient Status",
        recipientPending: "Waiting for activation.",
        bankLabel: "Bank",
        bankPlaceholder: "Select a bank",
        accountNameLabel: "Account name",
        accountNamePlaceholder: "Name on the bank account",
        accountNumberLabel: "Account number",
        accountNumberPlaceholder: "Enter the bank account number for payouts",
        keepExistingNumber: "Keep current number",
        currentAccount: "Current account",
        consent: "I confirm this account can receive payouts.",
        save: "Save payout account",
        update: "Update payout account",
        saving: "Saving...",
        noAccountTitle: "No payout account set up yet",
        noAccountSubtitle: "No recipient yet.",
        recipientId: "Recipient ID",
        lastSynced: "Last synced",
        gatewayNote: "A recipient will be created automatically after saving.",
        rejectedLabel: "Latest issue",
        status: {
          pending_verification: "Pending verification",
          active: "Active",
          inactive: "Inactive",
          rejected: "Needs attention",
        },
        recipientStatus: {
          pending: "Pending",
          active: "Active",
          disabled: "Disabled",
          failed: "Sync failed",
        },
      };
  function handleTabChange(tab: "methods" | "payout" | "transactions") {
    const nextParams = new URLSearchParams(searchParams);
    if (tab === "methods") {
      nextParams.delete("tab");
    } else {
      nextParams.set("tab", tab);
    }
    setSearchParams(nextParams, { replace: true });
  }

  async function load(skip = page * LIMIT) {
    setLoading(true);
    setError(null);
    try {
      const [setupRes, methodsRes, txRes, payoutRes, user] = await Promise.all([
        getPaymentSetup(),
        listSavedPaymentMethods(),
        listTransactions({ skip, limit: LIMIT }),
        getMyPayoutAccount(),
        authService.getCurrentUser().catch(() => null),
      ]);
      setSetup(setupRes.data);
      setCurrentUser(user);
      setMethods(methodsRes.data);
      setPayoutAccount(payoutRes.data);
      setPayoutForm(
        payoutRes.data
          ? {
              bankCode: payoutRes.data.bank_code,
              accountName: payoutRes.data.account_name,
              accountNumber: "",
              consentGiven: payoutRes.data.consent_given,
            }
          : INITIAL_PAYOUT_FORM
      );
      setShowComposer((prev) => (methodsRes.data.length === 0 ? true : prev));
      setSelectedMethodId((prev) => {
        if (prev && methodsRes.data.some((method) => method.id === prev)) {
          return prev;
        }
        return methodsRes.data.find((method) => method.is_default)?.id ?? methodsRes.data[0]?.id ?? null;
      });
      setTransactions(txRes.data);
    } catch {
      setError(t("paymentsPage.errors.loadFailed"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load(page * LIMIT);
  }, [page]);

  async function handleAddCard(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!setup?.omise_enabled || !setup.public_key) {
      setActionError(t("paymentsPage.errors.gatewayUnavailable"));
      return;
    }

    setSubmitting(true);
    setActionError(null);
    try {
      const token = await createOmiseCardToken(setup.public_key, {
        name: form.holderName.trim(),
        number: form.number.replace(/\s/g, ""),
        expiration_month: form.expMonth,
        expiration_year: form.expYear,
        security_code: form.cvc,
      });

      await createSavedPaymentMethod({
        token,
        holder_name: form.holderName.trim(),
        set_as_default: form.setAsDefault,
      });

      setForm(INITIAL_FORM);
      setShowComposer(false);
      await load(page * LIMIT);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : t("paymentsPage.errors.addFailed"));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(methodId: string) {
    setActionError(null);
    try {
      await deleteSavedPaymentMethod(methodId);
      await load(page * LIMIT);
    } catch {
      setActionError(t("paymentsPage.errors.deleteFailed"));
    }
  }

  async function handleSavePayout(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setActionError(null);

    const selectedBank = TH_BANK_OPTIONS.find((bank) => bank.code === payoutForm.bankCode);
    if (!selectedBank) {
      setActionError(
        isThai ? "กรุณาเลือกธนาคารสำหรับรับเงิน" : "Please choose the bank for this payout account."
      );
      return;
    }
    if (!payoutForm.consentGiven) {
      setActionError(
        isThai
          ? "กรุณายืนยันความยินยอมก่อนบันทึกบัญชีรับเงิน"
          : "Please confirm the payout consent before saving."
      );
      return;
    }

    const normalizedAccountNumber = normalizePayoutAccountNumber(payoutForm.accountNumber);
    if (!payoutAccount && !normalizedAccountNumber) {
      setActionError(
        isThai ? "กรุณากรอกเลขบัญชีรับเงิน" : "Please enter the bank account number."
      );
      return;
    }

    setSavingPayout(true);
    try {
      await upsertMyPayoutAccount({
        bank_name: selectedBank.name,
        bank_code: selectedBank.code,
        account_name: payoutForm.accountName.trim(),
        account_number: normalizedAccountNumber || undefined,
        consent_given: payoutForm.consentGiven,
        set_as_default: true,
      });
      await load(page * LIMIT);
    } catch (err) {
      setActionError(
        err instanceof Error
          ? err.message
          : isThai
            ? "บันทึกบัญชีรับเงินไม่สำเร็จ"
            : "Unable to save the payout account."
      );
    } finally {
      setSavingPayout(false);
    }
  }

  function resetPayoutForm() {
    setPayoutForm(
      payoutAccount
        ? {
            bankCode: payoutAccount.bank_code,
            accountName: payoutAccount.account_name,
            accountNumber: "",
            consentGiven: payoutAccount.consent_given,
          }
        : INITIAL_PAYOUT_FORM
    );
    setActionError(null);
  }

  const selectedMethod =
    methods.find((method) => method.id === selectedMethodId) ??
    methods.find((method) => method.is_default) ??
    methods[0] ??
    null;

  const showAddMethodForm = showComposer || methods.length === 0;
  const previewNumberDigits = form.number.replace(/\D/g, "");
  const previewBrand = showAddMethodForm
    ? detectCardBrand(form.number) || t("paymentsPage.saved.cardFallback")
    : selectedMethod?.brand || t("paymentsPage.saved.cardFallback");
  const previewLast4 = showAddMethodForm
    ? previewNumberDigits.slice(-4).padStart(4, "*") || "****"
    : selectedMethod?.last4 ?? "****";
  const previewNumber = showAddMethodForm
    ? getPreviewNumber(form.number)
    : `**** ${selectedMethod?.last4 ?? "****"}`;
  const previewName = showAddMethodForm
    ? form.holderName.trim() || "Your Name"
    : selectedMethod?.holder_name || "Your Name";
  const previewExpiry = showAddMethodForm
    ? form.expMonth || form.expYear
      ? `${form.expMonth || "--"}/${form.expYear || "----"}`
      : "../.."
    : selectedMethod
      ? formatExpiry(selectedMethod)
      : "../..";
  const previewIsDefault = showAddMethodForm ? form.setAsDefault : !!selectedMethod?.is_default;
  const isKycVerified = currentUser?.kyc_status === "verified";
  const shouldShowPayoutConsent = !payoutAccount || !payoutAccount.consent_given;
  const payoutAccountPlaceholder = payoutAccount
    ? `${payoutCopy.currentAccount}: ${payoutAccount.account_number_masked}`
    : payoutCopy.accountNumberPlaceholder;
  const recipientState = payoutAccount?.omise_recipient?.recipient_status;
  const payoutStatusMode = !payoutAccount
    ? "empty"
    : recipientState === "active" || payoutAccount.status === "active"
      ? "active"
      : recipientState === "failed" || payoutAccount.status === "rejected"
        ? "failed"
        : "pending";
  const isPayoutLocked = payoutStatusMode === "pending";
  const payoutStatusContent = isThai
    ? payoutStatusMode === "active"
      ? {
          title: "บัญชีพร้อมรับเงิน",
          badge: "Active",
          message: "บัญชีนี้พร้อมใช้รับ payout แล้ว",
        }
      : payoutStatusMode === "failed"
        ? {
            title: "ต้องแก้ไขข้อมูล",
            badge: "Needs update",
            message: payoutAccount?.rejection_reason || "ตรวจสอบข้อมูลบัญชีแล้วบันทึกใหม่อีกครั้ง",
          }
        : {
            title: "กำลังตรวจสอบบัญชี",
            badge: "Pending",
            message: "ระบบกำลังรอตรวจสอบจาก Omise ระหว่างนี้ยังแก้ข้อมูลไม่ได้",
          }
    : payoutStatusMode === "active"
      ? {
          title: "Payout account is active",
          badge: "Active",
          message: "This account is ready to receive payouts.",
        }
      : payoutStatusMode === "failed"
        ? {
            title: "Update required",
            badge: "Needs update",
            message:
              payoutAccount?.rejection_reason || "Please review this payout account and save it again.",
          }
        : {
            title: "Verification in progress",
            badge: "Pending",
            message: "Omise is reviewing this payout account. Editing is locked for now.",
          };
  const hasPayoutChanges = Boolean(
    payoutForm.bankCode !== (payoutAccount?.bank_code ?? "") ||
    payoutForm.accountName.trim() !== (payoutAccount?.account_name ?? "") ||
    payoutForm.accountNumber.trim() ||
    (shouldShowPayoutConsent && payoutForm.consentGiven !== !!payoutAccount?.consent_given)
  );

  return (
    <div className="-m-6 min-h-screen w-auto space-y-6 bg-background p-6">
      <section className="space-y-2">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-text-primary">
            {t("paymentsPage.hero.title")}
          </h1>
          <p className="mt-2 text-sm text-text-secondary">
            {t("paymentsPage.hero.subtitle")}
          </p>
        </div>
      </section>

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      {actionError ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {actionError}
        </div>
      ) : null}

      <section
        className="inline-flex rounded-[16px] border border-border bg-accent p-1.5 shadow-[0_6px_16px_rgba(15,23,42,0.03)]"
        role="tablist"
        aria-label={t("paymentsPage.hero.title")}
      >
        <div className="flex flex-wrap gap-1">
          <button
            type="button"
            role="tab"
            id="payments-tab-methods"
            aria-selected={activeTab === "methods"}
            aria-controls="payments-panel-methods"
            tabIndex={activeTab === "methods" ? 0 : -1}
            onClick={() => handleTabChange("methods")}
            className={clsx(
              "inline-flex items-center gap-2 rounded-[12px] px-4 py-3 text-sm font-medium transition",
              activeTab === "methods"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-text-secondary hover:bg-[rgb(var(--primary)/0.08)] hover:text-primary"
            )}
          >
            <CreditCard className="h-4 w-4" />
            {t("paymentsPage.tabs.methods")}
          </button>
          <button
            type="button"
            role="tab"
            id="payments-tab-payout"
            aria-selected={activeTab === "payout"}
            aria-controls="payments-panel-payout"
            tabIndex={activeTab === "payout" ? 0 : -1}
            onClick={() => handleTabChange("payout")}
            className={clsx(
              "inline-flex items-center gap-2 rounded-[12px] px-4 py-3 text-sm font-medium transition",
              activeTab === "payout"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-text-secondary hover:bg-[rgb(var(--primary)/0.08)] hover:text-primary"
            )}
          >
            <Landmark className="h-4 w-4" />
            {payoutCopy.tab}
          </button>
          <button
            type="button"
            role="tab"
            id="payments-tab-transactions"
            aria-selected={activeTab === "transactions"}
            aria-controls="payments-panel-transactions"
            tabIndex={activeTab === "transactions" ? 0 : -1}
            onClick={() => handleTabChange("transactions")}
            className={clsx(
              "inline-flex items-center gap-2 rounded-[12px] px-4 py-3 text-sm font-medium transition",
              activeTab === "transactions"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-text-secondary hover:bg-[rgb(var(--primary)/0.08)] hover:text-primary"
            )}
          >
            <RefreshCw className="h-4 w-4" />
            {t("paymentsPage.tabs.transactions")}
          </button>
        </div>
      </section>

      {activeTab === "methods" ? (
        <section
          role="tabpanel"
          id="payments-panel-methods"
          aria-labelledby="payments-tab-methods"
          className="grid items-start gap-8 xl:grid-cols-[300px_minmax(0,1fr)]"
        >
          <aside className="space-y-4">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-text-muted">
                  Saved Cards
                </p>
                <p className="mt-1 text-sm text-text-muted">
                  {loading ? "..." : `${methods.length} cards`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setForm(INITIAL_FORM);
                  setShowComposer(true);
                }}
                className="inline-flex items-center gap-2 text-sm font-medium text-primary transition hover:text-primary-hover"
              >
                <Plus className="h-4 w-4" />
                Add
              </button>
            </div>

            {loading ? (
              <div className="rounded-[18px] border border-border bg-card px-5 py-5 text-sm text-text-muted">
                <div className="flex items-center gap-3">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t("paymentsPage.states.loadingMethods")}
                </div>
              </div>
            ) : methods.length === 0 ? (
              <div className="rounded-[18px] border border-dashed border-border bg-card px-5 py-10 text-center">
                <Wallet className="mx-auto h-8 w-8 text-text-subtle" />
                <p className="mt-4 text-sm font-medium text-text-primary">
                  {t("paymentsPage.saved.emptyTitle")}
                </p>
                <p className="mt-1 text-sm text-text-muted">
                  {t("paymentsPage.saved.emptySubtitle")}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {methods.map((method) => {
                  const isActive = selectedMethod?.id === method.id;
                  return (
                    <div
                      key={method.id}
                      className={clsx(
                        "rounded-[18px] border px-5 py-5 transition",
                        isActive
                          ? "border-primary bg-accent shadow-[0_0_0_1px_rgba(23,68,140,0.14)]"
                          : "border-border bg-card hover:border-[rgb(var(--primary)/0.18)]"
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => setSelectedMethodId(method.id)}
                        className="w-full text-left"
                      >
                        <div className="flex items-start gap-4">
                          <div
                            className={clsx(
                              "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl",
                              isActive
                                ? "bg-primary text-primary-foreground"
                                : "bg-input text-text-muted"
                            )}
                          >
                            <CreditCard className="h-5 w-5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="text-[1.1rem] font-semibold text-text-primary">
                                {method.brand || t("paymentsPage.saved.cardFallback")}
                              </p>
                              {method.is_default ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-[rgb(var(--primary)/0.1)] px-2 py-0.5 text-[11px] font-medium text-primary">
                                  {t("paymentsPage.saved.defaultBadge")}
                                </span>
                              ) : null}
                            </div>
                            <p className="mt-1 text-sm font-medium tracking-[0.24em] text-text-secondary">
                              **** {method.last4}
                              <span className="ml-3 tracking-normal text-text-muted">
                                - {formatExpiry(method)}
                              </span>
                            </p>
                          </div>
                        </div>
                      </button>

                      <div className="mt-5 flex items-center justify-end">
                        <button
                          type="button"
                          onClick={() => void handleDelete(method.id)}
                          className="inline-flex items-center gap-2 text-sm font-medium text-text-muted transition hover:text-[rgb(var(--danger))]"
                        >
                          <Trash2 className="h-4 w-4" />
                          {t("paymentsPage.actions.remove")}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </aside>

          <section className="w-full rounded-[20px] border border-border bg-card px-10 py-10 shadow-[0_14px_34px_rgba(15,23,42,0.06)]">
            {showAddMethodForm ? (
              <>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                      Payment Methods
                    </p>
                    <h2 className="mt-2 text-2xl font-semibold tracking-tight text-text-primary">
                      {t("paymentsPage.addCard.title")}
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setForm(INITIAL_FORM);
                      setShowComposer(false);
                    }}
                    className="text-sm font-medium text-text-muted transition hover:text-text-primary"
                  >
                    {t("cancel")}
                  </button>
                </div>

                <div className="mt-8 grid items-start gap-8 xl:grid-cols-[minmax(0,1fr)_380px] 2xl:gap-10">
                  <div className="min-w-0 max-w-none">
                {!setup?.omise_enabled ? (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-800">
                    {t("paymentsPage.addCard.gatewayUnavailable")}
                  </div>
                ) : (
                  <form className="space-y-5" onSubmit={handleAddCard}>
                    <label className="block space-y-2">
                      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                        {t("paymentsPage.form.holderName")}
                      </span>
                      <input
                        type="text"
                        value={form.holderName}
                        onChange={(e) =>
                          setForm((prev) => ({ ...prev, holderName: e.target.value }))
                        }
                        placeholder={t("paymentsPage.form.holderNamePlaceholder")}
                        className="w-full rounded-2xl border border-border bg-input px-4 py-3 text-sm text-text-primary outline-none transition placeholder:text-text-subtle focus:border-primary focus:ring-2 focus:ring-primary/10"
                        autoComplete="cc-name"
                        required
                      />
                    </label>

                    <label className="block space-y-2">
                      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                        {t("paymentsPage.form.cardNumber")}
                      </span>
                      <div className="relative">
                        <CreditCard className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                        <input
                          type="text"
                          inputMode="numeric"
                          value={form.number}
                          onChange={(e) =>
                            setForm((prev) => ({
                              ...prev,
                              number: maskCardNumber(e.target.value),
                            }))
                          }
                          placeholder={t("paymentsPage.form.cardNumberPlaceholder")}
                          className="w-full rounded-2xl border border-border bg-input px-11 py-3 text-sm tracking-[0.22em] text-text-primary outline-none transition placeholder:tracking-normal placeholder:text-text-subtle focus:border-primary focus:ring-2 focus:ring-primary/10"
                          autoComplete="cc-number"
                          required
                        />
                      </div>
                    </label>

                    <div className="grid gap-4 md:grid-cols-3">
                      <label className="block space-y-2">
                        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                          {t("paymentsPage.form.expiryMonth")}
                        </span>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={form.expMonth}
                          onChange={(e) =>
                            setForm((prev) => ({
                              ...prev,
                              expMonth: digitsOnly(e.target.value, 2),
                            }))
                          }
                          placeholder="MM"
                          className="w-full rounded-2xl border border-border bg-input px-4 py-3 text-center text-sm text-text-primary outline-none transition placeholder:text-text-subtle focus:border-primary focus:ring-2 focus:ring-primary/10"
                          autoComplete="cc-exp-month"
                          required
                        />
                      </label>

                      <label className="block space-y-2">
                        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                          {t("paymentsPage.form.expiryYear")}
                        </span>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={form.expYear}
                          onChange={(e) =>
                            setForm((prev) => ({
                              ...prev,
                              expYear: digitsOnly(e.target.value, 4),
                            }))
                          }
                          placeholder="YYYY"
                          className="w-full rounded-2xl border border-border bg-input px-4 py-3 text-center text-sm text-text-primary outline-none transition placeholder:text-text-subtle focus:border-primary focus:ring-2 focus:ring-primary/10"
                          autoComplete="cc-exp-year"
                          required
                        />
                      </label>

                      <label className="block space-y-2">
                        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                          {t("paymentsPage.form.cvc")}
                        </span>
                        <input
                          type="password"
                          inputMode="numeric"
                          value={form.cvc}
                          onChange={(e) =>
                            setForm((prev) => ({ ...prev, cvc: digitsOnly(e.target.value, 4) }))
                          }
                          placeholder="•••"
                          className="w-full rounded-2xl border border-border bg-input px-4 py-3 text-center text-sm text-text-primary outline-none transition placeholder:text-text-subtle focus:border-primary focus:ring-2 focus:ring-primary/10"
                          autoComplete="cc-csc"
                          required
                        />
                      </label>
                    </div>

                    <label className="inline-flex items-center gap-3 text-sm text-text-secondary">
                      <input
                        type="checkbox"
                        checked={form.setAsDefault}
                        onChange={(e) =>
                          setForm((prev) => ({ ...prev, setAsDefault: e.target.checked }))
                        }
                        className="h-4 w-4 rounded-full border-border text-primary focus:ring-primary/20"
                      />
                      <span>{t("paymentsPage.form.setAsDefault")}</span>
                    </label>

                    <button
                      type="submit"
                      disabled={submitting}
                      className="inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3 text-base font-semibold text-primary-foreground transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {submitting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Plus className="h-4 w-4" />
                      )}
                      {submitting
                        ? t("paymentsPage.actions.adding")
                        : t("paymentsPage.actions.addPaymentMethod")}
                    </button>
                  </form>
                )}

                <div className="mt-5 flex items-center justify-center gap-2 text-sm text-text-muted">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  <span>Card details are encrypted and stored securely</span>
                </div>
              </div>

              <div className="flex justify-start xl:justify-end xl:pt-10">
                    <article
                      key={`composer-card-${showComposer ? "draft" : (selectedMethod?.id ?? "none")}-${previewBrand}-${previewLast4}-${previewExpiry}-${previewName}-${previewIsDefault}`}
                      className="animate-card-flip relative aspect-[1.58/1] w-full max-w-[380px] overflow-hidden rounded-[18px] border border-[#244f9a] bg-[linear-gradient(135deg,_#346dcb_0%,_#2859b7_46%,_#20458f_100%)] px-6 py-5 shadow-[0_24px_46px_rgba(23,68,140,0.18)]"
                    >
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(173,208,255,0.18),_transparent_34%)]" />
                  <div className="relative">
                    <div className="flex items-start justify-between gap-4">
                      <p className="text-[1.2rem] font-semibold uppercase tracking-[0.08em] text-white">
                        {previewBrand}
                      </p>
                      {previewIsDefault ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-[#eef5ff]">
                          <BadgeCheck className="h-3.5 w-3.5" />
                          {t("paymentsPage.saved.defaultBadge")}
                        </span>
                      ) : null}
                    </div>

                    <div className="mt-6 space-y-5">
                      <p className="text-[1.08rem] font-semibold tracking-[0.18em] text-white/95">
                        {previewNumber}
                      </p>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-[11px] uppercase tracking-[0.22em] text-[#bfd5ff]">
                            {t("paymentsPage.form.holderName")}
                          </p>
                          <p className="mt-2 text-lg font-semibold leading-tight text-white">
                            {previewName}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-[11px] uppercase tracking-[0.22em] text-[#bfd5ff]">
                            Expires
                          </p>
                          <p className="mt-2 text-lg font-semibold text-white">{previewExpiry}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </article>

              </div>
            </div>
              </>
            ) : selectedMethod ? (
              <div className="flex min-h-[520px] flex-col items-center justify-center px-6 py-8 text-center">
                <article
                  key={`selected-card-${selectedMethod.id}`}
                  className="animate-card-flip relative aspect-[1.68/1] w-full max-w-[380px] overflow-hidden rounded-[18px] border border-[#244f9a] bg-[linear-gradient(135deg,_#346dcb_0%,_#2859b7_46%,_#20458f_100%)] px-7 py-6 shadow-[0_24px_46px_rgba(23,68,140,0.18)]"
                >
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(173,208,255,0.18),_transparent_34%)]" />
                  <div className="relative">
                    <div className="flex items-start justify-between gap-4">
                      <p className="text-[1.2rem] font-semibold uppercase tracking-[0.08em] text-white">
                        {selectedMethod.brand || "CARD"}
                      </p>
                      {selectedMethod.is_default ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-[#eef5ff]">
                          <BadgeCheck className="h-3.5 w-3.5" />
                          {t("paymentsPage.saved.defaultBadge")}
                        </span>
                      ) : null}
                    </div>

                    <div className="mt-10 space-y-7">
                      <p className="text-center text-[1.35rem] font-semibold tracking-[0.26em] text-white/95">
                        **** **** **** {selectedMethod.last4}
                      </p>
                      <div className="text-left">
                        <p className="text-[11px] uppercase tracking-[0.22em] text-[#bfd5ff]">
                          Expires
                        </p>
                        <p className="mt-2 text-xl font-semibold text-white">
                          {formatExpiry(selectedMethod)}
                        </p>
                      </div>
                    </div>
                  </div>
                </article>

                <p className="mt-10 text-sm text-text-muted">
                  Select a card or add a new payment method
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setForm(INITIAL_FORM);
                    setShowComposer(true);
                  }}
                  className="mt-4 inline-flex items-center gap-2 text-lg font-medium text-primary transition hover:text-primary-hover"
                >
                  <Plus className="h-5 w-5" />
                  Add New Card
                </button>
              </div>
            ) : null}
          </section>
        </section>
      ) : null}

      {activeTab === "payout" ? (
        <section
          role="tabpanel"
          id="payments-panel-payout"
          aria-labelledby="payments-tab-payout"
          className="rounded-[20px] border border-border bg-card px-10 py-10 shadow-[0_14px_34px_rgba(15,23,42,0.06)]"
        >
          <section>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                  {payoutCopy.tab}
                </p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-text-primary">
                  {payoutCopy.panelTitle}
                </h2>
                <p className="mt-2 text-sm text-text-muted">{payoutCopy.panelSubtitle}</p>
              </div>
            </div>

            {payoutAccount ? (
              <div className="mt-8 rounded-[22px] border border-border bg-accent/60 px-6 py-5 shadow-[0_12px_24px_rgba(15,23,42,0.04)]">
                <div className="flex flex-col gap-5">
                  <div className="flex items-start gap-4">
                    <div
                      className={clsx(
                        "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl",
                        payoutStatusMode === "active"
                          ? "bg-[rgb(var(--success)/0.14)] text-success"
                          : payoutStatusMode === "failed"
                            ? "bg-rose-100 text-rose-700"
                            : "bg-[rgb(var(--primary)/0.12)] text-primary"
                      )}
                    >
                      {payoutStatusMode === "active" ? (
                        <BadgeCheck className="h-5 w-5" />
                      ) : payoutStatusMode === "failed" ? (
                        <ShieldCheck className="h-5 w-5" />
                      ) : (
                        <RefreshCw className="h-5 w-5" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="text-xl font-semibold text-text-primary">
                          {payoutStatusContent.title}
                        </h3>
                        <span
                          className={clsx(
                            "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium",
                            payoutStatusMode === "active"
                              ? "bg-[rgb(var(--success)/0.12)] text-success"
                              : payoutStatusMode === "failed"
                                ? "bg-rose-100 text-rose-700"
                                : "bg-amber-100 text-amber-800"
                          )}
                        >
                          {payoutStatusContent.badge}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-text-secondary">
                        {payoutStatusContent.message}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="h-2 overflow-hidden rounded-full bg-border">
                      <div
                        className={clsx(
                          "h-full rounded-full transition-all",
                          payoutStatusMode === "active"
                            ? "w-full bg-success"
                            : payoutStatusMode === "failed"
                              ? "w-1/2 bg-rose-500"
                              : "w-2/3 bg-primary"
                        )}
                      />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <span className="inline-flex items-center rounded-full border border-[rgb(var(--primary)/0.18)] bg-card px-3 py-1.5 text-sm font-medium text-primary">
                        1. {isThai ? "ส่งบัญชีแล้ว" : "Account submitted"}
                      </span>
                      <span
                        className={clsx(
                          "inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium",
                          payoutStatusMode === "pending"
                            ? "border-amber-200 bg-amber-50 text-amber-800"
                            : payoutStatusMode === "failed"
                              ? "border-rose-200 bg-rose-50 text-rose-700"
                              : "border-[rgb(var(--primary)/0.18)] bg-card text-primary"
                        )}
                      >
                        2. {payoutStatusMode === "failed"
                          ? isThai ? "ต้องแก้ไข" : "Needs update"
                          : isThai ? "กำลังตรวจสอบ" : "Under review"}
                      </span>
                      <span
                        className={clsx(
                          "inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium",
                          payoutStatusMode === "active"
                            ? "border-[rgb(var(--success)/0.2)] bg-[rgb(var(--success)/0.12)] text-success"
                            : "border-border bg-card text-text-muted"
                        )}
                      >
                        3. {isThai ? "พร้อมรับเงิน" : "Active"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {!isKycVerified ? (
              <div className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-800">
                {payoutCopy.kycPending}
              </div>
            ) : null}

            <form className="mt-8 space-y-5" onSubmit={handleSavePayout}>
              <label className="block space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                  {payoutCopy.bankLabel}
                </span>
                <select
                  value={payoutForm.bankCode}
                  disabled={isPayoutLocked}
                  onChange={(e) =>
                    setPayoutForm((prev) => ({ ...prev, bankCode: e.target.value }))
                  }
                  className="w-full rounded-2xl border border-border bg-input px-4 py-3 text-sm text-text-primary outline-none transition disabled:cursor-not-allowed disabled:opacity-70 focus:border-primary focus:ring-2 focus:ring-primary/10"
                  required
                >
                  <option value="">{payoutCopy.bankPlaceholder}</option>
                  {TH_BANK_OPTIONS.map((bank) => (
                    <option key={bank.code} value={bank.code}>
                      {bank.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                  {payoutCopy.accountNameLabel}
                </span>
                <input
                  type="text"
                  value={payoutForm.accountName}
                  disabled={isPayoutLocked}
                  onChange={(e) =>
                    setPayoutForm((prev) => ({ ...prev, accountName: e.target.value }))
                  }
                  placeholder={payoutCopy.accountNamePlaceholder}
                  className="w-full rounded-2xl border border-border bg-input px-4 py-3 text-sm text-text-primary outline-none transition placeholder:text-text-subtle disabled:cursor-not-allowed disabled:opacity-70 focus:border-primary focus:ring-2 focus:ring-primary/10"
                  required
                />
              </label>

              <label className="block space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                  {payoutCopy.accountNumberLabel}
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={payoutForm.accountNumber}
                  disabled={isPayoutLocked}
                  onChange={(e) =>
                    setPayoutForm((prev) => ({
                      ...prev,
                      accountNumber: normalizePayoutAccountNumber(e.target.value),
                    }))
                  }
                  placeholder={payoutAccountPlaceholder}
                  className="w-full rounded-2xl border border-border bg-input px-4 py-3 text-sm text-text-primary outline-none transition placeholder:text-text-subtle disabled:cursor-not-allowed disabled:opacity-70 focus:border-primary focus:ring-2 focus:ring-primary/10"
                />
              </label>

              {shouldShowPayoutConsent ? (
                <label className="inline-flex items-start gap-3 text-sm text-text-secondary">
                  <input
                    type="checkbox"
                    checked={payoutForm.consentGiven}
                    onChange={(e) =>
                      setPayoutForm((prev) => ({ ...prev, consentGiven: e.target.checked }))
                    }
                    className="mt-0.5 h-4 w-4 rounded border-border text-primary focus:ring-primary/20"
                    required
                  />
                  <span>{payoutCopy.consent}</span>
                </label>
              ) : null}

              {hasPayoutChanges ? (
                <div className="mt-2 flex items-center justify-between gap-4 border-t border-border pt-6">
                  <p className="text-sm text-text-muted">You have unsaved changes</p>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={resetPayoutForm}
                      className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-border bg-card px-5 py-2.5 text-sm font-medium text-text-secondary transition hover:border-[rgb(var(--primary)/0.18)] hover:text-text-primary"
                    >
                      Discard
                    </button>
                    <button
                      type="submit"
                      disabled={savingPayout}
                      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {savingPayout ? <Loader2 className="h-4 w-4 animate-spin" /> : <Landmark className="h-4 w-4" />}
                      {savingPayout
                        ? payoutCopy.saving
                        : payoutAccount
                          ? payoutCopy.update
                          : payoutCopy.save}
                    </button>
                  </div>
                </div>
              ) : null}
            </form>
          </section>
        </section>
      ) : null}

      {activeTab === "transactions" ? (
        <section
          role="tabpanel"
          id="payments-panel-transactions"
          aria-labelledby="payments-tab-transactions"
          className="rounded-[20px] border border-border bg-card p-8 shadow-[0_14px_34px_rgba(15,23,42,0.05)]"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
                <h2 className="text-2xl font-semibold tracking-tight text-text-primary">
                {t("paymentsPage.transactions.title")}
              </h2>
            </div>
          </div>

          <div className="mt-8 overflow-hidden rounded-[18px] border border-border bg-card">
            {loading ? (
              <div className="flex items-center justify-center gap-3 px-4 py-14 text-sm text-text-muted">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t("paymentsPage.states.loadingTransactions")}
              </div>
            ) : transactions.length === 0 ? (
              <div className="px-4 py-14 text-center">
                <p className="text-sm font-medium text-text-primary">
                  {t("paymentsPage.transactions.emptyTitle")}
                </p>
                <p className="mt-1 text-sm text-text-muted">
                  {t("paymentsPage.transactions.emptySubtitle")}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {transactions.map((tx) => {
                  const typeCfg = TYPE_STYLE[tx.type] ?? {
                    labelKey: "paymentsPage.transactions.types.fallback",
                    tone: "text-slate-700",
                  };
                  const incoming = isIncomingTransaction(tx.type);

                  return (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between gap-4 px-6 py-6"
                    >
                      <div className="flex min-w-0 items-center gap-4">
                        <div
                          className={clsx(
                            "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl",
                            incoming
                              ? "bg-[rgb(var(--success)/0.12)] text-success"
                              : "bg-input text-text-muted"
                          )}
                        >
                          {incoming ? (
                            <ArrowDownLeft className="h-4 w-4" />
                          ) : (
                            <ArrowUpRight className="h-4 w-4" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className={clsx("text-base font-semibold text-text-primary", typeCfg.tone)}>
                            {t(typeCfg.labelKey, { defaultValue: tx.type })}
                          </p>
                          <p className="mt-1 text-sm text-text-muted">
                            {new Date(tx.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      <div className="shrink-0 text-right">
                        <p
                          className={clsx(
                            "text-base font-semibold",
                            incoming ? "text-success" : "text-text-primary"
                          )}
                        >
                          {incoming ? "+" : "-"}
                          ${formatAmount(tx.amount)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {!loading ? (
            <div className="mt-6 flex justify-end gap-3">
              {page > 0 ? (
                <button
                  type="button"
                  onClick={() => setPage((prev) => prev - 1)}
                  className="rounded-xl border border-border px-4 py-2 text-sm text-text-secondary transition hover:border-[rgb(var(--primary)/0.2)] hover:bg-accent"
                >
                  {t("paymentsPage.pagination.previous")}
                </button>
              ) : null}
              {transactions.length === LIMIT ? (
                <button
                  type="button"
                  onClick={() => setPage((prev) => prev + 1)}
                  className="rounded-xl border border-border px-4 py-2 text-sm text-text-secondary transition hover:border-[rgb(var(--primary)/0.2)] hover:bg-accent"
                >
                  {t("paymentsPage.pagination.next")}
                </button>
              ) : null}
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}


