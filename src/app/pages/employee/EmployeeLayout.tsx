// EmployeeLayout.tsx (enhanced)
import React, { useState } from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../../../config/firebaseSetup';
import toast from 'react-hot-toast';
import NotificationBell from '../../components/NotificationBell';

const EmployeeLayout: React.FC = () => {
  const navigate = useNavigate();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await signOut(auth);
      toast.success('Logged out successfully');
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Failed to log out. Please try again.');
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f3f4f6' }}>
      {/* Sidebar */}
      <aside style={{ width: '250px', backgroundColor: '#1e293b', color: 'white', padding: '20px' }}>
        <h2>My Portal</h2>
        <nav>
          <ul style={{ listStyleType: 'none', padding: 0, lineHeight: '2.5' }}>
            <li><Link to="/portal/profile" style={{ color: '#cbd5e1', textDecoration: 'none' }}>👤 My Profile</Link></li>
            <li><Link to="/portal/attendance" style={{ color: '#cbd5e1', textDecoration: 'none' }}>⏱️ Attendance</Link></li>
            <li><Link to="/portal/leave" style={{ color: '#cbd5e1', textDecoration: 'none' }}>📅 Leave Requests</Link></li>
            <li><Link to="/portal/payroll" style={{ color: '#cbd5e1', textDecoration: 'none' }}>💰 Payslip</Link></li>
            <li><Link to="/portal/training" style={{ color: '#cbd5e1', textDecoration: 'none' }}>🎓 Training</Link></li>
            <li><Link to="/portal/requests" style={{ color: '#cbd5e1', textDecoration: 'none' }}>📋 Requests</Link></li>
            <li><Link to="/portal/notifications" style={{ color: '#cbd5e1', textDecoration: 'none' }}>🔔 Notifications</Link></li>
          </ul>
        </nav>
      </aside>

      <main style={{ flexGrow: 1, padding: '20px' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h1>Employee Portal</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <NotificationBell onClick={() => navigate('/portal/notifications')} />
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              style={{
                padding: '8px 16px',
                cursor: loggingOut ? 'not-allowed' : 'pointer',
                backgroundColor: '#ef4444',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                opacity: loggingOut ? 0.7 : 1,
              }}
            >
              {loggingOut ? 'Logging out...' : 'Logout'}
            </button>
          </div>
        </header>

        <section style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <Outlet />
        </section>
      </main>
    </div>
  );
};

export default EmployeeLayout;