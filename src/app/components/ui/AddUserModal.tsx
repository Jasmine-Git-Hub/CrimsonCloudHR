import React, { useState, ChangeEvent, FormEvent } from "react";

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

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      alert("Passwords do not match!");
      return;
    }

    console.log("User Created:", formData);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white w-[900px] max-h-[90vh] overflow-y-auto rounded-xl shadow-2xl p-8 relative">

        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-lg"
        >
          ✕
        </button>

        <h2 className="text-2xl text-[#1B1717] mb-6">Add New User</h2>

        <form onSubmit={handleSubmit}>

          {/* ================= EMPLOYEE INFO ================= */}
          <div className="mb-8">
            <h3 className="text-lg text-[#810100] mb-4">
              Employee Information
            </h3>

            <div className="grid grid-cols-3 gap-6">

              <div className="flex flex-col items-center">
                <div className="w-32 h-32 rounded-full bg-gray-200 flex items-center justify-center text-gray-400">
                  Photo
                </div>
                <button
                  type="button"
                  className="mt-3 text-sm text-[#810100] hover:underline"
                >
                  Upload Image
                </button>
              </div>

              <div className="col-span-2 space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <input
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    type="text"
                    placeholder="First Name*"
                    required
                    className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:border-[#810100]"
                  />
                  <input
                    name="middleName"
                    value={formData.middleName}
                    onChange={handleChange}
                    type="text"
                    placeholder="Middle Name"
                    className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:border-[#810100]"
                  />
                  <input
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    type="text"
                    placeholder="Last Name*"
                    required
                    className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:border-[#810100]"
                  />
                </div>

                <input
                  name="employeeId"
                  value={formData.employeeId}
                  onChange={handleChange}
                  type="text"
                  placeholder="Employee ID*"
                  required
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:border-[#810100]"
                />
              </div>
            </div>
          </div>

          {/* ================= ACCOUNT INFO ================= */}
          <div>
            <h3 className="text-lg text-[#810100] mb-4">
              Account Information
            </h3>

            <div className="grid grid-cols-2 gap-6">

              <select
                name="role"
                value={formData.role}
                onChange={handleChange}
                required
                className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:border-[#810100]"
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
                className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:border-[#810100]"
              />

              <input
                name="email"
                value={formData.email}
                onChange={handleChange}
                type="email"
                placeholder="Email*"
                required
                className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:border-[#810100]"
              />

              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="status"
                    value="Enabled"
                    checked={formData.status === "Enabled"}
                    onChange={handleChange}
                  />
                  Enabled
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="status"
                    value="Disabled"
                    checked={formData.status === "Disabled"}
                    onChange={handleChange}
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
                className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:border-[#810100]"
              />

              <input
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                type="password"
                placeholder="Confirm Password*"
                required
                className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:border-[#810100]"
              />
            </div>
          </div>

          <div className="flex justify-end gap-4 mt-8">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 rounded-lg border border-gray-300 hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 rounded-lg bg-[#810100] text-white hover:bg-[#630000]"
            >
              Save User
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

export default AddUserModal;