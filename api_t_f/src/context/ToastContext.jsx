import { useCallback, useState } from 'react';
import Toast from '../components/Toast';
import { ToastContext } from './toastContextStore';

let idCounter = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback((type, message, title) => {
    const id = ++idCounter;
    setToasts((prev) => [...prev, { id, type, message, title }]);
    return id;
  }, []);

  const success = useCallback(
    (message, title = 'Success') => push('success', message, title),
    [push]
  );

  const error = useCallback(
    (message, title = 'Error') => push('error', message, title),
    [push]
  );

  const info = useCallback(
    (message, title = 'Notice') => push('info', message, title),
    [push]
  );

  return (
    <ToastContext.Provider value={{ success, error, info }}>
      {children}
      <div className="fixed top-4 right-4 z-[100] flex w-full max-w-sm flex-col gap-3 pointer-events-none">
        {toasts.map((t) => (
          <Toast key={t.id} toast={t} onClose={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}