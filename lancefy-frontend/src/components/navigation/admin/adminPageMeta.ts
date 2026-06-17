export type AdminPageMeta = {
  title: string;
  description: string;
};

type Translate = (key: string) => string;

export function getAdminPageMeta(pathname: string, t: Translate): AdminPageMeta {
  if (pathname === "/admin") {
    return {
      title: t("admin.meta.dashboard.title"),
      description: t("admin.meta.dashboard.description"),
    };
  }

  if (pathname.startsWith("/admin/users")) {
    return {
      title: t("admin.meta.users.title"),
      description: t("admin.meta.users.description"),
    };
  }

  if (pathname.startsWith("/admin/kyc")) {
    return {
      title: t("admin.meta.kyc.title"),
      description: t("admin.meta.kyc.description"),
    };
  }

  if (pathname.startsWith("/admin/disputes")) {
    return {
      title: "Disputes",
      description: "ตรวจสอบและตัดสิน dispute ระหว่าง client กับ freelancer",
    };
  }

  if (pathname.startsWith("/admin/projects")) {
    return {
      title: t("admin.meta.projects.title"),
      description: t("admin.meta.projects.description"),
    };
  }

  if (pathname.startsWith("/admin/payments")) {
    return {
      title: t("admin.meta.payments.title"),
      description: t("admin.meta.payments.description"),
    };
  }

  return {
    title: t("admin.meta.default.title"),
    description: t("admin.meta.default.description"),
  };
}
