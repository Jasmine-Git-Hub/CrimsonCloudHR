import React from "react";
import { createBrowserRouter } from "react-router";

// --- LAYOUT & LOGIN ---
import Layout from "./Layout";
import Login from "./pages/Login";

// --- ADMIN PAGES ---
import Dashboard from "./pages/Dashboard";
import Admin from "./pages/Admin";
import Employee from "./pages/Employee";
import Payroll from "./pages/Payroll";
import Leave from "./pages/Leave";
import Time from "./pages/Time";
import AdminAttendance from "./pages/time/Attendance"; 
import Reports from "./pages/time/Reports"; 
import Recruitment from "./pages/Recruitment"; 
import MyInfo from "./pages/MyInfo"; 
import Performance from "./pages/Performance";
import SearchPage from "./pages/Search";
import AuditLogs from "./pages/AuditLogs";

// --- EMPLOYEE PAGES ---
import MyProfile from "./pages/employee/MyProfile";
import EmployeeAttendance from "./pages/employee/AttendanceEmployee";
import LeaveRequests from "./pages/employee/LeaveRequests";
import Payslip from "./pages/employee/Payslip";
import Requests from "./pages/employee/Requests";
import Training from "./pages/employee/Training";
import Notifications from "./pages/employee/Notifications";
import MyEvaluation from "./pages/employee/MyEvaluation"; 

// --- SECURITY BOUNCER ---
import ProtectedRoute from "./components/ProtectedRoute";
import { RouteErrorPage } from "./components/ErrorBoundary";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Login,
    ErrorBoundary: RouteErrorPage,
  },

  // ==========================================
  // 🛡️ ADMIN & SUPERVISOR ROUTES (Management)
  // ==========================================
  {
    element: <ProtectedRoute allowedRoles={['admin', 'supervisor', 'hr']} />, 
    ErrorBoundary: RouteErrorPage,
    children: [
      {
        path: "/app",
        Component: Layout,
        children: [
          { index: true, Component: Dashboard },
          { path: "employee", Component: Employee },
          { path: "leave", Component: Leave },
          { path: "time", Component: Time },
          { path: "time/attendance", Component: AdminAttendance },
          { path: "reports", Component: Reports }, 
          { path: "my-attendance", Component: EmployeeAttendance }, 
          { path: "my-payslip", Component: Payslip },
          { path: "my-evaluation", Component: MyEvaluation },
          { path: "recruitment", Component: Recruitment },
          { path: "my-info", Component: MyInfo },
          { path: "performance", Component: Performance },
          // 👇 IDINAGDAG NATIN ITO PARA MABUKSAN NG ADMIN ANG INBOX 👇
          { path: "notifications", Component: Notifications },
          { path: "search", Component: SearchPage },

          // 🔒 ADMIN-ONLY: system settings, payroll, audit trail.
          // Supervisors/HR hitting these are bounced back to /app.
          {
            element: <ProtectedRoute allowedRoles={['admin']} />,
            children: [
              { path: "admin", Component: Admin },
              { path: "payroll", Component: Payroll },
              { path: "audit-logs", Component: AuditLogs },
            ],
          },
        ],
      }
    ]
  },

  // ==========================================
  // 🛡️ EMPLOYEE PORTAL ROUTES (Self-Service)
  // ==========================================
  {
    element: <ProtectedRoute allowedRoles={['ess', 'employee', 'supervisor', 'hr']} />, 
    ErrorBoundary: RouteErrorPage,
    children: [
      {
        path: "/portal",
        Component: Layout, 
        children: [
          { index: true, Component: MyProfile },
          { path: "profile", Component: MyProfile },
          { path: "attendance", Component: EmployeeAttendance },
          { path: "leave", Component: LeaveRequests },
          { path: "payroll", Component: Payslip },
          { path: "requests", Component: Requests },
          { path: "training", Component: Training },
          { path: "notifications", Component: Notifications },
          { path: "evaluation", Component: MyEvaluation },
           { path: "search", Component: SearchPage }, 
        ]
      }
    ]
  },

  { path: "*", Component: RouteErrorPage },
]);
