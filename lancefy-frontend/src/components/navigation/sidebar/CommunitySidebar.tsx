import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, X } from "lucide-react";
import { useTranslation } from "react-i18next";

type SidebarOption = {
  label: string;
  value: string;
};

const itemClass =
  "flex w-full items-center rounded-md px-3 py-2 text-left text-sm transition-colors";

export default function CommunitySidebar() {
  const { t } = useTranslation("common");
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedCategory = searchParams.get("category") ?? "";
  const selectedSort = searchParams.get("sort") ?? "latest";
  const search = searchParams.get("search") ?? "";

  const categories = useMemo<SidebarOption[]>(
    () => [
      { label: t("communityPage.categories.all"), value: "" },
      { label: t("communityPage.categories.general"), value: "general" },
      { label: t("communityPage.categories.artwork"), value: "artwork" },
      { label: t("communityPage.categories.coding"), value: "coding" },
      { label: t("communityPage.categories.design"), value: "design" },
      { label: t("communityPage.categories.writing"), value: "writing" },
    ],
    [t]
  );

  const sortOptions = useMemo<SidebarOption[]>(
    () => [
      { label: t("communityPage.sort.latest"), value: "latest" },
      { label: t("communityPage.sort.reactions"), value: "reactions" },
      { label: t("communityPage.sort.views"), value: "views" },
    ],
    [t]
  );

  const setCategory = (value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set("category", value);
    else next.delete("category");
    next.delete("page");
    setSearchParams(next);
  };

  const setSort = (value: string) => {
    const next = new URLSearchParams(searchParams);
    next.set("sort", value);
    setSearchParams(next);
  };

  const handleSearch = (value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set("search", value);
    else next.delete("search");
    next.delete("page");
    setSearchParams(next);
  };

  return (
    <aside className="relative flex h-full w-72 shrink-0 flex-col overflow-y-auto border-r border-border bg-surface">
      <div className="space-y-5 p-4 pt-6">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
          <input
            className="h-11 w-full rounded-[12px] border border-border bg-card py-2.5 pl-10 pr-9 text-sm text-foreground outline-none transition-colors focus:ring-2 focus:ring-accent/20"
            placeholder={t("communityPage.sidebar.searchPlaceholder")}
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
          />
          {search ? (
            <button
              onClick={() => handleSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary transition hover:text-foreground"
              aria-label={t("communityPage.sidebar.clear")}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>

        <div>
          <h3 className="mb-2 px-1 text-[11px] font-bold uppercase tracking-[0.18em] text-text-tertiary">
            {t("communityPage.sidebar.categories")}
          </h3>
          <ul className="space-y-1">
            {categories.map((category) => (
              <li key={category.value}>
                <button
                  onClick={() => setCategory(category.value)}
                  className={`${itemClass} ${
                    selectedCategory === category.value
                      ? "bg-accent font-semibold text-accent-foreground"
                      : "text-text-secondary hover:bg-accent/50 hover:text-text-primary"
                  }`}
                >
                  <span className="truncate">{category.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="mb-2 px-1 text-[11px] font-bold uppercase tracking-[0.18em] text-text-tertiary">
            {t("communityPage.sidebar.sortBy")}
          </h3>
          <ul className="space-y-1">
            {sortOptions.map((option) => (
              <li key={option.value}>
                <button
                  onClick={() => setSort(option.value)}
                  className={`${itemClass} ${
                    selectedSort === option.value
                      ? "bg-accent font-semibold text-accent-foreground"
                      : "text-text-secondary hover:bg-accent/50 hover:text-text-primary"
                  }`}
                >
                  <span className="truncate">{option.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </aside>
  );
}
