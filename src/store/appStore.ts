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
  unreadFollowerCount: number;
  unreadNotificationCount: number;
  unreadLikeFavoriteCount: number;
  unreadCommentCount: number;
  setTheme: (theme: ThemeMode) => Promise<void>;
  initTheme: () => Promise<void>;
  initAuth: () => Promise<void>;
  signInWithApple: (session: AuthSession) => Promise<void>;
  updateCurrentUser: (user: AuthUser) => Promise<void>;
  setUnreadFollowerCount: (count: number) => void;
  setUnreadNotificationCount: (count: number) => void;
  setUnreadLikeFavoriteCount: (count: number) => void;
  setUnreadCommentCount: (count: number) => void;
  signOut: () => Promise<void>;
};

export const useAppStore = create<AppState>((set) => ({
  theme: 'system',
  initialized: false,
  authInitialized: false,
  isAuthenticated: false,
  currentSession: null,
  currentUser: null,
  unreadFollowerCount: 0,
  unreadNotificationCount: 0,
  unreadLikeFavoriteCount: 0,
  unreadCommentCount: 0,
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
        unreadFollowerCount: 0,
        unreadNotificationCount: 0,
        unreadLikeFavoriteCount: 0,
        unreadCommentCount: 0,
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
        unreadFollowerCount: 0,
        unreadNotificationCount: 0,
        unreadLikeFavoriteCount: 0,
        unreadCommentCount: 0,
      });
    }
  },
  signInWithApple: async (session) => {
    await StorageUtil.set(STORAGE_KEYS.authSession, session);
    set({
      isAuthenticated: true,
      currentSession: session,
      currentUser: session.user,
      unreadFollowerCount: 0,
      unreadNotificationCount: 0,
      unreadLikeFavoriteCount: 0,
      unreadCommentCount: 0,
    });
  },
  updateCurrentUser: async (user) => {
    let nextSession: AuthSession | null = null;

    set((state) => {
      nextSession = state.currentSession
        ? {
            ...state.currentSession,
            user,
          }
        : null;

      return {
        currentUser: user,
        currentSession: nextSession,
      };
    });

    if (nextSession) {
      await StorageUtil.set(STORAGE_KEYS.authSession, nextSession);
    }
  },
  setUnreadFollowerCount: (count) => {
    set({
      unreadFollowerCount: Math.max(0, Number(count) || 0),
    });
  },
  setUnreadNotificationCount: (count) => {
    set({
      unreadNotificationCount: Math.max(0, Number(count) || 0),
    });
  },
  setUnreadLikeFavoriteCount: (count) => {
    set({
      unreadLikeFavoriteCount: Math.max(0, Number(count) || 0),
    });
  },
  setUnreadCommentCount: (count) => {
    set({
      unreadCommentCount: Math.max(0, Number(count) || 0),
    });
  },
  signOut: async () => {
    await StorageUtil.remove(STORAGE_KEYS.authSession);
    set({
      isAuthenticated: false,
      currentSession: null,
      currentUser: null,
      unreadFollowerCount: 0,
      unreadNotificationCount: 0,
      unreadLikeFavoriteCount: 0,
      unreadCommentCount: 0,
    });
  },
}));
