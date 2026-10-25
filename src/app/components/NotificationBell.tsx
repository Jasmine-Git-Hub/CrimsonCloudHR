import React, { useState, useEffect, useRef } from 'react';
import { Bell, Megaphone, Info, Clock, CheckCircle2 } from 'lucide-react';
import { auth, db } from '../../config/firebaseSetup';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, onSnapshot, getDoc, doc, limit, or, where } from 'firebase/firestore';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'Announcement' | 'System';
  date: string;
  isRead: boolean;
  employeeId?: string;
}

interface NotificationBellProps {
  onClick: () => void;
}

const NotificationBell: React.FC<NotificationBellProps> = ({ onClick }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 1. Isara ang dropdown kapag nag-click sa labas
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 2. MONITOR AUTH STATE
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserId(user.uid);
      } else {
        setUserId(null);
        setUnreadCount(0);
        setNotifications([]);
      }
    });
    return () => unsubscribeAuth();
  }, []);

  // 3. FETCH DATA PARA SA DROPDOWN PREVIEW
  useEffect(() => {
    if (!userId) return;

    let unsubscribeNotifs: () => void;

    const setupListener = async () => {
      try {
        const userDoc = await getDoc(doc(db, 'users', userId));
        const empId = userDoc.exists() ? (userDoc.data().employeeId || 'TBA') : 'TBA';

        // Must match firestore.rules: only announcements + my own notifications.
        // (Sorted client-side; OR + orderBy would need extra composite indexes.)
        const q = query(
          collection(db, 'notifications'),
          or(where('type', '==', 'Announcement'), where('employeeId', '==', empId)),
          limit(10) // Kukunin lang yung top 10 para mabilis sa dropdown
        );
        
        unsubscribeNotifs = onSnapshot(q, (snapshot) => {
          let count = 0;
          const notifsList: Notification[] = [];

          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const isForUser = data.type === 'Announcement' || data.employeeId === empId;
            
            if (isForUser) {
              if (data.isRead === false) count++;
              notifsList.push({ id: docSnap.id, ...data } as Notification);
            }
          });
          
          notifsList.sort((a: any, b: any) => String(b.date).localeCompare(String(a.date)));
          setUnreadCount(count);
          setNotifications(notifsList);
        });

      } catch (err) {
        console.error("Bell setup error:", err);
      }
    };

    setupListener();
    return () => { if (unsubscribeNotifs) unsubscribeNotifs(); };
  }, [userId]);

  // Kapag may pinindot sa loob ng dropdown, isasara ito at magna-navigate
  const handleItemClick = () => {
    setIsOpen(false);
    onClick(); // Ito yung magti-trigger ng navigation na galing sa Header.tsx
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* BELL BUTTON */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`relative p-3 rounded-2xl transition-all shadow-inner active:scale-90 group ${
          isOpen ? 'bg-[#810100] text-white' : 'bg-[#fce8e8] text-[#810100] hover:bg-[#f5d5d5]'
        }`}
        title="Notifications"
      >
        <Bell className="w-5 h-5 group-hover:rotate-12 transition-transform" />
        
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-6 h-6 bg-red-600 text-white text-[10px] font-black rounded-full border-2 border-white animate-pulse flex items-center justify-center shadow-sm">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* DROPDOWN MENU */}
      {isOpen && (
        <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden z-[999] animate-in slide-in-from-top-2 duration-200">
          
          {/* Dropdown Header */}
          <div className="bg-[#810100] p-4 flex justify-between items-center text-white">
            <h3 className="font-black uppercase tracking-widest text-sm">Notifications</h3>
            <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs font-bold">{unreadCount} New</span>
          </div>

          {/* Dropdown List */}
          <div className="max-h-[60vh] overflow-y-auto divide-y divide-gray-50">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                <CheckCircle2 className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p className="text-xs font-black uppercase tracking-widest">No notifications yet</p>
              </div>
            ) : (
              notifications.slice(0, 5).map((notif) => ( // Pinapakita lang ang top 5 sa preview
                <div 
                  key={notif.id} 
                  onClick={handleItemClick}
                  className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors flex gap-4 ${
                    !notif.isRead ? 'bg-[#fce8e8]/30' : ''
                  }`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-white shadow-sm ${
                    notif.type === 'Announcement' ? 'bg-blue-600' : 'bg-[#810100]'
                  }`}>
                    {notif.type === 'Announcement' ? <Megaphone className="w-5 h-5"/> : <Info className="w-5 h-5"/>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm line-clamp-2 leading-snug ${!notif.isRead ? 'font-bold text-[#1B1717]' : 'font-medium text-gray-600'}`}>
                      {notif.title}
                    </p>
                    <p className="text-[10px] text-gray-400 font-bold mt-1 flex items-center gap-1 uppercase tracking-widest">
                      <Clock className="w-3 h-3"/> {notif.date.split('T')[0]}
                    </p>
                  </div>
                  {!notif.isRead && (
                    <div className="w-2 h-2 bg-red-600 rounded-full mt-2 shrink-0"></div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Dropdown Footer */}
          {notifications.length > 0 && (
            <div className="p-3 bg-gray-50 border-t border-gray-100">
              <button 
                onClick={handleItemClick}
                className="w-full py-2.5 text-[#810100] text-xs font-black uppercase tracking-widest hover:bg-[#fce8e8] rounded-xl transition-colors"
              >
                View All in Inbox
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationBell;