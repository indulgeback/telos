import { useState, useEffect } from 'react';
import { authService } from '../services';
import type { User, AuthState } from '../types';

export const useAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: true,
  });

  useEffect(() => {
    checkAuthState();
  }, []);

  const checkAuthState = async () => {
    try {
      const [isAuthenticated, user, token] = await Promise.all([
        authService.isAuthenticated(),
        authService.getStoredUser(),
        authService.getStoredToken(),
      ]);

      setAuthState({
        user,
        token,
        isAuthenticated,
        isLoading: false,
      });
    } catch (error) {
      console.error('Failed to check auth state:', error);
      setAuthState({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  };

  const login = async (email: string, password: string) => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true }));

      const authData = await authService.login({ email, password });

      setAuthState({
        user: authData.user,
        token: authData.token,
        isAuthenticated: true,
        isLoading: false,
      });

      return authData;
    } catch (error) {
      setAuthState(prev => ({ ...prev, isLoading: false }));
      throw error;
    }
  };

  const register = async (email: string, password: string, name: string) => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true }));

      const authData = await authService.register({ email, password, name });

      setAuthState({
        user: authData.user,
        token: authData.token,
        isAuthenticated: true,
        isLoading: false,
      });

      return authData;
    } catch (error) {
      setAuthState(prev => ({ ...prev, isLoading: false }));
      throw error;
    }
  };

  const logout = async () => {
    try {
      await authService.logout();

      setAuthState({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
      });
    } catch (error) {
      console.error('Logout failed:', error);
      // 即使API调用失败，也要清除本地状态
      setAuthState({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  };

  const updateUser = async () => {
    try {
      const user = await authService.getCurrentUser();
      setAuthState(prev => ({ ...prev, user }));
      return user;
    } catch (error) {
      console.error('Failed to update user:', error);
      throw error;
    }
  };

  return {
    ...authState,
    login,
    register,
    logout,
    updateUser,
    checkAuthState,
  };
};
