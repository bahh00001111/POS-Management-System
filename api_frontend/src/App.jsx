import { Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import ProtectedRoute from './components/ProtectedRoute';
import MainLayout from './components/MainLayout';

const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const PosTerminal = lazy(() => import('./pages/PosTerminal'));
const ProductList = lazy(() => import('./pages/products/ProductList'));
const CategoryList = lazy(() => import('./pages/categories/CategoryList'));
const OrderList = lazy(() => import('./pages/orders/OrderList'));
const UserList = lazy(() => import('./pages/users/UserList'));
const Settings = lazy(() => import('./pages/Settings'));
const RevenueReport = lazy(() => import('./pages/reports/RevenueReport'));
const SupplierList = lazy(() => import('./pages/suppliers/SupplierList'));

function PageFallback() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-stone-50">
      <div className="flex items-center gap-3 text-stone-500">
        <span className="w-5 h-5 rounded-full border-2 border-coffee-600 border-t-transparent animate-spin" />
        <span className="text-sm font-medium">Loading...</span>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Suspense fallback={<PageFallback />}>
      <Routes>
      {/* 1. ដំបូងបង្អស់ពេល run app ត្រូវបើក Login Page */}
      <Route path="/login" element={<Login />} />

      {/* 2. Protected Routes (ទាមទារ Login មុននឹងអាចចូលបាន) */}
      <Route element={<ProtectedRoute />}>
        <Route element={<MainLayout />}>
          {/* បើចូល root path "/" ឱ្យវា Redirect ទៅ Dashboard */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          
          {/* Shared: Admin, Manager, Cashier */}
          <Route element={<ProtectedRoute allowedRoles={['Admin', 'Manager', 'Cashier']} />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/pos" element={<PosTerminal />} />
            <Route path="/orders" element={<OrderList />} />
          </Route>

          {/* Admin & Manager Only */}
          <Route element={<ProtectedRoute allowedRoles={['Admin', 'Manager']} />}>
            <Route path="/products" element={<ProductList />} />
            <Route path="/categories" element={<CategoryList />} />
            <Route path="/reports" element={<RevenueReport />} />
            <Route path="/suppliers" element={<SupplierList />} />
            <Route path="/settings" element={<Settings />} />
          </Route>

          {/* Admin Only */}
          <Route element={<ProtectedRoute allowedRoles={['Admin']} />}>
            <Route path="/users" element={<UserList />} />
          </Route>
        </Route>
      </Route>

      {/* Path ផ្សេងទៀតដែលខុស ឱ្យ Redirect ទៅ /login */}
      <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Suspense>
  );
}