import { useState, useEffect } from "react";
import { useSearchParams, useLocation } from "react-router";
import { Search, User, FileText, Clock, Calendar, Briefcase } from "lucide-react";
import { db, auth } from "../../config/firebaseSetup";
import { collection, getDocs, query, where, orderBy, limit, doc, getDoc, DocumentData } from "firebase/firestore";

// Define proper interfaces for Firestore documents
interface UserData {
  firstName?: string;
  middleName?: string;
  lastName?: string;
  username?: string;
  email?: string;
  employeeId?: string;
  role?: string;
  status?: string;
}

interface TimesheetData {
  employee_id?: string;
  employeeId?: string;
  employee_name?: string;
  employeeName?: string;
  date?: string;
  status?: string;
  hoursWorked?: number;
  overtime?: number;
  timeIn?: string;
  timeOut?: string;
}

interface RequestData {
  request_type?: string;
  employee_id?: string;
  employee_name?: string;
  status?: string;
  date_submitted?: string;
  details?: string;
  reason?: string;
  time_in?: string;
  time_out?: string;
  date_effective?: string;
}

interface LeaveData {
  leave_type?: string;
  leaveType?: string;
  employee_id?: string;
  employeeId?: string;
  employee_name?: string;
  employeeName?: string;
  status?: string;
  start_date?: string;
  end_date?: string;
  fromDate?: string;
  days?: number;
  appliedOn?: string;
}

interface SearchResult {
  id: string;
  type: 'user' | 'timesheet' | 'request' | 'leave';
  title: string;
  subtitle: string;
  status?: string;
  date?: string;
  data: UserData | TimesheetData | RequestData | LeaveData;
}

interface UserRole {
  role: string;
  employeeId: string;
  userId: string;
}

export default function SearchPage() {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const [queryText, setQueryText] = useState(searchParams.get('q') || '');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'users' | 'timesheets' | 'requests' | 'leaves'>('all');
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [isAdminOrHR, setIsAdminOrHR] = useState(false);
  const [isEmployee, setIsEmployee] = useState(false);

  // Check user role on component mount
  useEffect(() => {
    const checkUserRole = async () => {
      const currentUser = auth.currentUser;
      if (currentUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data() as UserData;
            const role = String(userData.role || 'employee').toLowerCase();
            const employeeId = userData.employeeId || '';
            
            setUserRole({
              role,
              employeeId,
              userId: currentUser.uid
            });
            
            setIsAdminOrHR(['admin', 'supervisor', 'hr'].includes(role));
            setIsEmployee(['ess', 'employee'].includes(role));
          }
        } catch (error) {
          console.error('Error fetching user role:', error);
        }
      }
    };
    
    checkUserRole();
  }, []);

  const performSearch = async (searchQuery: string) => {
    if (!searchQuery.trim() || !userRole) {
      setResults([]);
      return;
    }

    setLoading(true);
    const searchTerm = searchQuery.toLowerCase();
    const allResults: SearchResult[] = [];

    try {
      // Search Users - With role-based filtering
      if ((activeTab === 'all' || activeTab === 'users') && isAdminOrHR) {
        // Admins/HR can see all users
        const usersSnapshot = await getDocs(collection(db, 'users'));
        usersSnapshot.forEach((doc) => {
          const data = doc.data() as UserData;
          const fullName = `${data.firstName || ''} ${data.middleName || ''} ${data.lastName || ''}`.trim();
          if (
            fullName.toLowerCase().includes(searchTerm) ||
            (data.username || '').toLowerCase().includes(searchTerm) ||
            (data.email || '').toLowerCase().includes(searchTerm) ||
            (data.employeeId || '').toLowerCase().includes(searchTerm)
          ) {
            allResults.push({
              id: doc.id,
              type: 'user',
              title: fullName || data.username || 'Unknown User',
              subtitle: `${data.email || ''} | ${data.employeeId || ''} | Role: ${data.role || 'N/A'}`,
              status: data.status || 'Active',
              data
            });
          }
        });
      } else if ((activeTab === 'all' || activeTab === 'users') && isEmployee) {
        // Employees can only see themselves
        const currentUserDoc = await getDoc(doc(db, 'users', userRole.userId));
        if (currentUserDoc.exists()) {
          const data = currentUserDoc.data() as UserData;
          const fullName = `${data.firstName || ''} ${data.middleName || ''} ${data.lastName || ''}`.trim();
          if (
            fullName.toLowerCase().includes(searchTerm) ||
            (data.username || '').toLowerCase().includes(searchTerm) ||
            (data.email || '').toLowerCase().includes(searchTerm) ||
            (data.employeeId || '').toLowerCase().includes(searchTerm)
          ) {
            allResults.push({
              id: currentUserDoc.id,
              type: 'user',
              title: fullName || data.username || 'Unknown User',
              subtitle: `${data.email || ''} | ${data.employeeId || ''}`,
              status: data.status || 'Active',
              data
            });
          }
        }
      }

      // Search Timesheets - With role-based filtering
      if ((activeTab === 'all' || activeTab === 'timesheets')) {
        if (isAdminOrHR) {
          // Admins can see all timesheets
          const timesheetsSnapshot = await getDocs(collection(db, 'timesheets'));
          timesheetsSnapshot.forEach((doc) => {
            const data = doc.data() as TimesheetData;
            const employeeIdentifier = data.employee_name || data.employeeName || data.employee_id || data.employeeId || '';
            if (
              employeeIdentifier.toLowerCase().includes(searchTerm) ||
              (data.date || '').includes(searchTerm) ||
              (data.status || '').toLowerCase().includes(searchTerm)
            ) {
              allResults.push({
                id: doc.id,
                type: 'timesheet',
                title: `Timesheet - ${data.employee_name || data.employeeName || data.employee_id || data.employeeId || 'Unknown'}`,
                subtitle: `Date: ${data.date || 'N/A'} | Status: ${data.status || 'Unknown'}`,
                status: data.status,
                date: data.date,
                data
              });
            }
          });
        } else if (isEmployee) {
          // Employees can only see their own timesheets
          if (!userRole?.employeeId) return;
          
          const timesheetsQuery = query(
            collection(db, 'timesheets'),
            where('employeeId', '==', userRole.employeeId) // timesheets use employeeId (not employee_id)
          );
          const timesheetsSnapshot = await getDocs(timesheetsQuery);
          timesheetsSnapshot.forEach((doc) => {
            const data = doc.data() as TimesheetData;
            if (
              (data.date || '').includes(searchTerm) ||
              (data.status || '').toLowerCase().includes(searchTerm)
            ) {
              allResults.push({
                id: doc.id,
                type: 'timesheet',
                title: `Timesheet - ${data.date || 'Unknown Date'}`,
                subtitle: `Status: ${data.status || 'Unknown'}`,
                status: data.status,
                date: data.date,
                data
              });
            }
          });
        }
      }

      // Search Requests - With role-based filtering
      if ((activeTab === 'all' || activeTab === 'requests')) {
        if (isAdminOrHR) {
          // Admins can see all requests
          const requestsSnapshot = await getDocs(collection(db, 'requests'));
          requestsSnapshot.forEach((doc) => {
            const data = doc.data() as RequestData;
            if (
              (data.request_type || '').toLowerCase().includes(searchTerm) ||
              (data.employee_name || '').toLowerCase().includes(searchTerm) ||
              (data.status || '').toLowerCase().includes(searchTerm) ||
              (data.date_submitted || '').includes(searchTerm)
            ) {
              allResults.push({
                id: doc.id,
                type: 'request',
                title: `${data.request_type || 'Request'} - ${data.employee_name || 'Unknown'}`,
                subtitle: `Submitted: ${data.date_submitted || 'N/A'} | Status: ${data.status || 'Unknown'}`,
                status: data.status,
                date: data.date_submitted,
                data
              });
            }
          });
        } else if (isEmployee) {
          // Employees can only see their own requests
          if (!userRole?.employeeId) return;
          
          const requestsQuery = query(
            collection(db, 'requests'),
            where('employee_id', '==', userRole.employeeId)
          );
          const requestsSnapshot = await getDocs(requestsQuery);
          requestsSnapshot.forEach((doc) => {
            const data = doc.data() as RequestData;
            if (
              (data.request_type || '').toLowerCase().includes(searchTerm) ||
              (data.status || '').toLowerCase().includes(searchTerm) ||
              (data.date_submitted || '').includes(searchTerm)
            ) {
              allResults.push({
                id: doc.id,
                type: 'request',
                title: `${data.request_type || 'Request'} - ${data.date_submitted || 'Unknown'}`,
                subtitle: `Status: ${data.status || 'Unknown'}`,
                status: data.status,
                date: data.date_submitted,
                data
              });
            }
          });
        }
      }

      // Search Leaves - With role-based filtering
      if ((activeTab === 'all' || activeTab === 'leaves')) {
        if (isAdminOrHR) {
          // Admins can see all leave requests
          const leavesSnapshot = await getDocs(collection(db, 'leaveRequests'));
          leavesSnapshot.forEach((doc) => {
            const data = doc.data() as LeaveData;
            const leaveType = data.leave_type || data.leaveType || '';
            const employeeName = data.employee_name || data.employeeName || '';
            const startDate = data.start_date || data.fromDate || '';
            const endDate = data.end_date || '';
            
            if (
              leaveType.toLowerCase().includes(searchTerm) ||
              employeeName.toLowerCase().includes(searchTerm) ||
              (data.status || '').toLowerCase().includes(searchTerm) ||
              startDate.includes(searchTerm) ||
              endDate.includes(searchTerm)
            ) {
              allResults.push({
                id: doc.id,
                type: 'leave',
                title: `${leaveType || 'Leave'} - ${employeeName || 'Unknown'}`,
                subtitle: `From: ${startDate || 'N/A'} To: ${endDate || 'N/A'}`,
                status: data.status,
                date: startDate,
                data
              });
            }
          });
        } else if (isEmployee) {
          // Employees can only see their own leave requests
          if (!userRole || !userRole.employeeId) return;
          
          const leavesQuery = query(
            collection(db, 'leaveRequests'),
            where('employee_id', '==', userRole.employeeId)
          );
          const leavesSnapshot = await getDocs(leavesQuery);
          leavesSnapshot.forEach((doc) => {
            const data = doc.data() as LeaveData;
            const leaveType = data.leave_type || data.leaveType || '';
            const startDate = data.start_date || data.fromDate || '';
            const endDate = data.end_date || '';
            
            if (
              leaveType.toLowerCase().includes(searchTerm) ||
              (data.status || '').toLowerCase().includes(searchTerm) ||
              startDate.includes(searchTerm) ||
              endDate.includes(searchTerm)
            ) {
              allResults.push({
                id: doc.id,
                type: 'leave',
                title: `${leaveType || 'Leave'} - ${startDate || 'Unknown'}`,
                subtitle: `From: ${startDate || 'N/A'} To: ${endDate || 'N/A'}`,
                status: data.status,
                date: startDate,
                data
              });
            }
          });
        }
      }

      setResults(allResults);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const q = searchParams.get('q');
    if (q && userRole) {
      setQueryText(q);
      performSearch(q);
    }
  }, [searchParams, activeTab, userRole]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    performSearch(queryText);
  };

  const getIcon = (type: SearchResult['type']) => {
    switch (type) {
      case 'user': return <User className="w-5 h-5" />;
      case 'timesheet': return <Clock className="w-5 h-5" />;
      case 'request': return <FileText className="w-5 h-5" />;
      case 'leave': return <Calendar className="w-5 h-5" />;
      default: return <Search className="w-5 h-5" />;
    }
  };

  const getStatusColor = (status?: string) => {
    if (!status) return 'bg-gray-100 text-gray-700';
    const statusLower = status.toLowerCase();
    if (statusLower.includes('approved') || statusLower.includes('active') || statusLower.includes('enabled')) {
      return 'bg-green-100 text-green-700';
    }
    if (statusLower.includes('pending') || statusLower.includes('submitted')) {
      return 'bg-yellow-100 text-yellow-700';
    }
    if (statusLower.includes('rejected') || statusLower.includes('inactive') || statusLower.includes('disabled')) {
      return 'bg-red-100 text-red-700';
    }
    return 'bg-gray-100 text-gray-700';
  };

  // Get available tabs based on user role
  const getAvailableTabs = () => {
    const allTabs = [
      { key: 'all', label: 'All Results' },
      { key: 'users', label: 'Users' },
      { key: 'timesheets', label: 'Timesheets' },
      { key: 'requests', label: 'Requests' },
      { key: 'leaves', label: 'Leaves' }
    ];

    if (isEmployee) {
      // Employees can only see their own data, but we still show the tabs
      // The filtering will be applied in the search logic
      return allTabs;
    }

    return allTabs;
  };

  if (!userRole) {
    return (
      <div className="p-6 flex justify-center items-center min-h-[400px]">
        <div className="animate-spin inline-block w-6 h-6 border-2 border-[#810100] border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-semibold text-[#1B1717] mb-6">Search Results</h1>

        {/* Role Info Banner */}
        {isEmployee && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
            <Briefcase className="w-4 h-4 inline mr-2" />
            You're searching within your personal data only. Results are limited to your own records.
          </div>
        )}

        {/* Search Form */}
        <form onSubmit={handleSearch} className="mb-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <input
                type="text"
                value={queryText}
                onChange={(e) => setQueryText(e.target.value)}
                placeholder={isEmployee 
                  ? "Search your attendance, requests, leaves, and profile..." 
                  : "Search users, timesheets, requests, leaves..."}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-[#810100] focus:ring-1 focus:ring-[#810100]"
              />
            </div>
            <button
              type="submit"
              className="bg-[#810100] text-white px-6 py-3 rounded-lg hover:bg-[#630000] transition-colors flex items-center gap-2"
            >
              <Search className="w-5 h-5" />
              Search
            </button>
          </div>
        </form>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b border-gray-200 overflow-x-auto">
          {getAvailableTabs().map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors whitespace-nowrap ${
                activeTab === tab.key
                  ? 'bg-[#810100] text-white'
                  : 'text-gray-600 hover:text-[#810100] hover:bg-gray-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Results */}
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin inline-block w-6 h-6 border-2 border-[#810100] border-t-transparent rounded-full"></div>
              <p className="mt-2 text-gray-600">Searching...</p>
            </div>
          ) : results.length === 0 ? (
            <div className="text-center py-8">
              <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No results found for "{queryText}"</p>
              {isEmployee && (
                <p className="text-sm text-gray-400 mt-2">
                  Try searching for your attendance records or leave requests.
                </p>
              )}
            </div>
          ) : (
            results.map((result) => (
              <div
                key={`${result.type}-${result.id}`}
                className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-[#EDEBDD] rounded-lg text-[#630000]">
                    {getIcon(result.type)}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-[#1B1717] mb-1">{result.title}</h3>
                    <p className="text-sm text-gray-600 mb-2">{result.subtitle}</p>
                    <div className="flex items-center gap-2">
                      {result.status && (
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(result.status)}`}>
                          {result.status}
                        </span>
                      )}
                      {result.date && (
                        <span className="text-xs text-gray-500">{result.date}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Results Count */}
        {!loading && results.length > 0 && (
          <div className="mt-6 text-sm text-gray-600 text-center">
            Found {results.length} result{results.length !== 1 ? 's' : ''} for "{queryText}"
            {isEmployee && " in your personal records"}
          </div>
        )}
      </div>
    </div>
  );
}