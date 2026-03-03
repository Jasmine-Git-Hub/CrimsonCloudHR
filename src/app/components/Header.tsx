import { ArrowUpCircle, User, ChevronDown, HelpCircle } from "lucide-react";
import { useLocation } from "react-router";

export function Header() {
  const location = useLocation();
  
  const getPageTitle = () => {
    const path = location.pathname.split("/").pop();
    if (!path || path === "app") return "Dashboard";
    return path
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  return (
    <header className="bg-gradient-to-r from-[#810100] to-[#630000] text-white px-6 py-4 shadow-md">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl">{getPageTitle()}</h1>
        </div>

        <div className="flex items-center gap-4">
          {/* Upgrade Button */}
          <button className="flex items-center gap-2 bg-white text-[#810100] px-4 py-2 rounded-lg hover:shadow-lg transition-shadow">
            <ArrowUpCircle className="w-5 h-5" />
            <span>Upgrade</span>
          </button>

          {/* User Profile */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
              <User className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm">Jasmine Michaela Espiritu</p>
            </div>
            <ChevronDown className="w-4 h-4" />
          </div>

          {/* Help Icon */}
          <button className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors">
            <HelpCircle className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  );
}