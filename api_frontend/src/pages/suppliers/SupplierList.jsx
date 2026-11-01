import { useState, useEffect, useMemo } from "react";
import axiosClient from "../../api/axiosClient";
import { useToast } from "../../context/useToast";
import { toArray } from "../../utils/apiUtils";
import ConfirmDialog from "../../components/ConfirmDialog";
import Pagination from "../../components/Pagination";
import {
  Truck,
  Plus,
  Edit,
  Trash2,
  Phone,
  Mail,
  MapPin,
  User,
  Loader2,
  X,
  PackageX,
  AlertTriangle,
  Building2,
  PhoneCall,
  Search,
} from "lucide-react";

export default function SupplierList() {
  const toast = useToast();
  const [suppliers, setSuppliers] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Pagination (10 suppliers per page)
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    supplier_name: "",
    contact_name: "",
    phone: "",
    email: "",
    address: "",
  });

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Live Search Filtering (ដូច CategoryList/ProductList)
  const [searchTerm, setSearchTerm] = useState("");

  const filteredSuppliers = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    const supplierList = Array.isArray(suppliers) ? suppliers : toArray(suppliers);
    if (!query) return supplierList;
    return supplierList.filter((s) =>
      [s.supplier_name, s.contact_name, s.phone, s.email, s.address].some((v) =>
        (v || "").toLowerCase().includes(query)
      )
    );
  }, [suppliers, searchTerm]);

  // ត្រលប់ទៅទំព័រទី 1 ពេលស្វែងរកផ្លាស់ប្ដូរ
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setPage(1);
  };

  const totalPages = Math.max(1, Math.ceil(filteredSuppliers.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageStart = filteredSuppliers.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const pageEnd = Math.min(currentPage * PAGE_SIZE, filteredSuppliers.length);
  const paginatedSuppliers = useMemo(
    () =>
      filteredSuppliers.slice(
        (currentPage - 1) * PAGE_SIZE,
        currentPage * PAGE_SIZE
      ),
    [filteredSuppliers, currentPage]
  );

  const fetchData = async () => {
    try {
      const [supRes, notifRes] = await Promise.all([
        axiosClient.get("/suppliers"),
        axiosClient.get("/notifications"),
      ]);
      setSuppliers(toArray(supRes.data));
      setAlerts(toArray(notifRes.data).filter(
        (n) => n.type === "OUT_OF_STOCK" || n.type === "LOW_STOCK"
      ));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openCreate = () => {
    setEditId(null);
    setForm({ supplier_name: "", contact_name: "", phone: "", email: "", address: "" });
    setShowModal(true);
  };

  const openEdit = (s) => {
    setEditId(s.supplier_id || s.id);
    setForm({
      supplier_name: s.supplier_name || "",
      contact_name: s.contact_name || "",
      phone: s.phone || "",
      email: s.email || "",
      address: s.address || "",
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editId) {
        await axiosClient.put(`/suppliers/${editId}`, form);
        toast.success("Supplier updated successfully", "Supplier Updated");
      } else {
        await axiosClient.post("/suppliers", form);
        toast.success("Supplier created successfully", "Supplier Created");
      }
      setShowModal(false);
      fetchData();
    } catch (err) {
      console.error(err);
      toast.error(
        err.response?.data?.message || `Failed to ${editId ? "update" : "create"} supplier`,
        editId ? "Update Failed" : "Create Failed"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteRequest = (s) => setDeleteTarget(s);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await axiosClient.delete(`/suppliers/${deleteTarget.supplier_id || deleteTarget.id}`);
      toast.deleted("Supplier deleted successfully", "Supplier Deleted");
      setDeleteTarget(null);
      fetchData();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Failed to delete supplier", "Delete Failed");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="p-3 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="w-10 h-10 rounded-xl bg-coffee-600/10 flex items-center justify-center shrink-0">
            <Truck className="text-coffee-600" size={22} />
          </span>
          <div>
            <h1 className="text-2xl font-bold text-stone-800 leading-tight">Supplier Partners</h1>
            <p className="text-stone-500 text-sm mt-0.5">
              Manage supply partners & restock alerts
            </p>
          </div>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center justify-center gap-2 bg-coffee-600 hover:bg-coffee-700 text-white px-4 py-2.5 rounded-xl font-medium text-sm shadow-sm shadow-coffee-600/20 transition cursor-pointer"
        >
          <Plus size={18} /> Add Supplier
        </button>
      </div>

      {/* Restock Alerts */}
      {alerts.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          {alerts.slice(0, 6).map((a) => (
            <div
              key={a.notification_id}
              className={`bg-white rounded-xl border p-4 shadow-sm ${
                a.type === "OUT_OF_STOCK" ? "border-red-200" : "border-amber-200"
              }`}
            >
              <div className="flex items-start gap-3">
                <span
                  className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                    a.type === "OUT_OF_STOCK"
                      ? "bg-red-600/10 text-red-600"
                      : "bg-amber-500/10 text-amber-600"
                  }`}
                >
                  {a.type === "OUT_OF_STOCK" ? <PackageX size={18} /> : <AlertTriangle size={18} />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-stone-800">{a.title}</p>
                  <p className="text-xs text-stone-500 mt-0.5 leading-relaxed break-words">
                    {a.message}
                  </p>
                  {a.product && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {a.supplier ? (
                        <a
                          href={a.supplier.phone ? `tel:${a.supplier.phone}` : "#"}
                          title={`Contact ${a.supplier.supplier_name}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-coffee-50 text-coffee-700 hover:bg-coffee-100 transition cursor-pointer"
                        >
                          <PhoneCall size={12} /> Contact {a.supplier.supplier_name}
                        </a>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-stone-100 text-stone-500">
                          No supplier assigned
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Main Card */}
      <div className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden">
        {/* Toolbar — Search */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between px-5 py-4 border-b border-stone-200">
          <div className="relative w-full lg:max-w-xs">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"
              size={16}
            />
            <input
              type="text"
              value={searchTerm}
              onChange={handleSearchChange}
              placeholder="Search suppliers..."
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
            <span className="font-medium text-stone-700">{filteredSuppliers.length}</span>{" "}
            {searchTerm ? "results" : "total suppliers"}
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[720px]">
            <thead>
              <tr className="bg-stone-50/80 text-[11px] uppercase tracking-wider text-stone-500">
                <th className="px-5 py-3 font-semibold">Supplier</th>
                <th className="px-5 py-3 font-semibold">Contact Person</th>
                <th className="px-5 py-3 font-semibold">Phone</th>
                <th className="px-5 py-3 font-semibold">Email</th>
                <th className="px-5 py-3 font-semibold">Products</th>
                <th className="px-5 py-3 font-semibold text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {!loading &&
                paginatedSuppliers.map((s) => (
                  <tr key={s.supplier_id || s.id} className="hover:bg-stone-50/70 transition">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <span className="w-9 h-9 rounded-lg bg-coffee-600/10 flex items-center justify-center shrink-0">
                          <Building2 className="text-coffee-600" size={18} />
                        </span>
                        <div className="min-w-0">
                          <p className="font-medium text-stone-800 leading-tight truncate max-w-[200px]">
                            {s.supplier_name}
                          </p>
                          {s.address && (
                            <p className="text-xs text-stone-400 mt-0.5 flex items-center gap-1">
                              <MapPin size={11} /> {s.address}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center gap-1 text-sm text-stone-600">
                        <User size={13} className="text-stone-400" />
                        {s.contact_name || "—"}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center gap-1 text-sm text-stone-600">
                        <Phone size={13} className="text-stone-400" />
                        {s.phone || "—"}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center gap-1 text-sm text-stone-600">
                        <Mail size={13} className="text-stone-400" />
                        {s.email || "—"}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center rounded-full bg-stone-100 px-2.5 py-1 text-xs font-medium text-stone-600 tabular-nums">
                        {s.products_count ?? (s.products || []).length} products
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <div className="flex items-center justify-center space-x-2">
                        <button
                          onClick={() => openEdit(s)}
                          title="Edit supplier"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-coffee-600 bg-coffee-50/60 border border-coffee-100 rounded-lg shadow-sm hover:bg-coffee-100 hover:border-coffee-200 active:scale-[0.97] focus:outline-none focus:ring-2 focus:ring-coffee-200 transition cursor-pointer"
                        >
                          <Edit size={14} /> Edit
                        </button>
                        <button
                          onClick={() => handleDeleteRequest(s)}
                          title="Delete supplier"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-600 bg-red-50/60 border border-red-100 rounded-lg shadow-sm hover:bg-red-100 hover:border-red-200 active:scale-[0.97] focus:outline-none focus:ring-2 focus:ring-red-200 transition cursor-pointer"
                        >
                          <Trash2 size={14} /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              {!loading && filteredSuppliers.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-16 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Truck className="text-stone-300" size={28} />
                      <p className="text-sm text-stone-400">
                        {searchTerm
                          ? `No suppliers found for "${searchTerm}".`
                          : "No suppliers yet."}
                      </p>
                      {!searchTerm && (
                        <button
                          onClick={openCreate}
                          className="mt-1 inline-flex items-center gap-1.5 text-xs font-medium text-coffee-600 hover:text-coffee-700 cursor-pointer"
                        >
                          <Plus size={14} /> Add your first supplier
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
              {loading && (
                <tr>
                  <td colSpan={6} className="px-5 py-16 text-center text-sm text-stone-400">
                    Loading suppliers...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer — Pagination */}
        <div className="flex flex-col lg:flex-row items-center justify-between gap-3 px-5 py-3.5 border-t border-stone-200 bg-stone-50/50">
          <p className="text-xs text-stone-500">
            Showing{" "}
            <span className="font-medium text-stone-700">
              {pageStart}&ndash;{pageEnd}
            </span>{" "}
            of <span className="font-medium text-stone-700">{filteredSuppliers.length}</span> suppliers
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

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-stone-900/50 backdrop-blur-sm flex justify-center items-start z-50 p-4 pt-16 sm:pt-24">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl ring-1 ring-stone-200/60 overflow-hidden max-h-[88vh] overflow-y-auto">
            <div className="flex items-start justify-between px-6 pt-5 pb-4 border-b border-stone-100">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-xl bg-coffee-600/10 flex items-center justify-center shrink-0">
                  <Truck className="text-coffee-600" size={20} />
                </span>
                <h3 className="text-base font-bold text-stone-800 leading-tight">
                  {editId ? "Edit Supplier" : "Add New Supplier"}
                </h3>
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
              <div>
                <label className="block text-xs font-semibold text-stone-500 mb-1.5">
                  Supplier Name *
                </label>
                <input
                  type="text"
                  value={form.supplier_name}
                  onChange={(e) => setForm({ ...form, supplier_name: e.target.value })}
                  required
                  placeholder="e.g. Khmer Best Trading Co."
                  className="w-full rounded-lg border border-stone-200 bg-white px-3.5 py-2.5 text-sm text-stone-800 shadow-sm transition focus:border-coffee-500 focus:ring-2 focus:ring-coffee-500/30 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-500 mb-1.5">
                  Contact Person
                </label>
                <input
                  type="text"
                  value={form.contact_name}
                  onChange={(e) => setForm({ ...form, contact_name: e.target.value })}
                  placeholder="Full name"
                  className="w-full rounded-lg border border-stone-200 bg-white px-3.5 py-2.5 text-sm text-stone-800 shadow-sm transition focus:border-coffee-500 focus:ring-2 focus:ring-coffee-500/30 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-500 mb-1.5">Phone</label>
                  <input
                    type="text"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="09xx xxx xxx"
                    className="w-full rounded-lg border border-stone-200 bg-white px-3.5 py-2.5 text-sm text-stone-800 shadow-sm transition focus:border-coffee-500 focus:ring-2 focus:ring-coffee-500/30 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-500 mb-1.5">Email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="supplier@mail.com"
                    className="w-full rounded-lg border border-stone-200 bg-white px-3.5 py-2.5 text-sm text-stone-800 shadow-sm transition focus:border-coffee-500 focus:ring-2 focus:ring-coffee-500/30 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-500 mb-1.5">Address</label>
                <input
                  type="text"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  placeholder="Street, city"
                  className="w-full rounded-lg border border-stone-200 bg-white px-3.5 py-2.5 text-sm text-stone-800 shadow-sm transition focus:border-coffee-500 focus:ring-2 focus:ring-coffee-500/30 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  disabled={submitting}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-stone-600 border border-stone-200 bg-white hover:bg-stone-100 transition disabled:opacity-60 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold text-white bg-coffee-600 hover:bg-coffee-700 shadow-sm shadow-coffee-600/20 transition disabled:opacity-60 cursor-pointer"
                >
                  {submitting && <Loader2 className="animate-spin" size={16} />}
                  {editId ? "Update Supplier" : "Save Supplier"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteTarget && (
        <ConfirmDialog
          open
          title="Delete Supplier"
          message={`Are you sure you want to delete "${deleteTarget.supplier_name}"? Products assigned to this supplier will keep their data but lose the supplier link. This action cannot be undone.`}
          loading={deleting}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}