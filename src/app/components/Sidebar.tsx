import { NavLink } from "react-router";
import {
  Search,
  Users,
  UserCog,
  Clock,
  UserPlus,
  FileText,
  BarChart3,
  Home,
  BookOpen,
  Settings,
  DollarSign,
  MessageSquare,
  ChevronLeft,
} from "lucide-react";
import { useState } from "react";

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);

  const menuItems = [
    { icon: Home, label: "Dashboard", path: "/app" },
    { icon: Users, label: "Admin", path: "/app/admin" },
    { icon: UserCog, label: "Employee", path: "/app/employee" },
    { icon: Search, label: "Search", path: "/app/search" },
    { icon: Clock, label: "Leave", path: "/app/leave" },
    { icon: Clock, label: "Time", path: "/app/time" },
    { icon: UserPlus, label: "Recruitment", path: "/app/recruitment" },
    { icon: FileText, label: "My Info", path: "/app/my-info" },
    { icon: BarChart3, label: "Performance", path: "/app/performance" },
    { icon: BookOpen, label: "Directory", path: "/app/directory" },
    { icon: Settings, label: "Configuration", path: "/app/configuration" },
    { icon: DollarSign, label: "Payroll", path: "/app/payroll" },
    { icon: MessageSquare, label: "Buzz", path: "/app/buzz" },
  ];

  return (
    <aside
      className={`bg-white border-r border-gray-200 transition-all duration-300 ${
        collapsed ? "w-20" : "w-64"
      } flex flex-col relative`}
    >
      {/* Logo */}
      <div className="p-6 border-b border-gray-200">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#810100] to-[#630000] flex items-center justify-center">
                <div className="w-6 h-6 rounded-full border-3 border-white"></div>
              </div>
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-[#4A7C59] rounded-full"></div>
            </div>
            <div>
              <h1 className="text-xl">
                <span className="text-[#810100]">Orange</span>
                <span className="text-[#1B1717]">HRM</span>
              </h1>
            </div>
          </div>
        )}
      </div>

      {/* Collapse button */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-32 w-6 h-6 bg-[#810100] rounded-full flex items-center justify-center text-white hover:bg-[#630000] transition-colors z-10 shadow-lg"
      >
        <ChevronLeft
          className={`w-4 h-4 transition-transform ${
            collapsed ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-1 px-3">
          {menuItems.map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                end={item.path === "/app"}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive
                      ? "bg-[#810100] text-white"
                      : "text-[#630000] hover:bg-[#EDEBDD]"
                  }`
                }
                title={collapsed ? item.label : undefined}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                {!collapsed && <span className="text-sm">{item.label}</span>}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}