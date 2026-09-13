import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/useAuth';
import axiosClient from '../api/axiosClient';
import {
  User,
  Wallet,
  ShoppingBag,
  MapPin,
  Phone,
  DollarSign,
  Receipt,
  Coffee,
  FolderTree,
  TrendingUp,
  BarChart3,
  Clock,
  PieChart,
  Utensils,
  Target,
  CalendarCheck,
  Package,
  Loader2,
} from 'lucide-react';

function toArray(raw) {
  if (Array.isArray(raw)) return raw;
  if (raw && Array.isArray(raw.data)) return raw.data;
  if (raw && raw.data && Array.isArray(raw.data.data)) return raw.data.data;
  return [];
}

const parseDate = (value) => {
  if (!value) return null;
  const date = new Date(String(value).replace(' ', 'T'));
  return Number.isNaN(date.getTime()) ? null : date;
};

function StatCard({ icon: Icon, label, value, sub, iconBg, iconColor, loading }) {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-100 flex items-center justify-between">
      <div className="min-w-0">
        <p className="text-sm text-stone-500">{label}</p>
        <h3 className="text-2xl font-bold text-stone-800 mt-1 truncate">
          {loading ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="animate-spin" size={20} /> ...
            </span>
          ) : (
            value
          )}
        </h3>
        {sub && !loading && <p className="text-xs text-stone-400 mt-1">{sub}</p>}
      </div>
      <div className={`p-3 rounded-xl shrink-0 ${iconBg} ${iconColor}`}>
        <Icon />
      </div>
    </div>
  );
}

function MiniStat({ icon: Icon, label, value, iconBg, iconColor }) {
  return (
    <div className="bg-white p-5 rounded-2xl shadow-sm border border-stone-100">
      <div className={`p-2.5 w-fit rounded-xl ${iconBg} ${iconColor}`}>
        <Icon size={18} />
      </div>
      <p className="text-xs text-stone-500 mt-3">{label}</p>
      <h3 className="text-xl font-bold text-stone-800 mt-0.5">{value}</h3>
    </div>
  );
}

function ProgressRow({ label, value, max, colorClass }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div>
      <div className="flex justify-between text-sm mb-1.5">
        <span className="font-medium text-stone-700">{label}</span>
        <span className="font-bold text-stone-800">{value}</span>
      </div>
      <div className="h-2.5 bg-stone-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${colorClass}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState({ products: [], categories: [], orders: [] });
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState({ store_name: '', exchange_rate: 4000 });

  const roleList = user?.roles || [];
  const isAdmin = roleList.includes('Admin');
  const isManager = roleList.includes('Manager');
  const primaryRole =
    ['Admin', 'Manager', 'Cashier'].find((r) => roleList.includes(r)) || 'Staff';

  useEffect(() => {
    Promise.allSettled([
      axiosClient.get('/products'),
      axiosClient.get('/categories'),
      axiosClient.get('/orders'),
      axiosClient.get('/settings'),
    ])
      .then(([prodRes, catRes, ordRes, setRes]) => {
        setData({
          products: prodRes.status === 'fulfilled' ? toArray(prodRes.value.data) : [],
          categories: catRes.status === 'fulfilled' ? toArray(catRes.value.data) : [],
          orders: ordRes.status === 'fulfilled' ? toArray(ordRes.value.data) : [],
        });
        const settingsData =
          setRes.status === 'fulfilled' ? setRes.value.data?.data || {} : {};
        setSettings({
          store_name: settingsData.store_name || '',
          exchange_rate: parseFloat(settingsData.exchange_rate) || 4000,
        });
      })
      .catch((err) => console.error('Dashboard data fetch error:', err))
      .finally(() => setLoading(false));
  }, []);

  const { products, categories, orders } = data;

  const totalRevenue = useMemo(
    () => orders.reduce((sum, o) => sum + parseFloat(o.total_amount || 0), 0),
    [orders]
  );

  const orderItems = useMemo(
    () => (o) => o.details || o.order_details || o.items || [],
    []
  );

  const itemsSold = useMemo(
    () =>
      orders.reduce(
        (sum, o) =>
          sum + orderItems(o).reduce((a, i) => a + parseInt(i.quantity || 1, 10), 0),
        0
      ),
    [orders, orderItems]
  );

  const avgOrderValue = orders.length > 0 ? totalRevenue / orders.length : 0;

  const todayRevenue = useMemo(() => {
    const todayKey = new Date().toLocaleDateString();
    return orders
      .filter((o) => {
        const d = parseDate(o.created_at);
        return d && d.toLocaleDateString() === todayKey;
      })
      .reduce((sum, o) => sum + parseFloat(o.total_amount || 0), 0);
  }, [orders]);

  const todayOrders = useMemo(() => {
    const todayKey = new Date().toLocaleDateString();
    return orders.filter((o) => {
      const d = parseDate(o.created_at);
      return d && d.toLocaleDateString() === todayKey;
    }).length;
  }, [orders]);

  const weekRevenue = useMemo(() => {
    const days = [];
    for (let i = 6; i >= 0; i -= 1) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayKey = d.toLocaleDateString();
      const rev = orders
        .filter((o) => {
          const od = parseDate(o.created_at);
          return od && od.toLocaleDateString() === dayKey;
        })
        .reduce((sum, o) => sum + parseFloat(o.total_amount || 0), 0);
      days.push({
        label: d.toLocaleDateString(undefined, { weekday: 'short' }),
        rev,
      });
    }
    return days;
  }, [orders]);
  const maxWeekRev = Math.max(...weekRevenue.map((d) => d.rev), 0);

  const topProducts = useMemo(() => {
    const map = {};
    orders.forEach((o) => {
      orderItems(o).forEach((item) => {
        const p = item.product;
        const name =
          p?.product_name ||
          p?.name ||
          (item.product_id != null ? `Product #${item.product_id}` : 'Unknown');
        const qty = parseInt(item.quantity || 1, 10);
        const price = parseFloat(item.unit_price || item.price || p?.price || 0);
        if (!map[name]) map[name] = { name, qty: 0, revenue: 0 };
        map[name].qty += qty;
        map[name].revenue += price * qty;
      });
    });
    return Object.values(map)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);
  }, [orders, orderItems]);

  const categoryBreakdown = useMemo(() => {
    const catMap = {};
    categories.forEach((c) => {
      const id = c.category_id || c.id;
      if (id != null) catMap[String(id)] = c.category_name || c.name;
    });
    const counts = {};
    products.forEach((p) => {
      const name =
        p.category?.category_name ||
        p.category?.name ||
        catMap[String(p.category_id)] ||
        'Uncategorized';
      counts[name] = (counts[name] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [products, categories]);

  const orderTypes = useMemo(() => {
    let dine = 0;
    let takeaway = 0;
    let delivery = 0;
    orders.forEach((o) => {
      const type = String(o.order_type || '').toUpperCase();
      const hasTable = Boolean(o.table?.table_number);
      if (type === 'DELIVERY') {
        delivery += 1;
        return;
      }
      if (hasTable || type === 'DINE_IN' || type === 'DINEIN' || type === 'TABLE') dine += 1;
      else takeaway += 1;
    });
    return { dine, takeaway, delivery, total: orders.length };
  }, [orders]);

  const recentOrders = useMemo(
    () =>
      [...orders]
        .sort((a, b) => {
          const da = parseDate(a.created_at)?.getTime() || 0;
          const db = parseDate(b.created_at)?.getTime() || 0;
          return db - da;
        })
        .slice(0, 6),
    [orders]
  );

  const maxCategory = Math.max(...categoryBreakdown.map(([, v]) => v), 0);

  const bannerDate = new Date()
    .toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })
    .toUpperCase();
  const welcomeName = user?.full_name || user?.username || 'there';
  const storeName = settings?.store_name || 'Sok Coffee';
  const storeAddress = settings?.store_address || '';
  const storePhone = settings?.store_phone || '';
  const receiptFooter = settings?.receipt_footer_text || '';
  const exchangeRate = Number(settings?.exchange_rate) || 4000;
  const todayKhr = Math.round(todayRevenue * exchangeRate).toLocaleString();

  return (
    <div className="p-6 space-y-6">
      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-[2.5rem] border border-coffee-700/60 shadow-2xl shadow-coffee-950/30 bg-gradient-to-br from-coffee-950 via-coffee-900 to-coffee-600 p-8 lg:p-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
        {/* decorative circles */}
        <div className="pointer-events-none absolute -right-16 -top-20 w-72 h-72 rounded-full border-[28px] border-white/10" />
        <div className="pointer-events-none absolute right-44 -bottom-24 w-64 h-64 rounded-full border-[24px] border-coffee-300/20" />
        <div className="pointer-events-none absolute right-24 top-1/2 -translate-y-1/2 w-44 h-44 rounded-full bg-white/5" />

        <div className="relative max-w-xl">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-coffee-950/80 text-white text-[11px] font-bold tracking-wide">
            <User size={14} /> {primaryRole.toUpperCase()} • {bannerDate}
          </span>
          <h1 className="mt-4 text-3xl lg:text-4xl font-extrabold text-white leading-tight">
            Welcome back, {welcomeName}
          </h1>
          <p className="mt-2 text-sm lg:text-base text-white/80">
            Welcome to {storeName} &mdash; here&apos;s how your coffee shop is performing
            today. Every great brew starts with a great day.
          </p>
          {(storeAddress || storePhone || receiptFooter) && (
            <div className="mt-3 space-y-2">
              {(storeAddress || storePhone) && (
                <div className="flex flex-wrap gap-2">
                  {storeAddress && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-amber-100/80 text-xs font-medium">
                      <MapPin size={13} /> {storeAddress}
                    </span>
                  )}
                  {storePhone && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-amber-100/80 text-xs font-medium">
                      <Phone size={13} /> {storePhone}
                    </span>
                  )}
                </div>
              )}
              {receiptFooter && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-amber-100/80 text-xs font-medium">
                  <Receipt size={13} /> Receipt Footer: {receiptFooter}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="relative flex flex-col sm:flex-row items-stretch gap-4 shrink-0">
          <div className="bg-coffee-100/25 backdrop-blur-md border border-white/20 rounded-3xl px-6 py-5 min-w-[170px] shadow-lg shadow-coffee-950/10">
            <div className="flex items-center gap-2 text-coffee-800 text-[11px] font-bold tracking-widest">
              <Wallet size={15} /> TODAY&apos;S REVENUE
            </div>
            <p className="mt-2 text-3xl font-extrabold text-coffee-950">
              ${todayRevenue.toFixed(2)}
            </p>
            <p className="mt-1 text-[11px] font-semibold text-coffee-800/80">
              ≈ {todayKhr} KHR
            </p>
          </div>
          <div className="bg-coffee-100/25 backdrop-blur-md border border-white/20 rounded-3xl px-6 py-5 min-w-[150px] shadow-lg shadow-coffee-950/10">
            <div className="flex items-center gap-2 text-coffee-800 text-[11px] font-bold tracking-widest">
              <ShoppingBag size={15} /> ORDERS TODAY
            </div>
            <p className="mt-2 text-3xl font-extrabold text-coffee-950">{todayOrders}</p>
          </div>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
        <StatCard
          icon={DollarSign}
          label="Total Revenue"
          value={`$${totalRevenue.toFixed(2)}`}
          sub={`Avg $${avgOrderValue.toFixed(2)} per order`}
          iconBg="bg-coffee-100"
          iconColor="text-coffee-600"
          loading={loading}
        />
        <StatCard
          icon={Receipt}
          label="Total Orders"
          value={orders.length}
          sub={`${itemsSold} items sold`}
          iconBg="bg-coffee-100"
          iconColor="text-coffee-600"
          loading={loading}
        />
        <StatCard
          icon={Coffee}
          label="Products"
          value={products.length}
          sub="Active menu items"
          iconBg="bg-coffee-100"
          iconColor="text-coffee-600"
          loading={loading}
        />
        <StatCard
          icon={FolderTree}
          label="Categories"
          value={categories.length}
          sub="Menu categories"
          iconBg="bg-coffee-100"
          iconColor="text-coffee-600"
          loading={loading}
        />
      </div>

      {/* Revenue Overview + Top Sellers */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-stone-100 p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-bold text-stone-800 flex items-center gap-2">
              <TrendingUp className="text-coffee-600" size={20} /> Revenue — Last 7 Days
            </h2>
            <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
              isAdmin
                ? 'bg-coffee-50 text-coffee-700'
                : isManager
                  ? 'bg-coffee-50 text-coffee-700'
                  : 'bg-stone-100 text-stone-600'
            }`}>
              {primaryRole} View
            </span>
          </div>
          {loading ? (
            <div className="flex justify-center items-center h-40 text-stone-400">
              <Loader2 className="animate-spin mr-2" size={20} /> Loading chart...
            </div>
          ) : (
            <div className="flex items-end gap-3 h-40">
              {weekRevenue.map((d, i) => (
                <div key={i} className="flex-1 flex flex-col items-center justify-end h-full gap-2">
                  <span className="text-xs font-bold text-stone-700">
                    {d.rev > 0 ? `$${d.rev.toFixed(0)}` : ''}
                  </span>
                  <div
                    className={`w-full rounded-t-lg transition-all group-hover:opacity-80 ${
                      isAdmin
                        ? 'bg-coffee-500'
                        : isManager
                          ? 'bg-coffee-500'
                          : 'bg-coffee-400'
                    } ${d.rev > 0 ? 'hover:opacity-80' : ''}`}
                    style={{
                      height: maxWeekRev > 0 ? `${Math.max((d.rev / maxWeekRev) * 100, 4)}%` : '4%',
                    }}
                  />
                  <span className="text-xs text-stone-400 font-medium">{d.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-stone-100 p-6">
          <h2 className="font-bold text-stone-800 flex items-center gap-2 mb-5">
            <BarChart3 className="text-coffee-600" size={20} /> Top Selling Products
          </h2>
          {loading ? (
            <div className="flex justify-center items-center h-40 text-stone-400">
              <Loader2 className="animate-spin mr-2" size={20} /> Loading...
            </div>
          ) : topProducts.length > 0 ? (
            <div className="space-y-4">
              {topProducts.map((item, idx) => (
                <div key={item.name} className="flex items-center gap-3">
                  <span className="w-7 h-7 shrink-0 rounded-lg bg-stone-100 text-stone-600 text-xs font-bold flex items-center justify-center">
                    {idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-stone-800 text-sm truncate">{item.name}</p>
                    <p className="text-xs text-stone-400">
                      {item.qty} sold · ${item.revenue.toFixed(2)}
                    </p>
                  </div>
                  <span className="text-xs font-bold text-coffee-600">{item.qty}×</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-stone-400 text-sm text-center py-10">No sales data yet.</p>
          )}
        </div>
      </div>

      {/* Role-specific section */}
      {isAdmin ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Category Breakdown */}
          <div className="bg-white rounded-2xl shadow-sm border border-stone-100 p-6">
            <h2 className="font-bold text-stone-800 flex items-center gap-2 mb-5">
              <PieChart className="text-coffee-600" size={20} /> Menu by Category
            </h2>
            {loading ? (
              <div className="flex justify-center items-center h-40 text-stone-400">
                <Loader2 className="animate-spin mr-2" size={20} /> Loading...
              </div>
            ) : categoryBreakdown.length > 0 ? (
              <div className="space-y-4">
                {categoryBreakdown.map(([name, count]) => (
                  <ProgressRow
                    key={name}
                    label={name}
                    value={count}
                    max={maxCategory}
                    colorClass="bg-coffee-500"
                  />
                ))}
              </div>
            ) : (
              <p className="text-stone-400 text-sm text-center py-10">No products found.</p>
            )}
          </div>

          {/* Order Type Breakdown */}
          <div className="bg-white rounded-2xl shadow-sm border border-stone-100 p-6">
            <h2 className="font-bold text-stone-800 flex items-center gap-2 mb-5">
              <Utensils className="text-coffee-600" size={20} /> Order Types
            </h2>
            {loading ? (
              <div className="flex justify-center items-center h-40 text-stone-400">
                <Loader2 className="animate-spin mr-2" size={20} /> Loading...
              </div>
            ) : orderTypes.total > 0 ? (
              <div className="space-y-5">
                <ProgressRow
                  label="Dine-in"
                  value={orderTypes.dine}
                  max={orderTypes.total}
                  colorClass="bg-coffee-500"
                />
                <ProgressRow
                  label="Takeaway"
                  value={orderTypes.takeaway}
                  max={orderTypes.total}
                  colorClass="bg-coffee-500"
                />
                <ProgressRow
                  label="Delivery"
                  value={orderTypes.delivery}
                  max={orderTypes.total}
                  colorClass="bg-coffee-500"
                />
                <div className="grid grid-cols-3 gap-4 pt-2">
                  <div className="bg-coffee-50 rounded-xl p-4 text-center">
                    <p className="text-xl font-bold text-coffee-700">{orderTypes.dine}</p>
                    <p className="text-xs text-coffee-600 font-medium mt-0.5">Dine-in</p>
                  </div>
                  <div className="bg-coffee-50 rounded-xl p-4 text-center">
                    <p className="text-xl font-bold text-coffee-700">{orderTypes.takeaway}</p>
                    <p className="text-xs text-coffee-600 font-medium mt-0.5">Takeaway</p>
                  </div>
                  <div className="bg-coffee-50 rounded-xl p-4 text-center">
                    <p className="text-xl font-bold text-coffee-700">{orderTypes.delivery}</p>
                    <p className="text-xs text-coffee-600 font-medium mt-0.5">Delivery</p>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-stone-400 text-sm text-center py-10">No orders yet.</p>
            )}
          </div>
        </div>
      ) : isManager ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <MiniStat
            icon={CalendarCheck}
            label="Today's Revenue"
            value={`$${todayRevenue.toFixed(2)}`}
            iconBg="bg-coffee-100"
            iconColor="text-coffee-600"
          />
          <MiniStat
            icon={Target}
            label="Average Order Value"
            value={`$${avgOrderValue.toFixed(2)}`}
            iconBg="bg-coffee-100"
            iconColor="text-coffee-600"
          />
          <MiniStat
            icon={Package}
            label="Total Items Sold"
            value={itemsSold}
            iconBg="bg-coffee-100"
            iconColor="text-coffee-600"
          />
        </div>
      ) : null}

      {/* Recent Orders */}
      <div className="bg-white rounded-2xl shadow-sm border border-stone-100 overflow-hidden">
        <div className="p-6 pb-4">
          <h2 className="font-bold text-stone-800 flex items-center gap-2">
            <Clock className="text-coffee-600" size={20} /> Recent Orders
          </h2>
        </div>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-stone-50 border-y border-stone-100 text-stone-600 text-sm">
              <th className="p-4">Order</th>
              <th className="p-4">Table / Type</th>
              <th className="p-4">Date & Time</th>
              <th className="p-4">Total</th>
              <th className="p-4 text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100 text-stone-700 text-sm">
            {loading ? (
              <tr>
                <td colSpan="5" className="p-8 text-center text-stone-400">
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="animate-spin" size={18} /> Loading orders...
                  </span>
                </td>
              </tr>
            ) : recentOrders.length > 0 ? (
              recentOrders.map((order) => {
                const orderId = order.order_id || order.id;
                return (
                  <tr key={orderId} className="hover:bg-stone-50/50 transition">
                    <td className="p-4 font-bold text-stone-800">#{orderId}</td>
                    <td className="p-4">
                      <span className="flex items-center gap-1.5 font-medium text-stone-700">
                        <Utensils size={14} className="text-coffee-600" />
                        {order.table?.table_number ||
                          order.order_type ||
                          (order.table_id ? `Table ${order.table_id}` : 'TAKEAWAY')}
                      </span>
                    </td>
                    <td className="p-4 text-stone-500">
                      {order.created_at ? new Date(order.created_at).toLocaleString() : 'N/A'}
                    </td>
                    <td className="p-4 font-bold text-coffee-600">
                      ${parseFloat(order.total_amount || 0).toFixed(2)}
                    </td>
                    <td className="p-4 text-right">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-coffee-50 text-coffee-700 rounded-full text-xs font-semibold">
                        <span className="w-1.5 h-1.5 rounded-full bg-coffee-500" /> Completed
                      </span>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="5" className="p-8 text-center text-stone-400">
                  No orders found yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
