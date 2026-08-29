import { createContext, useContext, useEffect, useState } from 'react';
import { getCurrentUser, loginRequest, registerRequest } from '../services/authService';
import { saveSession, getAccessToken, clearSession } from '../services/tokenStorage';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getAccessToken()) {
      setLoading(false);
      return;
    }

    getCurrentUser()
      .then(setUser)
      .catch(clearSession)
      .finally(() => setLoading(false));
  }, []);

  async function login({ idNumber, email, password, remember }) {
    const { session, user: profile } = await loginRequest({ idNumber, email, password });
    saveSession({
      accessToken: session.access_token,
      refreshToken: session.refresh_token,
      remember,
    });
    setUser(profile);
    return profile;
  }

  async function register({ name, email, idNumber, password }) {
    return registerRequest({ name, email, idNumber, password });
  }

  function logout() {
    clearSession();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
