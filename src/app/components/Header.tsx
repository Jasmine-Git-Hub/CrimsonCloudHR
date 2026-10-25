import { useState, useEffect, useRef } from "react";
import { HelpCircle, Search, X } from "lucide-react";
import { useLocation, useNavigate } from "react-router";
import UserNav from "../components/UserNav";
import NotificationBell from "../components/NotificationBell";
import { auth, db } from "../../config/firebaseSetup";
import { doc, getDoc } from "firebase/firestore";

// Define all your actual routes based on your routes.tsx
const ROUTES_CONFIG = {
  admin: [
    { name: "Dashboard", path: "/app", keywords: ["dashboard", "home", "main"] },
    { name: "Admin", path: "/app/admin", keywords: ["admin", "administration"] },
    { name: "Employee Management", path: "/app/employee", keywords: ["employee", "staff", "people", "users"] },
    { name: "Payroll", path: "/app/payroll", keywords: ["payroll", "salary", "compensation"] },
    { name: "Leave Management", path: "/app/leave", keywords: ["leave", "vacation", "sick leave", "pto"] },
    { name: "Time Management", path: "/app/time", keywords: ["time", "schedule", "shift"] },
    { name: "Attendance", path: "/app/time/attendance", keywords: ["attendance", "clock in", "clock out", "time in"] },
    { name: "Reports", path: "/app/reports", keywords: ["report", "analytics", "statistics"] },
    { name: "Recruitment", path: "/app/recruitment", keywords: ["recruitment", "hiring", "candidates"] },
    { name: "My Info", path: "/app/my-info", keywords: ["my info", "profile", "information"] },
    { name: "Performance", path: "/app/performance", keywords: ["performance", "evaluation", "review"] },
    { name: "Notifications", path: "/app/notifications", keywords: ["notification", "alert", "bell"] },
  ],
  portal: [
    { name: "My Profile", path: "/portal", keywords: ["profile", "my profile", "account"] },
    { name: "My Profile", path: "/portal/profile", keywords: ["profile", "my profile", "account"] },
    { name: "My Attendance", path: "/portal/attendance", keywords: ["attendance", "time", "clock in", "clock out"] },
    { name: "Leave Requests", path: "/portal/leave", keywords: ["leave", "request", "vacation", "sick leave", "pto"] },
    { name: "Payroll", path: "/portal/payroll", keywords: ["payroll", "payslip", "salary"] },
    { name: "Requests", path: "/portal/requests", keywords: ["request", "forms"] },
    { name: "Training", path: "/portal/training", keywords: ["training", "learning", "development"] },
    { name: "Notifications", path: "/portal/notifications", keywords: ["notification", "alert", "bell"] },
    { name: "My Evaluation", path: "/portal/evaluation", keywords: ["evaluation", "review", "performance"] },
  ]
};

export function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchSuggestions, setSearchSuggestions] = useState<Array<{name: string, path: string, type: string}>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  // Get user role on component mount
  useEffect(() => {
    const getUserRole = async () => {
      const currentUser = auth.currentUser;
      if (currentUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
          if (userDoc.exists()) {
            const role = userDoc.data().role;
            setUserRole(role);
          }
        } catch (error) {
          console.error('Error fetching user role:', error);
        }
      }
    };
    getUserRole();
  }, []);

  const getPageTitle = () => {
    const path = location.pathname;
    
    // Check admin routes
    for (const route of ROUTES_CONFIG.admin) {
      if (path === route.path) {
        return route.name;
      }
    }
    
    // Check portal routes
    for (const route of ROUTES_CONFIG.portal) {
      if (path === route.path) {
        return route.name;
      }
    }
    
    // Default title generation for dynamic routes
    const pathSegments = path.split("/").filter(seg => seg && seg !== 'app' && seg !== 'portal');
    if (pathSegments.length === 0) return "Dashboard";
    
    const lastSegment = pathSegments[pathSegments.length - 1];
    return lastSegment
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  // Get current context routes
  const getCurrentRoutes = () => {
    const isPortal = location.pathname.startsWith('/portal');
    return isPortal ? ROUTES_CONFIG.portal : ROUTES_CONFIG.admin;
  };

  // Check if user is employee (restricted access)
  const isEmployee = userRole === 'employee' || userRole === 'ess';

  // Search routes and data
  const performSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchSuggestions([]);
      return;
    }

    setIsLoading(true);
    const searchTerm = query.toLowerCase();
    const routes = getCurrentRoutes();
    const suggestions: Array<{name: string, path: string, type: string}> = [];

    // Search in routes - for employees, only show their accessible routes
    routes.forEach(route => {
      // For employees, only show portal routes that they have access to
      if (isEmployee) {
        // Only show employee-relevant routes
        const employeeRelevantRoutes = [
          "My Attendance", "Leave Requests", "Payroll", 
          "Requests", "Training", "Notifications", "My Evaluation"
        ];
        if (employeeRelevantRoutes.includes(route.name)) {
          if (route.name.toLowerCase().includes(searchTerm) ||
              route.keywords.some(keyword => keyword.includes(searchTerm))) {
            suggestions.push({
              name: route.name,
              path: route.path,
              type: 'route'
            });
          }
        }
      } else {
        // Admin/HR can see all routes
        if (route.name.toLowerCase().includes(searchTerm) ||
            route.keywords.some(keyword => keyword.includes(searchTerm))) {
          suggestions.push({
            name: route.name,
            path: route.path,
            type: 'route'
          });
        }
      }
    });

    // Limit to 5 suggestions
    setSearchSuggestions(suggestions.slice(0, 5));
    setIsLoading(false);
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    
    navigateToSearchResult(searchQuery.trim());
  };

  const navigateToSearchResult = (query: string) => {
    const searchTerm = query.toLowerCase();
    const routes = getCurrentRoutes();
    
    // First, try to find an exact route match
    let matchedRoute = routes.find(route => 
      route.name.toLowerCase() === searchTerm ||
      route.keywords.some(keyword => keyword === searchTerm)
    );

    // If no exact match, try partial matches
    if (!matchedRoute) {
      matchedRoute = routes.find(route => 
        route.name.toLowerCase().includes(searchTerm) ||
        route.keywords.some(keyword => keyword.includes(searchTerm))
      );
    }

    // If a route is found, navigate to it
    if (matchedRoute) {
      navigate(matchedRoute.path);
      setSearchOpen(false);
      setSearchQuery("");
      setSearchSuggestions([]);
      return;
    }

    // If no route match, go to search results page
    const basePath = location.pathname.startsWith('/portal') ? '/portal' : '/app';
    navigate(`${basePath}/search?q=${encodeURIComponent(query)}`);
    setSearchOpen(false);
    setSearchQuery("");
    setSearchSuggestions([]);
  };

  const handleSuggestionClick = (suggestion: {name: string, path: string, type: string}) => {
    setSearchQuery(suggestion.name);
    navigate(suggestion.path);
    setSearchOpen(false);
    setSearchQuery("");
    setSearchSuggestions([]);
  };

  // Debounced search
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (searchOpen && searchQuery) {
        performSearch(searchQuery);
      } else {
        setSearchSuggestions([]);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, searchOpen, userRole]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setSearchOpen(false);
      setSearchQuery("");
      setSearchSuggestions([]);
    }
  };

  // Close search when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setSearchOpen(false);
        setSearchSuggestions([]);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleBellClick = () => {
    if (location.pathname.startsWith('/portal')) {
      navigate('/portal/notifications');
    } else {
      navigate('/app/notifications');
    }
  };

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-3 shadow-sm">
      <div className="flex items-center justify-between">
        {/* Page Title */}
        <div>
          <h1 className="text-2xl font-semibold text-[#1B1717]">
            {getPageTitle()}
          </h1>
        </div>

        {/* Right side actions */}
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative" ref={searchRef}>
            {searchOpen ? (
              <div className="relative">
                <form onSubmit={handleSearch} className="flex items-center">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={isEmployee 
                      ? "Search your attendance, leaves, payslips..." 
                      : "Search for dashboard, attendance, timesheets..."}
                    className="w-80 px-4 py-2 rounded-l-lg border border-gray-300 text-[#1B1717] focus:outline-none focus:border-[#810100] focus:ring-1 focus:ring-[#810100]"
                    autoFocus
                  />
                  <button
                    type="submit"
                    className="bg-[#810100] text-white px-4 py-2 rounded-r-lg hover:bg-[#630000] transition-colors"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <Search className="w-5 h-5" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchOpen(false);
                      setSearchQuery("");
                      setSearchSuggestions([]);
                    }}
                    className="ml-2 p-1 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100 transition-colors"
                    aria-label="Close search"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </form>

                {/* Search Suggestions Dropdown */}
                {searchSuggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
                    {searchSuggestions.map((suggestion, index) => (
                      <button
                        key={index}
                        onClick={() => handleSuggestionClick(suggestion)}
                        className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2 transition-colors"
                      >
                        <Search className="w-4 h-4 text-gray-400" />
                        <div className="flex-1">
                          <span className="text-sm text-gray-700">{suggestion.name}</span>
                          <span className="text-xs text-gray-400 ml-2">
                            {suggestion.type === 'route' ? 'Page' : 'Record'}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

              </div>
            ) : (
              <button
                onClick={() => setSearchOpen(true)}
                className="flex items-center gap-2 bg-[#EDEBDD] hover:bg-[#E0DDCD] text-[#630000] px-4 py-2 rounded-lg transition-colors"
              >
                <Search className="w-5 h-5" />
                <span className="hidden md:inline text-sm font-medium">Search</span>
              </button>
            )}
          </div>

          {/* Pass the handleBellClick to NotificationBell */}
          <NotificationBell onClick={handleBellClick} />

          {/* User Navigation */}
          <UserNav />

          {/* Help button */}
          <button
            className="w-10 h-10 rounded-full bg-[#EDEBDD] hover:bg-[#E0DDCD] flex items-center justify-center transition-colors text-[#630000]"
            aria-label="Help"
          >
            <HelpCircle className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  );
}