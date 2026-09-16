import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import { useToast } from '../../context/useToast';
import { Plus, Edit, Trash2, Coffee, Search, X, ChevronDown, ImagePlus } from 'lucide-react';
import Pagination from '../../components/Pagination';
import ConfirmDialog from '../../components/ConfirmDialog';

const STORAGE_BASE = `${new URL(axiosClient.defaults.baseURL).origin}/storage/`;
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

export default function ProductList() {
  const toast = useToast();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [searchParams, setSearchParams] = useSearchParams();
  const activeCategoryId = searchParams.get('category') || '';

  // Form States
  const [productName, setProductName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // ១. Fetch Products & Categories
  const fetchData = async () => {
    try {
      const [prodRes, catRes, supRes] = await Promise.all([
        axiosClient.get('/products'),
        axiosClient.get('/categories'),
        axiosClient.get('/suppliers')
      ]);
      const fetchedCategories = catRes.data.data || catRes.data;
      setProducts(prodRes.data.data || prodRes.data);
      setCategories(fetchedCategories);
      setSuppliers(supRes.data.data || supRes.data || []);
    } catch (err) {
      console.error('Error fetching data:', err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // ២. Open Modal (Create / Edit)
  const handleOpenModal = (product = null) => {
    if (product) {
      // ប្រើ product_id តាម Database Structure ថ្មី
      setEditId(product.product_id || product.id);
      setProductName(product.product_name || product.name || '');
      setCategoryId(product.category_id || '');
      setPrice(product.price || '');
      setStock(product.stock ?? '');
      setSupplierId(product.supplier_id || '');
      setPreviewUrl(
        product.image 
          ? `${STORAGE_BASE}${product.image}` 
          : (product.image_url || '')
      );
      setImageFile(null);
    } else {
      setEditId(null);
      setProductName('');
      // កំណត់ Category ទី១ ជា default value ពេលបង្កើតថ្មី
      const firstCatId = categories[0]?.category_id || categories[0]?.id || '';
      setCategoryId(firstCatId);
      setPrice('');
      setStock('');
      setSupplierId('');
      setPreviewUrl('');
      setImageFile(null);
    }
    setIsOpen(true);
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

    const formData = new FormData();
    formData.append('product_name', productName);
    formData.append('category_id', categoryId);
    formData.append('price', price);
    formData.append('stock', stock === '' ? 0 : stock);
    if (supplierId) {
      formData.append('supplier_id', supplierId);
    }

    if (imageFile) {
      formData.append('image', imageFile);
    }

    try {
      if (editId) {
        // Method Spoofing សម្រាប់ Laravel File Upload លើ Update Route
        formData.append('_method', 'PUT');
        await axiosClient.post(`/products/${editId}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        toast.success('Product updated successfully', 'Product Updated');
      } else {
        await axiosClient.post('/products', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        toast.success('Product created successfully', 'Product Created');
      }

      setIsOpen(false);
      fetchData();
    } catch (err) {
      console.error('Error saving product:', err.response?.data || err);
      toast.error(
        err.response?.data?.message || 'Could not save product',
        'Save Failed',
      );
    }
  };

  // ៥. Delete Product
  const handleDelete = (prod) => setDeleteTarget(prod);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await axiosClient.delete(`/products/${deleteTarget.product_id || deleteTarget.id}`);
      toast.deleted('Product deleted successfully', 'Product Deleted');
      setDeleteTarget(null);
      fetchData();
    } catch (err) {
      console.error('Error deleting product:', err);
      toast.error(
        err.response?.data?.message || 'Failed to delete product',
        'Delete Failed',
      );
    } finally {
      setDeleting(false);
    }
  };

  // ៦. Live Search Filtering — useMemo ដើម្បីកុំគណនាឡើងវិញនៅពេល re-render រាល់ដង
  const filteredProducts = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return products.filter((prod) => {
      const matchesCategory = activeCategoryId
        ? String(prod.category_id || prod.category?.category_id || '') === String(activeCategoryId)
        : true;
      const matchesSearch = !query ||
        (prod.product_name || prod.name || '').toLowerCase().includes(query) ||
        (prod.category?.category_name || prod.category?.name || '').toLowerCase().includes(query);
      return matchesCategory && matchesSearch;
    });
  }, [products, searchTerm, activeCategoryId]);

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageStart = filteredProducts.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const pageEnd = Math.min(currentPage * PAGE_SIZE, filteredProducts.length);
  const paginatedProducts = useMemo(
    () => filteredProducts.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [filteredProducts, currentPage]
  );

  const activeCategory = useMemo(
    () =>
      categories.find(
        (cat) => String(cat.category_id || cat.id) === String(activeCategoryId)
      ),
    [categories, activeCategoryId]
  );

  const clearCategoryFilter = () => {
    searchParams.delete('category');
    setSearchParams(searchParams);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="w-10 h-10 rounded-xl bg-coffee-600/10 flex items-center justify-center shrink-0">
            <Coffee className="text-coffee-600" size={22} />
          </span>
          <div>
            <h1 className="text-2xl font-bold text-stone-800 leading-tight">Product Management</h1>
            <p className="text-stone-500 text-sm mt-0.5">Manage drinks, prices, and menu items</p>
          </div>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="inline-flex items-center justify-center gap-2 bg-coffee-600 hover:bg-coffee-700 text-white px-4 py-2.5 rounded-xl font-medium text-sm shadow-sm shadow-coffee-600/20 transition cursor-pointer"
        >
          <Plus size={18} /> Add Product
        </button>
      </div>

      {/* Main Card */}
      <div className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden">
        {/* Toolbar */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between px-5 py-4 border-b border-stone-200">
          <div className="relative w-full lg:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={16} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search products or categories..."
              className="w-full border border-stone-200 rounded-lg pl-9 pr-8 py-2 bg-stone-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-coffee-500/60 focus:border-coffee-500 text-sm transition"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 cursor-pointer"
              >
                <X size={16} />
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <select
                value={activeCategoryId}
                onChange={(e) => {
                  if (e.target.value) {
                    setSearchParams({ category: e.target.value });
                  } else {
                    clearCategoryFilter();
                  }
                }}
                className="appearance-none border border-stone-200 rounded-lg pl-3.5 pr-9 py-2 bg-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-coffee-500/60 focus:border-coffee-500 text-sm text-stone-700"
              >
                <option value="">All Categories</option>
                {categories.map((cat) => {
                  const catId = cat.category_id || cat.id;
                  return (
                    <option key={catId} value={catId}>
                      {cat.category_name || cat.name}
                    </option>
                  );
                })}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" size={15} />
            </div>
            {activeCategory && (
              <span className="hidden md:inline-flex items-center gap-1 text-xs font-medium text-coffee-700 bg-coffee-50 border border-coffee-200 rounded-full px-2.5 py-1">
                {activeCategory.category_name || activeCategory.name}
              </span>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-stone-50/80 text-[11px] uppercase tracking-wider text-stone-500">
                <th className="px-5 py-3 font-semibold">Product</th>
                <th className="px-5 py-3 font-semibold">Category</th>
                <th className="px-5 py-3 font-semibold text-right">Price</th>
                <th className="px-5 py-3 font-semibold text-right">Stock</th>
                <th className="px-5 py-3 font-semibold text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filteredProducts.length > 0 ? (
                paginatedProducts.map((prod) => {
                  const prodId = prod.product_id || prod.id;
                  const name = prod.product_name || prod.name || 'Untitled';
                  const imgSrc = prod.image
                    ? `${STORAGE_BASE}${prod.image}`
                    : prod.image_url;
                  const stockQty = Number(prod.stock || 0);
                  const stockBadge =
                    stockQty <= 0
                      ? 'bg-red-50 text-red-600 ring-red-600/10'
                      : stockQty <= 5
                        ? 'bg-amber-50 text-amber-600 ring-amber-600/10'
                        : 'bg-emerald-50 text-emerald-600 ring-emerald-600/10';
                  return (
                    <tr key={prodId} className="hover:bg-stone-50/70 transition">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <ImageWithFallback src={imgSrc} alt={name} initials={getInitials(name)} />
                          <div className="min-w-0">
                            <p className="font-medium text-stone-800 leading-tight truncate max-w-[220px]">{name}</p>
                            <p className="text-xs text-stone-400 mt-0.5">ID: {prodId}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="inline-flex items-center rounded-full bg-coffee-50 px-2.5 py-1 text-xs font-medium text-coffee-700 ring-1 ring-inset ring-coffee-600/10">
                          {prod.category?.category_name || prod.category?.name || 'Beverage'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <span className="font-semibold text-stone-900 tabular-nums">
                          ${parseFloat(prod.price || 0).toFixed(2)}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset tabular-nums ${stockBadge}`}
                        >
                          {stockQty}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <div className="flex items-center justify-center space-x-2">
                          <button
                            onClick={() => handleOpenModal(prod)}
                            title="Edit product"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-coffee-600 bg-coffee-50/60 border border-coffee-100 rounded-lg shadow-sm hover:bg-coffee-100 hover:border-coffee-200 active:scale-[0.97] focus:outline-none focus:ring-2 focus:ring-coffee-200 transition cursor-pointer"
                          >
                            <Edit size={14} /> Edit
                          </button>
                          <button
                            onClick={() => handleDelete(prod)}
                            title="Delete product"
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
                  <td colSpan="5" className="px-5 py-16 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Search className="text-stone-300" size={28} />
                      <p className="text-sm text-stone-400">
                        {activeCategory
                          ? `No products in "${activeCategory.category_name || activeCategory.name}".`
                          : searchTerm
                            ? `No products found for "${searchTerm}".`
                            : 'No products yet.'}
                      </p>
                      <button
                        onClick={() => handleOpenModal()}
                        className="mt-1 inline-flex items-center gap-1.5 text-xs font-medium text-coffee-600 hover:text-coffee-700"
                      >
                        <Plus size={14} /> Add your first product
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
            of <span className="font-medium text-stone-700">{filteredProducts.length}</span> products
            {activeCategory && (
              <button
                onClick={clearCategoryFilter}
                className="ml-2 inline-flex items-center gap-1 font-medium text-coffee-600 hover:text-coffee-700 cursor-pointer"
              >
                <X size={12} /> Clear filter
              </button>
            )}
          </p>
          <Pagination page={currentPage} totalPages={totalPages} onPageChange={setPage} />
        </div>
      </div>

      {/* Modal Dialog */}
      {isOpen && (
        <div className="fixed inset-0 bg-stone-900/50 backdrop-blur-sm flex justify-center items-start z-50 p-4 pt-24">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl ring-1 ring-stone-200/60 overflow-hidden">
            {/* Header */}
            <div className="flex items-start justify-between px-6 pt-5 pb-4 border-b border-stone-100">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-xl bg-coffee-600/10 flex items-center justify-center shrink-0">
                  <Coffee className="text-coffee-600" size={20} />
                </span>
                <div>
                  <h2 className="text-base font-bold text-stone-800 leading-tight">
                    {editId ? 'Edit Product' : 'Add New Product'}
                  </h2>
                  <p className="text-xs text-stone-400 mt-0.5">
                    {editId
                      ? 'Update the details of this item'
                      : 'Add a new item to your menu'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition cursor-pointer"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-stone-500 mb-1.5">
                  Product Name
                </label>
                <input
                  type="text"
                  required
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  placeholder="e.g. Iced Latte"
                  className="w-full rounded-lg border border-stone-200 bg-white px-3.5 py-2.5 text-sm text-stone-800 placeholder:text-stone-400 shadow-sm transition focus:border-coffee-500 focus:ring-2 focus:ring-coffee-500/30 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-stone-500 mb-1.5">
                  Category
                </label>
                <select
                  required
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full rounded-lg border border-stone-200 bg-white px-3.5 py-2.5 text-sm text-stone-800 shadow-sm transition focus:border-coffee-500 focus:ring-2 focus:ring-coffee-500/30 focus:outline-none"
                >
                  <option value="">Select Category</option>
                  {categories.map((cat) => {
                    const catId = cat.category_id || cat.id;
                    return (
                      <option key={catId} value={catId}>
                        {cat.category_name || cat.name}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-stone-500 mb-1.5">
                  Price ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="2.50"
                  className="w-full rounded-lg border border-stone-200 bg-white px-3.5 py-2.5 text-sm text-stone-800 placeholder:text-stone-400 shadow-sm transition focus:border-coffee-500 focus:ring-2 focus:ring-coffee-500/30 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-stone-500 mb-1.5">
                    Stock
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={stock}
                    onChange={(e) => setStock(e.target.value)}
                    placeholder="0"
                    className="w-full rounded-lg border border-stone-200 bg-white px-3.5 py-2.5 text-sm text-stone-800 placeholder:text-stone-400 shadow-sm transition focus:border-coffee-500 focus:ring-2 focus:ring-coffee-500/30 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-stone-500 mb-1.5">
                    Supplier
                  </label>
                  <select
                    value={supplierId}
                    onChange={(e) => setSupplierId(e.target.value)}
                    className="w-full rounded-lg border border-stone-200 bg-white px-3.5 py-2.5 text-sm text-stone-800 shadow-sm transition focus:border-coffee-500 focus:ring-2 focus:ring-coffee-500/30 focus:outline-none"
                  >
                    <option value="">No supplier</option>
                    {suppliers.map((s) => {
                      const sid = s.supplier_id || s.id;
                      return (
                        <option key={sid} value={sid}>
                          {s.supplier_name}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-stone-500 mb-1.5">
                  Product Image
                </label>
                <label className="group flex flex-col items-center justify-center w-full min-h-24 rounded-xl border-2 border-dashed border-stone-200 bg-stone-50/50 px-4 py-5 text-center cursor-pointer transition hover:border-coffee-400 hover:bg-coffee-50/50">
                  <ImagePlus
                    size={24}
                    className="text-stone-400 group-hover:text-coffee-600 transition"
                  />
                  <span className="mt-1.5 text-xs font-medium text-stone-500 group-hover:text-coffee-700">
                    {imageFile
                      ? imageFile.name
                      : 'Click to upload product image'}
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
                      alt="Product preview"
                      className="w-14 h-14 object-cover rounded-lg ring-1 ring-stone-200"
                    />
                    <span className="text-xs text-stone-400">
                      Product image preview
                    </span>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-stone-600 border border-stone-200 bg-white hover:bg-stone-100 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold text-white bg-coffee-600 hover:bg-coffee-700 shadow-sm shadow-coffee-600/20 transition cursor-pointer"
                >
                  {editId ? 'Update Product' : 'Save Product'}
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
          title="Delete Product"
          message={`Are you sure you want to delete "${deleteTarget.product_name || deleteTarget.name || 'this product'}"? This action cannot be undone.`}
          loading={deleting}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}