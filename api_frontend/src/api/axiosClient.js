import axios from 'axios';

const axiosClient = axios.create({
  baseURL: 'http://127.0.0.1:8000/api', 
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

axiosClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('pos_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

axiosClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Token ផុតកំណត់ / ត្រូវបានលុប → សម្អាត session ហើយឲ្យចូលប្រព័ន្ធវិញដោយស្វ័យប្រវត្តិ
    if (
      error.response?.status === 401 &&
      !(error.config?.url || '').includes('/login')
    ) {
      localStorage.removeItem('pos_token');
      localStorage.removeItem('pos_user');
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default axiosClient;