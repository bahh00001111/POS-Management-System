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
  BarChart3,
  Truck,
  X,
} from 'lucide-react';
import { useAuth } from '../context/useAuth';

export default function Sidebar({ open = false, onClose, collapsed = false }) {
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
          path: '/reports',
          label: 'Revenue Report',
          icon: BarChart3,
          roles: ['Admin', 'Manager'],
        },
        {
          path: '/suppliers',
          label: 'Suppliers',
          icon: Truck,
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
    <aside
      className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#241608] text-stone-300 flex flex-col shrink-0 transform transition-all duration-300 ease-in-out ${
        open ? 'translate-x-0' : '-translate-x-full'
      } ${collapsed ? 'lg:w-20' : ''} lg:static lg:translate-x-0 lg:z-auto`}
    >
      {/* Brand — Coffee icon + POS System text only */}
      <div
        className={`flex items-center gap-3 px-5 py-6 ${
          collapsed ? 'lg:justify-center lg:px-4' : ''
        }`}
      >
        <span className="w-10 h-10 rounded-xl bg-coffee-600 text-white flex items-center justify-center shadow-lg shadow-coffee-600/30 shrink-0">
          <Coffee size={22} />
        </span>
        <div className={`min-w-0 flex-1 ${collapsed ? 'lg:hidden' : ''}`}>
          <p className="text-lg font-bold text-white tracking-wide leading-tight">POS System</p>
        </div>
        <button
          onClick={onClose}
          className="lg:hidden p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800/60 transition cursor-pointer"
          aria-label="Close sidebar"
        >
          <X size={20} />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
        {visibleSections.map((section) => (
          <div key={section.label}>
            <p
              className={`px-3 mb-3 text-[11px] font-bold uppercase tracking-wider text-stone-400/80 ${
                collapsed ? 'lg:hidden' : ''
              }`}
            >
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
                    onClick={() => onClose?.()}
                    title={collapsed ? item.label : undefined}
                  >
                    {({ isActive }) => (
                      <div
                        className={`group flex items-center gap-3.5 px-3.5 py-3 rounded-xl text-sm font-semibold transition-all duration-150 ${
                          collapsed ? 'lg:justify-center lg:px-0' : ''
                        } ${
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
                        <span className={`flex-1 ${collapsed ? 'lg:hidden' : ''}`}>
                          {item.label}
                        </span>
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
        <div
          className={`bg-[#3a2313]/70 rounded-2xl p-4 border border-stone-700/50 ${
            collapsed ? 'lg:flex lg:items-center lg:justify-center lg:p-2' : ''
          }`}
        >
          <p className={`text-xs text-stone-400 font-medium ${collapsed ? 'lg:hidden' : ''}`}>
            Logged in as
          </p>
          <p className={`text-sm font-bold text-white truncate mt-0.5 ${collapsed ? 'lg:hidden' : ''}`}>
            {displayName}
          </p>
          <p className={`text-xs font-semibold text-coffee-400 mt-0.5 ${collapsed ? 'lg:hidden' : ''}`}>
            Role: {mainRole}
          </p>
        </div>

        <span className="block mx-2 h-px bg-stone-700/50" />

        <button
          onClick={logout}
          className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold text-stone-400 hover:text-white hover:bg-coffee-500/15 transition ${
            collapsed ? 'lg:justify-center lg:px-0' : ''
          }`}
          title="Logout"
        >
          <LogOut size={18} />
          <span className={collapsed ? 'lg:hidden' : ''}>Logout</span>
        </button>
      </div>
    </aside>
  );
}