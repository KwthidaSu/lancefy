import { Outlet, useLocation, useSearchParams } from "react-router-dom";
import GallerySidebar from "@/components/navigation/sidebar/GallerySidebar";

export default function GalleryLayout() {
  const location = useLocation();
  const isCommunity = location.pathname.includes("/community");

  const [searchParams, setSearchParams] = useSearchParams();
  const selected = searchParams.get("category") ? [searchParams.get("category")!] : [];

  const handleCategoryChange = (values: string[]) => {
    const next = new URLSearchParams(searchParams);
    if (values.length === 0) {
      next.delete("category");
    } else {
      next.set("category", values[values.length - 1]);
    }
    next.delete("page");
    setSearchParams(next);
  };

  return (
    <div className="flex h-full min-h-0 overflow-hidden bg-[linear-gradient(180deg,#f8fbff_0%,#f5f8fc_100%)]">
      {isCommunity ? null : (
        <GallerySidebar values={selected} onChange={handleCategoryChange} />
      )}
      <main className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
