// src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import './index.css';
import { AuthProvider } from './context/AuthContext'; // Import AuthProvider របស់អ្នក
import { ToastProvider } from './context/ToastContext'; // Import ToastProvider សម្រាប់ Notifications
import NotificationWatcher from './components/NotificationWatcher';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      {/* Wrap App ជាមួយ AuthProvider ដើម្បីឱ្យ useAuth ដំណើរការ */}
      <AuthProvider> 
        <ToastProvider>
          <NotificationWatcher />
          <App />
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);