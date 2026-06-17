import type { IconType } from "react-icons";
import {
  HiOutlineHome,
  HiOutlineUsers,
  HiOutlineShieldCheck,
  HiOutlineFolder,
  HiOutlineBanknotes,
  HiOutlineScale,
  HiOutlineGlobeAlt,
} from "react-icons/hi2";

type AdminNavigationLinkItem = {
  key: string;
  to: string;
  icon: IconType;
  end?: boolean;
  disabled?: false;
};

type AdminNavigationDisabledItem = {
  key: string;
  icon: IconType;
  disabled: true;
  to?: never;
  end?: never;
};

export type AdminNavigationItem =
  | AdminNavigationLinkItem
  | AdminNavigationDisabledItem;

export const adminNavigation: AdminNavigationItem[] = [
  {
    key: "dashboard",
    to: "/admin",
    icon: HiOutlineHome,
    end: true,
  },
  {
    key: "users",
    to: "/admin/users",
    icon: HiOutlineUsers,
  },
  {
    key: "kyc",
    to: "/admin/kyc",
    icon: HiOutlineShieldCheck,
  },
  {
    key: "disputes",
    to: "/admin/disputes",
    icon: HiOutlineScale,
  },
  {
    key: "community",
    to: "/admin/community",
    icon: HiOutlineGlobeAlt,
  },
  {
    key: "projects",
    icon: HiOutlineFolder,
    disabled: true,
  },
  {
    key: "payments",
    icon: HiOutlineBanknotes,
    disabled: true,
  },
];