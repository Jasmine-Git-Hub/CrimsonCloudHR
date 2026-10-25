import React, { useState, useRef, ChangeEvent, FormEvent } from "react";
// 1. IMPORTS PARA SA FIREBASE
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "../../../config/firebaseSetup";
import { Loader2 } from "lucide-react";

interface AddUserModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AddUserModal: React.FC<AddUserModalProps> = ({ isOpen, onClose }) => {
  const [formData, setFormData] = useState({
    firstName: "",
    middleName: "",
    lastName: "",
    employeeId: "",
    role: "",
    username: "",
    email: "",
    status: "Enabled",
    password: "",
    confirmPassword: "",
  });

  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // STATE PARA SA LOADING BUTTON HABANG NAGSE-SAVE
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // 2. ANG FUNCTION PARA MAG-SAVE SA DATABASE
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match!");
      return;
    }

    setLoading(true);

    try {
      // A. Gumawa ng account sa Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(
        auth, 
        formData.email, 
        formData.password
      );
      const user = userCredential.user;

      // B. I-save ang employee details sa Firestore Database
      await setDoc(doc(db, "users", user.uid), {
        firstName: formData.firstName,
        middleName: formData.middleName,
        lastName: formData.lastName,
        employeeId: formData.employeeId,
        role: formData.role.toLowerCase(), // Gagawing lowercase (e.g., 'admin', 'manager')
        username: formData.username,
        email: formData.email,
        status: formData.status === "Enabled" ? "active" : "inactive", // Para tugma sa Login logic natin
        failedLoginAttempts: 0,
        lockUntil: null,
      });

      console.log("User Successfully Created and Saved to Database!");
      
      // I-reset ang form at isara ang modal
      setFormData({
        firstName: "", middleName: "", lastName: "", employeeId: "",
        role: "", username: "", email: "", status: "Enabled", password: "", confirmPassword: "",
      });
      setPhotoPreview(null);
      onClose();
      
      // I-refresh ang page para lumitaw agad sa table
      window.location.reload();

    } catch (err: any) {
      console.error("Error creating user:", err);
      // Ipakita ang error kung may kaparehas nang email o mahina ang password
      if (err.code === "auth/email-already-in-use") {
        setError("This email is already registered.");
      } else if (err.code === "auth/weak-password") {
        setError("Password should be at least 6 characters.");
      } else {
        setError("Failed to create user. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleImageClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const previewUrl = URL.createObjectURL(file);
      setPhotoPreview(previewUrl);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white w-[900px] max-h-[90vh] overflow-y-auto rounded-xl shadow-2xl p-8 relative animate-in fade-in zoom-in duration-200">

        <button
          onClick={onClose}
          disabled={loading}
          className="absolute top-6 right-6 text-gray-400 hover:text-gray-700 transition-colors disabled:opacity-50"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <h2 className="text-2xl font-semibold text-[#1B1717] mb-8 border-b border-gray-100 pb-4">Add New User</h2>

        {error && (
          <div className="mb-6 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg text-sm text-center font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>

          {/* ================= EMPLOYEE INFO ================= */}
          <div className="mb-10">
            <h3 className="text-lg font-semibold text-[#810100] mb-6">
              Employee Information
            </h3>

            <div className="grid grid-cols-[auto_1fr] gap-8">
              
              <div className="flex flex-col items-center">
                <div 
                  className="w-32 h-32 rounded-full bg-[#E5E7EB] flex items-center justify-center overflow-hidden border-2 border-dashed border-gray-300 cursor-pointer hover:border-[#810100] transition-colors"
                  onClick={handleImageClick}
                >
                  {photoPreview ? (
                    <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-gray-400 font-medium">Photo</span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleImageClick}
                  className="mt-3 text-sm font-semibold text-[#810100] hover:underline"
                >
                  Upload Image
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleImageChange} 
                  accept="image/*" 
                  className="hidden" 
                />
              </div>

              <div className="space-y-4 pt-2">
                <div className="grid grid-cols-3 gap-4">
                  <input
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    type="text"
                    placeholder="First Name*"
                    required
                    disabled={loading}
                    className="border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:border-[#810100] focus:ring-1 focus:ring-[#810100] w-full disabled:bg-gray-100"
                  />
                  <input
                    name="middleName"
                    value={formData.middleName}
                    onChange={handleChange}
                    type="text"
                    placeholder="Middle Name"
                    disabled={loading}
                    className="border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:border-[#810100] focus:ring-1 focus:ring-[#810100] w-full disabled:bg-gray-100"
                  />
                  <input
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    type="text"
                    placeholder="Last Name*"
                    required
                    disabled={loading}
                    className="border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:border-[#810100] focus:ring-1 focus:ring-[#810100] w-full disabled:bg-gray-100"
                  />
                </div>

                <input
                  name="employeeId"
                  value={formData.employeeId}
                  onChange={handleChange}
                  type="text"
                  placeholder="Employee ID*"
                  required
                  disabled={loading}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:border-[#810100] focus:ring-1 focus:ring-[#810100] disabled:bg-gray-100"
                />
              </div>
            </div>
          </div>

          {/* ================= ACCOUNT INFO ================= */}
          <div>
            <h3 className="text-lg font-semibold text-[#810100] mb-6">
              Account Information
            </h3>

            <div className="grid grid-cols-2 gap-6">

              <select
                name="role"
                value={formData.role}
                onChange={handleChange}
                required
                disabled={loading}
                className="border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:border-[#810100] focus:ring-1 focus:ring-[#810100] bg-white text-gray-700 disabled:bg-gray-100"
              >
                <option value="">Select Role*</option>
                <option value="Admin">Admin</option>
                <option value="Manager">Manager</option>
                <option value="Supervisor">Supervisor</option>
                <option value="ESS">ESS</option>
              </select>

              <input
                name="username"
                value={formData.username}
                onChange={handleChange}
                type="text"
                placeholder="Username*"
                required
                disabled={loading}
                className="border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:border-[#810100] focus:ring-1 focus:ring-[#810100] disabled:bg-gray-100"
              />

              <input
                name="email"
                value={formData.email}
                onChange={handleChange}
                type="email"
                placeholder="Email*"
                required
                disabled={loading}
                className="border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:border-[#810100] focus:ring-1 focus:ring-[#810100] disabled:bg-gray-100"
              />

              <div className="flex items-center gap-6 px-2">
                <label className="flex items-center gap-2 cursor-pointer text-gray-700 font-medium">
                  <input
                    type="radio"
                    name="status"
                    value="Enabled"
                    checked={formData.status === "Enabled"}
                    onChange={handleChange}
                    disabled={loading}
                    className="text-[#810100] focus:ring-[#810100] disabled:opacity-50"
                  />
                  Enabled
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-gray-700 font-medium">
                  <input
                    type="radio"
                    name="status"
                    value="Disabled"
                    checked={formData.status === "Disabled"}
                    onChange={handleChange}
                    disabled={loading}
                    className="text-[#810100] focus:ring-[#810100] disabled:opacity-50"
                  />
                  Disabled
                </label>
              </div>

              <input
                name="password"
                value={formData.password}
                onChange={handleChange}
                type="password"
                placeholder="Password*"
                required
                disabled={loading}
                className="border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:border-[#810100] focus:ring-1 focus:ring-[#810100] disabled:bg-gray-100"
              />

              <input
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                type="password"
                placeholder="Confirm Password*"
                required
                disabled={loading}
                className="border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:border-[#810100] focus:ring-1 focus:ring-[#810100] disabled:bg-gray-100"
              />
            </div>
          </div>

          <div className="flex justify-end gap-4 mt-10 border-t border-gray-100 pt-6">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-6 py-2.5 rounded-lg border border-gray-300 font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 rounded-lg bg-[#810100] text-white font-medium hover:bg-[#630000] shadow-sm transition-colors flex items-center gap-2 disabled:opacity-70"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? "Saving..." : "Save User"}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

export default AddUserModal;