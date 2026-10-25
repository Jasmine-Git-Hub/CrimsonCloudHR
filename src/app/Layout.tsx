import { Outlet } from "react-router";
import { Sidebar } from "./components/Sidebar";
import { Header } from "./components/Header";

// 1. TAMA NA ANG PATH (Dalawang tuldok: ../) AT IMPORT NAME (May "use")
import useAutoLogout from "../hooks/autoLogout";

export default function Layout() {
  // 2. TAMA NA ANG TAWAG (May "use" sa unahan para iwas crash)
  useAutoLogout(5);

  return (
    <div className="flex h-screen bg-[#F5F5F5]">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}