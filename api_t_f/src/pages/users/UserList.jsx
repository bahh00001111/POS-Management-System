import { useState, useEffect } from "react";
import axiosClient from "../../api/axiosClient";
import { useToast } from "../../context/useToast";
import {
  Users,
  Plus,
  Trash2,
  Edit,
  Loader2,
  X,
  UserCircle,
  User,
  Lock,
  Shield,
} from "lucide-react";

export default function UserList() {
  const toast = useToast();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // ១. កែសម្រួលតម្លៃ default នៃ role មកជា ID វិញ (ឧ. '3' សម្រាប់ Cashier)
  const [formData, setFormData] = useState({
    full_name: "",
    username: "",
    password: "",
    role_id: "3",
  });

  // Map រវាង Role Name និង Role ID តាម Database របស់អ្នក
  const roleMapToId = { Admin: "1", Manager: "2", Cashier: "3" };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await axiosClient.get("/users");
      const data = Array.isArray(res.data) ? res.data : res.data.data || [];
      setUsers(data);
    } catch (err) {
      console.error("Error fetching users:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await axiosClient.get("/users");
        const data = Array.isArray(res.data) ? res.data : res.data.data || [];
        if (!cancelled) setUsers(data);
      } catch (err) {
        console.error("Error fetching users:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleOpenCreateModal = () => {
    setIsEditing(false);
    setSelectedUserId(null);
    setFormData({ full_name: "", username: "", password: "", role_id: "3" });
    setShowModal(true);
  };

  const handleOpenEditModal = (u) => {
    const userId = u.user_id || u.id;

    // ស្វែងរក Role Name រួចបម្លែងទៅជា Role ID
    let currentRoleName = "Cashier";
    if (Array.isArray(u.roles) && u.roles.length > 0) {
      currentRoleName =
        typeof u.roles[0] === "string"
          ? u.roles[0]
          : u.roles[0].role_name || u.roles[0].name || "Cashier";
    }

    setIsEditing(true);
    setSelectedUserId(userId);
    setFormData({
      full_name: u.full_name || "",
      username: u.username || "",
      password: "",
      role_id: roleMapToId[currentRoleName] || "3",
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    // ផ្ញើ field 'role_id' ទៅកាន់ Backend ឱ្យត្រូវតាម Validation rule
    const payload = {
      full_name: formData.full_name,
      username: formData.username,
      role_id: parseInt(formData.role_id, 10), // បម្លែងទៅជា Integer
    };

    if (formData.password) {
      payload.password = formData.password;
    }

    try {
      if (isEditing) {
        await axiosClient.put(`/users/${selectedUserId}`, payload);
        toast.success("User updated successfully", "User Updated");
      } else {
        await axiosClient.post("/users", payload);
        toast.success("User created successfully", "User Created");
      }

      setShowModal(false);
      fetchUsers();
    } catch (err) {
      console.error(err);
      toast.error(
        err.response?.data?.message ||
          `Failed to ${isEditing ? "update" : "create"} user`,
        isEditing ? "Update Failed" : "Create Failed",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (u) => {
    const userId = u.user_id || u.id;
    if (!userId) return;

    if (isAdminUser(u)) {
      toast.error(
        `${u.full_name || u.username} has the Admin role and cannot be deleted`,
        "Delete Blocked",
      );
      return;
    }

    if (!window.confirm("Are you sure you want to delete this user?")) return;
    try {
      await axiosClient.delete(`/users/${userId}`);
      toast.success("User deleted successfully", "User Deleted");
      fetchUsers();
    } catch (err) {
      console.error(err);
      toast.error(
        err.response?.data?.message || "Failed to delete user",
        "Delete Failed",
      );
    }
  };

  const formatRoles = (roles) => {
    if (!roles || !Array.isArray(roles) || roles.length === 0) return "No Role";
    return roles
      .map((r) =>
        typeof r === "string" ? r : r.role_name || r.name || "Unknown",
      )
      .join(", ");
  };

  const isAdminUser = (u) => {
    const roles = Array.isArray(u.roles) ? u.roles : [];
    return roles.some(
      (r) => (typeof r === "string" ? r : r.role_name || r.name) === "Admin",
    );
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-800 flex items-center gap-2">
            <Users className="text-coffee-600" /> Users Management
          </h1>
          <p className="text-stone-500 text-sm mt-1">
            Manage system staff and access roles
          </p>
        </div>
        <button
          onClick={handleOpenCreateModal}
          className="px-4 py-2 bg-coffee-600 hover:bg-coffee-700 text-white font-semibold rounded-xl text-sm flex items-center gap-2 shadow-sm transition cursor-pointer"
        >
          <Plus size={18} /> Add New User
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-stone-100 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-stone-50 border-b border-stone-100 text-stone-600 text-sm">
              <th className="p-4 font-semibold">User</th>
              <th className="p-4 font-semibold">Username</th>
              <th className="p-4 font-semibold">Role</th>
              <th className="p-4 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100 text-sm text-stone-700">
            {loading ? (
              <tr>
                <td colSpan="4" className="p-8 text-center text-stone-400">
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="animate-spin" /> Loading users...
                  </span>
                </td>
              </tr>
            ) : users.length > 0 ? (
              users.map((u) => {
                const userId = u.user_id || u.id;
                const roleString = formatRoles(u.roles);

                return (
                  <tr key={userId} className="hover:bg-stone-50/50 transition">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <UserCircle size={32} className="text-stone-400" />
                        <div>
                          <p className="font-bold text-stone-800">
                            {u.full_name}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 font-medium text-stone-600">
                      @{u.username}
                    </td>
                    <td className="p-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                          roleString.includes("Admin")
                            ? "bg-coffee-100 text-coffee-700"
                            : roleString.includes("Manager")
                              ? "bg-coffee-100 text-coffee-700"
                              : "bg-stone-100 text-stone-700"
                        }`}
                      >
                        {roleString}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleOpenEditModal(u)}
                          className="p-2 text-coffee-600 hover:bg-coffee-50 rounded-lg transition cursor-pointer"
                          title="Edit User"
                        >
                          <Edit size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(u)}
                          disabled={isAdminUser(u)}
                          className="p-2 text-coffee-500 hover:bg-coffee-50 rounded-lg transition cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
                          title={
                            isAdminUser(u)
                              ? "Admin users cannot be deleted"
                              : "Delete User"
                          }
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="4" className="p-8 text-center text-stone-400">
                  No users found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-stone-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl ring-1 ring-stone-200/60 overflow-hidden">
            <div className="flex items-start justify-between px-6 pt-5 pb-4 border-b border-stone-100">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-xl bg-coffee-600/10 flex items-center justify-center shrink-0">
                  <UserCircle className="text-coffee-600" size={20} />
                </span>
                <div>
                  <h3 className="text-base font-bold text-stone-800 leading-tight">
                    {isEditing ? "Edit User" : "Create New User"}
                  </h3>
                  <p className="text-xs text-stone-400 mt-0.5">
                    {isEditing
                      ? "Update the details of this staff account"
                      : "Add a new staff account to the system"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-stone-500 mb-1.5">
                  Full Name
                </label>
                <div className="relative">
                  <UserCircle
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"
                  />
                  <input
                    type="text"
                    required
                    value={formData.full_name}
                    onChange={(e) =>
                      setFormData({ ...formData, full_name: e.target.value })
                    }
                    placeholder="e.g. Sokha Chan"
                    className="w-full rounded-lg border border-stone-200 bg-white pl-9 pr-3.5 py-2.5 text-sm text-stone-800 placeholder:text-stone-400 shadow-sm transition focus:border-coffee-500 focus:ring-2 focus:ring-coffee-500/30 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-stone-500 mb-1.5">
                  Username
                </label>
                <div className="relative">
                  <User
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"
                  />
                  <input
                    type="text"
                    required
                    value={formData.username}
                    onChange={(e) =>
                      setFormData({ ...formData, username: e.target.value })
                    }
                    placeholder="e.g. sokha.chan"
                    className="w-full rounded-lg border border-stone-200 bg-white pl-9 pr-3.5 py-2.5 text-sm text-stone-800 placeholder:text-stone-400 shadow-sm transition focus:border-coffee-500 focus:ring-2 focus:ring-coffee-500/30 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-stone-500 mb-1.5">
                  Password{" "}
                  {isEditing && (
                    <span className="normal-case tracking-normal text-stone-400 font-medium">
                      (Leave blank to keep existing)
                    </span>
                  )}
                </label>
                <div className="relative">
                  <Lock
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"
                  />
                  <input
                    type="password"
                    required={!isEditing}
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    placeholder={isEditing ? "••••••••" : "Enter a password"}
                    className="w-full rounded-lg border border-stone-200 bg-white pl-9 pr-3.5 py-2.5 text-sm text-stone-800 placeholder:text-stone-400 shadow-sm transition focus:border-coffee-500 focus:ring-2 focus:ring-coffee-500/30 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-stone-500 mb-1.5">
                  Role
                </label>
                <div className="relative">
                  <Shield
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"
                  />
                  <select
                    value={formData.role_id}
                    onChange={(e) =>
                      setFormData({ ...formData, role_id: e.target.value })
                    }
                    className="w-full rounded-lg border border-stone-200 bg-white pl-9 pr-3.5 py-2.5 text-sm text-stone-800 shadow-sm transition focus:border-coffee-500 focus:ring-2 focus:ring-coffee-500/30 focus:outline-none"
                  >
                    <option value="3">Cashier</option>
                    <option value="2">Manager</option>
                    <option value="1">Admin</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 rounded-lg text-sm font-medium text-stone-600 border border-stone-200 bg-white hover:bg-stone-100 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white bg-coffee-600 hover:bg-coffee-700 shadow-sm shadow-coffee-600/20 transition flex justify-center items-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {submitting && <Loader2 className="animate-spin" size={15} />}
                  {isEditing ? "Update User" : "Save User"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
