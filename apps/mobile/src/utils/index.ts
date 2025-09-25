// API 常量
export const API_BASE_URL = __DEV__
  ? 'http://localhost:8080/api'
  : 'https://api.telos.com/api';

// 存储键名
export const STORAGE_KEYS = {
  AUTH_TOKEN: '@telos:auth_token',
  USER_DATA: '@telos:user_data',
  THEME: '@telos:theme',
  LANGUAGE: '@telos:language',
} as const;

// 时间格式化
export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export const formatDateTime = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

// 字符串工具
export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

export const capitalizeFirst = (text: string): string => {
  return text.charAt(0).toUpperCase() + text.slice(1);
};

// 验证工具
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePassword = (
  password: string,
): {
  isValid: boolean;
  errors: string[];
} => {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('密码至少需要8个字符');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('密码需要包含至少一个大写字母');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('密码需要包含至少一个小写字母');
  }

  if (!/\d/.test(password)) {
    errors.push('密码需要包含至少一个数字');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

// 错误处理
export const getErrorMessage = (error: any): string => {
  if (typeof error === 'string') return error;
  if (error?.message) return error.message;
  if (error?.response?.data?.message) return error.response.data.message;
  if (error?.response?.data?.error) return error.response.data.error;
  return '发生未知错误';
};

// 设备信息
export const isIOS = (): boolean => {
  return require('react-native').Platform.OS === 'ios';
};

export const isAndroid = (): boolean => {
  return require('react-native').Platform.OS === 'android';
};

// 延迟工具
export const delay = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

// 防抖函数
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number,
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};
