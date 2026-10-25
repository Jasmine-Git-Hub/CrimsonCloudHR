import React, { useState, useEffect } from 'react';
import { Bell, Megaphone, Info, Clock, CheckCircle2, X } from 'lucide-react';
import { auth, db } from '../../../config/firebaseSetup';
import { onAuthStateChanged } from 'firebase/auth';
import { 
  collection, query, onSnapshot, doc, 
  getDoc, updateDoc, limit, or, where
} from 'firebase/firestore';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'Announcement' | 'System';
  date: string;
  isRead: boolean;
  employeeId?: string;
}

const Notifications: React.FC = () => {
  // 🟢 1. I-set agad sa TRUE ang loading at kunin agad ang current user kung meron na
  const [loading, setLoading] = useState(true); 
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [employeeId, setEmployeeId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(auth.currentUser?.uid || null);

  const [selectedNotif, setSelectedNotif] = useState<Notification | null>(null);
  const [showModal, setShowModal] = useState(false);

  // 2. MONITOR AUTH STATE (Backup lang kung sakaling na-delay ang auth)
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserId(user.uid);
      } else {
        setUserId(null);
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // 3. FETCH EMPLOYEE ID & LISTEN TO NOTIFICATIONS
  useEffect(() => {
    if (!userId) return;

    let unsubscribeNotifs: () => void;

    const setupData = async () => {
      try {
        const userDoc = await getDoc(doc(db, 'users', userId));
        const empId = userDoc.exists() ? (userDoc.data().employeeId || 'TBA') : 'TBA';
        setEmployeeId(empId);

        // Must match firestore.rules: only announcements + my own notifications.
        // (Sorted client-side; OR + orderBy would need extra composite indexes.)
        const q = query(
          collection(db, 'notifications'),
          or(where('type', '==', 'Announcement'), where('employeeId', '==', empId)),
          limit(50)
        );

        unsubscribeNotifs = onSnapshot(q, (snapshot) => {
          const list: Notification[] = [];
          snapshot.forEach((doc) => {
            const data = doc.data();
            if (data.type === 'Announcement' || data.employeeId === empId) {
              list.push({ id: doc.id, ...data } as Notification);
            }
          });
          list.sort((a: any, b: any) => String(b.date).localeCompare(String(a.date)));
          setNotifications(list);
          setLoading(false); // 🟢 Dito lang iseset sa false kapag hawak na ang data
        }, (error) => {
          console.error("Firestore error:", error);
          setLoading(false);
        });

      } catch (err) {
        console.error("Setup error:", err);
        setLoading(false);
      }
    };

    setupData();
    return () => { if (unsubscribeNotifs) unsubscribeNotifs(); };
  }, [userId]);

  const handleNotifClick = async (notif: Notification) => {
    setSelectedNotif(notif);
    setShowModal(true);

    if (!notif.isRead) {
      try {
        await updateDoc(doc(db, 'notifications', notif.id), { isRead: true });
      } catch (error) {
        console.error("Failed to mark as read:", error);
      }
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-4xl mx-auto">
      
      {/* HEADER */}
      <div className="flex justify-between items-center border-b border-gray-100 pb-6">
        <div>
          <h1 className="text-3xl font-black text-[#1B1717] uppercase tracking-tight italic">Inbox</h1>
          <p className="text-sm text-gray-500 font-bold font-mono">
            {loading ? "CHECKING MESSAGES..." : `${notifications.filter(n => !n.isRead).length} NEW MESSAGES`}
          </p>
        </div>
        <div className="bg-[#fce8e8] p-4 rounded-2xl text-[#810100] relative shadow-sm">
          <Bell className="w-7 h-7" />
          {(!loading && notifications.some(n => !n.isRead)) && (
            <span className="absolute top-3 right-3 w-3 h-3 bg-red-600 rounded-full border-2 border-white animate-pulse"></span>
          )}
        </div>
      </div>

      {/* 🟢 LIST CONTENT WITH SKELETON LOADER (Para walang blink) */}
      {loading ? (
        <div className="space-y-4">
          {/* SKELETON CARDS (Nag-a-animate pulse habang naglo-load) */}
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-6 rounded-2xl border-2 border-transparent bg-stone-50 flex gap-5 animate-pulse">
              <div className="w-14 h-14 rounded-2xl bg-stone-200 shrink-0"></div>
              <div className="flex-1 space-y-3 py-1">
                <div className="flex justify-between">
                   <div className="w-20 h-4 bg-stone-200 rounded"></div>
                   <div className="w-16 h-3 bg-stone-200 rounded"></div>
                </div>
                <div className="w-2/3 h-5 bg-stone-200 rounded"></div>
                <div className="w-full h-4 bg-stone-200 rounded"></div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-4 animate-in fade-in duration-300">
          {notifications.length === 0 ? (
            <div className="text-center py-24 bg-white rounded-3xl border-2 border-dashed border-gray-100">
              <CheckCircle2 className="text-gray-200 w-12 h-12 mx-auto mb-4" />
              <p className="text-gray-400 font-black uppercase tracking-widest text-xs italic">Inbox is empty</p>
            </div>
          ) : (
            notifications.map((notif) => (
              <div
                key={notif.id}
                onClick={() => handleNotifClick(notif)}
                className={`p-6 rounded-2xl border-2 transition-all cursor-pointer flex gap-5 relative group active:scale-[0.98] ${
                  notif.isRead
                    ? 'bg-stone-50/50 border-transparent opacity-60'
                    : 'bg-white border-[#810100]/10 shadow-xl shadow-[#810100]/5'
                }`}
              >
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${
                  notif.type === 'Announcement' ? 'bg-blue-600' : 'bg-[#810100]'
                } text-white`}>
                  {notif.type === 'Announcement' ? <Megaphone className="w-6 h-6"/> : <Info className="w-6 h-6"/>}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-1">
                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded tracking-tighter ${
                      notif.type === 'Announcement' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {notif.type}
                    </span>
                    <div className="flex items-center gap-1 text-[10px] font-bold text-gray-400 font-mono italic">
                      <Clock className="w-3 h-3"/> {notif.date}
                    </div>
                  </div>
                  <h3 className={`font-black text-lg leading-tight truncate ${notif.isRead ? 'text-gray-600' : 'text-[#1B1717]'}`}>
                    {notif.title}
                  </h3>
                  <p className={`text-sm mt-1 line-clamp-1 ${notif.isRead ? 'text-gray-400' : 'text-gray-600 font-medium italic'}`}>
                    {notif.message}
                  </p>
                </div>

                {!notif.isRead && (
                  <div className="w-2.5 h-2.5 bg-red-600 rounded-full mt-2 self-start shadow-sm shadow-red-500"></div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* VIEW MODAL */}
      {showModal && selectedNotif && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[999] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in duration-200">
            <div className={`p-8 flex justify-between items-center text-white ${
              selectedNotif.type === 'Announcement' ? 'bg-blue-600' : 'bg-[#810100]'
            }`}>
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/20 rounded-2xl">
                  {selectedNotif.type === 'Announcement' ? <Megaphone className="w-6 h-6"/> : <Info className="w-6 h-6"/>}
                </div>
                <h2 className="text-xl font-black uppercase tracking-tight italic">Message Details</h2>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="hover:rotate-90 transition-transform bg-white/20 p-2 rounded-full"
              >
                <X className="w-6 h-6"/>
              </button>
            </div>

            <div className="p-10 space-y-6">
              <div className="flex items-center gap-2 text-xs font-black text-gray-400 uppercase tracking-widest italic">
                <Clock className="w-4 h-4"/> Date Sent: {selectedNotif.date}
              </div>
              <h3 className="text-3xl font-black text-[#1B1717] leading-tight">{selectedNotif.title}</h3>
              <div className="bg-stone-50 p-8 rounded-3xl border border-stone-100">
                <p className="text-gray-700 whitespace-pre-wrap leading-relaxed font-medium text-lg italic">
                  {selectedNotif.message}
                </p>
              </div>
            </div>

            <div className="p-8 bg-stone-50 border-t flex justify-end">
              <button
                onClick={() => setShowModal(false)}
                className="w-full py-4 bg-[#1B1717] text-white rounded-2xl font-black uppercase text-sm tracking-widest hover:bg-black transition-all shadow-lg active:scale-95 italic"
              >
                Close Inbox
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Notifications;