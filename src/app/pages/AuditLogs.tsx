import React, { useState, useEffect } from 'react';
import { Shield, Clock, User, Mail, Activity, LogIn, LogOut, AlertCircle } from 'lucide-react';
import { auth, db } from '../../config/firebaseSetup';
import { collection, query, orderBy, onSnapshot, where, Timestamp } from 'firebase/firestore';

interface AuditLog {
  id: string;
  timestamp: string | Timestamp;
  action: string;
  userId: string;
  email: string;
  employeeId?: string;
  role?: string;
  ipAddress?: string;
  userAgent?: string;
  status?: 'success' | 'failed';
  failureReason?: string;
}

const AuditLogs: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [dateRange, setDateRange] = useState('7days');

  useEffect(() => {
    // Create a query to get audit logs from Firestore
    let logsQuery = query(
      collection(db, 'audit_logs'),
      orderBy('timestamp', 'desc')
    );

    // Apply date range filter
    const now = new Date();
    let startDate: Date;
    
    switch (dateRange) {
      case 'today':
        startDate = new Date(now.setHours(0, 0, 0, 0));
        break;
      case 'yesterday':
        startDate = new Date(now.setDate(now.getDate() - 1));
        startDate.setHours(0, 0, 0, 0);
        break;
      case '7days':
        startDate = new Date(now.setDate(now.getDate() - 7));
        break;
      case '30days':
        startDate = new Date(now.setDate(now.getDate() - 30));
        break;
      default:
        startDate = new Date(0);
    }

    // If not 'all', add where clause for timestamp
    if (dateRange !== 'all') {
      logsQuery = query(
        collection(db, 'audit_logs'),
        where('timestamp', '>=', Timestamp.fromDate(startDate)),
        orderBy('timestamp', 'desc')
      );
    }

    const unsubscribe = onSnapshot(logsQuery, 
      (snapshot) => {
        const logsData: AuditLog[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          logsData.push({ 
            id: doc.id, 
            ...data,
            timestamp: data.timestamp
          } as AuditLog);
        });
        setLogs(logsData);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching audit logs:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [dateRange]);

  const filteredLogs = logs.filter(log => {
    if (filter === 'all') return true;
    if (filter === 'login') {
      return log.action.toLowerCase().includes('login') || 
             log.action.toLowerCase().includes('sign in');
    }
    if (filter === 'logout') {
      return log.action.toLowerCase().includes('logout') || 
             log.action.toLowerCase().includes('sign out');
    }
    if (filter === 'failed') {
      return log.status === 'failed' || 
             log.action.toLowerCase().includes('failed');
    }
    return log.action.toLowerCase().includes(filter.toLowerCase());
  });

  const formatTimestamp = (timestamp: string | Timestamp) => {
    if (!timestamp) return 'N/A';
    
    let date: Date;
    if (timestamp instanceof Timestamp) {
      date = timestamp.toDate();
    } else {
      date = new Date(timestamp);
    }
    
    return date.toLocaleString();
  };

  const getActionIcon = (action: string, status?: string) => {
    if (action.toLowerCase().includes('login') || action.toLowerCase().includes('sign in')) {
      return <LogIn className="w-4 h-4 text-green-600" />;
    }
    if (action.toLowerCase().includes('logout') || action.toLowerCase().includes('sign out')) {
      return <LogOut className="w-4 h-4 text-red-600" />;
    }
    if (status === 'failed' || action.toLowerCase().includes('failed')) {
      return <AlertCircle className="w-4 h-4 text-orange-600" />;
    }
    return <Activity className="w-4 h-4 text-blue-600" />;
  };

  const getActionBadge = (action: string, status?: string) => {
    if (status === 'failed' || action.toLowerCase().includes('failed')) {
      return 'bg-orange-100 text-orange-700';
    }
    if (action.toLowerCase().includes('login') || action.toLowerCase().includes('sign in')) {
      return 'bg-green-100 text-green-700';
    }
    if (action.toLowerCase().includes('logout') || action.toLowerCase().includes('sign out')) {
      return 'bg-red-100 text-red-700';
    }
    return 'bg-blue-100 text-blue-700';
  };

  if (loading) {
    return (
      <div className="p-6 md:p-8 max-w-7xl mx-auto">
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#810100]"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-[#1B1717] tracking-tight uppercase">Audit Logs</h1>
          <p className="text-sm text-gray-500 font-medium">Monitor user login activities and system access</p>
        </div>
        <div className="flex gap-3">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#810100] focus:border-transparent text-sm"
          >
            <option value="today">Today</option>
            <option value="yesterday">Yesterday</option>
            <option value="7days">Last 7 Days</option>
            <option value="30days">Last 30 Days</option>
            <option value="all">All Time</option>
          </select>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#810100] focus:border-transparent text-sm"
          >
            <option value="all">All Activities</option>
            <option value="login">Successful Logins</option>
            <option value="logout">Logouts</option>
            <option value="failed">Failed Attempts</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
          <h2 className="text-lg font-bold text-[#1B1717] flex items-center gap-2">
            <Shield className="w-5 h-5 text-[#810100]" />
            Login Activity Log
            <span className="ml-2 px-2 py-1 bg-gray-100 rounded-full text-xs font-medium">
              {filteredLogs.length} {filteredLogs.length === 1 ? 'record' : 'records'}
            </span>
          </h2>
        </div>

        <div className="max-h-[600px] overflow-y-auto">
          {filteredLogs.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <Activity className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p className="font-medium">No audit logs found</p>
              <p className="text-sm mt-1">Try adjusting your filters or date range</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredLogs.map((log) => (
                <div key={log.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        {getActionIcon(log.action, log.status)}
                        <span className="text-xs text-gray-500 font-mono">
                          {formatTimestamp(log.timestamp)}
                        </span>
                        <span className={`px-2 py-1 text-xs font-bold rounded-full ${getActionBadge(log.action, log.status)}`}>
                          {log.status === 'failed' ? 'FAILED' : log.action.toUpperCase()}
                        </span>
                        {log.status === 'failed' && log.failureReason && (
                          <span className="text-xs text-orange-600">
                            ({log.failureReason})
                          </span>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-gray-400" />
                          <span className="font-medium text-gray-900">{log.email}</span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-600">
                            {log.employeeId ? `ID: ${log.employeeId}` : 'User ID: ' + log.userId?.substring(0, 8)}
                          </span>
                        </div>
                        
                        {log.role && (
                          <div className="flex items-center gap-2">
                            <Shield className="w-4 h-4 text-gray-400" />
                            <span className="capitalize text-gray-600">{log.role}</span>
                          </div>
                        )}
                      </div>
                      
                      {(log.ipAddress || log.userAgent) && (
                        <div className="mt-3 pt-2 border-t border-gray-100 text-xs text-gray-500">
                          {log.ipAddress && (
                            <span className="inline-flex items-center gap-1 mr-4">
                              <span>🌐 IP: {log.ipAddress}</span>
                            </span>
                          )}
                          {log.userAgent && (
                            <span className="inline-flex items-center gap-1">
                              <span>💻 {log.userAgent.substring(0, 100)}</span>
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuditLogs;