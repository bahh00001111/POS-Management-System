import React, { useState, useEffect, useRef } from 'react';
import { User as UserIcon, Coffee, Bell, CheckCheck, PackageX, AlertTriangle, X, Menu } from 'lucide-react';
import { useAuth } from '../context/useAuth';
import axiosClient from '../api/axiosClient';
import { toArray } from '../utils/apiUtils';

const getInitials = (name = '') => {
  const words = name.split(/\s+/).filter(Boolean);
  const initials = (words[0]?.[0] || '') + (words[1]?.[0] || '');
  return initials ? initials.toUpperCase() : '?';
};

// ដក Origin ពី API base URL ហើយភ្ជាប់ /storage/ (http://127.0.0.1:8000/storage/)
const STORAGE_BASE = `${new URL(axiosClient.defaults.baseURL).origin}/storage/`;

const ROLE_BADGES = {
  Admin: 'bg-coffee-50 text-coffee-700 ring-coffee-600/10',
  Manager: 'bg-coffee-50 text-coffee-700 ring-coffee-600/10',
  Cashier: 'bg-coffee-50 text-coffee-700 ring-coffee-600/10',
};

const timeAgo = (dateStr) => {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

function NotificationBell() {
  const { user } = useAuth();
  const userRoles = user?.roles || [];
  const canView = userRoles.some((r) => ['Admin', 'Manager'].includes(r));
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const menuRef = useRef(null);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await axiosClient.get('/notifications');
      // toArray unwraps the paginated shape
      // { message, data: { data: [...], current_page, ... } } to a plain array.
      setNotifications(toArray(res.data));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!canView) return;
    fetchNotifications();
    const timer = setInterval(fetchNotifications, 60000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canView]);

  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (!canView) return null;

  // Defensive normalizer: never trust the stored shape if a stale value slips
  // through, so .filter() can never be called on a non-array.
  const notifList = Array.isArray(notifications) ? notifications : [];

  const unread = notifList.filter((n) => !n.read_at).length;
  const unreadNotifications = notifList.filter((n) => !n.read_at);

  const markRead = async (id) => {
    try {
      await axiosClient.post(`/notifications/${id}/read`);
      setNotifications((prev) => prev.filter((n) => n.notification_id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const markAllRead = async () => {
    try {
      await axiosClient.post('/notifications/read-all');
      setNotifications((prev) => prev.filter((n) => n.read_at));
    } catch (err) {
      console.error(err);
    }
  };

  const dismiss = async (id) => {
    try {
      await axiosClient.delete(`/notifications/${id}`);
      setNotifications((prev) => prev.filter((n) => n.notification_id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => {
          setOpen((o) => !o);
          if (!open) fetchNotifications();
        }}
        className="relative w-10 h-10 flex items-center justify-center rounded-xl text-stone-500 hover:bg-stone-100 hover:text-stone-700 transition cursor-pointer"
        title="Notifications"
      >
        <Bell size={19} />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold ring-2 ring-white flex items-center justify-center">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-2xl ring-1 ring-black/5 overflow-hidden z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-stone-100 bg-stone-50/50">
            <p className="text-sm font-bold text-stone-800">Notifications</p>
            {unread > 0 && (
              <button
                onClick={markAllRead}
                className="inline-flex items-center gap-1 text-xs font-semibold text-coffee-600 hover:text-coffee-700 transition cursor-pointer"
              >
                <CheckCheck size={13} /> Mark all read
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto divide-y divide-stone-50">
            {loading && unreadNotifications.length === 0 && (
              <p className="px-4 py-8 text-center text-sm text-stone-400">Loading...</p>
            )}
            {!loading && unreadNotifications.length === 0 && (
              <p className="px-4 py-8 text-center text-sm text-stone-400">No notifications</p>
            )}
            {unreadNotifications.map((n) => (
              <div
                key={n.notification_id}
                onClick={() => markRead(n.notification_id)}
                className="w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-stone-50 transition group cursor-pointer"
              >
                <span
                  className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    n.type === 'OUT_OF_STOCK'
                      ? 'bg-red-600/10 text-red-600'
                      : 'bg-amber-500/10 text-amber-600'
                  }`}
                >
                  {n.type === 'OUT_OF_STOCK' ? <PackageX size={15} /> : <AlertTriangle size={15} />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-stone-800">{n.title}</span>
                  <span className="block text-xs text-stone-500 mt-0.5 leading-relaxed break-words">
                    {n.message}
                  </span>
                  <span className="block text-[10px] text-stone-400 mt-1">{timeAgo(n.created_at)}</span>
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    dismiss(n.notification_id);
                  }}
                  title="Clear"
                  className="p-1 rounded-lg text-stone-300 hover:text-red-500 hover:bg-red-50 transition opacity-0 group-hover:opacity-100 cursor-pointer shrink-0"
                >
                  <X size={13} />
                </button>
                <span className="w-2 h-2 rounded-full bg-coffee-500 shrink-0 mt-1.5" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Navbar({ onToggleSidebar }) {
  const { user } = useAuth();
  const [avatarFailed, setAvatarFailed] = useState(false);

  const displayName = user?.full_name || user?.username || 'User';
  const mainRole = user?.roles?.[0] || 'Staff';
  const badgeCls = ROLE_BADGES[mainRole] || 'bg-stone-100 text-stone-600 ring-stone-500/10';

  return (
    <header className="h-16 bg-white border-b border-stone-200 px-4 sm:px-6 flex items-center gap-4 sticky top-0 z-40">
      {/* Hamburger menu — visible on ALL screen sizes (Mobile, Tablet, Desktop) */}
      <button
        onClick={onToggleSidebar}
        className="w-10 h-10 flex items-center justify-center rounded-xl text-stone-500 hover:bg-stone-100 hover:text-stone-700 transition cursor-pointer"
        title="Toggle sidebar"
        aria-label="Toggle sidebar"
      >
        <Menu size={20} />
      </button>

      {/* Brand (mobile only) */}
      <div className="flex items-center gap-2 lg:hidden">
        <span className="w-9 h-9 rounded-lg bg-coffee-600 text-white flex items-center justify-center">
          <Coffee size={18} />
        </span>
      </div>

      {/* Greeting */}
      <div className="hidden lg:block">
        <p className="text-sm font-semibold text-stone-500 leading-tight">
          Welcome back,{' '}
          <span className="text-stone-900 font-bold">{displayName}</span>
        </p>
        <p className="text-xs text-stone-400 mt-0.5">
          {new Date().toLocaleDateString(undefined, {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </p>
      </div>

      <div className="flex-1" />

      {/* Right controls */}
      <div className="flex items-center gap-3">
        {/* Notification bell */}
        <NotificationBell />

        <span className="w-px h-7 bg-stone-200" />

        {/* User avatar with role — បង្ហាញ avatar រូបភាព បើមាន បើមិនអញ្ចឹងបង្ហាញ Initials */}
        <div className="flex items-center gap-3">
          {user?.avatar && !avatarFailed ? (
            <img
              src={`${STORAGE_BASE}${user.avatar}`}
              alt={displayName}
              onError={() => setAvatarFailed(true)}
              className="w-10 h-10 rounded-xl object-cover ring-1 ring-stone-200"
            />
          ) : (
            <span className="w-10 h-10 rounded-xl bg-stone-900 text-white flex items-center justify-center text-xs font-semibold">
              {displayName === 'User' ? <UserIcon size={17} /> : getInitials(displayName)}
            </span>
          )}
          <div className="hidden sm:block">
            <p className="text-sm font-semibold text-stone-800 leading-tight">{displayName}</p>
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${badgeCls}`}
            >
              {mainRole}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}