import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';

export default function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const closeSidebar = () => setSidebarOpen(false);

  // One hamburger for all screens:
  //  - Desktop (≥1024px, sidebar permanent): toggle collapsed width
  //  - Mobile/Tablet (<1024px, off-canvas drawer): open/close drawer
  const toggleSidebar = () => {
    if (window.matchMedia('(min-width: 1024px)').matches) {
      setCollapsed((c) => !c);
    } else {
      setSidebarOpen((o) => !o);
    }
  };

  return (
    <div className="flex h-screen bg-stone-50 overflow-hidden">
      {/* Sidebar — off-canvas drawer below lg (Mobile & Tablet, < 1024px),
          permanently visible on Desktop (lg+) */}
      <Sidebar
        open={sidebarOpen}
        onClose={closeSidebar}
        collapsed={collapsed}
      />

      {/* Dark translucent backdrop — Mobile & Tablet only */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={closeSidebar}
        />
      )}

      {/* Main content — flex-1 min-w-0 prevents horizontal scrollbar bugs */}
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        <Navbar onToggleSidebar={toggleSidebar} />
        <main className="flex-1 overflow-y-auto p-2 sm:p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}