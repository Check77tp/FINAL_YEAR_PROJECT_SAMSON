import { createContext, useContext, useEffect, useState } from 'react';
import { getCurrentUser, loginRequest, registerRequest } from '../services/authService';
import { saveSession, getAccessToken, clearSession } from '../services/tokenStorage';
import { disablePush, resubscribeIfOptedIn } from '../services/pushService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getAccessToken()) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    // A network failure here (offline, or the server briefly unreachable)
    // does NOT mean the session itself is invalid — only a genuine auth
    // rejection (expired/invalid token, a real 401) should log the user
    // out. Wiping a perfectly good session just because a background check
    // couldn't reach the server would boot a student to the login screen
    // every time they open the installed app with weak hostel wifi.
    function attempt() {
      getCurrentUser()
        .then((profile) => {
          if (!cancelled) setUser(profile);
        })
        .catch((err) => {
          if (!cancelled && !err.isNetworkError) clearSession();
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }

    attempt();

    // If that first attempt failed because we were offline, the token is
    // still sitting in storage unused — retry once the browser reports a
    // connection again instead of leaving the user stuck on the login
    // screen until they manually reload.
    function retryOnReconnect() {
      if (!cancelled) attempt();
    }
    window.addEventListener('online', retryOnReconnect);

    return () => {
      cancelled = true;
      window.removeEventListener('online', retryOnReconnect);
    };
  }, []);

  async function login({ idNumber, email, password, remember }) {
    const { session, user: profile } = await loginRequest({ idNumber, email, password });
    saveSession({
      accessToken: session.access_token,
      refreshToken: session.refresh_token,
      remember,
    });
    setUser(profile);
    resubscribeIfOptedIn(); // silently restore notifications if previously enabled here
    return profile;
  }

  async function register({ name, email, idNumber, password }) {
    return registerRequest({ name, email, idNumber, password });
  }

  // Removes this device's push subscription BEFORE the token is cleared (the
  // unsubscribe call needs it) so the next person to use a shared phone never
  // receives the previous user's notifications. Capped at 1.5s so a slow
  // network can't stall logging out.
  async function logout() {
    await Promise.race([
      disablePush({ forget: false }).catch(() => {}),
      new Promise((resolve) => setTimeout(resolve, 1500)),
    ]);
    clearSession();
    setUser(null);
  }

  // Merges a server-returned profile (e.g. after editing name/avatar in
  // Account Settings) into the current user so it's reflected everywhere it
  // renders — the TopNav avatar included — without a full reload.
  function updateUser(patch) {
    setUser((prev) => ({ ...prev, ...patch }));
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser }}>
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
