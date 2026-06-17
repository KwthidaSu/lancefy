import { useTranslation } from "react-i18next";

import CategoryFilterSidebar, {
  Category,
} from "@/components/navigation/sidebar/CategoryFilterSidebar";

interface GallerySidebarProps {
  values?: string[];
  onChange?: (values: string[]) => void;
}

export default function GallerySidebar({
  values,
  onChange,
}: GallerySidebarProps) {
  const { t } = useTranslation("common");

  const categories: Category[] = [
    { label: t("gallery.logoDesign"), value: "logo-design" },
    { label: t("gallery.branding"), value: "branding" },
    { label: t("gallery.socialMedia"), value: "social-media" },
    { label: t("gallery.websiteDesign"), value: "website-design" },
    { label: t("gallery.illustration"), value: "illustration" },
    { label: t("gallery.packaging"), value: "packaging" },
    { label: t("gallery.landingPage"), value: "landing-page" },
    { label: t("gallery.uiux"), value: "ui-ux" },
    { label: t("gallery.architecture"), value: "architecture" },
  ];

  return (
    <aside className="flex w-64 flex-col border-r border-border bg-surface">
      <CategoryFilterSidebar
        title={t("gallery.categories")}
        allLabel={t("all")}
        popularLabel={t("gallery.popular")}
        categories={categories}
        viewAllLabel={t("gallery.viewAll")}
        values={values}
        onChange={onChange}
      />
    </aside>
  );
}
