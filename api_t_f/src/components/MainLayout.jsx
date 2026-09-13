import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';

export default function MainLayout() {
  return (
    <div className="flex h-screen bg-stone-50 overflow-hidden">
      {/* Sidebar ខាងឆ្វេង */}
      <Sidebar />

      {/* ផ្នែកខាងស្តាំ (Navbar + ទំព័រ dynamic) */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Navbar />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}