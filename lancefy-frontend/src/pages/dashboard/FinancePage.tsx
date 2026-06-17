import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Clock,
  RefreshCw,
  Search,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { useTranslation } from "react-i18next";

import { getFinanceSummary } from "@/services/payments.service";
import type { FinanceSummary, PaymentTransaction } from "@/types";

type FilterTab = "all" | "transfer" | "charge" | "refund" | "reversal";

const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "transfer", label: "Income" },
  { key: "charge", label: "Expense" },
  { key: "refund", label: "Refund" },
  { key: "reversal", label: "Reversal" },
];

const TYPE_META: Record<
  string,
  { label: string; icon: ReactNode; amountColor: string; sign: "+" | "-" | "" }
> = {
  transfer: {
    label: "Income",
    icon: <ArrowDownLeft className="h-4 w-4 text-emerald-600" />,
    amountColor: "text-emerald-600",
    sign: "+",
  },
  charge: {
    label: "Expense",
    icon: <ArrowUpRight className="h-4 w-4 text-rose-500" />,
    amountColor: "text-rose-500",
    sign: "-",
  },
  refund: {
    label: "Refund",
    icon: <RefreshCw className="h-4 w-4 text-sky-500" />,
    amountColor: "text-sky-600",
    sign: "+",
  },
  reversal: {
    label: "Reversal",
    icon: <RefreshCw className="h-4 w-4 text-violet-500" />,
    amountColor: "text-violet-600",
    sign: "+",
  },
};

const STATUS_LABEL: Record<string, string> = {
  succeeded: "Succeeded",
  completed: "Completed",
  held: "Held",
  released: "Released",
  pending: "Pending",
  failed: "Failed",
  refunded: "Refunded",
};

const STATUS_STYLE: Record<string, string> = {
  succeeded: "border-emerald-100 bg-emerald-50/90 text-emerald-700",
  completed: "border-emerald-100 bg-emerald-50/90 text-emerald-700",
  held: "border-amber-100 bg-amber-50/90 text-amber-700",
  released: "border-emerald-100 bg-emerald-50/90 text-emerald-700",
  pending: "border-blue-100 bg-blue-50/90 text-blue-700",
  failed: "border-rose-100 bg-rose-50/90 text-rose-700",
  refunded: "border-sky-100 bg-sky-50/90 text-sky-700",
};

function formatAmount(value: number) {
  return Number(value || 0).toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getDisplayAmount(tx: PaymentTransaction) {
  if (tx.type === "charge") return tx.amount;
  if (tx.type === "transfer" || tx.type === "refund") {
    return tx.net_amount ?? tx.amount;
  }
  return tx.amount;
}

function SummaryCard({
  label,
  value,
  sub,
  icon,
}: {
  label: string;
  value: string;
  sub: string;
  icon: ReactNode;
}) {
  return (
    <div className="relative overflow-hidden rounded-[24px] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,1),rgba(248,250,255,0.98))] px-6 py-6 shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
      <div className="pointer-events-none absolute inset-x-6 -bottom-10 h-24 rounded-full bg-[radial-gradient(circle_at_18%_100%,rgba(96,165,250,0.06),transparent_34%),radial-gradient(circle_at_82%_100%,rgba(191,219,254,0.14),transparent_30%)] blur-2xl" />
      <div className="pointer-events-none absolute right-6 top-6 hidden grid-cols-4 gap-2 opacity-50 lg:grid">
        {Array.from({ length: 12 }).map((_, index) => (
          <span key={index} className="h-1 w-1 rounded-full bg-blue-200" />
        ))}
      </div>
      <div className="relative flex items-start gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-[18px] bg-blue-50 text-blue-600">
          {icon}
        </div>
        <div>
          <div className="text-sm font-medium text-slate-500">{label}</div>
          <div className="mt-2 text-[2.3rem] font-bold leading-none tracking-tight text-text-primary">
            {value}
          </div>
          <div className="mt-3 text-sm text-slate-500">{sub}</div>
        </div>
      </div>
    </div>
  );
}

export default function FinancePage() {
  const { t } = useTranslation("common");
  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterTab>("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    getFinanceSummary()
      .then((res) => setSummary(res.data))
      .catch(() => setSummary(null))
      .finally(() => setLoading(false));
  }, []);

  const transactions: PaymentTransaction[] = summary?.transactions ?? [];

  const filtered = useMemo(() => {
    const byType =
      filter === "all"
        ? transactions
        : transactions.filter((tx) => tx.type === filter);

    const query = search.trim().toLowerCase();
    if (!query) return byType;

    return byType.filter((tx) => {
      const typeLabel = TYPE_META[tx.type]?.label.toLowerCase() ?? tx.type;
      const reference =
        tx.reference_type && tx.reference_id
          ? `${tx.reference_type} ${tx.reference_id}`
          : "";
      return (
        typeLabel.includes(query) ||
        reference.toLowerCase().includes(query) ||
        (STATUS_LABEL[tx.status] ?? tx.status).toLowerCase().includes(query)
      );
    });
  }, [filter, transactions, search]);

  return (
    <div className="min-h-full w-full overflow-x-hidden bg-[linear-gradient(180deg,#f8fbff_0%,#f5f8fc_100%)]">
      <div className="relative w-full overflow-hidden px-8 pb-10 pt-10 sm:px-8 xl:px-10 xl:pt-12 2xl:px-12">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-[radial-gradient(circle_at_top_right,rgba(96,165,250,0.10),transparent_24%),radial-gradient(circle_at_20%_0%,rgba(255,255,255,0.96),transparent_32%)]" />

        <div className="relative flex flex-col gap-7">
          <div className="relative pb-3 pt-2">
            <div className="pointer-events-none absolute right-0 top-0 hidden lg:block">
              <div className="absolute -right-12 -top-16 h-40 w-40 rounded-full border border-blue-100/80" />
              <div className="absolute right-48 top-0 grid grid-cols-4 gap-2 opacity-60">
                {Array.from({ length: 12 }).map((_, index) => (
                  <span key={index} className="h-1 w-1 rounded-full bg-blue-200" />
                ))}
              </div>
            </div>

            <div className="relative flex flex-col gap-6">
              <div>
                <h1 className="text-[2.35rem] font-bold tracking-tight text-text-primary md:text-[2.6rem]">
                  {t("dashboard.transactions")}
                </h1>
                <p className="mt-2 text-base font-medium text-text-secondary">
                  {t("dashboard.transactionsDescription")}
                </p>
              </div>

              <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div className="flex flex-wrap items-center gap-2">
                  {FILTER_TABS.map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => setFilter(tab.key)}
                      className={`rounded-[14px] border px-4 py-2 text-sm font-semibold transition ${
                        filter === tab.key
                          ? "border-blue-600 bg-blue-600 text-white shadow-[0_10px_24px_rgba(37,99,235,0.18)]"
                          : "border-slate-200 bg-white text-slate-600 shadow-[0_10px_24px_rgba(15,23,42,0.05)] hover:bg-slate-50"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                <label className="relative block w-full max-w-[320px]">
                  <Search className="pointer-events-none absolute left-5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search transactions..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="h-12 w-full rounded-[18px] border border-slate-200 bg-white pl-12 pr-4 text-sm text-slate-700 shadow-[0_10px_24px_rgba(15,23,42,0.05)] outline-none transition focus:border-blue-200 focus:ring-2 focus:ring-blue-100"
                  />
                </label>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              label="Total income"
              value={`\u0e3f${formatAmount(summary?.total_earned ?? 0)}`}
              sub="Amount received"
              icon={<TrendingUp className="h-7 w-7" />}
            />
            <SummaryCard
              label="Pending escrow"
              value={`\u0e3f${formatAmount(summary?.pending_escrow ?? 0)}`}
              sub="Waiting to be released"
              icon={<Clock className="h-7 w-7" />}
            />
            <SummaryCard
              label="Total expense"
              value={`\u0e3f${formatAmount(summary?.total_charged ?? 0)}`}
              sub="Outgoing payments"
              icon={<ArrowUpRight className="h-7 w-7" />}
            />
            <SummaryCard
              label="Refund total"
              value={`\u0e3f${formatAmount(summary?.total_refunded ?? 0)}`}
              sub="Refunded amount"
              icon={<Wallet className="h-7 w-7" />}
            />
          </div>

          <div className="overflow-hidden rounded-[24px] border border-slate-200/80 bg-white shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
            <div className="border-b border-slate-100 px-7 py-5">
              <h2 className="text-[1.35rem] font-semibold tracking-tight text-text-primary">
                Transaction history
              </h2>
            </div>

            {loading ? (
              <div className="px-7 py-12 text-center text-sm text-slate-500">
                Loading transactions...
              </div>
            ) : filtered.length === 0 ? (
              <div className="px-7 py-14 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-blue-100 bg-blue-50 text-blue-400">
                  <Wallet className="h-7 w-7" />
                </div>
                <div className="mt-4 text-lg font-semibold text-text-primary">
                  No transactions found
                </div>
                <div className="mt-2 text-sm text-slate-500">
                  Try changing the filter or search keyword.
                </div>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                <div className="hidden grid-cols-[1.1fr_1fr_1fr_1fr_0.8fr] gap-6 px-7 py-5 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 lg:grid">
                  <div>Date</div>
                  <div>Type</div>
                  <div>Reference</div>
                  <div className="text-right">Amount</div>
                  <div className="text-center">Status</div>
                </div>

                {filtered.map((tx) => {
                  const meta = TYPE_META[tx.type] ?? {
                    label: tx.type,
                    icon: <Wallet className="h-4 w-4 text-slate-400" />,
                    amountColor: "text-slate-700",
                    sign: "" as const,
                  };
                  const displayAmt = getDisplayAmount(tx);
                  const statusStyle =
                    STATUS_STYLE[tx.status] ??
                    "border-slate-200 bg-slate-50 text-slate-600";
                  const statusLabel = STATUS_LABEL[tx.status] ?? tx.status;
                  const reference =
                    tx.reference_type && tx.reference_id
                      ? `${tx.reference_type} #${tx.reference_id.slice(0, 8)}...`
                      : "-";

                  return (
                    <div
                      key={tx.id}
                      className="grid gap-4 px-7 py-5 transition hover:bg-slate-50/60 lg:grid-cols-[1.1fr_1fr_1fr_1fr_0.8fr] lg:items-center lg:gap-6"
                    >
                      <div className="text-sm text-slate-500">
                        <span className="mr-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400 lg:hidden">
                          Date
                        </span>
                        {formatDate(tx.created_at)}
                      </div>

                      <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                        <span className="mr-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400 lg:hidden">
                          Type
                        </span>
                        {meta.icon}
                        <span>{meta.label}</span>
                      </div>

                      <div className="truncate text-sm text-slate-500">
                        <span className="mr-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400 lg:hidden">
                          Ref
                        </span>
                        {reference}
                      </div>

                      <div className={`text-sm font-semibold lg:text-right ${meta.amountColor}`}>
                        <span className="mr-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400 lg:hidden">
                          Amount
                        </span>
                        {meta.sign}\u0e3f{formatAmount(displayAmt)}
                      </div>

                      <div className="lg:text-center">
                        <span
                          className={`inline-flex rounded-full border px-4 py-1.5 text-xs font-semibold ${statusStyle}`}
                        >
                          {statusLabel}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
