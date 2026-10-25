import { Search, Plus, Edit, Trash2, Loader2, X, Save } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { collection, getDocs, doc, updateDoc, deleteDoc, setDoc } from "firebase/firestore";
import { initializeApp, deleteApp, getApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, signOut, sendPasswordResetEmail } from "firebase/auth";
import { db, auth } from "../../config/firebaseSetup";

interface AdminUser {
  id: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  middleName?: string;
  employeeId?: string;
  department?: string;
  jobTitle?: string;
  email?: string;
  phone?: string;
  status?: "Active" | "On Leave" | "Inactive" | "Enabled" | "Disabled";
  hireDate?: string;
  role?: string;
  username?: string;
  password?: string;
}

export default function Admin() {
  const [showAddUser, setShowAddUser] = useState<boolean>(false);
  const [showEditUser, setShowEditUser] = useState<boolean>(false);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState("");

  // New User Form State
  const [addFormData, setAddFormData] = useState({
    firstName: "",
    lastName: "",
    middleName: "",
    email: "",
    role: "ESS",
    status: "Enabled",
    username: "",
    password: "",
    confirmPassword: "",
  });

  // Edit form state - added employeeId
  const [editFormData, setEditFormData] = useState({
    role: "",
    employeeName: "",
    employeeId: "",
    status: "",
    username: "",
    changePassword: false,
    password: "",
    confirmPassword: "",
  });

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, "users"));
      const fetchedUsers: AdminUser[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const derivedUsername = data.email ? data.email.split('@')[0] : "unknown";
        const firstName = data.firstName || "";
        const lastName = data.lastName || "";
        const middleName = data.middleName || "";
        const fullName = `${firstName} ${middleName} ${lastName}`.trim().replace(/\s+/g, ' ') || "Unknown";
        
        fetchedUsers.push({
          id: doc.id,
          username: data.username || derivedUsername,
          name: fullName,
          firstName, lastName, middleName,
          role: data.role ? data.role.toUpperCase() : "ESS",
          status: data.status || "Active",
          email: data.email || "No Email",
          employeeId: data.employeeId || "",
          ...data
        } as AdminUser);
      });
      setUsers(fetchedUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

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

  /**
   * AUTO-GENERATED ID LOGIC
   * Follows the format: EMP-2026-0001
   */
  const nextEmployeeId = useMemo(() => {
    const year = new Date().getFullYear();
    const prefix = `EMP-${year}-`;
    const idNumbers = users
      .map(u => u.employeeId || "")
      .filter(id => id.startsWith(prefix))
      .map(id => parseInt(id.replace(prefix, ""), 10))
      .filter(num => !isNaN(num));

    const highestId = idNumbers.length > 0 ? Math.max(...idNumbers) : 0;
    return `${prefix}${(highestId + 1).toString().padStart(4, '0')}`;
  }, [users]);

  const filteredUsers = users.filter((user) => 
    (user.name?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
    (user.username?.toLowerCase() || "").includes(searchQuery.toLowerCase()) || 
    (user.email?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
    (user.employeeId?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
    (user.role?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
    (user.status?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
    (user.firstName?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
    (user.lastName?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
    (user.middleName?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
    (user.department?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
    (user.jobTitle?.toLowerCase() || "").includes(searchQuery.toLowerCase())
  );

  // Handle Add User Submission
  const handleSaveNewUser = async () => {
    if (!addFormData.firstName || !addFormData.lastName || !addFormData.email || !addFormData.username) {
      alert("Please fill in all required fields.");
      return;
    }

    // Validate password strength
    const passwordValidation = validatePassword(addFormData.password);
    if (!passwordValidation.isValid) {
      alert(passwordValidation.message);
      return;
    }

    // Check password confirmation
    if (addFormData.password !== addFormData.confirmPassword) {
      alert("Passwords do not match.");
      return;
    }

    try {
      // Create the Firebase Auth account on a throwaway app instance so the
      // admin stays signed in. Passwords live ONLY in Firebase Auth (hashed) —
      // never in Firestore.
      const { password, confirmPassword, ...profile } = addFormData;
      const tempApp = initializeApp(getApp().options, `user-creator-${Date.now()}`);
      let uid: string;
      try {
        const tempAuth = getAuth(tempApp);
        const cred = await createUserWithEmailAndPassword(tempAuth, profile.email.trim().toLowerCase(), password);
        uid = cred.user.uid;
        await signOut(tempAuth);
      } finally {
        await deleteApp(tempApp);
      }

      await setDoc(doc(db, "users", uid), {
        ...profile,
        uid,
        email: profile.email.trim().toLowerCase(),
        role: profile.role.toLowerCase(),
        employeeId: nextEmployeeId,
        createdAt: new Date().toISOString()
      });
      setShowAddUser(false);
      setAddFormData({ firstName: "", lastName: "", middleName: "", email: "", role: "ESS", status: "Enabled", username: "", password: "", confirmPassword: "" });
      fetchUsers();
    } catch (error) {
      console.error("Error adding user:", error);
      alert("Error creating user. Please try again.");
    }
  };

  const handleEditUser = (user: AdminUser) => {
    setSelectedUser(user);
    setEditFormData({
      role: user.role || "ESS",
      employeeName: user.name || "Unknown",
      employeeId: user.employeeId || "",
      status: user.status || "Active",
      username: user.username || "",
      changePassword: false,
      password: "",
      confirmPassword: "",
    });
    setShowEditUser(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedUser) return;
    try {
      const userRef = doc(db, "users", selectedUser.id);
      const updateData: any = {
        role: editFormData.role,
        status: editFormData.status,
        username: editFormData.username,
        employeeId: editFormData.employeeId, // Add employeeId to update
      };

      if (editFormData.changePassword && editFormData.password) {
        if (editFormData.password !== editFormData.confirmPassword) {
          alert("Passwords do not match!"); return;
        }
        // Optional: Validate password strength when changing password
        const passwordValidation = validatePassword(editFormData.password);
        if (!passwordValidation.isValid) {
          alert(passwordValidation.message);
          return;
        }
        // The client SDK can't set another user's password, and storing it in
        // Firestore would leak it. Send them a secure reset link instead.
        if (selectedUser.email) {
          await sendPasswordResetEmail(auth, selectedUser.email);
          alert(`A password reset link was sent to ${selectedUser.email}.`);
        }
      }

      await updateDoc(userRef, updateData);
      setShowEditUser(false);
      fetchUsers();
    } catch (error) {
      console.error("Error updating user:", error);
      alert("Error updating user. Please try again.");
    }
  };

  const handleDeleteUser = async (user: AdminUser) => {
    if (!window.confirm(`Delete user "${user.name}"?`)) return;
    try {
      await deleteDoc(doc(db, "users", user.id));
      fetchUsers();
    } catch (error) {
      console.error("Error deleting user:", error);
    }
  };

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl text-[#1B1717] mb-2">Admin</h1>
          <p className="text-[#1B1717]/60">Manage system users, roles, and configurations</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl text-[#1B1717]">User Management</h2>
            <button onClick={() => setShowAddUser(true)} className="flex items-center gap-2 bg-[#810100] text-white px-4 py-2 rounded-lg hover:bg-[#630000]">
              <Plus className="w-4 h-4" /> Add User
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#1B1717]/40" />
            <input
              type="text"
              placeholder="Search by name, username or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#810100]"
            />
          </div>
        </div>

        <table className="w-full">
          <thead className="bg-[#EDEBDD]">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold">Employee ID</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Name</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Username</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Role</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Status</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="p-8 text-center"><Loader2 className="animate-spin inline text-[#810100]" /></td></tr>
            ) : filteredUsers.map((user) => (
              <tr key={user.id} className="border-t hover:bg-gray-50">
                <td className="px-6 py-4 text-sm font-mono">{user.employeeId || "N/A"}</td>
                <td className="px-6 py-4">{user.name}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{user.username}</td>
                <td className="px-6 py-4"><span className="px-2 py-1 rounded bg-gray-100 text-xs">{user.role}</span></td>
                <td className="px-6 py-4"><span className={`px-2 py-1 rounded text-xs ${(user.status?.toLowerCase().trim() === 'active' || user.status?.toLowerCase().trim() === 'enabled') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{user.status}</span></td>
                <td className="px-6 py-4 flex gap-3">
                  <button onClick={() => handleEditUser(user)}><Edit className="w-4 h-4 text-[#630000]" /></button>
                  <button onClick={() => handleDeleteUser(user)}><Trash2 className="w-4 h-4 text-red-500" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add User Modal (unchanged from your original) */}
      {showAddUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-[#1B1717]">Add User</h3>
              <button onClick={() => setShowAddUser(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-6">
              {/* Employee Information Section */}
              <div>
                <h4 className="text-md font-semibold text-[#1B1717] mb-3 pb-1 border-b border-gray-200">Employee Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      First Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={addFormData.firstName}
                      onChange={(e) => setAddFormData({...addFormData, firstName: e.target.value})}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:border-[#810100] focus:ring-1 focus:ring-[#810100]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Middle Name</label>
                    <input
                      type="text"
                      value={addFormData.middleName}
                      onChange={(e) => setAddFormData({...addFormData, middleName: e.target.value})}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:border-[#810100] focus:ring-1 focus:ring-[#810100]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Last Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={addFormData.lastName}
                      onChange={(e) => setAddFormData({...addFormData, lastName: e.target.value})}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:border-[#810100] focus:ring-1 focus:ring-[#810100]"
                    />
                  </div>
                </div>
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Employee ID</label>
                  <input
                    type="text"
                    value={nextEmployeeId}
                    readOnly
                    className="w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-50 text-gray-600 cursor-not-allowed"
                  />
                  <p className="text-xs text-gray-500 mt-1">Auto-generated based on current year and sequence</p>
                </div>
              </div>

              {/* Account Information Section */}
              <div>
                <h4 className="text-md font-semibold text-[#1B1717] mb-3 pb-1 border-b border-gray-200">Account Information</h4>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Select Role <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={addFormData.role}
                      onChange={(e) => setAddFormData({...addFormData, role: e.target.value})}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:border-[#810100] focus:ring-1 focus:ring-[#810100]"
                    >
                      <option value="ESS">ESS</option>
                      <option value="ADMIN">Admin</option>
                      <option value="MANAGER">Manager</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      value={addFormData.email}
                      onChange={(e) => setAddFormData({...addFormData, email: e.target.value})}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:border-[#810100] focus:ring-1 focus:ring-[#810100]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Username <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={addFormData.username}
                      onChange={(e) => setAddFormData({...addFormData, username: e.target.value})}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:border-[#810100] focus:ring-1 focus:ring-[#810100]"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Password <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="password"
                        value={addFormData.password}
                        onChange={(e) => setAddFormData({...addFormData, password: e.target.value})}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:border-[#810100] focus:ring-1 focus:ring-[#810100]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Confirm Password <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="password"
                        value={addFormData.confirmPassword}
                        onChange={(e) => setAddFormData({...addFormData, confirmPassword: e.target.value})}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:border-[#810100] focus:ring-1 focus:ring-[#810100]"
                      />
                    </div>
                  </div>
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
              </div>

              {/* Account Status Section */}
              <div>
                <h4 className="text-md font-semibold text-[#1B1717] mb-3 pb-1 border-b border-gray-200">Account Status</h4>
                <div className="flex gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="status"
                      value="Enabled"
                      checked={addFormData.status === "Enabled"}
                      onChange={(e) => setAddFormData({...addFormData, status: e.target.value})}
                      className="w-4 h-4 text-[#810100] focus:ring-[#810100]"
                    />
                    <span className="text-green-600 font-medium">Enabled</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="status"
                      value="Disabled"
                      checked={addFormData.status === "Disabled"}
                      onChange={(e) => setAddFormData({...addFormData, status: e.target.value})}
                      className="w-4 h-4 text-[#810100] focus:ring-[#810100]"
                    />
                    <span className="text-red-600 font-medium">Disabled</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-gray-200">
              <button
                onClick={() => setShowAddUser(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveNewUser}
                className="px-4 py-2 bg-[#810100] text-white rounded-md hover:bg-[#630000] transition-colors flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                Save User
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Updated Edit User Modal with Employee ID field */}
      {showEditUser && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-[#1B1717]">Edit User</h3>
              <button onClick={() => setShowEditUser(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Employee Name</label>
                <input 
                  value={editFormData.employeeName} 
                  readOnly 
                  className="w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-50 text-gray-600 cursor-not-allowed" 
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Employee ID</label>
                <input 
                  value={editFormData.employeeId} 
                  onChange={(e) => setEditFormData({...editFormData, employeeId: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:border-[#810100] focus:ring-1 focus:ring-[#810100]"
                  placeholder="Enter Employee ID (e.g., EMP-2026-0001)"
                />
                <p className="text-xs text-gray-500 mt-1">Format: EMP-YYYY-XXXX (YYYY = year, XXXX = sequential number)</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select 
                  value={editFormData.role} 
                  onChange={(e) => setEditFormData({...editFormData, role: e.target.value})} 
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:border-[#810100] focus:ring-1 focus:ring-[#810100]"
                >
                  <option value="ESS">ESS</option>
                  <option value="ADMIN">Admin</option>
                  <option value="MANAGER">Manager</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select 
                  value={editFormData.status} 
                  onChange={(e) => setEditFormData({...editFormData, status: e.target.value})} 
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:border-[#810100] focus:ring-1 focus:ring-[#810100]"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                  <option value="Enabled">Enabled</option>
                  <option value="Disabled">Disabled</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                <input 
                  value={editFormData.username} 
                  onChange={(e) => setEditFormData({...editFormData, username: e.target.value})} 
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:border-[#810100] focus:ring-1 focus:ring-[#810100]" 
                />
              </div>
              
              <div className="flex items-center gap-2">
                <input 
                  type="checkbox" 
                  checked={editFormData.changePassword} 
                  onChange={(e) => setEditFormData({...editFormData, changePassword: e.target.checked})} 
                  id="chg" 
                  className="w-4 h-4 text-[#810100] focus:ring-[#810100]"
                />
                <label htmlFor="chg" className="text-sm text-gray-700">Reset Password?</label>
              </div>
              
              {editFormData.changePassword && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                    <input 
                      type="password" 
                      placeholder="Enter new password"
                      value={editFormData.password}
                      onChange={(e) => setEditFormData({...editFormData, password: e.target.value})} 
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:border-[#810100] focus:ring-1 focus:ring-[#810100]" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                    <input 
                      type="password" 
                      placeholder="Confirm new password"
                      value={editFormData.confirmPassword}
                      onChange={(e) => setEditFormData({...editFormData, confirmPassword: e.target.value})} 
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:border-[#810100] focus:ring-1 focus:ring-[#810100]" 
                    />
                  </div>
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
                </>
              )}
            </div>
            
            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
              <button 
                onClick={() => setShowEditUser(false)} 
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveEdit} 
                className="px-4 py-2 bg-[#810100] text-white rounded-md hover:bg-[#630000] transition-colors flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}