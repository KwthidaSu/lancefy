import React from "react";
import { useTranslation } from "react-i18next";
import { SearchX } from "lucide-react";
import { cn } from "@/utils/cn";

type Column<T> = {
  key?: React.Key;
  header: React.ReactNode;
  width?: string;
  render: (row: T) => React.ReactNode;
};

type EmptyState = {
  title: string;
  subtitle?: string;
};

type Props<T> = {
  data: T[];
  columns: Column<T>[];
  loading?: boolean;
  page: number;
  pageSize: number;
  total: number;
  rowKey?: (row: T, index: number) => React.Key;
  pageSizeOptions?: number[];
  emptyState?: EmptyState;
  containerClassName?: string;
  tableClassName?: string;
  headerClassName?: string;
  headerCellClassName?: string;
  rowClassName?: string;
  cellClassName?: string;
  footerClassName?: string;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onRowClick?: (row: T) => void;
};

export default function DataTable<T>({
  data,
  columns,
  page,
  pageSize,
  total,
  loading = false,
  rowKey,
  pageSizeOptions = [10, 15],
  emptyState,
  containerClassName,
  tableClassName,
  headerClassName,
  headerCellClassName,
  rowClassName,
  cellClassName,
  footerClassName,
  onPageChange,
  onPageSizeChange,
  onRowClick,
}: Props<T>) {
  const { t } = useTranslation();

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(page, 1), totalPages);
  const start = total === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const end = Math.min(safePage * pageSize, total);
  const totalColumns = Math.max(columns.length, 1);

  const getColumnKey = (column: Column<T>, index: number) => {
    if (column.key !== undefined) {
      return column.key;
    }

    if (typeof column.header === "string") {
      return column.header;
    }

    return index;
  };

  const handlePageChange = (nextPage: number) => {
    const clampedPage = Math.min(Math.max(nextPage, 1), totalPages);
    if (clampedPage !== safePage) {
      onPageChange(clampedPage);
    }
  };

  return (
    <div className={cn("overflow-hidden rounded-xl border border-border bg-white", containerClassName)}>
      <table className={cn("w-full text-sm", tableClassName)}>
        <thead className={cn("bg-slate-50 text-slate-600", headerClassName)}>
          <tr>
            {columns.map((c, i) => (
              <th
                key={getColumnKey(c, i)}
                style={{ width: c.width }}
                className={cn(
                  "px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider",
                  headerCellClassName
                )}
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {!loading && data.length === 0 && emptyState && (
            <tr>
              <td colSpan={totalColumns} className="py-20">
                <div className="flex flex-col items-center gap-3 text-center">
                  <SearchX className="w-14 h-14 text-gray-400" />
                  <div className="text-base font-semibold text-text-primary">
                    {emptyState.title}
                  </div>
                  {emptyState.subtitle && (
                    <div className="text-sm text-text-muted">
                      {emptyState.subtitle}
                    </div>
                  )}
                </div>
              </td>
            </tr>
          )}

          {!loading &&
            data.map((row, rowIndex) => (
            <tr
              key={rowKey ? rowKey(row, rowIndex) : rowIndex}
              onClick={() => onRowClick?.(row)}
              className={cn(
                "border-t border-border/70",
                onRowClick && "cursor-pointer transition-colors hover:bg-slate-50/60",
                rowClassName
              )}
            >
              {columns.map((c, columnIndex) => (
                <td
                  key={getColumnKey(c, columnIndex)}
                  style={{ width: c.width }}
                  className={cn("px-4 py-4 align-middle", cellClassName)}
                >
                  {c.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      <div
        className={cn(
          "flex flex-wrap items-center justify-between gap-3 border-t border-border/70 px-4 py-3 text-sm",
          footerClassName
        )}
      >
        <span className="text-text-muted">
          {t("project.table.showing", {
            start,
            end,
            total,
          })}
        </span>

        <div className="flex items-center gap-3">
          <select
            value={pageSize}
            onChange={(e) =>
              onPageSizeChange(Number(e.target.value))
            }
            className="rounded-lg border border-border bg-white px-2 py-1 text-sm"
          >
            {pageSizeOptions.map((size) => (
              <option key={size} value={size}>
                {t("project.table.per_page", { count: size })}
              </option>
            ))}
          </select>

          <div className="flex gap-2">
            <button
              type="button"
              disabled={safePage === 1}
              onClick={() => handlePageChange(safePage - 1)}
              className="rounded-lg border border-border px-3 py-1 disabled:opacity-50"
            >
              {t("project.table.prev")}
            </button>
            <button
              type="button"
              disabled={safePage === totalPages || total === 0}
              onClick={() => handlePageChange(safePage + 1)}
              className="rounded-lg border border-border px-3 py-1 disabled:opacity-50"
            >
              {t("project.table.next")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
