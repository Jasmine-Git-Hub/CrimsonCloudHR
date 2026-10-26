import React, { useEffect, useState } from 'react';
import { 
  User, Mail, Phone, MapPin, Briefcase, Calendar, Shield, 
  Loader2, Edit, Save, X, HeartPulse, Activity 
} from 'lucide-react';
import { auth, db } from '../../../config/firebaseSetup';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

interface UserProfileData {
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  department: string;
  status: string;
  employeeId: string;
  hireDate: string;
  phone: string;
  address: string;
  emergencyName: string;
  emergencyRelation: string;
  emergencyPhone: string;
}

const MyProfile: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [editForm, setEditForm] = useState<any>(null);

  const [userData, setUserData] = useState<UserProfileData>({
    firstName: '',
    lastName: '',
    email: 'Loading...',
    role: 'ESS',
    department: 'Not assigned',
    status: 'Active',
    employeeId: 'TBA',
    hireDate: 'Not provided',
    phone: 'Not provided',
    address: 'Not provided',
    emergencyName: '',
    emergencyRelation: '',
    emergencyPhone: '',
  });

  // --- FETCH DATA MULA SA FIREBASE ---
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const currentUser = auth.currentUser;
        if (currentUser) {
          const userDocRef = doc(db, 'users', currentUser.uid);
          const userDocSnap = await getDoc(userDocRef);
          
          if (userDocSnap.exists()) {
            const data = userDocSnap.data();
            
            const fallbackName = data.username || currentUser.email?.split('@')[0] || 'Employee';
            
            setUserData({
              firstName: data.firstName || fallbackName,
              lastName: data.lastName || '',
              email: data.email || currentUser.email || 'Not provided',
              role: data.role || 'Employee',
              department: data.department || 'General Administration',
              status: data.status || 'Active',
              employeeId: data.employeeId || 'TBA',
              hireDate: data.hireDate?.seconds ? new Date(data.hireDate.seconds * 1000).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : (data.hireDate || "Not provided"),
              phone: data.phone || 'Not provided',
              address: data.address || 'Not provided',
              emergencyName: data.emergencyName || '',
              emergencyRelation: data.emergencyRelation || '',
              emergencyPhone: data.emergencyPhone || '',
            });
          }
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  // --- MGA FUNCTIONS PARA SA EDITING ---
  const handleEditClick = () => {
    setIsEditing(true);
    setEditForm({
      firstName: userData.firstName === userData.email?.split('@')[0] ? '' : userData.firstName, 
      lastName: userData.lastName,
      phone: userData.phone === 'Not provided' ? '' : userData.phone,
      address: userData.address === 'Not provided' ? '' : userData.address,
      emergencyName: userData.emergencyName,
      emergencyRelation: userData.emergencyRelation,
      emergencyPhone: userData.emergencyPhone,
    });
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditForm(null);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEditForm((prev: any) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    try {
      setSaveLoading(true);
      const currentUser = auth.currentUser;
      if (currentUser) {
        const userDocRef = doc(db, 'users', currentUser.uid);
        
        await updateDoc(userDocRef, editForm);

        setUserData((prev) => ({
          ...prev,
          ...editForm,
          phone: editForm.phone || 'Not provided',
          address: editForm.address || 'Not provided',
        }));

        setIsEditing(false);
        setEditForm(null);
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      alert("May error sa pag-save. Subukan muli.");
    } finally {
      setSaveLoading(false);
    }
  };

  // --- DISPLAY LOGIC ---
  const getFullName = () => {
    if (userData.lastName) return `${userData.firstName} ${userData.lastName}`;
    return userData.firstName;
  };

  const getInitials = () => {
    const first = userData.firstName ? userData.firstName.charAt(0) : 'U';
    const last = userData.lastName ? userData.lastName.charAt(0) : '';
    return `${first}${last}`.toUpperCase();
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen pb-20">
        <Loader2 className="w-10 h-10 animate-spin text-[#810100]" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto bg-[#f8f9fa] min-h-screen">
      
      {/* PAGE HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-[#1B1717] tracking-tight uppercase">My Profile</h1>
          <p className="text-gray-500 font-medium mt-1">View and manage your personal and employment details</p>
        </div>
        {!isEditing ? (
          <button onClick={handleEditClick} className="flex items-center gap-2 px-6 py-3 bg-[#810100] text-white rounded-xl font-bold hover:bg-[#630000] shadow-lg active:scale-95 transition-all text-sm">
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
              {getInitials()}
            </div>
            <h2 className="text-2xl font-black text-[#1B1717] tracking-tight">{getFullName()}</h2>
            <p className="text-[#810100] font-black text-xs tracking-widest uppercase mt-2 mb-1 bg-[#fce8e8] px-3 py-1 rounded-full">
              {userData.role}
            </p>
            <p className="text-sm text-gray-500 font-medium mb-5">{userData.department}</p>
            <span className="px-4 py-1.5 bg-green-50 border border-green-200 text-green-700 rounded-full text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span> {userData.status}
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
                <span className="font-bold text-[#1B1717] bg-gray-100 px-2 py-1 rounded-md text-xs">{userData.employeeId}</span>
              </div>
              <div className="flex justify-between items-center pb-4 border-b border-gray-50">
                <span className="text-sm font-medium text-gray-500 flex items-center gap-2"><Calendar className="w-4 h-4 text-[#810100]"/> Hire Date</span>
                <span className="font-bold text-[#1B1717]">{userData.hireDate}</span>
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
          
          {/* BASIC INFORMATION */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 md:p-8">
            <h3 className="text-sm font-black text-[#1B1717] uppercase tracking-widest mb-6 flex items-center gap-2 border-b border-gray-100 pb-4">
              <User className="w-5 h-5 text-[#810100]" /> Basic Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className={isEditing ? "" : "bg-gray-50 p-4 rounded-2xl border border-gray-100"}>
                <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-2">First Name</p>
                {isEditing ? (
                  <input autoComplete="off" type="text" name="firstName" value={editForm.firstName} onChange={handleInputChange} className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:border-[#810100] focus:ring-4 focus:ring-[#810100]/10 outline-none font-bold text-sm transition-all" placeholder="Enter first name" />
                ) : (
                  <p className="text-sm font-bold text-[#1B1717] px-2">{userData.firstName}</p>
                )}
              </div>
              <div className={isEditing ? "" : "bg-gray-50 p-4 rounded-2xl border border-gray-100"}>
                <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-2">Last Name</p>
                {isEditing ? (
                  <input autoComplete="off" type="text" name="lastName" value={editForm.lastName} onChange={handleInputChange} className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:border-[#810100] focus:ring-4 focus:ring-[#810100]/10 outline-none font-bold text-sm transition-all" placeholder="Enter last name" />
                ) : (
                  <p className="text-sm font-bold text-[#1B1717] px-2">{userData.lastName || "Not specified"}</p>
                )}
              </div>
            </div>
          </div>

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
                  <p className="text-sm font-bold text-gray-700">{userData.email}</p>
                </div>
              </div>
              <div className={isEditing ? "" : "bg-gray-50 p-4 rounded-2xl border border-gray-100"}>
                <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-2">Phone Number</p>
                {isEditing ? (
                  <input autoComplete="off" type="tel" name="phone" value={editForm.phone} onChange={handleInputChange} className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:border-[#810100] focus:ring-4 focus:ring-[#810100]/10 outline-none font-bold text-sm transition-all" placeholder="e.g. +63 912 345 6789" />
                ) : (
                  <div className="flex items-center gap-3"><Phone className="w-5 h-5 text-gray-400" /><p className="text-sm font-bold text-[#1B1717]">{userData.phone}</p></div>
                )}
              </div>
              <div className={`md:col-span-2 ${isEditing ? "" : "bg-gray-50 p-4 rounded-2xl border border-gray-100"}`}>
                <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-2">Home Address</p>
                {isEditing ? (
                  <input autoComplete="off" type="text" name="address" value={editForm.address} onChange={handleInputChange} className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:border-[#810100] focus:ring-4 focus:ring-[#810100]/10 outline-none font-bold text-sm transition-all" placeholder="Full residential address" />
                ) : (
                  <div className="flex items-center gap-3"><MapPin className="w-5 h-5 text-gray-400" /><p className="text-sm font-bold text-[#1B1717]">{userData.address}</p></div>
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
                  <p className="text-sm font-bold text-[#1B1717]">{userData.emergencyName || "None provided"}</p>
                )}
              </div>
              <div>
                <p className="text-[10px] font-black uppercase text-[#810100]/70 tracking-widest mb-2">Relationship</p>
                {isEditing ? (
                  <input autoComplete="off" type="text" name="emergencyRelation" value={editForm.emergencyRelation} onChange={handleInputChange} className="w-full px-4 py-3 bg-white border-2 border-[#810100]/20 rounded-xl focus:border-[#810100] focus:ring-4 focus:ring-[#810100]/10 outline-none font-bold text-sm transition-all" placeholder="e.g. Spouse, Parent" />
                ) : (
                  <p className="text-sm font-bold text-[#1B1717]">{userData.emergencyRelation || "None provided"}</p>
                )}
              </div>
              <div>
                <p className="text-[10px] font-black uppercase text-[#810100]/70 tracking-widest mb-2">Contact Number</p>
                {isEditing ? (
                  <input autoComplete="off" type="tel" name="emergencyPhone" value={editForm.emergencyPhone} onChange={handleInputChange} className="w-full px-4 py-3 bg-white border-2 border-[#810100]/20 rounded-xl focus:border-[#810100] focus:ring-4 focus:ring-[#810100]/10 outline-none font-bold text-sm transition-all" placeholder="Phone Number" />
                ) : (
                  <p className="text-sm font-bold text-[#1B1717]">{userData.emergencyPhone || "None provided"}</p>
                )}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default MyProfile;