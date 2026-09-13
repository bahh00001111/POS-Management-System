import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  ShoppingCart,
  Coffee,
  FolderTree,
  History,
  Users,
  Settings,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../context/useAuth';

export default function Sidebar() {
  const { user, logout } = useAuth();
  const userRoles = user?.roles || [];
  const mainRole = userRoles[0] || 'Staff';
  const displayName = user?.full_name || user?.username || 'User';

  const navSections = [
    {
      label: 'Main',
      items: [
        {
          path: '/dashboard',
          label: 'Dashboard',
          icon: LayoutDashboard,
          roles: ['Admin', 'Manager', 'Cashier'],
        },
        {
          path: '/pos',
          label: 'POS Terminal',
          icon: ShoppingCart,
          roles: ['Admin', 'Manager', 'Cashier'],
        },
        {
          path: '/orders',
          label: 'Order History',
          icon: History,
          roles: ['Admin', 'Manager', 'Cashier'],
        },
      ],
    },
    {
      label: 'Management',
      items: [
        {
          path: '/products',
          label: 'Products',
          icon: Coffee,
          roles: ['Admin', 'Manager'],
        },
        {
          path: '/categories',
          label: 'Categories',
          icon: FolderTree,
          roles: ['Admin', 'Manager'],
        },
        {
          path: '/users',
          label: 'Users',
          icon: Users,
          roles: ['Admin'],
        },
        {
          path: '/settings',
          label: 'Settings',
          icon: Settings,
          roles: ['Admin', 'Manager'],
        },
      ],
    },
  ];

  const visibleSections = navSections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) =>
        item.roles.some((role) => userRoles.includes(role))
      ),
    }))
    .filter((section) => section.items.length > 0);

  return (
    <aside className="w-64 bg-[#241608] text-stone-300 flex flex-col shrink-0 min-h-screen">
      {/* Brand */}
      <div className="flex items-center gap-3 px-5 py-6">
        <span className="w-10 h-10 rounded-xl bg-coffee-600 text-white flex items-center justify-center shadow-lg shadow-coffee-600/30">
          <Coffee size={22} />
        </span>
        <div className="min-w-0">
          <p className="text-lg font-bold text-white tracking-wide leading-tight">POS System</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
        {visibleSections.map((section) => (
          <div key={section.label}>
            <p className="px-3 mb-3 text-[11px] font-bold uppercase tracking-wider text-stone-400/80">
              {section.label}
            </p>
            <div className="space-y-1.5">
              {section.items.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.path === '/dashboard'}
                  >
                    {({ isActive }) => (
                      <div
                        className={`group flex items-center gap-3.5 px-3.5 py-3 rounded-xl text-sm font-semibold transition-all duration-150 ${
                          isActive
                            ? 'bg-coffee-600 text-white shadow-md shadow-coffee-600/20'
                            : 'text-stone-300 hover:bg-stone-800/60 hover:text-white'
                        }`}
                      >
                        <Icon
                          size={20}
                          className={
                            isActive
                              ? 'text-white'
                              : 'text-stone-400 group-hover:text-stone-200 transition'
                          }
                        />
                        <span className="flex-1">{item.label}</span>
                      </div>
                    )}
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User profile / Footer */}
      <div className="p-4 space-y-2">
        <div className="bg-[#3a2313]/70 rounded-2xl p-4 border border-stone-700/50">
          <p className="text-xs text-stone-400 font-medium">Logged in as</p>
          <p className="text-sm font-bold text-white truncate mt-0.5">{displayName}</p>
          <p className="text-xs font-semibold text-coffee-400 mt-0.5">Role: {mainRole}</p>
        </div>

        <span className="block mx-2 h-px bg-stone-700/50" />

        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold text-stone-400 hover:text-white hover:bg-coffee-500/15 transition"
          title="Logout"
        >
          <LogOut size={18} />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}