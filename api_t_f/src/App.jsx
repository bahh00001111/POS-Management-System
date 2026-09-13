import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import MainLayout from './components/MainLayout';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import PosTerminal from './pages/PosTerminal';
import ProductList from './pages/products/ProductList';
import CategoryList from './pages/categories/CategoryList';
import OrderList from './pages/orders/OrderList';
import UserList from './pages/users/UserList';
import Settings from './pages/Settings';

export default function App() {
  return (
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
  );
}