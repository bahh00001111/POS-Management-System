import { useEffect, useRef } from 'react';
import { useAuth } from '../context/useAuth';
import { useToast } from '../context/useToast';
import axiosClient from '../api/axiosClient';

// កាលបរិច្ឆេទខុសគ្នាសម្រាប់ការជូនដំណឹងដែលត្រូវបានដាស់ថ្មី (reactivate)
const sig = (n) => `${n.notification_id}:${n.created_at}`;

export default function NotificationWatcher() {
  const { user } = useAuth();
  const toast = useToast();
  const seen = useRef(new Set());
  const firstPoll = useRef(true);

  const canView = (user?.roles || []).some((r) => ['Admin', 'Manager'].includes(r));

  const poll = async () => {
    try {
      const res = await axiosClient.get('/notifications');
      const list = res.data.data || res.data || [];

      // លើកទីមួយគ្រាន់តែផ្ទុកបញ្ជី កុំបង្ហាញ toast ទាំងអស់ពេលចូលប្រព័ន្ធ
      if (firstPoll.current) {
        firstPoll.current = false;
        list.forEach((n) => seen.current.add(sig(n)));
        return;
      }

      list.forEach((n) => {
        const s = sig(n);
        if (seen.current.has(s)) return;
        seen.current.add(s);
        if (n.type === 'OUT_OF_STOCK') {
          toast.error(n.message, n.title || 'Out of Stock');
        } else {
          toast.info(n.message, n.title || 'Low Stock');
        }
      });
    } catch {
      // មិនទាន់ចូលប្រព័ន្ធ — មិនធ្វើអ្វី
    }
  };

  useEffect(() => {
    if (!canView) return;
    poll();

    const timer = setInterval(poll, 15000);
    const onRefresh = () => poll();
    window.addEventListener('pos-stock-alert', onRefresh);

    return () => {
      clearInterval(timer);
      window.removeEventListener('pos-stock-alert', onRefresh);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canView]);

  return null;
}