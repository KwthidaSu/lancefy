import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import CategoryFilterSidebar, {
  Category,
} from "./CategoryFilterSidebar";
import {
  dashboardSidebarPanelClass,
  dashboardSidebarShellClass,
} from "./sidebarStyles";

const freelancerCategories: Category[] = [
  { label: "UI / UX", value: "ui-ux" },
  { label: "Branding", value: "branding" },
  { label: "Web Development", value: "web-development" },
  { label: "Illustration", value: "illustration" },
  { label: "Marketing", value: "marketing" },
  { label: "Photography", value: "photography" },
  { label: "Writing & Translation", value: "writing-translation" },
  { label: "Video & Animation", value: "video-animation" },
];

function FreelancersSidebar() {
  const { t } = useTranslation("common");
  const [searchParams, setSearchParams] = useSearchParams();

  const rawParam = searchParams.get("category") || "";
  const selectedCategories = rawParam ? rawParam.split(",").filter(Boolean) : [];

  const handleCategoryChange = (values: string[]) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (values.length === 0) {
        next.delete("category");
      } else {
        next.set("category", values.join(","));
      }
      return next;
    });
  };

  return (
    <aside className={dashboardSidebarShellClass}>
      <div className={dashboardSidebarPanelClass}>
        <CategoryFilterSidebar
          title={t("freelancersPage.sidebarTitle")}
          allLabel={t("freelancersPage.sidebarAll")}
          popularLabel={t("freelancersPage.sidebarPopular")}
          clearLabel={t("freelancersPage.filters.clear")}
          categories={freelancerCategories}
          values={selectedCategories}
          onChange={handleCategoryChange}
          variant="dashboard"
        />
      </div>
    </aside>
  );
}

export { FreelancersSidebar };
export default FreelancersSidebar;
