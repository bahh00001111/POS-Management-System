import { useState, useEffect, useMemo } from "react";
import axiosClient from "../../api/axiosClient";
import { useToast } from "../../context/useToast";
import { toArray } from "../../utils/apiUtils";
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
  Search,
  Eye,
  EyeOff,
  Mail,
  Phone,
  KeyRound,
  Camera,
} from "lucide-react";
import ConfirmDialog from "../../components/ConfirmDialog";
import Pagination from "../../components/Pagination";

const PAGE_SIZE = 10;

// ដក Origin ពី API base URL (http://127.0.0.1:8000/api) ហើយភ្ជាប់ /storage/
const STORAGE_BASE = `${new URL(axiosClient.defaults.baseURL).origin}/storage/`;
const avatarUrl = (avatar) => (avatar ? `${STORAGE_BASE}${avatar}` : "");

// បង្ហាញ Avatar ជារូបភាព ជាមួយ Fallback ទៅ placeholder icon ពេលគ្មាន / load អត់ជោគជ័យ
function AvatarImage({ avatar, name = "", sizeCls = "w-9 h-9" }) {
  const [failed, setFailed] = useState(false);

  if (!avatar || failed) {
    return (
      <span
        className={`${sizeCls} rounded-full bg-stone-100 border border-stone-200 flex items-center justify-center shrink-0`}
      >
        <UserCircle className="text-stone-300" size={sizeCls === "w-10 h-10" ? 26 : 22} />
      </span>
    );
  }

  return (
    <img
      src={avatarUrl(avatar)}
      alt={name}
      onError={() => setFailed(true)}
      className={`${sizeCls} rounded-full object-cover shrink-0`}
    />
  );
}

export default function UserList() {
  const toast = useToast();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Live Search Filtering (ដូច CategoryList/ProductList)
  const [searchTerm, setSearchTerm] = useState("");

  // Pagination
  const [page, setPage] = useState(1);

  // Show/Hide password toggle
  const [showPassword, setShowPassword] = useState(false);

  // Avatar upload state — preview uses URL.createObjectURL(file)
  const [avatarPreview, setAvatarPreview] = useState("");

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // ១. កែសម្រួលតម្លៃ default នៃ role មកជា ID វិញ (ឧ. '3' សម្រាប់ Cashier)
  const [formData, setFormData] = useState({
    full_name: "",
    username: "",
    email: "",
    phone: "",
    password: "",
    pin_code: "",
    avatar: null,
    role_id: "3",
  });

  // Map រវាង Role Name និង Role ID តាម Database របស់អ្នក
  const roleMapToId = { Admin: "1", Manager: "2", Cashier: "3" };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await axiosClient.get("/users");
      const data = toArray(res.data);
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
        const data = toArray(res.data);
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
    setShowPassword(false);
    setFormData({
      full_name: "",
      username: "",
      email: "",
      phone: "",
      password: "",
      pin_code: "",
      avatar: null,
      role_id: "3",
    });
    setAvatarPreview("");
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
    setShowPassword(false);
    setFormData({
      full_name: u.full_name || "",
      username: u.username || "",
      email: u.email || "",
      phone: u.phone || "",
      password: "",
      pin_code: "",
      avatar: null,
      role_id: roleMapToId[currentRoleName] || "3",
    });
    setAvatarPreview(avatarUrl(u.avatar));
    setShowModal(true);
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (avatarPreview && avatarPreview.startsWith("blob:")) {
      URL.revokeObjectURL(avatarPreview);
    }
    setFormData((prev) => ({ ...prev, avatar: file }));
    setAvatarPreview(URL.createObjectURL(file));
    e.target.value = "";
  };

  const handleRemoveAvatar = () => {
    if (avatarPreview && avatarPreview.startsWith("blob:")) {
      URL.revokeObjectURL(avatarPreview);
    }
    setFormData((prev) => ({ ...prev, avatar: null }));
    setAvatarPreview("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    // ផ្ញើតាម FormData ដើម្បីគាំទ្រ Avatar Upload
    const payload = new FormData();
    payload.append("full_name", formData.full_name);
    payload.append("username", formData.username);
    payload.append("role_id", parseInt(formData.role_id, 10));
    if (formData.email) payload.append("email", formData.email);
    if (formData.phone) payload.append("phone", formData.phone);
    if (formData.password) payload.append("password", formData.password);
    if (formData.pin_code) payload.append("pin_code", formData.pin_code);
    // បញ្ជូន avatar តែពេលជា File ពិតប្រាកដ (កុំផ្ញើ URL string ទៅ backend)
    if (formData.avatar instanceof File) {
      payload.append("avatar", formData.avatar);
    }

    const multipartConfig = {
      headers: { "Content-Type": "multipart/form-data" },
    };

    try {
      if (isEditing) {
        // Method Spoofing: POST + _method=PUT ដើម្បីឱ្យ multipart files ដំណើរការត្រឹមត្រូវ
        payload.append("_method", "PUT");
        await axiosClient.post(`/users/${selectedUserId}`, payload, multipartConfig);
        toast.success("User updated successfully", "User Updated");
      } else {
        await axiosClient.post("/users", payload, multipartConfig);
        toast.success("User created successfully", "User Created");
      }

      setShowModal(false);
      setAvatarPreview("");
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

  const handleDelete = (u) => {
    if (isAdminUser(u)) {
      toast.error(
        `${u.full_name || u.username} has the Admin role and cannot be deleted`,
        "Delete Blocked",
      );
      return;
    }
    setDeleteTarget(u);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await axiosClient.delete(`/users/${deleteTarget.user_id || deleteTarget.id}`);
      toast.deleted("User deleted successfully", "User Deleted");
      setDeleteTarget(null);
      fetchUsers();
    } catch (err) {
      console.error(err);
      toast.error(
        err.response?.data?.message || "Failed to delete user",
        "Delete Failed",
      );
    } finally {
      setDeleting(false);
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

  const filteredUsers = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    const userList = Array.isArray(users) ? users : toArray(users);
    if (!query) return userList;
    return userList.filter((u) => {
      const roleString = formatRoles(u.roles).toLowerCase();
      return (
        (u.full_name || "").toLowerCase().includes(query) ||
        (u.username || "").toLowerCase().includes(query) ||
        roleString.includes(query)
      );
    });
  }, [users, searchTerm]);

  // ត្រលប់ទៅទំព័រទី 1 ពេលស្វែងរកផ្លាស់ប្ដូរ
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setPage(1);
  };

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageStart = filteredUsers.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const pageEnd = Math.min(currentPage * PAGE_SIZE, filteredUsers.length);
  const paginatedUsers = useMemo(
    () =>
      filteredUsers.slice(
        (currentPage - 1) * PAGE_SIZE,
        currentPage * PAGE_SIZE
      ),
    [filteredUsers, currentPage]
  );

  return (
    <div className="p-3 sm:p-6 space-y-6">
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
        {/* Toolbar — Search */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between px-5 py-4 border-b border-stone-100">
          <div className="relative w-full lg:max-w-xs">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"
              size={16}
            />
            <input
              type="text"
              value={searchTerm}
              onChange={handleSearchChange}
              placeholder="Search users by name, username or role..."
              className="w-full border border-stone-200 rounded-lg pl-9 pr-8 py-2 bg-stone-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-coffee-500/60 focus:border-coffee-500 text-sm transition"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 cursor-pointer"
              >
                <X size={16} />
              </button>
            )}
          </div>
          <p className="text-xs text-stone-500">
            <span className="font-medium text-stone-700">{filteredUsers.length}</span>{" "}
            {searchTerm ? "results" : "total users"}
          </p>
        </div>

        {/* Desktop Table (md+) — scrollable wrapper + min-width to prevent column crush */}
        <div className="hidden md:block">
          <div className="w-full overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
            <table className="w-full min-w-[760px] text-left border-collapse">
              <thead>
                <tr className="bg-stone-50 border-b border-stone-100 text-stone-600 text-sm">
                  <th className="p-4 font-semibold">User</th>
                  <th className="p-4 font-semibold">Username</th>
                  <th className="p-4 font-semibold">Email</th>
                  <th className="p-4 font-semibold">Phone</th>
                  <th className="p-4 font-semibold">Role</th>
                  <th className="p-4 font-semibold text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 text-sm text-stone-700">
                {loading ? (
                  <tr>
<td colSpan="6" className="p-8 text-center text-stone-400">
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="animate-spin" /> Loading users...
                    </span>
                  </td>
                  </tr>
                ) : filteredUsers.length > 0 ? (
                  paginatedUsers.map((u) => {
                    const userId = u.user_id || u.id;
                    const roleString = formatRoles(u.roles);

                    return (
                      <tr key={userId} className="hover:bg-stone-50/50 transition">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <AvatarImage avatar={u.avatar} name={u.full_name || u.username} />                            
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
                        <td className="p-4 text-stone-500 max-w-[220px] truncate">
                          <span className="inline-flex items-center gap-1.5">
                            <Mail size={13} className="text-stone-400 shrink-0" />
                            {u.email || "—"}
                          </span>
                        </td>
                        <td className="p-4 font-medium text-stone-500 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1.5">
                            <Phone size={13} className="text-stone-400 shrink-0" />
                            {u.phone || "—"}
                          </span>
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
                        <td className="p-4 text-center">
                        <div className="flex items-center justify-center space-x-2">
                          <button
                            onClick={() => handleOpenEditModal(u)}
                            title="Edit user"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-coffee-600 bg-coffee-50/60 border border-coffee-100 rounded-lg shadow-sm hover:bg-coffee-100 hover:border-coffee-200 active:scale-[0.97] focus:outline-none focus:ring-2 focus:ring-coffee-200 transition cursor-pointer"
                          >
                            <Edit size={14} /> Edit
                          </button>
                          <button
                            onClick={() => handleDelete(u)}
                            disabled={isAdminUser(u)}
                            title={
                              isAdminUser(u)
                                ? "Admin users cannot be deleted"
                                : "Delete user"
                            }
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-600 bg-red-50/60 border border-red-100 rounded-lg shadow-sm hover:bg-red-100 hover:border-red-200 active:scale-[0.97] focus:outline-none focus:ring-2 focus:ring-red-200 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none"
                          >
                            <Trash2 size={14} /> Delete
                          </button>
                        </div>
                      </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
<td colSpan="6" className="p-8 text-center text-stone-400">
                    {searchTerm ? `No users found for "${searchTerm}".` : "No users found."}
                  </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mobile Cards (below md) — stacked card per user, no horizontal scroll */}
        <div className="md:hidden divide-y divide-stone-100">
          {loading ? (
            <div className="p-8 text-center text-stone-400 text-sm">
              <span className="inline-flex items-center gap-2">
                <Loader2 className="animate-spin" /> Loading users...
              </span>
            </div>
          ) : paginatedUsers.length > 0 ? (
            paginatedUsers.map((u) => {
              const userId = u.user_id || u.id;
              const roleString = formatRoles(u.roles);

              return (
                <div key={userId} className="p-4 space-y-3">
                  {/* Header row: avatar + name + role */}
                  <div className="flex items-center gap-3">
                    <AvatarImage avatar={u.avatar} name={u.full_name || u.username} sizeCls="w-10 h-10" />
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-stone-800 truncate">
                        {u.full_name}
                      </p>
                      <p className="text-sm font-medium text-stone-500 truncate">
                        @{u.username}
                      </p>
                      {(u.email || u.phone) && (
                        <div className="mt-1 flex flex-col gap-1 text-xs text-stone-400">
                          {u.email && (
                            <span className="inline-flex items-center gap-1 truncate">
                              <Mail size={11} className="shrink-0" /> {u.email}
                            </span>
                          )}
                          {u.phone && (
                            <span className="inline-flex items-center gap-1">
                              <Phone size={11} className="shrink-0" /> {u.phone}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <span
                      className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-bold ${
                        roleString.includes("Admin")
                          ? "bg-coffee-100 text-coffee-700"
                          : roleString.includes("Manager")
                            ? "bg-coffee-100 text-coffee-700"
                            : "bg-stone-100 text-stone-700"
                      }`}
                    >
                      {roleString}
                    </span>
                  </div>

                  {/* Action buttons stacked full width */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleOpenEditModal(u)}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-coffee-600 bg-coffee-50/60 border border-coffee-100 rounded-lg shadow-sm hover:bg-coffee-100 hover:border-coffee-200 active:scale-[0.97] focus:outline-none focus:ring-2 focus:ring-coffee-200 transition cursor-pointer"
                    >
                      <Edit size={14} /> Edit
                    </button>
                    <button
                      onClick={() => handleDelete(u)}
                      disabled={isAdminUser(u)}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-red-600 bg-red-50/60 border border-red-100 rounded-lg shadow-sm hover:bg-red-100 hover:border-red-200 active:scale-[0.97] focus:outline-none focus:ring-2 focus:ring-red-200 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Trash2 size={14} /> Delete
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-8 text-center text-stone-400 text-sm">
              {searchTerm ? `No users found for "${searchTerm}".` : "No users found."}
            </div>
          )}
        </div>

        {/* Footer — Pagination */}
        <div className="flex flex-col lg:flex-row items-center justify-between gap-3 px-5 py-3.5 border-t border-stone-200 bg-stone-50/50">
          <p className="text-xs text-stone-500">
            Showing{" "}
            <span className="font-medium text-stone-700">
              {pageStart}&ndash;{pageEnd}
            </span>{" "}
            of <span className="font-medium text-stone-700">{filteredUsers.length}</span> users
            {searchTerm && (
              <button
                onClick={() => {
                  setSearchTerm("");
                  setPage(1);
                }}
                className="ml-2 inline-flex items-center gap-1 font-medium text-coffee-600 hover:text-coffee-700 cursor-pointer"
              >
                <X size={12} /> Clear search
              </button>
            )}
          </p>
          <Pagination page={currentPage} totalPages={totalPages} onPageChange={setPage} />
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-stone-900/50 backdrop-blur-sm flex items-start justify-center p-4 pt-16 sm:pt-24 z-50">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl ring-1 ring-stone-200/60 overflow-hidden max-h-[88vh] overflow-y-auto">
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
                className="p-1.5 rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition cursor-pointer"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              {/* Avatar Upload */}
              <div className="flex flex-col items-center gap-2.5 pb-1">
                <div className="relative">
                  <div className="w-20 h-20 rounded-full bg-stone-100 border-2 border-stone-200 overflow-hidden flex items-center justify-center ring-4 ring-stone-50">
                    {avatarPreview ? (
                      <img
                        src={avatarPreview}
                        alt="Avatar preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <UserCircle className="text-stone-300" size={44} />
                    )}
                  </div>
                  <label
                    title="Upload avatar"
                    className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-coffee-600 hover:bg-coffee-700 text-white flex items-center justify-center shadow-md shadow-coffee-600/30 cursor-pointer transition"
                  >
                    <Camera size={14} />
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleAvatarChange}
                    />
                  </label>
                </div>

                <p className="text-xs text-stone-400 font-medium">
                  {avatarPreview
                    ? "Click the camera icon to change photo"
                    : "No photo — click the camera icon to upload an avatar"}
                </p>

                {avatarPreview && (
                  <button
                    type="button"
                    onClick={handleRemoveAvatar}
                    className="text-xs font-medium text-red-500 hover:text-red-600 transition cursor-pointer"
                  >
                    Remove photo
                  </button>
                )}
              </div>

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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-stone-500 mb-1.5">
                    Email
                  </label>
                  <div className="relative">
                    <Mail
                      size={16}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"
                    />
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      placeholder="e.g. sokha@cafe.com"
                      className="w-full rounded-lg border border-stone-200 bg-white pl-9 pr-3.5 py-2.5 text-sm text-stone-800 placeholder:text-stone-400 shadow-sm transition focus:border-coffee-500 focus:ring-2 focus:ring-coffee-500/30 focus:outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-stone-500 mb-1.5">
                    Phone
                  </label>
                  <div className="relative">
                    <Phone
                      size={16}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"
                    />
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) =>
                        setFormData({ ...formData, phone: e.target.value })
                      }
                      placeholder="e.g. 012 345 678"
                      className="w-full rounded-lg border border-stone-200 bg-white pl-9 pr-3.5 py-2.5 text-sm text-stone-800 placeholder:text-stone-400 shadow-sm transition focus:border-coffee-500 focus:ring-2 focus:ring-coffee-500/30 focus:outline-none"
                    />
                  </div>
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
                    type={showPassword ? "text" : "password"}
                    required={!isEditing}
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    placeholder={isEditing ? "••••••••" : "Enter a password"}
                    className="w-full rounded-lg border border-stone-200 bg-white pl-9 pr-10 py-2.5 text-sm text-stone-800 placeholder:text-stone-400 shadow-sm transition focus:border-coffee-500 focus:ring-2 focus:ring-coffee-500/30 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    title={showPassword ? "Hide password" : "Show password"}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition cursor-pointer focus:outline-none focus:ring-0 focus:border-none"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-stone-500 mb-1.5">
                  PIN Code{" "}
                  <span className="normal-case tracking-normal text-stone-400 font-medium">
                    (Optional, 4-6 digits)
                  </span>
                </label>
                <div className="relative">
                  <KeyRound
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"
                  />
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    pattern="[0-9]{4,6}"
                    value={formData.pin_code}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        pin_code: e.target.value.replace(/\D/g, ""),
                      })
                    }
                    placeholder="e.g. 1234"
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

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <ConfirmDialog
          open
          title="Delete User"
          message={`Are you sure you want to delete "${deleteTarget.full_name || deleteTarget.username}"? This action cannot be undone.`}
          loading={deleting}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
