import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile, UserRole } from '../types/index.js';
import { api, setAuthToken, getSavedAuthToken } from '../services/api.js';
import { auth, assertFirebaseClientConfiguration } from '../config/firebase.js';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut as fbSignOut } from 'firebase/auth';

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  error: string | null;
  login: (email: string, rollNumber: string, password?: string) => Promise<boolean>;
  register: (payload: {
    name: string;
    email: string;
    rollNumber: string;
    department?: string;
    year?: string;
    section?: string;
    password?: string;
    role?: UserRole;
  }) => Promise<boolean>;
  logout: () => Promise<void>;
  switchRole: (newRole: UserRole) => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initAuth = async () => {
      const savedToken = getSavedAuthToken();
      if (savedToken) {
        try {
          const res = await api.getMe();
          setUser(res.user);
        } catch (err: any) {
          console.warn('[AuthProvider] Stored session expired or invalid:', err.message);
          setAuthToken(null);
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const clearError = () => setError(null);

  const login = async (email: string, rollNumber: string, password = ''): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      if (!email.trim() || !rollNumber.trim()) {
        throw new Error('University email and roll number are required.');
      }

      assertFirebaseClientConfiguration();
      const userCred = await signInWithEmailAndPassword(auth, email.trim(), password);
      setAuthToken(await userCred.user.getIdToken());

      // Verify user in backend
      const res = await api.getMe();
      const userProfile = res.user;

      // Mandatory Roll Number Validation check per Section 4
      if (userProfile.rollNumber && rollNumber) {
        if (userProfile.rollNumber.toUpperCase() !== rollNumber.trim().toUpperCase()) {
          setAuthToken(null);
          setUser(null);
          throw new Error(`Authentication Mismatch: Entered roll number '${rollNumber}' does not match registered university credentials for ${email}.`);
        }
      }

      setUser(userProfile);
      return true;
    } catch (err: any) {
      console.error('[Auth.login]', err);
      setError(err.message || 'Login failed');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const register = async (payload: {
    name: string;
    email: string;
    rollNumber: string;
    department?: string;
    year?: string;
    section?: string;
    password?: string;
    role?: UserRole;
  }): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      assertFirebaseClientConfiguration();
      const userCred = await createUserWithEmailAndPassword(auth, payload.email.trim(), payload.password || '');
      const uid = userCred.user.uid;
      setAuthToken(await userCred.user.getIdToken());

      const res = await api.register({
        ...payload,
        name: payload.name.trim().toUpperCase(),
        rollNumber: payload.rollNumber.trim().toUpperCase(),
        uid,
        role: payload.role || 'student',
      });

      setUser(res.user);
      return true;
    } catch (err: any) {
      console.error('[Auth.register]', err);
      setError(err.message || 'Registration failed');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await fbSignOut(auth).catch(() => {});
    } catch {}
    setAuthToken(null);
    setUser(null);
  };

  const switchRole = async (newRole: UserRole) => {
    if (!user) return;
    try {
      setLoading(true);
      const res = await api.switchRole(newRole, user.uid);
      setUser(res.user);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        login,
        register,
        logout,
        switchRole,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
