import { 
  User, Mail, Phone, MapPin, Briefcase, Calendar, Shield, Loader2, Edit, Save, X,
  HeartPulse, CreditCard, FileText, Activity
} from "lucide-react";
import { useState, useEffect } from "react";
import { auth, db } from "../../config/firebaseSetup";
import { collection, query, where, getDocs, doc, updateDoc } from "firebase/firestore";

export default function MyInfo() {
  const [user, setUser] = useState<any>(null);
  const [employeeInfo, setEmployeeInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<any>(null);
  const [saveLoading, setSaveLoading] = useState(false);
  const [userDocId, setUserDocId] = useState<string>("");

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
      if (currentUser && currentUser.email) {
        fetchUserData(currentUser.email);
      } else {
        setLoading(false);
        setError("No user is currently logged in");
      }
    });
    return unsubscribe;
  }, []);

  const fetchUserData = async (email: string) => {
    try {
      setLoading(true);
      setError("");
      
      const usersQuery = query(collection(db, "users"), where("email", "==", email));
      const usersSnapshot = await getDocs(usersQuery);
      
      if (!usersSnapshot.empty) {
        const userData = usersSnapshot.docs[0].data();
        setUserDocId(usersSnapshot.docs[0].id);
        mapUserData(userData);
      } else {
        const employeesQuery = query(collection(db, "employees"), where("email", "==", email));
        const employeesSnapshot = await getDocs(employeesQuery);
        
        if (!employeesSnapshot.empty) {
          const employeeData = employeesSnapshot.docs[0].data();
          setUserDocId(employeesSnapshot.docs[0].id);
          mapUserData(employeeData);
        } else {
          setEmployeeInfo(getFallbackData(email));
        }
      }
    } catch (error: any) {
      console.error("Error fetching user data:", error);
      setError("Failed to fetch user data.");
      setEmployeeInfo(getFallbackData(email));
    } finally {
      setLoading(false);
    }
  };

  const mapUserData = (data: any) => {
    setEmployeeInfo({
      name: `${data.firstName || ""} ${data.lastName || ""}`.trim() || data.name || data.username || "Unknown User",
      employeeId: data.employeeId || "N/A",
      role: data.role || data.position || data.jobTitle || "Employee",
      department: data.department || data.subUnit || "General",
      email: data.email,
      phone: data.phone || "Not provided",
      address: data.address || "Not provided",
      hireDate: data.hireDate?.seconds ? new Date(data.hireDate.seconds * 1000).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : (data.hireDate || "Not provided"),
      status: data.status || "Active",
      
      dob: data.dob || "",
      gender: data.gender || "",
      civilStatus: data.civilStatus || "",
      
      emergencyName: data.emergencyName || "",
      emergencyRelation: data.emergencyRelation || "",
      emergencyPhone: data.emergencyPhone || "",

      sss: data.sss || "Not provided",
      philhealth: data.philhealth || "Not provided",
      pagibig: data.pagibig || "Not provided",
      tin: data.tin || "Not provided",
    });
  };

  const getFallbackData = (email: string) => ({
    name: user?.displayName || email.split("@")[0] || "Unknown User",
    employeeId: "N/A", role: "User", department: "Not specified", email: email,
    phone: "Not provided", address: "Not provided", hireDate: "Not provided", status: "Active",
    dob: "", gender: "", civilStatus: "", emergencyName: "", emergencyRelation: "", emergencyPhone: "",
    sss: "Not provided", philhealth: "Not provided", pagibig: "Not provided", tin: "Not provided"
  });

  const handleEdit = () => {
    setIsEditing(true);
    setEditForm({
      phone: employeeInfo.phone !== "Not provided" ? employeeInfo.phone : "",
      address: employeeInfo.address !== "Not provided" ? employeeInfo.address : "",
      dob: employeeInfo.dob,
      gender: employeeInfo.gender,
      civilStatus: employeeInfo.civilStatus,
      emergencyName: employeeInfo.emergencyName,
      emergencyRelation: employeeInfo.emergencyRelation,
      emergencyPhone: employeeInfo.emergencyPhone,
    });
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditForm(null);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setEditForm((prev: any) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    if (!userDocId) return alert("Unable to save: User document not found");

    try {
      setSaveLoading(true);
      const collectionName = userDocId.startsWith('emp_') ? 'employees' : 'users';
      const userRef = doc(db, collectionName, userDocId);
      
      await updateDoc(userRef, editForm);
      
      setEmployeeInfo((prev: any) => ({ ...prev, ...editForm }));
      setIsEditing(false);
      setEditForm(null);
    } catch (error) {
      console.error("Error updating profile:", error);
      alert("Failed to update profile. Please try again.");
    } finally {
      setSaveLoading(false);
    }
  };

  if (loading) return <div className="p-8 flex justify-center min-h-screen"><Loader2 className="w-10 h-10 animate-spin text-[#810100] mt-20" /></div>;
  if (!employeeInfo) return <div className="p-8 text-center text-red-500 min-h-screen mt-20 font-bold">Unable to load profile. Please log in again.</div>;

  return (
    <div className="p-6 md:p-8 space-y-8 bg-[#f8f9fa] min-h-screen max-w-7xl mx-auto">
      
      {/* PAGE HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-[#1B1717] tracking-tight uppercase">My Information</h1>
          <p className="text-gray-500 font-medium mt-1">View and manage your personal and employment details</p>
        </div>
        {!isEditing ? (
          <button onClick={handleEdit} className="flex items-center gap-2 px-6 py-3 bg-[#810100] text-white rounded-xl font-bold hover:bg-[#630000] shadow-lg active:scale-95 transition-all text-sm">
            <Edit className="w-4 h-4" /> Edit Profile
          </button>
        ) : (
          <div className="flex items-center gap-3">
            <button onClick={handleCancel} className="px-6 py-3 bg-white border border-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition-all text-sm">
              Cancel
            </button>
            <button onClick={handleSave} disabled={saveLoading} className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 shadow-lg active:scale-95 transition-all text-sm disabled:opacity-50">
              {saveLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} 
              {saveLoading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* ================= LEFT COLUMN ================= */}
        <div className="lg:col-span-1 space-y-8">
          
          {/* PROFILE CARD */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 flex flex-col items-center text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-b from-[#810100]/10 to-transparent"></div>
            <div className="w-28 h-28 rounded-full bg-gradient-to-br from-[#810100] to-[#630000] text-white flex items-center justify-center text-4xl font-black mb-5 shadow-xl z-10 border-4 border-white">
              {employeeInfo.name.split(" ").map((n: string) => n[0]).join("").substring(0, 2).toUpperCase()}
            </div>
            <h2 className="text-2xl font-black text-[#1B1717] tracking-tight">{employeeInfo.name}</h2>
            <p className="text-[#810100] font-black text-xs tracking-widest uppercase mt-2 mb-1 bg-[#fce8e8] px-3 py-1 rounded-full">
              {employeeInfo.role}
            </p>
            <p className="text-sm text-gray-500 font-medium mb-5">{employeeInfo.department}</p>
            <span className="px-4 py-1.5 bg-green-50 border border-green-200 text-green-700 rounded-full text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span> {employeeInfo.status}
            </span>
          </div>

          {/* EMPLOYMENT SUMMARY */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 md:p-8">
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-6 flex items-center gap-2">
              <Briefcase className="w-4 h-4" /> Employment Summary
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center pb-4 border-b border-gray-50">
                <span className="text-sm font-medium text-gray-500 flex items-center gap-2"><Shield className="w-4 h-4 text-[#810100]"/> Employee ID</span>
                <span className="font-bold text-[#1B1717] bg-gray-100 px-2 py-1 rounded-md text-xs">{employeeInfo.employeeId}</span>
              </div>
              <div className="flex justify-between items-center pb-4 border-b border-gray-50">
                <span className="text-sm font-medium text-gray-500 flex items-center gap-2"><Calendar className="w-4 h-4 text-[#810100]"/> Hire Date</span>
                <span className="font-bold text-[#1B1717]">{employeeInfo.hireDate}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-500 flex items-center gap-2"><Activity className="w-4 h-4 text-[#810100]"/> Work Type</span>
                <span className="font-bold text-[#1B1717]">Full-Time</span>
              </div>
            </div>
          </div>
        </div>

        {/* ================= RIGHT COLUMN ================= */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* CONTACT INFORMATION */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 md:p-8">
            <h3 className="text-sm font-black text-[#1B1717] uppercase tracking-widest mb-6 flex items-center gap-2 border-b border-gray-100 pb-4">
              <Phone className="w-5 h-5 text-[#810100]" /> Contact Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-2 flex items-center gap-1">Email Address <span className="text-[#810100]">(Read Only)</span></p>
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-gray-400" />
                  <p className="text-sm font-bold text-gray-700">{employeeInfo.email}</p>
                </div>
              </div>
              <div className={isEditing ? "" : "bg-gray-50 p-4 rounded-2xl border border-gray-100"}>
                <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-2">Phone Number</p>
                {isEditing ? (
                  <input autoComplete="off" type="tel" name="phone" value={editForm.phone} onChange={handleInputChange} className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:border-[#810100] focus:ring-4 focus:ring-[#810100]/10 outline-none font-bold text-sm transition-all" placeholder="e.g. +63 912 345 6789" />
                ) : (
                  <div className="flex items-center gap-3"><Phone className="w-5 h-5 text-gray-400" /><p className="text-sm font-bold text-[#1B1717]">{employeeInfo.phone}</p></div>
                )}
              </div>
              <div className={`md:col-span-2 ${isEditing ? "" : "bg-gray-50 p-4 rounded-2xl border border-gray-100"}`}>
                <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-2">Home Address</p>
                {isEditing ? (
                  <input autoComplete="off" type="text" name="address" value={editForm.address} onChange={handleInputChange} className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:border-[#810100] focus:ring-4 focus:ring-[#810100]/10 outline-none font-bold text-sm transition-all" placeholder="Full residential address" />
                ) : (
                  <div className="flex items-center gap-3"><MapPin className="w-5 h-5 text-gray-400" /><p className="text-sm font-bold text-[#1B1717]">{employeeInfo.address}</p></div>
                )}
              </div>
            </div>
          </div>

          {/* PERSONAL DETAILS */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 md:p-8">
            <h3 className="text-sm font-black text-[#1B1717] uppercase tracking-widest mb-6 flex items-center gap-2 border-b border-gray-100 pb-4">
              <User className="w-5 h-5 text-[#810100]" /> Personal Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className={isEditing ? "" : "bg-gray-50 p-4 rounded-2xl border border-gray-100"}>
                <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-2">Date of Birth</p>
                {isEditing ? (
                  <input autoComplete="off" type="date" name="dob" value={editForm.dob} onChange={handleInputChange} className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:border-[#810100] focus:ring-4 focus:ring-[#810100]/10 outline-none font-bold text-sm transition-all" />
                ) : (
                  <p className="text-sm font-bold text-[#1B1717]">{employeeInfo.dob || "Not specified"}</p>
                )}
              </div>
              <div className={isEditing ? "" : "bg-gray-50 p-4 rounded-2xl border border-gray-100"}>
                <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-2">Gender</p>
                {isEditing ? (
                  <select name="gender" value={editForm.gender} onChange={handleInputChange} className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:border-[#810100] focus:ring-4 focus:ring-[#810100]/10 outline-none font-bold text-sm transition-all">
                    <option value="">Select Gender</option><option value="Male">Male</option><option value="Female">Female</option><option value="Other">Other</option>
                  </select>
                ) : (
                  <p className="text-sm font-bold text-[#1B1717]">{employeeInfo.gender || "Not specified"}</p>
                )}
              </div>
              <div className={isEditing ? "" : "bg-gray-50 p-4 rounded-2xl border border-gray-100"}>
                <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-2">Civil Status</p>
                {isEditing ? (
                  <select name="civilStatus" value={editForm.civilStatus} onChange={handleInputChange} className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:border-[#810100] focus:ring-4 focus:ring-[#810100]/10 outline-none font-bold text-sm transition-all">
                    <option value="">Select Status</option><option value="Single">Single</option><option value="Married">Married</option><option value="Widowed">Widowed</option>
                  </select>
                ) : (
                  <p className="text-sm font-bold text-[#1B1717]">{employeeInfo.civilStatus || "Not specified"}</p>
                )}
              </div>
            </div>
          </div>

          {/* EMERGENCY CONTACT */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 md:p-8">
            <h3 className="text-sm font-black text-[#810100] uppercase tracking-widest mb-6 flex items-center gap-2 border-b border-gray-100 pb-4">
              <HeartPulse className="w-5 h-5" /> Emergency Contact
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-[#fce8e8]/50 p-6 rounded-2xl border border-[#810100]/10">
              <div>
                <p className="text-[10px] font-black uppercase text-[#810100]/70 tracking-widest mb-2">Contact Name</p>
                {isEditing ? (
                  <input autoComplete="off" type="text" name="emergencyName" value={editForm.emergencyName} onChange={handleInputChange} className="w-full px-4 py-3 bg-white border-2 border-[#810100]/20 rounded-xl focus:border-[#810100] focus:ring-4 focus:ring-[#810100]/10 outline-none font-bold text-sm transition-all" placeholder="Full Name" />
                ) : (
                  <p className="text-sm font-bold text-[#1B1717]">{employeeInfo.emergencyName || "None provided"}</p>
                )}
              </div>
              <div>
                <p className="text-[10px] font-black uppercase text-[#810100]/70 tracking-widest mb-2">Relationship</p>
                {isEditing ? (
                  <input autoComplete="off" type="text" name="emergencyRelation" value={editForm.emergencyRelation} onChange={handleInputChange} className="w-full px-4 py-3 bg-white border-2 border-[#810100]/20 rounded-xl focus:border-[#810100] focus:ring-4 focus:ring-[#810100]/10 outline-none font-bold text-sm transition-all" placeholder="e.g. Spouse, Parent" />
                ) : (
                  <p className="text-sm font-bold text-[#1B1717]">{employeeInfo.emergencyRelation || "None provided"}</p>
                )}
              </div>
              <div>
                <p className="text-[10px] font-black uppercase text-[#810100]/70 tracking-widest mb-2">Contact Number</p>
                {isEditing ? (
                  <input autoComplete="off" type="tel" name="emergencyPhone" value={editForm.emergencyPhone} onChange={handleInputChange} className="w-full px-4 py-3 bg-white border-2 border-[#810100]/20 rounded-xl focus:border-[#810100] focus:ring-4 focus:ring-[#810100]/10 outline-none font-bold text-sm transition-all" placeholder="Phone Number" />
                ) : (
                  <p className="text-sm font-bold text-[#1B1717]">{employeeInfo.emergencyPhone || "None provided"}</p>
                )}
              </div>
            </div>
          </div>

          {/* GOVERNMENT IDS (DARK THEME) */}
          <div className="bg-gradient-to-br from-[#1B1717] to-[#2D2626] text-white rounded-3xl shadow-lg p-6 md:p-8 relative overflow-hidden">
            <FileText className="absolute -right-6 -bottom-6 w-40 h-40 text-white/5 rotate-12" />
            <div className="relative z-10">
              <h3 className="text-sm font-black text-gray-300 uppercase tracking-widest mb-2 flex items-center gap-2 border-b border-gray-700 pb-4">
                <CreditCard className="w-5 h-5 text-white" /> Government Identification
              </h3>
              <p className="text-xs text-gray-400 mb-6 italic">To update your government IDs, please contact the HR Department.</p>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="bg-white/5 p-4 rounded-xl border border-white/10 backdrop-blur-sm">
                  <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1">SSS Number</p>
                  <p className="text-sm font-mono font-bold tracking-wider text-green-400">{employeeInfo.sss}</p>
                </div>
                <div className="bg-white/5 p-4 rounded-xl border border-white/10 backdrop-blur-sm">
                  <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1">PhilHealth</p>
                  <p className="text-sm font-mono font-bold tracking-wider text-blue-400">{employeeInfo.philhealth}</p>
                </div>
                <div className="bg-white/5 p-4 rounded-xl border border-white/10 backdrop-blur-sm">
                  <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1">Pag-IBIG</p>
                  <p className="text-sm font-mono font-bold tracking-wider text-orange-400">{employeeInfo.pagibig}</p>
                </div>
                <div className="bg-white/5 p-4 rounded-xl border border-white/10 backdrop-blur-sm">
                  <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1">TIN</p>
                  <p className="text-sm font-mono font-bold tracking-wider text-yellow-400">{employeeInfo.tin}</p>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}