import { Outlet } from "react-router";
import { Sidebar } from "./components/Sidebar";
import { Header } from "./components/Header";

export default function Layout() {
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
