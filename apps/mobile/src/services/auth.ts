import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient } from './api';
import { STORAGE_KEYS } from '../utils';
import type {
  LoginRequest,
  RegisterRequest,
  AuthResponse,
  User,
} from '../types';

class AuthService {
  // 登录
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>(
      '/auth/login',
      credentials,
    );

    if (response.success && response.data) {
      await this.storeAuthData(response.data);
      return response.data;
    }

    throw new Error(response.message || '登录失败');
  }

  // 注册
  async register(userData: RegisterRequest): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>(
      '/auth/register',
      userData,
    );

    if (response.success && response.data) {
      await this.storeAuthData(response.data);
      return response.data;
    }

    throw new Error(response.message || '注册失败');
  }

  // 登出
  async logout(): Promise<void> {
    try {
      await apiClient.post('/auth/logout');
    } catch (error) {
      console.error('Logout API call failed:', error);
    } finally {
      await this.clearAuthData();
    }
  }

  // 获取当前用户信息
  async getCurrentUser(): Promise<User> {
    const response = await apiClient.get<User>('/auth/me');

    if (response.success && response.data) {
      await AsyncStorage.setItem(
        STORAGE_KEYS.USER_DATA,
        JSON.stringify(response.data),
      );
      return response.data;
    }

    throw new Error(response.message || '获取用户信息失败');
  }

  // 刷新令牌
  async refreshToken(): Promise<string> {
    const response = await apiClient.post<{ token: string }>('/auth/refresh');

    if (response.success && response.data) {
      await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, response.data.token);
      return response.data.token;
    }

    throw new Error(response.message || '刷新令牌失败');
  }

  // 修改密码
  async changePassword(
    oldPassword: string,
    newPassword: string,
  ): Promise<void> {
    const response = await apiClient.put('/auth/change-password', {
      oldPassword,
      newPassword,
    });

    if (!response.success) {
      throw new Error(response.message || '修改密码失败');
    }
  }

  // 重置密码
  async resetPassword(email: string): Promise<void> {
    const response = await apiClient.post('/auth/reset-password', { email });

    if (!response.success) {
      throw new Error(response.message || '重置密码失败');
    }
  }

  // 存储认证数据
  private async storeAuthData(authData: AuthResponse): Promise<void> {
    await Promise.all([
      AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, authData.token),
      AsyncStorage.setItem(
        STORAGE_KEYS.USER_DATA,
        JSON.stringify(authData.user),
      ),
    ]);
  }

  // 清除认证数据
  private async clearAuthData(): Promise<void> {
    await Promise.all([
      AsyncStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN),
      AsyncStorage.removeItem(STORAGE_KEYS.USER_DATA),
    ]);
  }

  // 检查是否已登录
  async isAuthenticated(): Promise<boolean> {
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
      return !!token;
    } catch {
      return false;
    }
  }

  // 获取存储的用户数据
  async getStoredUser(): Promise<User | null> {
    try {
      const userData = await AsyncStorage.getItem(STORAGE_KEYS.USER_DATA);
      return userData ? JSON.parse(userData) : null;
    } catch {
      return null;
    }
  }

  // 获取存储的令牌
  async getStoredToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
    } catch {
      return null;
    }
  }
}

export const authService = new AuthService();
