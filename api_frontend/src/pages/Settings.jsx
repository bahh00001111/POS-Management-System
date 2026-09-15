import { useState, useEffect } from 'react';
import { useToast } from '../context/useToast';
import axiosClient from '../api/axiosClient';
import {
  Settings as SettingsIcon,
  Store,
  MapPin,
  Phone,
  RefreshCw,
  FileText,
  Save,
  QrCode,
} from 'lucide-react';

const DEFAULT_SETTINGS = {
  storeName: '',
  storeAddress: '',
  storePhone: '',
  exchangeRate: 4000,
  receiptFooterText: '',
  bakongAccountId: '',
  bakongAppId: '',
  merchantName: '',
  merchantCity: '',
  merchantCategoryCode: '5812',
  merchantCurrency: 'KHR',
};

export default function Settings() {
  const toast = useToast();
  const [form, setForm] = useState(DEFAULT_SETTINGS);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await axiosClient.get('/settings');
        const d = res.data?.data || {};
        setForm({
          storeName: d.store_name || '',
          storeAddress: d.store_address || '',
          storePhone: d.store_phone || '',
          exchangeRate: d.exchange_rate != null ? Number(d.exchange_rate) : 4000,
          receiptFooterText: d.receipt_footer_text || '',
          bakongAccountId: d.bakong_account_id || '',
          bakongAppId: d.bakong_app_id || '',
          merchantName: d.merchant_name || '',
          merchantCity: d.merchant_city || '',
          merchantCategoryCode: d.merchant_category_code || '5812',
          merchantCurrency: d.merchant_currency || 'KHR',
        });
      } catch (err) {
        console.error('Error loading settings:', err);
      }
    };
    fetchSettings();
  }, []);

  const update = (key) => (e) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await axiosClient.put('/settings', {
        store_name: form.storeName,
        store_address: form.storeAddress,
        store_phone: form.storePhone,
        exchange_rate: form.exchangeRate,
        receipt_footer_text: form.receiptFooterText,
        bakong_account_id: form.bakongAccountId,
        bakong_app_id: form.bakongAppId,
        merchant_name: form.merchantName,
        merchant_city: form.merchantCity,
        merchant_category_code: form.merchantCategoryCode,
        merchant_currency: form.merchantCurrency,
      });
      toast.success('Settings saved successfully', 'Settings Saved');
    } catch (err) {
      console.error('Error saving settings:', err);
      toast.error(
        err.response?.data?.message || 'Failed to save settings',
        'Save Failed',
      );
    } finally {
      setSaving(false);
    }
  };

  const labelCls =
    'block text-[11px] font-semibold uppercase tracking-wide text-stone-500 mb-1.5';
  const inputCls = (icon) =>
    `w-full rounded-lg border border-stone-200 bg-white px-3.5 py-2.5 text-sm text-stone-800 placeholder:text-stone-400 shadow-sm transition focus:border-coffee-500 focus:ring-2 focus:ring-coffee-500/30 focus:outline-none ${
      icon ? 'pl-9' : ''
    }`;

  return (
    <div className="p-6 pb-12 flex flex-col min-h-full">
      {/* Header */}
      <div className="flex items-start gap-3">
        <span className="w-10 h-10 rounded-xl bg-coffee-600/10 flex items-center justify-center shrink-0">
          <SettingsIcon className="text-coffee-600" size={22} />
        </span>
        <div>
          <h1 className="text-2xl font-bold text-stone-800 leading-tight">Settings</h1>
          <p className="text-stone-500 text-sm mt-0.5">
            Store information, exchange rate, and receipt config
          </p>
        </div>
      </div>

      <form onSubmit={handleSave} className="flex-1 flex flex-col space-y-6 mt-6">
        {/* Card 1: Store Information */}
        <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
          <div className="flex items-center gap-3 px-6 pt-5 pb-4 border-b border-stone-100">
            <span className="w-9 h-9 rounded-lg bg-coffee-600/10 flex items-center justify-center shrink-0">
              <Store className="text-coffee-600" size={18} />
            </span>
            <div>
              <h2 className="text-base font-bold text-stone-800 leading-tight">
                Store Information
              </h2>
              <p className="text-xs text-stone-400 mt-0.5">
                Basic details shown on printed receipts
              </p>
            </div>
          </div>
          <div className="px-6 py-5 space-y-4">
            <div>
              <label className={labelCls}>Store Name</label>
              <input
                type="text"
                value={form.storeName}
                onChange={update('storeName')}
                placeholder="e.g. Sok Coffee"
                className={inputCls()}
              />
            </div>
            <div>
              <label className={labelCls}>Store Address</label>
              <div className="relative">
                <MapPin
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"
                />
                <input
                  type="text"
                  value={form.storeAddress}
                  onChange={update('storeAddress')}
                  placeholder="e.g. Street 123, Phnom Penh"
                  className={inputCls(true)}
                />
              </div>
            </div>
            <div>
              <label className={labelCls}>Store Phone</label>
              <div className="relative">
                <Phone
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"
                />
                <input
                  type="tel"
                  value={form.storePhone}
                  onChange={update('storePhone')}
                  placeholder="e.g. 012 345 678"
                  className={inputCls(true)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Currency & Exchange Rate */}
        <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
          <div className="flex items-center gap-3 px-6 pt-5 pb-4 border-b border-stone-100">
            <span className="w-9 h-9 rounded-lg bg-coffee-600/10 flex items-center justify-center shrink-0">
              <RefreshCw className="text-coffee-600" size={18} />
            </span>
            <div>
              <h2 className="text-base font-bold text-stone-800 leading-tight">
                Currency & Exchange Rate
              </h2>
              <p className="text-xs text-stone-400 mt-0.5">
                Used for the USD to Cambodian Riel (KHR) conversion shown on receipts
              </p>
            </div>
          </div>
          <div className="px-6 py-5 space-y-4">
            <div>
              <label className={labelCls}>Exchange Rate</label>
              <div className="w-full max-w-xs flex items-stretch rounded-lg border border-stone-200 bg-white shadow-sm transition focus-within:border-coffee-500 focus-within:ring-2 focus-within:ring-coffee-500/30">
                <span className="inline-flex items-center gap-1 px-3 border-r border-stone-200 bg-stone-50 rounded-l-lg text-xs font-semibold text-stone-500 whitespace-nowrap">
                  <RefreshCw size={12} /> 1 USD =
                </span>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={form.exchangeRate}
                  onChange={update('exchangeRate')}
                  placeholder="4000"
                  className="w-full min-w-0 flex-1 px-3 py-2.5 text-sm text-stone-800 placeholder:text-stone-400 focus:outline-none"
                />
                <span className="inline-flex items-center px-3 border-l border-stone-200 bg-stone-50 rounded-r-lg text-xs font-semibold text-stone-500 whitespace-nowrap">
                  KHR
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 3: Receipt Configuration */}
        <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
          <div className="flex items-center gap-3 px-6 pt-5 pb-4 border-b border-stone-100">
            <span className="w-9 h-9 rounded-lg bg-coffee-600/10 flex items-center justify-center shrink-0">
              <FileText className="text-coffee-600" size={18} />
            </span>
            <div>
              <h2 className="text-base font-bold text-stone-800 leading-tight">
                Receipt Configuration
              </h2>
              <p className="text-xs text-stone-400 mt-0.5">
                Customize the message printed at the bottom of every receipt
              </p>
            </div>
          </div>
          <div className="px-6 py-5 space-y-4">
            <div>
              <label className={labelCls}>Receipt Footer Text</label>
              <textarea
                rows={3}
                value={form.receiptFooterText}
                onChange={update('receiptFooterText')}
                placeholder="e.g. Thank you! Please come again."
                className="w-full rounded-lg border border-stone-200 bg-white px-3.5 py-2.5 text-sm text-stone-800 placeholder:text-stone-400 shadow-sm transition resize-none focus:border-coffee-500 focus:ring-2 focus:ring-coffee-500/30 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Card 4: KHQR / Merchant Setup */}
        <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
          <div className="flex items-center gap-3 px-6 pt-5 pb-4 border-b border-stone-100">
            <span className="w-9 h-9 rounded-lg bg-coffee-600/10 flex items-center justify-center shrink-0">
              <QrCode className="text-coffee-600" size={18} />
            </span>
            <div>
              <h2 className="text-base font-bold text-stone-800 leading-tight">
                KHQR / Merchant Setup
              </h2>
              <p className="text-xs text-stone-400 mt-0.5">
                Bakong account details used to generate dynamic, scannable KHQR codes
              </p>
            </div>
          </div>
          <div className="px-6 py-5 space-y-4">
            <div>
              <label className={labelCls}>Bakong Merchant Account ID</label>
              <input
                type="text"
                value={form.bakongAccountId}
                onChange={update('bakongAccountId')}
                placeholder="e.g. lina@acledabank or the merchant ID from your bank"
                className={inputCls()}
              />
              <p className="text-[11px] text-stone-400 mt-1">
                Ask your acquiring bank for the merchant account ID linked to your Bakong account.
              </p>
            </div>
            <div>
              <label className={labelCls}>Bakong App ID (Store Label)</label>
              <input
                type="text"
                value={form.bakongAppId}
                onChange={update('bakongAppId')}
                placeholder="e.g. MyCoffeePOS (optional)"
                className={inputCls()}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Merchant Name (on QR)</label>
                <input
                  type="text"
                  value={form.merchantName}
                  onChange={update('merchantName')}
                  placeholder="e.g. Sok Coffee"
                  className={inputCls()}
                />
              </div>
              <div>
                <label className={labelCls}>Merchant City</label>
                <input
                  type="text"
                  value={form.merchantCity}
                  onChange={update('merchantCity')}
                  placeholder="e.g. Phnom Penh"
                  className={inputCls()}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Merchant Category Code</label>
                <input
                  type="text"
                  value={form.merchantCategoryCode}
                  onChange={update('merchantCategoryCode')}
                  placeholder="5812"
                  className={inputCls()}
                />
              </div>
              <div>
                <label className={labelCls}>KHQR Payment Currency</label>
                <div className="flex rounded-xl overflow-hidden border border-stone-200 bg-white p-0.5 max-w-xs">
                  {['KHR', 'USD'].map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => update('merchantCurrency')({ target: { value: c } })}
                      className={`flex-1 px-3.5 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                        form.merchantCurrency === c
                          ? 'bg-coffee-600 text-white'
                          : 'text-stone-600 hover:text-stone-800'
                      }`}
                    >
                      {c === 'KHR' ? '៛' : '$'} {c}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Save Settings — normal page flow at the very bottom of the form */}
        <div className="flex justify-end pt-4">
          <button
            type="submit"
            disabled={saving}
            className="bg-amber-800 hover:bg-amber-900 text-white font-medium px-6 py-2.5 rounded-xl flex items-center gap-2 transition disabled:opacity-60"
          >
            <Save size={16} />
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </form>
    </div>
  );
}