import { useState, useCallback, useMemo } from 'react';
import { AuthContext } from './authContextStore';
import axiosClient from '../api/axiosClient';

const TOKEN_KEY = 'pos_token';
const USER_KEY = 'pos_user';

function getStoredToken() {
  return localStorage.getItem(TOKEN_KEY) || null;
}

function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY) || 'null');
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(getStoredToken);
  const [user, setUser] = useState(getStoredUser);

  const login = useCallback(async (username, password) => {
    const res = await axiosClient.post('/login', { username, password });
    const data = res.data;

    if (!data.access_token) {
      throw new Error(data.message || 'Login failed.');
    }

    localStorage.setItem(TOKEN_KEY, data.access_token);
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));

    setToken(data.access_token);
    setUser(data.user);

    return data.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await axiosClient.post('/logout');
    } catch {
      // ignore
    }
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setToken(null);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      token,
      login,
      logout,
      isAuthenticated: Boolean(user && token),
    }),
    [user, token, login, logout]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}