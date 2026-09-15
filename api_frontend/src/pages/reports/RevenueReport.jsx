import { useState, useEffect } from "react";
import axiosClient from "../../api/axiosClient";
import { useToast } from "../../context/useToast";
import { TrendingUp, ShoppingBag, CalendarRange, ArrowUpRight, ArrowDownRight, DollarSign, Star, AlertTriangle, Filter } from "lucide-react";

// Segmented Control Options — value = ចំនួនថ្ងៃ ផ្ញើទៅ backend /reports/revenue/{value}
const PERIODS = [
  { label: "3 Days", value: 3 },
  { label: "7 Days", value: 7 },
  { label: "15 Days", value: 15 },
  { label: "30 Days", value: 30 },
  { label: "60 Days", value: 60 },
];

const formatMoney = (n) =>
  `$${Number(n || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const toISODate = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

// គណនា Start/End Date ពីចំនួនថ្ងៃ (ដូច OrderList) — ថ្ងៃនេះរាប់បញ្ចូល
const rangeForDays = (days) => {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - (days - 1));
  return { start: toISODate(start), end: toISODate(end) };
};

export default function RevenueReport() {
  const toast = useToast();

  // mode: "days" (preset) | "custom" (Start – End Date)
  const [mode, setMode] = useState("days");
  const [selectedPeriod, setSelectedPeriod] = useState(7); // default 7 — ការពារ /reports/revenue/null
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  // Custom Date Range (Start - End) ដាច់ពី preset days
  const [custom, setCustom] = useState(null); // { start, end }
  const [draftStart, setDraftStart] = useState("");
  const [draftEnd, setDraftEnd] = useState("");

  // Validation៖ End Date មិនអាចមុន Start Date បានទេ
  const dateError = draftStart && draftEnd && draftEnd < draftStart
    ? "ថ្ងៃបញ្ចប់ (End Date) មិនអាចមុនថ្ងៃចាប់ផ្ដើម (Start Date) បានទេ។"
    : null;

  const isCustom = mode === "custom";
  const periodLabel = custom
    ? `${custom.start} → ${custom.end}`
    : `Last ${selectedPeriod} days`;

  // Guard Clause៖ កុំផ្ញើសំណើពេលខ្វះតម្លៃ ដើម្បីការពារ URL ដូចជា /reports/revenue/null
  const fetchReport = async () => {
    setLoading(true);
    setError(null);
    try {
      let url;
      if (isCustom) {
        if (!custom) return;
        url = `/reports/revenue/${selectedPeriod}?start_date=${custom.start}&end_date=${custom.end}`;
      } else {
        if (!selectedPeriod) return;
        url = `/reports/revenue/${selectedPeriod}`;
      }
      const res = await axiosClient.get(url);
      setData(res.data.data);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || "Could not load revenue report");
      toast.error(err.response?.data?.message || "Could not load revenue report", "Report Failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Guard clause មុនពេលទាញយកទិន្នន័យ
    if (isCustom && !custom) return;
    if (!isCustom && !selectedPeriod) return;
    fetchReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, selectedPeriod, custom]);

  // Segmented Control — អនុវត្តភ្លាមៗ និងបង្ហាញ Start/End Date ដូច OrderList
  const selectPeriod = (value) => {
    setMode("days");
    setSelectedPeriod(value);
    const { start, end } = rangeForDays(value);
    setDraftStart(start);
    setDraftEnd(end);
    setCustom({ start, end });
  };

  const periodActive = (value) => !isCustom && selectedPeriod === value;

  const applyCustom = (daysBack) => {
    const { start, end } = rangeForDays(daysBack);
    setDraftStart(start);
    setDraftEnd(end);
  };

  const applyNow = () => {
    if (dateError) return;
    setCustom({ start: draftStart, end: draftEnd });
    setMode("custom");
  };

  const clearCustom = () => {
    setDraftStart("");
    setDraftEnd("");
    setCustom(null);
    setMode("days");
    setSelectedPeriod(7);
  };

  const chartData = data?.chart || { labels: [], revenue: [], orders: [] };
  const maxRevenue = Math.max(1, ...chartData.revenue);
  const revenueGrowth = data?.previous_period?.revenue
    ? ((data.revenue - data.previous_period.revenue) / data.previous_period.revenue) * 100
    : null;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="w-10 h-10 rounded-xl bg-coffee-600/10 flex items-center justify-center shrink-0">
            <TrendingUp className="text-coffee-600" size={22} />
          </span>
          <div>
            <h1 className="text-2xl font-bold text-stone-800 leading-tight">Revenue Report</h1>
            <p className="text-stone-500 text-sm mt-0.5">Track revenue across selected time periods</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 bg-white border border-stone-200 rounded-xl p-1.5 shadow-sm">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              onClick={() => selectPeriod(p.value)}
              className={`px-3.5 py-1.5 rounded-lg text-sm font-semibold transition cursor-pointer ${
                periodActive(p.value)
                  ? "bg-coffee-600 text-white shadow-sm shadow-coffee-600/20"
                  : "text-stone-600 hover:bg-stone-100"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 text-sm font-medium">
          <AlertTriangle size={16} />
          {error}
        </div>
      )}

      {/* Start Date - End Date Filter (ដូច OrderList) */}
      <div className="bg-white rounded-2xl shadow-sm border border-stone-100 p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-stone-700">
          <Filter size={16} className="text-coffee-600" />
          Date Range
          {custom && (
            <span className="ml-1 px-2 py-0.5 bg-coffee-50 text-coffee-700 rounded-full text-xs font-medium">
              {custom.start || "…"} — {custom.end || "…"}
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
              onClick={() => applyCustom(7)}
              className="px-3 py-2 bg-stone-100 hover:bg-coffee-50 text-stone-700 hover:text-coffee-700 rounded-xl text-xs font-semibold transition"
            >
              7 Days
            </button>
            <button
              onClick={() => applyCustom(30)}
              className="px-3 py-2 bg-stone-100 hover:bg-coffee-50 text-stone-700 hover:text-coffee-700 rounded-xl text-xs font-semibold transition"
            >
              30 Days
            </button>
          </div>

          <div className="flex gap-2 pb-1">
            <button
              onClick={applyNow}
              disabled={Boolean(dateError)}
              className="px-4 py-2 bg-coffee-600 hover:bg-coffee-700 disabled:opacity-40 text-white rounded-xl text-xs font-bold transition"
            >
              Apply
            </button>
            <button
              onClick={clearCustom}
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

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-sm">
          <div className="flex items-center gap-2 text-stone-400 text-xs font-semibold uppercase tracking-wide">
            <DollarSign size={14} className="text-coffee-600" /> Revenue
          </div>
          <p className="mt-2 text-2xl font-bold text-stone-900">
            {loading ? "..." : formatMoney(data?.revenue)}
          </p>
          <p className="text-xs text-stone-400 mt-1">{periodLabel}</p>
        </div>

        <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-sm">
          <div className="flex items-center gap-2 text-stone-400 text-xs font-semibold uppercase tracking-wide">
            <ShoppingBag size={14} className="text-coffee-600" /> Orders
          </div>
          <p className="mt-2 text-2xl font-bold text-stone-900">
            {loading ? "..." : (data?.order_count ?? 0).toLocaleString()}
          </p>
          <p className="text-xs text-stone-400 mt-1">Confirmed orders</p>
        </div>

        <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-sm">
          <div className="flex items-center gap-2 text-stone-400 text-xs font-semibold uppercase tracking-wide">
            <CalendarRange size={14} className="text-coffee-600" /> Avg / Day
          </div>
          <p className="mt-2 text-2xl font-bold text-stone-900">
            {loading ? "..." : formatMoney(data?.average_revenue_per_day)}
          </p>
          <p className="text-xs text-stone-400 mt-1">Average per day · {periodLabel}</p>
        </div>

        <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-sm">
          <div className="flex items-center gap-2 text-stone-400 text-xs font-semibold uppercase tracking-wide">
            <ArrowUpRight size={14} className="text-coffee-600" /> vs Prev Period
          </div>
          <p className="mt-2 text-2xl font-bold text-stone-900 flex items-center gap-2">
            {loading ? (
              "..."
            ) : revenueGrowth === null || revenueGrowth === undefined ? (
              <span className="text-sm font-semibold text-stone-400">No previous data</span>
            ) : (
              <>
                {formatMoney(data?.previous_period?.revenue)}
                <span
                  className={`text-sm font-bold ${
                    revenueGrowth >= 0 ? "text-emerald-600" : "text-red-600"
                  } flex items-center gap-0.5`}
                >
                  {revenueGrowth >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                  {Math.abs(revenueGrowth).toFixed(1)}%
                </span>
              </>
            )}
          </p>
          <p className="text-xs text-stone-400 mt-1">Previous period total</p>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-sm">
        <h3 className="text-sm font-bold text-stone-700 mb-4">Revenue by Day ({periodLabel})</h3>
        {loading ? (
          <div className="h-48 flex items-center justify-center text-stone-400 text-sm">Loading...</div>
        ) : chartData.labels.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-stone-400 text-sm">No data</div>
        ) : (
          <div className="flex items-end gap-1.5 h-48">
            {chartData.labels.map((label, i) => {
              const value = chartData.revenue[i] || 0;
              const height = Math.max(4, (value / maxRevenue) * 100);
              return (
                <div key={label} className="flex-1 flex flex-col items-center gap-1 h-full justify-end min-w-0">
                  <span className="text-[10px] text-stone-400 font-medium">
                    {value > 0 ? `$${Math.round(value)}` : ""}
                  </span>
                  <div
                    className="w-full max-w-[36px] rounded-t-md bg-coffee-500 hover:bg-coffee-600 transition cursor-pointer"
                    style={{ height: `${height}%` }}
                    title={`${label}: ${formatMoney(value)}`}
                  />
                  <span className="text-[10px] text-stone-400 truncate w-full text-center">{label}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Top products + notes */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 bg-white rounded-xl border border-stone-200 p-5 shadow-sm">
          <h3 className="text-sm font-bold text-stone-700 mb-4 flex items-center gap-2">
            <Star size={16} className="text-coffee-600" /> Top Selling Products
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[11px] uppercase tracking-wider text-stone-400 border-b border-stone-100">
                  <th className="py-2 font-semibold">Product</th>
                  <th className="py-2 font-semibold text-right">Qty Sold</th>
                  <th className="py-2 font-semibold text-right">Sales</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-50">
                {(data?.top_products || []).map((p) => (
                  <tr key={p.product_id} className="hover:bg-stone-50/60 transition">
                    <td className="py-2.5 font-medium text-stone-700">{p.product_name}</td>
                    <td className="py-2.5 text-right text-stone-600">{p.total_qty}</td>
                    <td className="py-2.5 text-right font-semibold text-stone-800">
                      {formatMoney(p.total_sales)}
                    </td>
                  </tr>
                ))}
                {(data?.top_products || []).length === 0 && (
                  <tr>
                    <td colSpan={3} className="py-8 text-center text-stone-400 text-sm">
                      No sales in this period yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-sm">
          <h3 className="text-sm font-bold text-stone-700 mb-4">Period Summary</h3>
          <ul className="space-y-3 text-sm">
            <li className="flex justify-between">
              <span className="text-stone-500">Start date</span>
              <span className="font-semibold text-stone-800">{data?.period?.start_date}</span>
            </li>
            <li className="flex justify-between">
              <span className="text-stone-500">End date</span>
              <span className="font-semibold text-stone-800">{data?.period?.end_date}</span>
            </li>
            <li className="flex justify-between border-t border-stone-100 pt-3">
              <span className="text-stone-500">Total revenue</span>
              <span className="font-bold text-stone-900">{formatMoney(data?.revenue)}</span>
            </li>
            <li className="flex justify-between">
              <span className="text-stone-500">Total orders</span>
              <span className="font-semibold text-stone-800">{data?.order_count ?? 0}</span>
            </li>
            <li className="flex justify-between">
              <span className="text-stone-500">Previous period revenue</span>
              <span className="font-semibold text-stone-800">
                {formatMoney(data?.previous_period?.revenue)}
              </span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}