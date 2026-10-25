import { useState, useEffect } from "react";
import ClaimAccount from '../components/ClaimAccount';
import { useNavigate } from "react-router";
import { Linkedin, Facebook, Twitter, Youtube } from "lucide-react";
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { 
  doc, 
  updateDoc, 
  getDocs, 
  collection, 
  query, 
  where, 
  Timestamp,
  getDoc,
  limit
} from "firebase/firestore";
import { auth, db } from "../../config/firebaseSetup";
import crimsonLogo from "../../assets/crimson.png";
import { logAuditActivity } from "../../utils/auditLogger";
import { homeForRole } from "../components/ProtectedRoute";

export default function Login() {
  const navigate = useNavigate();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [logoError, setLogoError] = useState(false);
  
  
  const [isClaimingAccount, setIsClaimingAccount] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const cleanEmail = email.trim().toLowerCase();

    try {
      // 1️⃣ AUTHENTICATE FIRST. Reading `users` before sign-in would force the
      // whole collection to be public. Firebase Auth already throttles brute
      // force (auth/too-many-requests), replacing the old client-side lockout.
      let uid: string;
      try {
        const userCredential = await signInWithEmailAndPassword(auth, cleanEmail, password);
        uid = userCredential.user.uid;
      } catch (authError: any) {
        console.error("Firebase Auth Error:", authError.code);
        if (authError.code === 'auth/too-many-requests') {
          setError("Too many failed attempts. Please wait a few minutes or reset your password.");
        } else {
          // Same message for wrong email or password → no account enumeration.
          setError("Invalid email or password.");
        }
        setLoading(false);
        return;
      }

      // 2️⃣ LOAD THE HR PROFILE (now permitted by firestore.rules)
      let userDocRef = doc(db, "users", uid);
      let userSnap = await getDoc(userDocRef);
      if (!userSnap.exists()) {
        const legacy = await getDocs(query(collection(db, "users"), where("email", "==", cleanEmail), limit(1)));
        if (!legacy.empty) {
          userDocRef = legacy.docs[0].ref;
          userSnap = legacy.docs[0];
        }
      }

      if (!userSnap.exists()) {
        await signOut(auth);
        setError("No HR profile is linked to this account. Please contact HR.");
        setLoading(false);
        return;
      }

      const userData: any = userSnap.data();
      const userId = userData.employeeId || uid;
      const role = String(userData.role || "").toLowerCase();

      if (String(userData.status || "").toLowerCase() === "disabled") {
        await logAuditActivity({
          action: 'login_failed',
          userId,
          email: cleanEmail,
          employeeId: userData.employeeId,
          role: userData.role,
          status: 'failed',
          failureReason: 'Account disabled',
          userAgent: navigator.userAgent
        });
        await signOut(auth);
        setError("This account has been disabled. Please contact your administrator.");
        setLoading(false);
        return;
      }

      try {
        await updateDoc(userDocRef, { lastLogin: Timestamp.now() });
      } catch (err) {
        console.warn("Could not update lastLogin:", err);
      }

      await logAuditActivity({
        action: 'login_success',
        userId,
        email: cleanEmail,
        employeeId: userData.employeeId,
        role: userData.role,
        status: 'success',
        userAgent: navigator.userAgent
      });

      navigate(homeForRole(role));
    } catch (err: any) {
      console.error("System Error:", err.message);
      setError("An unexpected error occurred. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex relative overflow-hidden">
      <div className="flex-1 flex items-center justify-center bg-white relative z-10 p-8">
        
        {isClaimingAccount ? (
          <ClaimAccount onBackToLogin={() => setIsClaimingAccount(false)} />
        ) : (
          <div className="w-full max-w-md">
            <div className="text-center mb-12">
              <div className="flex flex-col items-center justify-center gap-3 mb-2">
                {!logoError ? (
                  <img 
                    src={crimsonLogo} 
                    alt="CrimsonCloud HR Logo" 
                    className="w-24 h-24 object-contain rounded-xl shadow-sm" 
                    onError={() => setLogoError(true)}
                  />
                ) : (
                  <div className="w-24 h-24 rounded-xl bg-gradient-to-br from-[#810100] to-[#630000] flex items-center justify-center text-white text-3xl font-bold shadow-sm">
                    C
                  </div>
                )}
                <div>
                  <h1 className="text-3xl font-bold">
                    <span className="text-[#810100]">CrimsonCloud</span>
                    <span className="text-[#1B1717]">HR</span>
                  </h1>
                </div>
              </div>
              <p className="text-sm text-[#630000] uppercase tracking-wide font-medium">
                Secure HR Management System
              </p>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg text-sm text-center font-medium animate-pulse">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <h2 className="text-2xl text-center text-[#630000] mb-8 font-semibold">Login</h2>

              <div>
                <label className="block text-sm font-medium text-[#630000] mb-2 items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Work Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-white border-2 border-[#630000]/20 rounded-lg focus:outline-none focus:border-[#810100] text-[#1B1717]"
                  placeholder="admin@crimsoncloud.example"
                  required
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#630000] mb-2 items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                  </svg>
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-white border-2 border-[#630000]/20 rounded-lg focus:outline-none focus:border-[#810100] text-[#1B1717]"
                  placeholder="••••••••••"
                  required
                  disabled={loading}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-[#810100] to-[#630000] text-white py-3 rounded-full hover:shadow-xl active:scale-95 transition-all font-bold tracking-wide disabled:opacity-70 flex justify-center items-center"
              >
                {loading ? "AUTHENTICATING..." : "ACCESS SYSTEM"}
              </button>
            </form>

            <div className="mt-8 text-center border-t border-gray-100 pt-6">
              <p className="text-sm text-gray-500 font-medium mb-3">Are you a newly hired employee?</p>
              <button
                onClick={() => setIsClaimingAccount(true)}
                className="text-xs font-black text-[#810100] hover:text-[#630000] transition-colors uppercase tracking-widest border-b-2 border-[#810100] pb-1"
              >
                Claim Your Account
              </button>
            </div>

            <div className="mt-12 text-center text-xs text-[#1B1717]/60">
              <p>CrimsonCloudHR OS 5.8 (Secure Edition)</p>
              <p className="mt-1">© 2005 - 2026 CrimsonCloudHR. All rights reserved.</p>
            </div>
          </div>
        )}

        {!isClaimingAccount && (
          <div className="absolute bottom-6 left-6 flex gap-3">
            {[Linkedin, Facebook, Twitter, Youtube].map((Icon, idx) => (
              <a key={idx} href="#" className="w-10 h-10 rounded-full bg-[#630000]/10 flex items-center justify-center hover:bg-[#630000]/20 transition-colors">
                <Icon className="w-5 h-5 text-[#630000]" />
              </a>
            ))}
          </div>
        )}
      </div>

      <div className="hidden lg:block w-1/2 relative">
        <div className="absolute inset-0 bg-gradient-to-br from-[#810100] via-[#630000] to-[#810100]">
          <div className="absolute top-0 right-0 w-full h-full">
            <svg className="w-full h-full" viewBox="0 0 800 800" preserveAspectRatio="none">
              <path d="M 0,0 L 800,0 L 800,800 L 200,800 Q 100,400 0,0 Z" fill="url(#gradient)" />
              <defs>
                <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#810100" />
                  <stop offset="50%" stopColor="#630000" />
                  <stop offset="100%" stopColor="#810100" />
                </linearGradient>
              </defs>
            </svg>
          </div>
          
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative">
              <div className="w-64 h-64 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
                <div className="w-48 h-48 rounded-full bg-white flex items-center justify-center shadow-2xl p-6 overflow-hidden">
                  {!logoError ? (
                    <img 
                      src={crimsonLogo} 
                      alt="CrimsonCloud HR Logo" 
                      className="w-full h-full object-contain" 
                      onError={() => setLogoError(true)}
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-[#810100] to-[#630000] rounded-full flex items-center justify-center text-white text-4xl font-bold">
                      C
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}