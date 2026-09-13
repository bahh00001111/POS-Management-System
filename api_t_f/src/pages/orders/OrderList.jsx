import { useState, useEffect } from 'react';
import axiosClient from '../../api/axiosClient';
import { ShoppingBag, Eye, Calendar, Utensils } from 'lucide-react';

export default function OrderList() {
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await axiosClient.get('/orders');
        const data = Array.isArray(res.data) ? res.data : (res.data.data || []);
        if (!cancelled) setOrders(data);
      } catch (err) {
        console.error('Error fetching order history:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleViewDetails = (order) => {
    setSelectedOrder(order);
    setIsOpen(true);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-stone-800 flex items-center gap-2">
            <ShoppingBag className="text-coffee-600" /> Order History
          </h1>
          <p className="text-stone-500 text-sm">View and manage past customer orders & receipts</p>
        </div>
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