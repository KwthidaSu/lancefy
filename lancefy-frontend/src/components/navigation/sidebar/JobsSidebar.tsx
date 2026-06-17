import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Check, ChevronDown, ChevronRight, Minus } from "lucide-react";
import { HiSquares2X2 } from "react-icons/hi2";
import { useTranslation } from "react-i18next";

import { listCategories, type CategoryResponse } from "@/services/skills.service";
import {
  dashboardSidebarCheckboxClass,
  dashboardSidebarExpandButtonClass,
  dashboardSidebarIconSlotClass,
  dashboardSidebarItemClass,
  dashboardSidebarPanelClass,
  dashboardSidebarScrollableClass,
  dashboardSidebarSectionLabelClass,
  dashboardSidebarShellClass,
} from "./sidebarStyles";

function JobsSidebar() {
  const { t } = useTranslation("common");
  const [searchParams, setSearchParams] = useSearchParams();

  const [categories, setCategories] = useState<CategoryResponse[]>([]);
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set());

  const selectedCategory = searchParams.get("category") ?? "";
  const rawSubcategory = searchParams.get("subcategory") ?? "";
  const selectedSubs = new Set(
    rawSubcategory ? rawSubcategory.split(",").filter(Boolean) : []
  );

  useEffect(() => {
    listCategories()
      .then((response) => setCategories(response.data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (selectedCategory) {
      setExpandedCats((prev) => new Set([...prev, selectedCategory]));
    }
  }, [selectedCategory]);

  const selectCategory = (catSlug: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("category", catSlug);
      next.delete("subcategory");
      return next;
    });

    setExpandedCats((prev) => new Set([...prev, catSlug]));
  };

  const toggleSubcategory = (catSlug: string, subSlug: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("category", catSlug);

      const current = new Set(
        (next.get("subcategory") ?? "").split(",").filter(Boolean)
      );

      if (current.has(subSlug)) {
        current.delete(subSlug);
      } else {
        current.add(subSlug);
      }

      if (current.size === 0) {
        next.delete("subcategory");
      } else {
        next.set("subcategory", [...current].join(","));
      }

      return next;
    });
  };

  const clearFilter = () => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete("category");
      next.delete("subcategory");
      return next;
    });
  };

  const toggleExpand = (slug: string) => {
    setExpandedCats((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) {
        next.delete(slug);
      } else {
        next.add(slug);
      }
      return next;
    });
  };

  const isAllActive = !selectedCategory && selectedSubs.size === 0;

  return (
    <aside className={dashboardSidebarShellClass}>
      <div className={dashboardSidebarPanelClass}>
        <div className={dashboardSidebarScrollableClass}>
          <section className="space-y-1.5">
            <p className={dashboardSidebarSectionLabelClass}>
              {t("jobs.categories")}
            </p>

            <button
              type="button"
              onClick={clearFilter}
              className={dashboardSidebarItemClass(isAllActive)}
            >
              <span className={dashboardSidebarIconSlotClass()}>
                <HiSquares2X2 className="h-4 w-4 shrink-0" />
              </span>
              <span className="truncate">{t("all")}</span>
            </button>
          </section>

          {categories.length > 0 ? (
            <section className="mt-5 space-y-1.5">
              <p className={dashboardSidebarSectionLabelClass}>Popular</p>

              <div className="space-y-1.5">
                {categories.map((cat) => {
                  const hasSubcategories = cat.subcategories.length > 0;
                  const isExpanded = expandedCats.has(cat.slug);
                  const isCatActive =
                    selectedCategory === cat.slug && selectedSubs.size === 0;
                  const isPartial =
                    selectedCategory === cat.slug && selectedSubs.size > 0;
                  const isCatHighlighted = isCatActive || isPartial;

                  return (
                    <div key={cat.id} className="space-y-1.5">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => selectCategory(cat.slug)}
                          className={dashboardSidebarItemClass(
                            isCatHighlighted,
                            "min-w-0 flex-1 pr-2"
                          )}
                        >
                          <span className={dashboardSidebarIconSlotClass()}>
                            <span
                              className={dashboardSidebarCheckboxClass(
                                isCatActive
                                  ? "active"
                                  : isPartial
                                    ? "partial"
                                    : "inactive"
                              )}
                            >
                              {isCatActive ? (
                                <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />
                              ) : isPartial ? (
                                <Minus className="h-2.5 w-2.5" strokeWidth={3} />
                              ) : null}
                            </span>
                          </span>
                          <span className="min-w-0 flex-1 truncate">{cat.name}</span>
                        </button>

                        {hasSubcategories ? (
                          <button
                            type="button"
                            onClick={() => toggleExpand(cat.slug)}
                            className={dashboardSidebarExpandButtonClass(
                              isCatHighlighted
                            )}
                            aria-label={
                              isExpanded ? `Collapse ${cat.name}` : `Expand ${cat.name}`
                            }
                          >
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </button>
                        ) : null}
                      </div>

                      {isExpanded && hasSubcategories ? (
                        <div className="ml-6 space-y-1.5 border-l border-border pl-3">
                          <button
                            type="button"
                            onClick={() => selectCategory(cat.slug)}
                            className={dashboardSidebarItemClass(isCatActive)}
                          >
                            <span className={dashboardSidebarIconSlotClass()}>
                              <span
                                className={dashboardSidebarCheckboxClass(
                                  isCatActive ? "active" : "inactive",
                                  "sm"
                                )}
                              >
                                {isCatActive ? (
                                  <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />
                                ) : null}
                              </span>
                            </span>
                            <span className="truncate italic">{t("all")}</span>
                          </button>

                          {cat.subcategories.map((sub) => {
                            const isSubChecked =
                              selectedCategory === cat.slug &&
                              selectedSubs.has(sub.slug);

                            return (
                              <button
                                type="button"
                                key={sub.id}
                                onClick={() => toggleSubcategory(cat.slug, sub.slug)}
                                className={dashboardSidebarItemClass(isSubChecked)}
                              >
                                <span className={dashboardSidebarIconSlotClass()}>
                                  <span
                                    className={dashboardSidebarCheckboxClass(
                                      isSubChecked ? "active" : "inactive",
                                      "sm"
                                    )}
                                  >
                                    {isSubChecked ? (
                                      <Check
                                        className="h-2.5 w-2.5 text-white"
                                        strokeWidth={3}
                                      />
                                    ) : null}
                                  </span>
                                </span>
                                <span className="truncate">{sub.name}</span>
                              </button>
                            );
                          })}

                          {(() => {
                            const isOtherChecked =
                              selectedCategory === cat.slug &&
                              selectedSubs.has("__none__");

                            return (
                              <button
                                type="button"
                                onClick={() => toggleSubcategory(cat.slug, "__none__")}
                                className={dashboardSidebarItemClass(isOtherChecked)}
                              >
                                <span className={dashboardSidebarIconSlotClass()}>
                                  <span
                                    className={dashboardSidebarCheckboxClass(
                                      isOtherChecked ? "active" : "inactive",
                                      "sm"
                                    )}
                                  >
                                    {isOtherChecked ? (
                                      <Check
                                        className="h-2.5 w-2.5 text-white"
                                        strokeWidth={3}
                                      />
                                    ) : null}
                                  </span>
                                </span>
                                <span className="truncate italic">
                                  {t("jobs.boardPage.filters.other")}
                                </span>
                              </button>
                            );
                          })()}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </section>
          ) : (
            <div className="mt-5 space-y-2 px-1">
              {[80, 65, 90, 70, 75].map((width, index) => (
                <div
                  key={index}
                  className="h-9 animate-pulse rounded-md bg-accent/60"
                  style={{ width: `${width}%` }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}

export { JobsSidebar };
export default JobsSidebar;
