import React from 'react';
import { User as UserIcon, Coffee, Bell } from 'lucide-react';
import { useAuth } from '../context/useAuth';

const getInitials = (name = '') => {
  const words = name.split(/\s+/).filter(Boolean);
  const initials = (words[0]?.[0] || '') + (words[1]?.[0] || '');
  return initials ? initials.toUpperCase() : '?';
};

const ROLE_BADGES = {
  Admin: 'bg-violet-50 text-violet-700 ring-violet-600/10',
  Manager: 'bg-blue-50 text-blue-700 ring-blue-600/10',
  Cashier: 'bg-emerald-50 text-emerald-700 ring-emerald-600/10',
};

export default function Navbar() {
  const { user } = useAuth();

  const displayName = user?.full_name || user?.username || 'User';
  const mainRole = user?.roles?.[0] || 'Staff';
  const badgeCls = ROLE_BADGES[mainRole] || 'bg-slate-100 text-slate-600 ring-slate-500/10';

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center gap-4 sticky top-0 z-10">
      {/* Brand (mobile only) */}
      <div className="flex items-center gap-2 lg:hidden">
        <span className="w-9 h-9 rounded-lg bg-amber-600 text-white flex items-center justify-center">
          <Coffee size={18} />
        </span>
      </div>

      {/* Greeting */}
      <div className="hidden lg:block">
        <p className="text-sm font-semibold text-slate-500 leading-tight">
          Welcome back,{' '}
          <span className="text-slate-900 font-bold">{displayName}</span>
        </p>
        <p className="text-xs text-slate-400 mt-0.5">
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
        {/* Notification */}
        <button
          className="relative w-10 h-10 flex items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition"
          title="Notifications"
        >
          <Bell size={19} />
          <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white" />
        </button>

        <span className="w-px h-7 bg-slate-200" />

        {/* User avatar with role */}
        <div className="flex items-center gap-3">
          <span className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center text-xs font-semibold">
            {displayName === 'User' ? <UserIcon size={17} /> : getInitials(displayName)}
          </span>
          <div className="hidden sm:block">
            <p className="text-sm font-semibold text-slate-800 leading-tight">{displayName}</p>
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