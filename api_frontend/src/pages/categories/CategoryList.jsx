import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import axiosClient from "../../api/axiosClient";
import { useToast } from "../../context/useToast";
import { Plus, Edit, Trash2, FolderTree, Loader2, Search, X, ArrowRight, ImagePlus } from "lucide-react";
import Pagination from "../../components/Pagination";
import ConfirmDialog from "../../components/ConfirmDialog";

const PAGE_SIZE = 10;

const getInitials = (name = "") => {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const initials = (words[0]?.[0] || "") + (words[1]?.[0] || "");
  return initials ? initials.toUpperCase() : "?";
};

function ImageWithFallback({ src, alt, initials, size = "w-10 h-10" }) {
  const [failed, setFailed] = useState(false);
  const base = `${size} rounded-lg ring-1 ring-stone-200 flex-shrink-0`;
  if (!src || failed) {
    return (
      <span className={`${base} bg-stone-100 flex items-center justify-center text-xs font-semibold text-stone-500`}>
        {initials}
      </span>
    );
  }
  return <img src={src} alt={alt} className={`${base} object-cover`} onError={() => setFailed(true)} />;
}

export default function CategoryList() {
  const navigate = useNavigate();
  const toast = useToast();
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [categoryName, setCategoryName] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // ១. Fetch Categories & Products
  const fetchCategories = useCallback(async () => {
    try {
      const [catRes, prodRes] = await Promise.all([
        axiosClient.get("/categories"),
        axiosClient.get("/products"),
      ]);
      const cats = Array.isArray(catRes.data) ? catRes.data : catRes.data.data || [];
      const prods = Array.isArray(prodRes.data) ? prodRes.data : prodRes.data.data || [];
      setCategories(cats);
      setProducts(prods);
    } catch (err) {
      console.error("Error fetching categories:", err);
      if (err.response?.status !== 401) {
        alert("Failed to load categories.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const countProductsIn = useCallback(
    (cat) => {
      const catId = cat.category_id || cat.id;
      return products.filter((p) => String(p.category_id || "") === String(catId)).length;
    },
    [products]
  );

  // ២. Open Modal for Create or Edit
  const handleOpenModal = (category = null) => {
    if (category) {
      const id = category.category_id || category.id;
      setEditId(id);
      setCategoryName(category.category_name || category.name || "");

      // កំណត់ Preview Image URL
      if (category.image_url) {
        setPreviewUrl(category.image_url);
      } else if (category.image) {
        const imagePath = category.image.startsWith("http")
          ? category.image
          : `http://127.0.0.1:8000/storage/${category.image}`;
        setPreviewUrl(imagePath);
      } else {
        setPreviewUrl("");
      }
      setImageFile(null);
    } else {
      // ករណីចុចប៊ូតុង "Add Category" ថ្មី
      setEditId(null);
      setCategoryName("");
      setPreviewUrl("");
      setImageFile(null);
    }
    setIsOpen(true);
  };

  const handleCloseModal = () => {
    setIsOpen(false);
    setEditId(null);
    setCategoryName("");
    setPreviewUrl("");
    setImageFile(null);
  };

  // ៣. Handle Image File Selection
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  // ៤. Submit Form (Create / Update with Multipart Payload)
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!categoryName.trim()) return;

    setSubmitting(true);

    const formData = new FormData();
    formData.append("category_name", categoryName);
    if (imageFile) {
      formData.append("image", imageFile);
    }

    try {
      if (editId) {
        formData.append("_method", "PUT");
        await axiosClient.post(`/categories/${editId}`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        toast.success("Category updated successfully", "Category Updated");
      } else {
        await axiosClient.post("/categories", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        toast.success("Category created successfully", "Category Created");
      }
      handleCloseModal();
      await fetchCategories();
    } catch (err) {
      console.error("Error saving category:", err);
      toast.error(
        err.response?.data?.message ||
          "Failed to save category.",
        "Save Failed",
      );
    } finally {
      setSubmitting(false);
    }
  };

  // ៥. Delete Category
  const handleDelete = (cat) => setDeleteTarget(cat);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await axiosClient.delete(`/categories/${deleteTarget.category_id || deleteTarget.id}`);
      toast.deleted("Category deleted successfully", "Category Deleted");
      setDeleteTarget(null);
      await fetchCategories();
    } catch (err) {
      console.error("Error deleting category:", err);
      toast.error(
        err.response?.data?.message || "Failed to delete category.",
        "Delete Failed",
      );
    } finally {
      setDeleting(false);
    }
  };

  // ៦. Live Search Filtering
  const filteredCategories = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return categories;
    return categories.filter((cat) =>
      (cat.category_name || cat.name || "").toLowerCase().includes(query)
    );
  }, [categories, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredCategories.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageStart = filteredCategories.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const pageEnd = Math.min(currentPage * PAGE_SIZE, filteredCategories.length);
  const paginatedCategories = useMemo(
    () =>
      filteredCategories.slice(
        (currentPage - 1) * PAGE_SIZE,
        currentPage * PAGE_SIZE
      ),
    [filteredCategories, currentPage]
  );

  return (
    <div className="p-3 sm:p-6 space-y-6">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="w-10 h-10 rounded-xl bg-coffee-600/10 flex items-center justify-center shrink-0">
            <FolderTree className="text-coffee-600" size={22} />
          </span>
          <div>
            <h1 className="text-2xl font-bold text-stone-800 leading-tight">Category Management</h1>
            <p className="text-stone-500 text-sm mt-0.5">Manage coffee & beverage categories</p>
          </div>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="inline-flex items-center justify-center gap-2 bg-coffee-600 hover:bg-coffee-700 text-white px-4 py-2.5 rounded-xl font-medium text-sm shadow-sm shadow-coffee-600/20 transition cursor-pointer"
        >
          <Plus size={18} /> Add Category
        </button>
      </div>

      {/* Main Card */}
      <div className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden">
        {/* Toolbar */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between px-5 py-4 border-b border-stone-200">
          <div className="relative w-full lg:max-w-xs">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"
              size={16}
            />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search categories..."
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
            <span className="font-medium text-stone-700">{categories.length}</span> total categories
          </p>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[560px]">
            <thead>
              <tr className="bg-stone-50/80 text-[11px] uppercase tracking-wider text-stone-500">
                <th className="px-5 py-3 font-semibold">ID</th>
                <th className="px-5 py-3 font-semibold">Category</th>
                <th className="px-5 py-3 font-semibold">Products</th>
                <th className="px-5 py-3 font-semibold text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {loading ? (
                <tr>
                  <td colSpan="4" className="px-5 py-16 text-center text-stone-400">
                    <div className="flex justify-center items-center gap-2">
                      <Loader2
                        className="animate-spin text-coffee-600"
                        size={20}
                      />{" "}
                      Loading categories...
                    </div>
                  </td>
                </tr>
              ) : filteredCategories.length > 0 ? (
                paginatedCategories.map((cat, index) => {
                  const catId = cat.category_id || cat.id || index + 1;
                  const imgSrc = cat.image_url
                    ? cat.image_url
                    : cat.image
                      ? cat.image.startsWith("http")
                        ? cat.image
                        : `http://127.0.0.1:8000/storage/${cat.image}`
                      : "";
                  return (
                    <tr key={catId} className="hover:bg-stone-50/70 transition">
                      <td className="px-5 py-3.5">
                        <span className="text-xs font-medium text-stone-400 tabular-nums">#{catId}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <ImageWithFallback
                            src={imgSrc}
                            alt={cat.category_name || "Category"}
                            initials={getInitials(cat.category_name || cat.name)}
                          />
                          <div className="min-w-0">
                            <button
                              onClick={() => navigate(`/products?category=${catId}`)}
                              className="group inline-flex items-center gap-1.5 font-medium text-stone-800 hover:text-coffee-600 transition"
                              title={`View products in ${cat.category_name || cat.name}`}
                            >
                              <span className="truncate max-w-[240px]">{cat.category_name || cat.name}</span>
                              <ArrowRight
                                size={14}
                                className="text-stone-400 group-hover:text-coffee-600 group-hover:translate-x-0.5 transition"
                              />
                            </button>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="inline-flex items-center rounded-full bg-stone-100 px-2.5 py-1 text-xs font-medium text-stone-600 tabular-nums">
                          {countProductsIn(cat)} products
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <div className="flex items-center justify-center space-x-2">
                          <button
                            onClick={() => handleOpenModal(cat)}
                            title="Edit category"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-coffee-600 bg-coffee-50/60 border border-coffee-100 rounded-lg shadow-sm hover:bg-coffee-100 hover:border-coffee-200 active:scale-[0.97] focus:outline-none focus:ring-2 focus:ring-coffee-200 transition cursor-pointer"
                          >
                            <Edit size={14} /> Edit
                          </button>
                          <button
                            onClick={() => handleDelete(cat)}
                            title="Delete category"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-600 bg-red-50/60 border border-red-100 rounded-lg shadow-sm hover:bg-red-100 hover:border-red-200 active:scale-[0.97] focus:outline-none focus:ring-2 focus:ring-red-200 transition cursor-pointer"
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
                  <td colSpan="4" className="px-5 py-16 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <FolderTree className="text-stone-300" size={28} />
                      <p className="text-sm text-stone-400">
                        {searchTerm
                          ? `No categories found for "${searchTerm}".`
                          : "No categories yet."}
                      </p>
                      <button
                        onClick={() => handleOpenModal()}
                        className="mt-1 inline-flex items-center gap-1.5 text-xs font-medium text-coffee-600 hover:text-coffee-700"
                      >
                        <Plus size={14} /> Add your first category
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="flex flex-col lg:flex-row items-center justify-between gap-3 px-5 py-3.5 border-t border-stone-200 bg-stone-50/50">
          <p className="text-xs text-stone-500">
            Showing{' '}
            <span className="font-medium text-stone-700">
              {pageStart}&ndash;{pageEnd}
            </span>{' '}
            of <span className="font-medium text-stone-700">{filteredCategories.length}</span> categories
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

      {/* Modal dialog for Create / Update */}
      {isOpen && (
        <div className="fixed inset-0 bg-stone-900/50 backdrop-blur-sm flex justify-center items-start z-50 p-4 pt-16 sm:pt-24">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl ring-1 ring-stone-200/60 overflow-hidden max-h-[88vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-start justify-between px-6 pt-5 pb-4 border-b border-stone-100">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-xl bg-coffee-600/10 flex items-center justify-center shrink-0">
                  <FolderTree className="text-coffee-600" size={20} />
                </span>
                <div>
                  <h2 className="text-base font-bold text-stone-800 leading-tight">
                    {editId ? "Edit Category" : "Add New Category"}
                  </h2>
                  <p className="text-xs text-stone-400 mt-0.5">
                    {editId
                      ? "Update the details of this category"
                      : "Organize your menu with a new category"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseModal}
                className="p-1.5 rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition cursor-pointer"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-stone-500 mb-1.5">
                  Category Name
                </label>
                <input
                  type="text"
                  required
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                  placeholder="e.g. Espresso, Cold Brew, Bakery"
                  className="w-full rounded-lg border border-stone-200 bg-white px-3.5 py-2.5 text-sm text-stone-800 placeholder:text-stone-400 shadow-sm transition focus:border-coffee-500 focus:ring-2 focus:ring-coffee-500/30 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-stone-500 mb-1.5">
                  Category Image
                </label>
                <label className="group flex flex-col items-center justify-center w-full min-h-24 rounded-xl border-2 border-dashed border-stone-200 bg-stone-50/50 px-4 py-5 text-center cursor-pointer transition hover:border-coffee-400 hover:bg-coffee-50/50">
                  <ImagePlus
                    size={24}
                    className="text-stone-400 group-hover:text-coffee-600 transition"
                  />
                  <span className="mt-1.5 text-xs font-medium text-stone-500 group-hover:text-coffee-700">
                    {imageFile
                      ? imageFile.name
                      : "Click to upload category image"}
                  </span>
                  <span className="text-[10px] text-stone-400 mt-0.5">
                    JPG, PNG, WEBP up to 2MB
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </label>
                {previewUrl && (
                  <div className="mt-3 flex items-center gap-3">
                    <img
                      src={previewUrl}
                      alt="Category preview"
                      className="w-14 h-14 object-cover rounded-lg ring-1 ring-stone-200"
                    />
                    <span className="text-xs text-stone-400">
                      Category image preview
                    </span>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleCloseModal}
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
                  {editId ? "Update Category" : "Save Category"}
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
          title="Delete Category"
          message={`Are you sure you want to delete "${deleteTarget.category_name || deleteTarget.name}"? This action cannot be undone.`}
          loading={deleting}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
