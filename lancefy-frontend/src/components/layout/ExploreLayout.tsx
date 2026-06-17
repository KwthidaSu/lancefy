import { Outlet } from "react-router-dom";

export default function ExploreLayout() {
  return (
    <div className="flex h-full bg-[linear-gradient(180deg,#f8fbff_0%,#f5f8fc_100%)]">
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
