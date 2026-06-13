import { create } from 'zustand';

import { STORAGE_KEYS } from '../config/constant';
import { ThemeMode } from '../config/theme';
import authService from '../services/authService';
import { AuthSession, AuthUser } from '../types/user';
import StorageUtil from '../utils/storage';

type AppState = {
  theme: ThemeMode;
  initialized: boolean;
  authInitialized: boolean;
  isAuthenticated: boolean;
  currentSession: AuthSession | null;
  currentUser: AuthUser | null;
  setTheme: (theme: ThemeMode) => Promise<void>;
  initTheme: () => Promise<void>;
  initAuth: () => Promise<void>;
  signInWithApple: (session: AuthSession) => Promise<void>;
  signOut: () => Promise<void>;
};

export const useAppStore = create<AppState>((set) => ({
  theme: 'system',
  initialized: false,
  authInitialized: false,
  isAuthenticated: false,
  currentSession: null,
  currentUser: null,
  setTheme: async (theme) => {
    await StorageUtil.set(STORAGE_KEYS.theme, theme);
    set({ theme });
  },
  initTheme: async () => {
    const savedTheme = await StorageUtil.get<ThemeMode>(STORAGE_KEYS.theme);
    set({
      theme: savedTheme || 'system',
      initialized: true,
    });
  },
  initAuth: async () => {
    const savedSession = await StorageUtil.get<AuthSession>(STORAGE_KEYS.authSession);

    if (!savedSession?.token) {
      set({
        authInitialized: true,
        isAuthenticated: false,
        currentSession: null,
        currentUser: null,
      });
      return;
    }

    try {
      const verifiedSession = await authService.validateSession(savedSession.token);
      await StorageUtil.set(STORAGE_KEYS.authSession, verifiedSession);
      set({
        authInitialized: true,
        isAuthenticated: true,
        currentSession: verifiedSession,
        currentUser: verifiedSession.user,
      });
    } catch (error) {
      console.warn('[Auth] validate session failed:', error);
      await StorageUtil.remove(STORAGE_KEYS.authSession);
      set({
        authInitialized: true,
        isAuthenticated: false,
        currentSession: null,
        currentUser: null,
      });
    }
  },
  signInWithApple: async (session) => {
    await StorageUtil.set(STORAGE_KEYS.authSession, session);
    set({
      isAuthenticated: true,
      currentSession: session,
      currentUser: session.user,
    });
  },
  signOut: async () => {
    await StorageUtil.remove(STORAGE_KEYS.authSession);
    set({
      isAuthenticated: false,
      currentSession: null,
      currentUser: null,
    });
  },
}));
