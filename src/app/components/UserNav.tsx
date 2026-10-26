import { useEffect, useState } from "react";
import { auth, db } from "../../config/firebaseSetup";
import { signOut, updatePassword, EmailAuthProvider, reauthenticateWithCredential, sendPasswordResetEmail } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useNavigate } from "react-router";
import { LogOut, User, Settings, ChevronDown, Key, X, Mail } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";

export default function UserNav() {
  const navigate = useNavigate();
  const [user, setUser] = useState(auth.currentUser);
  const [role, setRole] = useState<string | null>(null);
  const [employeeId, setEmployeeId] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [resetStatus, setResetStatus] = useState<"" | "sending" | "sent" | "error">("");
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordError, setPasswordError] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // Kunin ang role para alam kung saan ituturo ang "Profile" button
        const userDoc = await getDoc(doc(db, "users", currentUser.uid));
        if (userDoc.exists()) {
          setRole(String(userDoc.data().role || "").toLowerCase());
          setEmployeeId(userDoc.data().employeeId || "");
        }
      }
    });
    return unsubscribe;
  }, []);

  const displayName = user?.displayName || user?.email?.split("@")[0] || "User";

  /**
   * PASSWORD VALIDATION FUNCTION
   * Requires: 8+ chars, uppercase, lowercase, number, special char
   */
  const validatePassword = (password: string): { isValid: boolean; message: string } => {
    if (!password || password.length < 8) {
      return { isValid: false, message: "Password must be at least 8 characters long." };
    }
    if (!/[A-Z]/.test(password)) {
      return { isValid: false, message: "Password must contain at least one uppercase letter." };
    }
    if (!/[a-z]/.test(password)) {
      return { isValid: false, message: "Password must contain at least one lowercase letter." };
    }
    if (!/\d/.test(password)) {
      return { isValid: false, message: "Password must contain at least one number." };
    }
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      return { isValid: false, message: "Password must contain at least one special character." };
    }
    return { isValid: true, message: "Password is strong!" };
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const handleProfileClick = () => {
    if (role === 'employee' || role === 'ess') {
      navigate("/portal");
    } else {
      navigate("/app/my-info");
    }
  };

  const handleSendReset = async () => {
    if (!user?.email) return;
    try {
      setResetStatus("sending");
      await sendPasswordResetEmail(auth, user.email);
      setResetStatus("sent");
    } catch (error) {
      console.error("Password reset email failed:", error);
      setResetStatus("error");
    }
  };

  const formatDate = (value?: string) => (value ? new Date(value).toLocaleString("en-PH") : "—");

  const handleChangePassword = async () => {
    if (!user) return;
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      setPasswordError("All fields are required");
      return;
    }
    const strength = validatePassword(passwordData.newPassword);
    if (!strength.isValid) {
      setPasswordError(strength.message);
      return;
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError("New passwords do not match");
      return;
    }

    try {
      setPasswordLoading(true);
      setPasswordError("");
      const credential = EmailAuthProvider.credential(user.email!, passwordData.currentPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, passwordData.newPassword);
      setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setShowChangePassword(false);
      alert("Password changed successfully!");
    } catch (error: any) {
      console.error("Password change error:", error);
      if (error.code === 'auth/wrong-password') setPasswordError("Current password is incorrect");
      else if (error.code === 'auth/weak-password') setPasswordError("New password is too weak");
      else setPasswordError("Failed to change password: " + error.message);
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {/* TAMA NA ANG KULAY: Gray outline, Dark Text, Walang Initial */}
        <button className="flex items-center gap-2 outline-none px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
          <User className="w-4 h-4 text-[#810100]" />
          <span className="text-sm font-bold text-[#1B1717] max-w-[150px] truncate block">
            {displayName}
          </span>
          <ChevronDown className="w-4 h-4 text-gray-500" />
        </button>
      </DropdownMenuTrigger>

      {/* 🟢 FIX: Dinagdag ang bg-white, z-[100], at shadow-xl para hindi maging transparent */}
      <DropdownMenuContent className="w-56 bg-white z-[100] shadow-xl border border-gray-200 rounded-xl p-1" align="end">
        <DropdownMenuLabel className="font-bold text-gray-500 text-xs uppercase tracking-widest px-2 py-2">My Account</DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-gray-100 my-1" />
        
        <DropdownMenuItem onClick={() => { setResetStatus(""); setShowSettings(true); }} className="cursor-pointer hover:bg-gray-50 rounded-lg px-2 py-2 transition-colors">
          <Settings className="mr-2 h-4 w-4 text-gray-600" /> <span className="font-medium text-gray-800">Settings</span>
        </DropdownMenuItem>
        
        <DropdownMenuSeparator className="bg-gray-100 my-1" />
        
        <DropdownMenuItem onClick={handleLogout} className="cursor-pointer hover:bg-red-50 rounded-lg px-2 py-2 transition-colors text-red-600 group">
          <LogOut className="mr-2 h-4 w-4 group-hover:text-red-700" />
          <span className="font-bold group-hover:text-red-700">Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>

      {/* Account Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[999]" onClick={() => setShowSettings(false)}>
          <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl animate-in zoom-in duration-200" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-black text-[#1B1717] uppercase tracking-tight">Account Settings</h2>
              <button onClick={() => setShowSettings(false)} className="p-2 hover:bg-gray-100 rounded-full" aria-label="Close"><X className="w-5 h-5" /></button>
            </div>

            <dl className="space-y-3 bg-gray-50 p-5 rounded-2xl border border-gray-100 text-sm">
              {[
                ["Email", user?.email || "—"],
                ["Role", role ? role.toUpperCase() : "—"],
                ["Employee ID", employeeId || "—"],
                ["Last sign-in", formatDate(user?.metadata.lastSignInTime)],
                ["Account created", formatDate(user?.metadata.creationTime)],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between gap-4">
                  <dt className="text-[10px] font-black text-gray-400 uppercase tracking-widest pt-0.5">{label}</dt>
                  <dd className="font-bold text-[#1B1717] text-right break-all">{value}</dd>
                </div>
              ))}
            </dl>

            <div className="space-y-3 mt-6">
              <button
                onClick={() => { setShowSettings(false); handleProfileClick(); }}
                className="w-full flex items-center gap-3 px-4 py-3 border-2 border-gray-100 rounded-xl hover:bg-gray-50 font-bold text-sm text-[#1B1717] transition-colors"
              >
                <User className="w-4 h-4 text-[#810100]" /> Edit my profile
              </button>
              <button
                onClick={() => { setShowSettings(false); setShowChangePassword(true); }}
                className="w-full flex items-center gap-3 px-4 py-3 border-2 border-gray-100 rounded-xl hover:bg-gray-50 font-bold text-sm text-[#1B1717] transition-colors"
              >
                <Key className="w-4 h-4 text-[#810100]" /> Change password
              </button>
              <button
                onClick={handleSendReset}
                disabled={resetStatus === "sending" || resetStatus === "sent"}
                className="w-full flex items-center gap-3 px-4 py-3 border-2 border-gray-100 rounded-xl hover:bg-gray-50 font-bold text-sm text-[#1B1717] transition-colors disabled:opacity-60"
              >
                <Mail className="w-4 h-4 text-[#810100]" />
                {resetStatus === "sending" ? "Sending..." : resetStatus === "sent" ? "Reset link sent — check your inbox" : "Email me a password reset link"}
              </button>
              {resetStatus === "error" && (
                <p className="text-xs font-bold text-red-600">Couldn't send the email. Please try again later.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {showChangePassword && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[999]">
          <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl animate-in zoom-in duration-200">
            <h2 className="text-2xl font-black text-[#1B1717] mb-6 uppercase tracking-tight">Change Password</h2>
            
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Current Password</label>
                <input autoComplete="new-password"
                  type="password"
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData({...passwordData, currentPassword: e.target.value})}
                  className="w-full px-4 py-3 border-2 border-gray-100 rounded-xl focus:outline-none focus:border-[#810100] font-bold text-sm transition-colors"
                  placeholder="Enter current password"
                />
              </div>
              
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">New Password</label>
                <input autoComplete="new-password"
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
                  className="w-full px-4 py-3 border-2 border-gray-100 rounded-xl focus:outline-none focus:border-[#810100] font-bold text-sm transition-colors"
                  placeholder="Enter new password"
                />
              </div>
              
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Confirm New Password</label>
                <input autoComplete="new-password"
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                  className="w-full px-4 py-3 border-2 border-gray-100 rounded-xl focus:outline-none focus:border-[#810100] font-bold text-sm transition-colors"
                  placeholder="Confirm new password"
                />
              </div>
              
              {passwordError && (
                <div className="text-red-600 text-xs font-black uppercase tracking-widest bg-red-50 p-3 rounded-xl border border-red-100 flex items-center gap-2">
                  <span>⚠️</span> {passwordError}
                </div>
              )}

              {/* Password Requirements */}
              <div className="bg-gray-50 p-3 rounded-md border border-gray-200">
                <p className="text-xs text-gray-600 font-medium mb-1">Password Requirements:</p>
                <ul className="text-xs text-gray-500 list-disc list-inside space-y-0.5">
                  <li>At least 8 characters long</li>
                  <li>One uppercase letter (A-Z)</li>
                  <li>One lowercase letter (a-z)</li>
                  <li>One number (0-9)</li>
                  <li>One special character (!@#$%^&*)</li>
                </ul>
              </div>
            </div>
            
            <div className="flex gap-3 mt-8">
              <button
                onClick={() => {
                  setShowChangePassword(false);
                  setPasswordError("");
                  setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
                }}
                className="flex-1 px-4 py-3 border-2 border-gray-200 text-gray-600 font-black uppercase text-xs tracking-widest rounded-xl hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleChangePassword}
                disabled={passwordLoading}
                className="flex-1 px-4 py-3 bg-[#810100] font-black uppercase text-xs tracking-widest text-white rounded-xl hover:bg-[#630000] transition-transform active:scale-95 disabled:opacity-50 shadow-lg shadow-[#810100]/20"
              >
                {passwordLoading ? "Changing..." : "Save Password"}
              </button>
            </div>
          </div>
        </div>
      )}
    </DropdownMenu>
  );
}