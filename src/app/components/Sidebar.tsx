// Declare module for PNG files
declare module "*.png" {
  const value: string;
  export default value;
}

import { NavLink, useLocation } from "react-router";
import React, { useState, useEffect } from "react";
import { auth, db } from "../../config/firebaseSetup";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

import crimsonLogo from '../../assets/crimson.png';
import {
  Users, UserCog, Clock, UserPlus, FileText,
  BarChart3, Home, DollarSign, ChevronLeft,
  UserCircle, Calendar, ClipboardList, GraduationCap, Bell, Star, PieChart, Shield
} from "lucide-react";

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [role, setRole] = useState<string | null>(null);
  const location = useLocation();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          setRole(String(userDoc.data().role || "").toLowerCase().trim());
        }
      }
    });
    return () => unsubscribe();
  }, []);

  const adminOnlyItem = { icon: Users, label: "Admin Settings", path: "/app/admin" };
  
  const managementMenu = [
    { icon: Home, label: "Dashboard", path: "/app" },
    { icon: UserCog, label: "Employee", path: "/app/employee" },
    { icon: UserPlus, label: "Recruitment", path: "/app/recruitment" },
    { icon: Calendar, label: "Leave ", path: "/app/leave" },
    { icon: Clock, label: "Attendance", path: "/app/time" },
    { icon: DollarSign, label: "Payroll", path: "/app/payroll" },
    { icon: BarChart3, label: "Performance", path: "/app/performance" },
    { icon: PieChart, label: "Reports", path: "/app/reports" }, // <--- NAGMA-MATCH NA SILA NGAYON
  ];

  const employeeMenu = [
    { icon: UserCircle, label: "My Profile", path: "/portal/profile" },
    { icon: Clock, label: "My Time Logs", path: "/portal/attendance" },
    { icon: Calendar, label: "My Leaves", path: "/portal/leave" },
    { icon: DollarSign, label: "My Payslip", path: "/portal/payroll" },
    { icon: ClipboardList, label: "Requests", path: "/portal/requests" },
    { icon: GraduationCap, label: "My Training", path: "/portal/training" },
    { icon: Star, label: "My Evaluation", path: "/portal/evaluation" },
    { icon: Bell, label: "Inbox", path: "/portal/notifications" },
  ];

  let finalMenu: any[] = [];
  let portalTitle = "HR PORTAL";

  if (role === 'admin') {
    portalTitle = "ADMIN PORTAL";
    finalMenu = [managementMenu[0], adminOnlyItem, { icon: Shield, label: "Audit Logs", path: "/app/audit-logs" }, ...managementMenu.slice(1), { icon: UserCircle, label: "My Info", path: "/app/my-info" }, { icon: Clock, label: "My Time Logs", path: "/app/my-attendance" }, { icon: FileText, label: "My Payslip", path: "/app/my-payslip" }, { icon: Star, label: "My Evaluation", path: "/app/my-evaluation" }, { icon: Bell, label: "Inbox", path: "/app/notifications" }];
  } 
  else if (role === 'supervisor') {
    portalTitle = "SUPERVISOR PORTAL";
    finalMenu = [...managementMenu, { isDivider: true, label: "MY PORTAL" }, ...employeeMenu.filter(item => item.label !== "My Leaves")]; 
  } 
  else if (role === 'hr') {
    portalTitle = "HR PORTAL";
    finalMenu = [...managementMenu, { isDivider: true, label: "MY PORTAL" }, ...employeeMenu]; 
  } 
  else {
    portalTitle = "EMPLOYEE PORTAL";
    finalMenu = employeeMenu;
  }

  return (
    <aside className={`bg-white border-r border-gray-200 transition-all duration-300 ${collapsed ? "w-20" : "w-64"} flex flex-col relative z-20 h-full`}>
      <div className={`border-b border-gray-200 transition-all duration-300 flex items-center justify-center ${collapsed ? 'p-4 min-h-[88px]' : 'px-6 py-8'}`}>
        {collapsed ? (
          <img src={crimsonLogo} alt="CrimsonCloud Logo" className="w-12 h-12 object-contain" />
        ) : (
          <div className="flex flex-col items-center gap-4 w-full text-center animate-in fade-in duration-300">
            <img src={crimsonLogo} alt="CrimsonCloud Logo" className="w-20 h-20 object-contain shadow-sm rounded-lg" />
            <div className="space-y-1">
              <h1 className="text-2xl font-bold leading-tight tracking-tight">
                <span className="text-[#810100]">CrimsonCloud</span>
                <span className="text-[#1B1717]">HR</span>
              </h1>
              <p className="text-[10px] text-[#630000] uppercase tracking-widest font-bold opacity-80 mt-1">
                {portalTitle}
              </p>
            </div>
          </div>
        )}
      </div>

      <button onClick={() => setCollapsed(!collapsed)} className="absolute -right-3 top-32 w-6 h-6 bg-[#810100] rounded-full flex items-center justify-center text-white hover:bg-[#630000] transition-colors z-30 shadow-lg">
        <ChevronLeft className={`w-4 h-4 transition-transform ${collapsed ? "rotate-180" : ""}`} />
      </button>

      <nav className="flex-1 overflow-y-auto py-4 scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
        <ul className="space-y-1 px-3">
          {finalMenu.map((item, index) => {
            if (item.isDivider) {
              return !collapsed ? (
                <li key={`div-${index}`} className="pt-6 pb-2 px-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  {item.label}
                </li>
              ) : <li key={`div-${index}`} className="my-4 border-b border-gray-200"></li>;
            }

            const isActive = location.pathname === item.path || (item.path !== '/app' && item.path !== '/portal' && location.pathname.startsWith(item.path));

            return (
              <li key={item.path}>
                <NavLink to={item.path} className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive ? "bg-[#810100] text-white shadow-md font-semibold" : "text-[#630000] hover:bg-[#EDEBDD]"}`} title={collapsed ? item.label : undefined}>
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  {!collapsed && <span className="text-sm">{item.label}</span>}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}