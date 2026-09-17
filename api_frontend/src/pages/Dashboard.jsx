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
  const [data, setData] = useState({ products: [], categories: [], summary: {} });
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState({ store_name: '', exchange_rate: 4000 });

  const roleList = user?.roles || [];
  const isAdmin = roleList.includes('Admin');
  const isManager = roleList.includes('Manager');
  const primaryRole =
    ['Admin', 'Manager', 'Cashier'].find((r) => roleList.includes(r)) || 'Staff';

  useEffect(() => {
    Promise.allSettled([
      axiosClient.get('/categories'),
      axiosClient.get('/orders/summary'),
      axiosClient.get('/settings'),
    ])
      .then(([catRes, ordRes, setRes]) => {
        setData({
          categories: catRes.status === 'fulfilled' ? toArray(catRes.value.data) : [],
          summary: ordRes.status === 'fulfilled' ? ordRes.value.data?.data || {} : {},
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

  const { categories, summary } = data;

  const totalRevenue = Number(summary.total_revenue) || 0;
  const totalOrders = Number(summary.total_orders) || 0;
  const itemsSold = Number(summary.items_sold) || 0;
  const avgOrderValue = Number(summary.avg_order_value) || 0;
  const todayRevenue = Number(summary.today?.revenue) || 0;
  const todayOrders = Number(summary.today?.orders) || 0;
  const totalProducts = categories.reduce(
    (sum, c) => sum + (Number(c.products_count) || 0),
    0
  );

  const weekRevenue = (summary.week?.labels || []).map((label, i) => ({
    label,
    rev: Number(summary.week?.revenue?.[i]) || 0,
  }));
  const maxWeekRev = Math.max(...weekRevenue.map((d) => d.rev), 0);

  const topProducts = (summary.top_products || []).map((p) => ({
    name: p.product_name || `Product #${p.product_id}`,
    qty: Number(p.total_qty) || 0,
    revenue: Number(p.total_sales) || 0,
  }));

  const categoryBreakdown = useMemo(() => {
    return categories
      .map((c) => [c.category_name || c.categoryName || 'Uncategorized', Number(c.products_count) || 0])
      .filter(([, count]) => count > 0)
      .sort((a, b) => b[1] - a[1]);
  }, [categories]);

  const orderTypes = useMemo(() => {
    const ot = summary.order_types || {};
    return {
      dine: Number(ot.dine_in) || 0,
      takeaway: Number(ot.takeaway) || 0,
      delivery: Number(ot.delivery) || 0,
      total: ot.total != null ? Number(ot.total) : totalOrders,
    };
  }, [summary.order_types, totalOrders]);

  const recentOrders = useMemo(() => {
    return Array.isArray(summary.recent_orders) ? summary.recent_orders.slice(0, 6) : [];
  }, [summary.recent_orders]);

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
    <div className="p-3 sm:p-6 space-y-6">
      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-[1.5rem] sm:rounded-[2.5rem] border border-coffee-700/60 shadow-2xl shadow-coffee-950/30 bg-gradient-to-br from-coffee-950 via-coffee-900 to-coffee-600 p-5 sm:p-8 lg:p-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6 lg:gap-8">
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
          value={totalOrders}
          sub={`${itemsSold} items sold`}
          iconBg="bg-coffee-100"
          iconColor="text-coffee-600"
          loading={loading}
        />
        <StatCard
          icon={Coffee}
          label="Products"
          value={totalProducts}
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
        <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-stone-50 border-y border-stone-100 text-stone-600 text-sm">
              <th className="p-4 whitespace-nowrap">Order</th>
              <th className="p-4 whitespace-nowrap hidden sm:table-cell">Table / Type</th>
              <th className="p-4 whitespace-nowrap hidden md:table-cell">Date & Time</th>
              <th className="p-4 whitespace-nowrap">Total</th>
              <th className="p-4 text-right whitespace-nowrap">Status</th>
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
                    <td className="p-4 font-bold text-stone-800 whitespace-nowrap">#{orderId}</td>
                    <td className="p-4 hidden sm:table-cell">
                      <span className="flex items-center gap-1.5 font-medium text-stone-700">
                        <Utensils size={14} className="text-coffee-600" />
                        {order.table?.table_number ||
                          order.order_type ||
                          (order.table_id ? `Table ${order.table_id}` : 'TAKEAWAY')}
                      </span>
                    </td>
                    <td className="p-4 text-stone-500 hidden md:table-cell">
                      {order.created_at ? new Date(order.created_at).toLocaleString() : 'N/A'}
                    </td>
                    <td className="p-4 font-bold text-coffee-600 whitespace-nowrap">
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
    </div>
  );
}
