import { useState, useEffect } from 'react';
import axiosClient from '../../api/axiosClient';
import { ShoppingBag, Eye, Calendar, Utensils, Filter } from 'lucide-react';

const toISODate = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const rangeForDays = (days) => {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - (days - 1));
  return { start: toISODate(start), end: toISODate(end) };
};

// Segmented Control — ដូច RevenueReport
const SEGMENTS = [
  { key: 'today', label: 'Today', days: 1 },
  { key: '7d', label: '7 Days', days: 7 },
  { key: '30d', label: '30 Days', days: 30 },
  { key: 'all', label: 'All' },
];

export default function OrderList() {
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);

  // តម្លៃបញ្ចូល (Draft) និងតម្លៃដែលបានអនុវត្ត (Applied) ដាច់ដោយឡែកពីគ្នា
  const [draftStart, setDraftStart] = useState('');
  const [draftEnd, setDraftEnd] = useState('');
  const [appliedStart, setAppliedStart] = useState('');
  const [appliedEnd, setAppliedEnd] = useState('');

  // Validation៖ End Date មិនអាចមុន Start Date បានទេ
  const dateError = draftStart && draftEnd && draftEnd < draftStart
    ? 'ថ្ងៃបញ្ចប់ (End Date) មិនអាចមុនថ្ងៃចាប់ផ្ដើម (Start Date) បានទេ។'
    : null;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const params = { page, per_page: perPage };
        if (appliedStart) params.start_date = appliedStart;
        if (appliedEnd) params.end_date = appliedEnd;
        const res = await axiosClient.get('/orders', { params });
        const payload = Array.isArray(res.data) ? { data: res.data } : res.data;
        const paginated = payload?.data;
        const items = Array.isArray(paginated) ? paginated : (paginated?.data || []);
        if (!cancelled) {
          setOrders(items);
          setTotal(Number(paginated?.total) || items.length);
          setLastPage(Math.max(Number(paginated?.last_page) || 1, 1));
          setPage(Number(paginated?.current_page) || page);
        }
      } catch (err) {
        console.error('Error fetching order history:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [page, perPage, appliedStart, appliedEnd]);

  const from = total === 0 ? 0 : (page - 1) * perPage + 1;
  const to = Math.min(page * perPage, total);

  // កំណត់រហ័ស (Quick Presets) — តែបំពេញ Draft ឲ្យអ្នកប្រើចុច Apply
  const applyPreset = (days) => {
    const { start, end } = rangeForDays(days);
    setDraftStart(start);
    setDraftEnd(end);
  };

  // Segmented Control — អនុវត្តភ្លាមៗ
  const selectSegment = (seg) => {
    if (seg.key === 'all') {
      setDraftStart('');
      setDraftEnd('');
      setAppliedStart('');
      setAppliedEnd('');
      setPage(1);
      return;
    }
    const { start, end } = rangeForDays(seg.days);
    setDraftStart(start);
    setDraftEnd(end);
    setAppliedStart(start);
    setAppliedEnd(end);
    setPage(1);
  };

  const segmentActive = (seg) => {
    if (seg.key === 'all') return !appliedStart && !appliedEnd;
    const { start, end } = rangeForDays(seg.days);
    return appliedStart === start && appliedEnd === end;
  };

  const applyFilter = () => {
    if (dateError) return;
    setAppliedStart(draftStart);
    setAppliedEnd(draftEnd);
    setPage(1);
  };

  const clearFilter = () => {
    setDraftStart('');
    setDraftEnd('');
    setAppliedStart('');
    setAppliedEnd('');
    setPage(1);
  };

  const isFilterActive = Boolean(appliedStart || appliedEnd);

  const pageNumbers = () => {
    if (lastPage <= 7) {
      return Array.from({ length: lastPage }, (_, i) => i + 1);
    }
    const pages = [1];
    const start = Math.max(2, page - 1);
    const end = Math.min(lastPage - 1, page + 1);
    if (start > 2) pages.push('…');
    for (let i = start; i <= end; i += 1) pages.push(i);
    if (end < lastPage - 1) pages.push('…');
    pages.push(lastPage);
    return pages;
  };

  const changePage = (p) => {
    if (p >= 1 && p <= lastPage) setPage(p);
  };

  const handleViewDetails = (order) => {
    setSelectedOrder(order);
    setIsOpen(true);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold text-stone-800 flex items-center gap-2">
            <ShoppingBag className="text-coffee-600" /> Order History
          </h1>
          <p className="text-stone-500 text-sm">View and manage past customer orders & receipts</p>
        </div>

        {/* Segmented Control — ជ្រើសរើសរយៈពេលរហ័ស */}
        <div className="flex flex-wrap items-center gap-1.5 bg-white border border-stone-200 rounded-xl p-1.5 shadow-sm">
          {SEGMENTS.map((seg) => (
            <button
              key={seg.key}
              onClick={() => selectSegment(seg)}
              className={`px-3.5 py-1.5 rounded-lg text-sm font-semibold transition cursor-pointer ${
                segmentActive(seg)
                  ? 'bg-coffee-600 text-white shadow-sm shadow-coffee-600/20'
                  : 'text-stone-600 hover:bg-stone-100'
              }`}
            >
              {seg.label}
            </button>
          ))}
        </div>
      </div>

      {/* Start Date - End Date Filter */}
      <div className="bg-white rounded-2xl shadow-sm border border-stone-100 p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-stone-700">
          <Filter size={16} className="text-coffee-600" />
          Date Range
          {isFilterActive && (
            <span className="ml-1 px-2 py-0.5 bg-coffee-50 text-coffee-700 rounded-full text-xs font-medium">
              {appliedStart || '…'} — {appliedEnd || '…'}
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-stone-500 font-medium">Start Date</label>
            <input
              type="date"
              value={draftStart}
              max={draftEnd || undefined}
              onChange={(e) => setDraftStart(e.target.value)}
              className="px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-sm text-stone-700 outline-none focus:border-coffee-500 transition"
            />
          </div>
          <span className="pb-2.5 text-stone-400 text-sm">→</span>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-stone-500 font-medium">End Date</label>
            <input
              type="date"
              value={draftEnd}
              min={draftStart || undefined}
              onChange={(e) => setDraftEnd(e.target.value)}
              className="px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-sm text-stone-700 outline-none focus:border-coffee-500 transition"
            />
          </div>

          {/* Quick Presets */}
          <div className="flex gap-2 pb-1">
            <button
              onClick={() => applyPreset(7)}
              className="px-3 py-2 bg-stone-100 hover:bg-coffee-50 text-stone-700 hover:text-coffee-700 rounded-xl text-xs font-semibold transition"
            >
              7 Days
            </button>
            <button
              onClick={() => applyPreset(30)}
              className="px-3 py-2 bg-stone-100 hover:bg-coffee-50 text-stone-700 hover:text-coffee-700 rounded-xl text-xs font-semibold transition"
            >
              30 Days
            </button>
          </div>

          <div className="flex gap-2 pb-1">
            <button
              onClick={applyFilter}
              disabled={Boolean(dateError)}
              className="px-4 py-2 bg-coffee-600 hover:bg-coffee-700 disabled:opacity-40 text-white rounded-xl text-xs font-bold transition"
            >
                Apply
            </button>
            <button
              onClick={clearFilter}
              className="px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-semibold transition"
            >
                Clear
            </button>
          </div>
        </div>

        {dateError && (
          <p className="text-xs font-medium text-red-500">{dateError}</p>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-stone-100 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-stone-50 border-b border-stone-100 text-stone-600 text-sm">
              <th className="p-4">Order ID</th>
              <th className="p-4">Table / Type</th>
              <th className="p-4">Date & Time</th>
              <th className="p-4">Total Amount</th>
              <th className="p-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100 text-stone-700 text-sm">
            {orders.length > 0 ? (
              orders.map((order) => {
                const orderId = order.order_id || order.id;
                return (
                  <tr key={orderId} className="hover:bg-stone-50/50 transition">
                    <td className="p-4 font-bold text-stone-800">#{orderId}</td>
                    <td className="p-4">
                      <span className="flex items-center gap-1 font-semibold text-stone-700">
                        <Utensils size={14} className="text-coffee-600" />
                        {order.table?.table_number || order.order_type || (order.table_id ? `Table ${order.table_id}` : 'TAKEAWAY')}
                      </span>
                    </td>
                    <td className="p-4 text-stone-500">
                      <span className="flex items-center gap-1">
                        <Calendar size={14} />
                        {order.created_at ? new Date(order.created_at).toLocaleString() : 'N/A'}
                      </span>
                    </td>
                    <td className="p-4 font-bold text-coffee-600">
                      ${parseFloat(order.total_amount || 0).toFixed(2)}
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => handleViewDetails(order)}
                        className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl font-medium text-xs flex items-center gap-1.5 ml-auto transition"
                      >
                        <Eye size={14} /> Details
                      </button>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="5" className="p-6 text-center text-stone-400">
                  {loading ? 'Loading orders...' : 'No past orders found.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-stone-100">
          <p className="text-sm text-stone-400">
            {total > 0 ? (
              <>Showing <span className="font-semibold text-stone-700">{from}</span>–<span className="font-semibold text-stone-700">{to}</span> of <span className="font-semibold text-stone-700">{total}</span> orders</>
            ) : (
              'No orders'
            )}
          </p>
          <div className="flex items-center gap-2">
            <select
              value={perPage}
              onChange={(e) => { setPerPage(Number(e.target.value)); setPage(1); }}
              className="px-2 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl font-medium text-xs border border-transparent focus:border-stone-300 outline-none transition"
            >
              <option value={10}>10 / page</option>
              <option value={20}>20 / page</option>
              <option value={50}>50 / page</option>
            </select>
            <button
              onClick={() => changePage(page - 1)}
              disabled={page <= 1}
              className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl font-medium text-xs disabled:opacity-40 transition"
            >
              Previous
            </button>
            <div className="flex items-center gap-1">
              {pageNumbers().map((p, idx) =>
                p === '…' ? (
                  <span key={`dots-${idx}`} className="px-1 text-stone-400 text-xs">…</span>
                ) : (
                  <button
                    key={p}
                    onClick={() => changePage(p)}
                    className={`min-w-8 h-8 px-2 rounded-xl text-xs font-semibold transition ${
                      p === page
                        ? 'bg-coffee-600 text-white'
                        : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
                    }`}
                  >
                    {p}
                  </button>
                )
              )}
            </div>
            <button
              onClick={() => changePage(page + 1)}
              disabled={page >= lastPage}
              className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl font-medium text-xs disabled:opacity-40 transition"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Modal View Details */}
      {isOpen && selectedOrder && (
        <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm flex justify-center items-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-xl space-y-4">
            <div className="flex justify-between items-center border-b border-stone-100 pb-3">
              <div>
                <h2 className="text-xl font-bold text-stone-800">
                  Order #{selectedOrder.order_id || selectedOrder.id}
                </h2>
                <p className="text-xs text-stone-400">
                  {selectedOrder.created_at ? new Date(selectedOrder.created_at).toLocaleString() : 'N/A'}
                </p>
              </div>
              <span className="px-3 py-1 bg-coffee-50 text-coffee-700 font-bold rounded-xl text-sm">
                {selectedOrder.table?.table_number || selectedOrder.order_type}
              </span>
            </div>

            <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
              <h3 className="text-xs font-bold uppercase tracking-wider text-stone-400">Items Ordered</h3>
              {(selectedOrder.details || selectedOrder.order_details || selectedOrder.items || []).map((item, idx) => {
                const itemPrice = parseFloat(item.unit_price || item.price || item.product?.price || 0);
                const itemQty = parseInt(item.quantity || 1);
                const itemSubtotal = item.subtotal ? parseFloat(item.subtotal) : itemPrice * itemQty;

                return (
                  <div key={item.id || idx} className="flex justify-between items-center bg-stone-50 p-3 rounded-xl">
                    <div>
                      <h4 className="font-semibold text-stone-800 text-sm">
                        {item.product?.product_name || item.product?.name || `Product #${item.product_id}`}
                      </h4>
                      <p className="text-xs text-stone-500">
                        Qty: {itemQty}
                      </p>
                    </div>
                    <span className="font-bold text-stone-700 text-sm">
                      ${itemSubtotal.toFixed(2)}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="border-t border-stone-100 pt-3 flex justify-between font-bold text-base">
              <span>Total Payment</span>
              <span className="text-coffee-600">
                ${parseFloat(selectedOrder.total_amount || 0).toFixed(2)}
              </span>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setIsOpen(false)}
                className="px-5 py-2 bg-stone-800 text-white rounded-xl hover:bg-stone-900 transition text-sm font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}