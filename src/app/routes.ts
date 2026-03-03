import { createBrowserRouter } from "react-router";
import Layout from "./Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Admin from "./pages/Admin";
import Employee from "./pages/Employee";
import Payroll from "./pages/Payroll";
import NotFound from "./pages/NotFound";
import PlaceholderPage from "./pages/PlaceholderPage";
import Leave from "./pages/Leave";
import Time from "./pages/Time";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Login,
  },
  {
    path: "/app",
    Component: Layout,
    children: [
      {
        index: true,
        Component: Dashboard,
      },
      {
        path: "admin",
        Component: Admin,
      },
      {
        path: "employee",
        Component: Employee,
      },
      {
        path: "payroll",
        Component: Payroll,
      },
      {
        path: "search",
        Component: PlaceholderPage,
      },
      {
        path: "leave",
        Component: Leave,
      },
      {
        path: "time",
        Component: Time,
      },
      {
        path: "recruitment",
        Component: PlaceholderPage,
      },
      {
        path: "my-info",
        Component: PlaceholderPage,
      },
      {
        path: "performance",
        Component: PlaceholderPage,
      },
      {
        path: "directory",
        Component: PlaceholderPage,
      },
      {
        path: "maintenance",
        Component: PlaceholderPage,
      },
      {
        path: "buzz",
        Component: PlaceholderPage,
      },
    ],
  },
  {
    path: "*",
    Component: NotFound,
  },
]);