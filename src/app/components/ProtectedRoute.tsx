import React, { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router';
import { auth, db } from '../../config/firebaseSetup';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { collection, query, where, getDocs, doc, getDoc, limit } from 'firebase/firestore';

export type AppRole = 'admin' | 'hr' | 'supervisor' | 'employee' | 'ess' | '';

export const MANAGEMENT_ROLES: AppRole[] = ['admin', 'hr', 'supervisor'];

interface ProtectedRouteProps {
  allowedRoles: string[];
}

interface Access {
  role: AppRole;
  disabled: boolean;
}

// Nested ProtectedRoutes (e.g. /app → /app/admin) share one lookup per login
// instead of re-reading Firestore on every navigation.
const accessCache = new Map<string, Promise<Access>>();

async function loadAccess(user: User): Promise<Access> {
  // Primary: users/{uid} — this is also what firestore.rules trusts.
  let snap = await getDoc(doc(db, 'users', user.uid));
  let data = snap.exists() ? snap.data() : null;

  // Legacy fallback: older accounts whose users doc id isn't the uid.
  if (!data && user.email) {
    const legacy = await getDocs(
      query(collection(db, 'users'), where('email', '==', user.email), limit(1))
    );
    data = legacy.empty ? null : legacy.docs[0].data();
  }

  return {
    role: String(data?.role || '').toLowerCase().trim() as AppRole,
    disabled: String(data?.status || '').toLowerCase() === 'disabled',
  };
}

export function getAccess(user: User): Promise<Access> {
  if (!accessCache.has(user.uid)) {
    accessCache.set(user.uid, loadAccess(user).catch((err) => {
      accessCache.delete(user.uid); // don't cache failures
      throw err;
    }));
  }
  return accessCache.get(user.uid)!;
}

export function homeForRole(role: string): string {
  if (MANAGEMENT_ROLES.includes(role as AppRole)) return '/app';
  if (role === 'employee' || role === 'ess') return '/portal';
  return '/';
}

/**
 * UI gatekeeper. It decides what the user SEES — the real enforcement is in
 * firestore.rules, because anyone can bypass client-side code.
 */
const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles }) => {
  const location = useLocation();
  const [state, setState] = useState<{ status: 'loading' | 'allowed' | 'denied'; role: string }>({
    status: 'loading',
    role: '',
  });
  const allowedKey = allowedRoles.map((r) => r.toLowerCase()).join(',');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        accessCache.clear();
        setState({ status: 'denied', role: '' });
        return;
      }

      try {
        const { role, disabled } = await getAccess(user);
        if (disabled) {
          await signOut(auth);
          return;
        }
        setState({ status: allowedKey.split(',').includes(role) ? 'allowed' : 'denied', role });
      } catch (error) {
        console.error('Error fetching user role:', error);
        setState({ status: 'denied', role: '' });
      }
    });

    return () => unsubscribe();
  }, [allowedKey]);

  if (state.status === 'loading') {
    return (
      <div className="flex justify-center items-center h-screen bg-[#F5F5F5]" role="status" aria-label="Checking access">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-[#810100] border-t-transparent"></div>
      </div>
    );
  }

  if (state.status === 'denied') {
    const home = homeForRole(state.role);
    // e.g. supervisor on /app/admin → /app; employee on /app → /portal.
    // If they're already on their home and still denied, fall back to login.
    const target = location.pathname === home ? '/' : home;
    return <Navigate to={target} replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
