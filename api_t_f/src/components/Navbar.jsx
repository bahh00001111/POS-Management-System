import React from 'react';
import { User as UserIcon, Coffee, Bell } from 'lucide-react';
import { useAuth } from '../context/useAuth';

const getInitials = (name = '') => {
  const words = name.split(/\s+/).filter(Boolean);
  const initials = (words[0]?.[0] || '') + (words[1]?.[0] || '');
  return initials ? initials.toUpperCase() : '?';
};

const ROLE_BADGES = {
  Admin: 'bg-coffee-50 text-coffee-700 ring-coffee-600/10',
  Manager: 'bg-coffee-50 text-coffee-700 ring-coffee-600/10',
  Cashier: 'bg-coffee-50 text-coffee-700 ring-coffee-600/10',
};

export default function Navbar() {
  const { user } = useAuth();

  const displayName = user?.full_name || user?.username || 'User';
  const mainRole = user?.roles?.[0] || 'Staff';
  const badgeCls = ROLE_BADGES[mainRole] || 'bg-stone-100 text-stone-600 ring-stone-500/10';

  return (
    <header className="h-16 bg-white border-b border-stone-200 px-6 flex items-center gap-4 sticky top-0 z-10">
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
        {/* Notification */}
        <button
          className="relative w-10 h-10 flex items-center justify-center rounded-xl text-stone-500 hover:bg-stone-100 hover:text-stone-700 transition"
          title="Notifications"
        >
          <Bell size={19} />
          <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-coffee-500 ring-2 ring-white" />
        </button>

        <span className="w-px h-7 bg-stone-200" />

        {/* User avatar with role */}
        <div className="flex items-center gap-3">
          <span className="w-10 h-10 rounded-xl bg-stone-900 text-white flex items-center justify-center text-xs font-semibold">
            {displayName === 'User' ? <UserIcon size={17} /> : getInitials(displayName)}
          </span>
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