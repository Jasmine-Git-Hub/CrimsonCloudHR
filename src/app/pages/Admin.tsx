import { Search, Plus, Edit, Trash2, UserCog, Shield, Users } from "lucide-react";
import { useState } from "react";
import AddUserModal from "../components/ui/AddUserModal";

interface AdminUser {
  id: number;
  username: string;
  role: string;
  status: string;
  email: string;
}

export default function Admin() {
  const [showAddUser, setShowAddUser] = useState<boolean>(false);

  const adminUsers: AdminUser[] = [
    { id: 1, username: "admin", role: "Admin", status: "Enabled", email: "admin@orangehrm.com" },
    { id: 2, username: "jasmine.espiritu", role: "ESS", status: "Enabled", email: "jasmine@orangehrm.com" },
    { id: 3, username: "john.doe", role: "Manager", status: "Enabled", email: "john.doe@orangehrm.com" },
  ];

  return (
    <div className="p-8 space-y-8">
      
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl text-[#1B1717] mb-2">Admin</h1>
          <p className="text-[#1B1717]/60">
            Manage system users, roles, and configurations
          </p>
        </div>
      </div>

      {/* User Management */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl text-[#1B1717]">User Management</h2>

            <button
              onClick={() => setShowAddUser(true)}
              className="flex items-center gap-2 bg-[#810100] text-white px-4 py-2 rounded-lg hover:bg-[#630000] transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add User
            </button>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#1B1717]/40" />
            <input
              type="text"
              placeholder="Search by username or email..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#810100]"
            />
          </div>
        </div>

        <table className="w-full">
          <thead className="bg-[#EDEBDD]">
            <tr>
              <th className="px-6 py-3 text-left">Username</th>
              <th className="px-6 py-3 text-left">Role</th>
              <th className="px-6 py-3 text-left">Email</th>
              <th className="px-6 py-3 text-left">Status</th>
              <th className="px-6 py-3 text-left">Actions</th>
            </tr>
          </thead>

          <tbody>
            {adminUsers.map((user) => (
              <tr key={user.id} className="border-t">
                <td className="px-6 py-4">{user.username}</td>
                <td className="px-6 py-4">{user.role}</td>
                <td className="px-6 py-4">{user.email}</td>
                <td className="px-6 py-4">{user.status}</td>
                <td className="px-6 py-4 flex gap-2">
                  <Edit className="w-4 h-4 cursor-pointer text-[#630000]" />
                  <Trash2 className="w-4 h-4 cursor-pointer text-red-600" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AddUserModal
        isOpen={showAddUser}
        onClose={() => setShowAddUser(false)}
      />
    </div>
  );
}