import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Button, Input, Loading } from '../components/atoms';
import { authService } from '../services';
import { validateEmail, getErrorMessage } from '../utils';
import type { LoginRequest } from '../types';

interface LoginScreenProps {
  navigation: any;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ navigation }) => {
  const [formData, setFormData] = useState<LoginRequest>({
    email: '',
    password: '',
  });
  const [errors, setErrors] = useState<Partial<LoginRequest>>({});
  const [loading, setLoading] = useState(false);

  const validateForm = (): boolean => {
    const newErrors: Partial<LoginRequest> = {};

    if (!formData.email) {
      newErrors.email = '请输入邮箱地址';
    } else if (!validateEmail(formData.email)) {
      newErrors.email = '请输入有效的邮箱地址';
    }

    if (!formData.password) {
      newErrors.password = '请输入密码';
    } else if (formData.password.length < 6) {
      newErrors.password = '密码长度至少6位';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      await authService.login(formData);

      // 登录成功，导航将自动处理到主页面
      Alert.alert('成功', '登录成功！');
    } catch (error) {
      Alert.alert('登录失败', getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const updateFormData = (field: keyof LoginRequest, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // 清除相关错误
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>欢迎回来</Text>
          <Text style={styles.subtitle}>登录到您的 Telos 账户</Text>
        </View>

        <View style={styles.form}>
          <Input
            label="邮箱地址"
            placeholder="请输入邮箱地址"
            value={formData.email}
            onChangeText={text => updateFormData('email', text)}
            error={errors.email}
          />

          <Input
            label="密码"
            placeholder="请输入密码"
            value={formData.password}
            onChangeText={text => updateFormData('password', text)}
            secureTextEntry
            error={errors.password}
          />

          <Button
            title="登录"
            onPress={handleLogin}
            loading={loading}
            style={styles.loginButton}
          />
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            还没有账户？{' '}
            <Text
              style={styles.linkText}
              onPress={() => navigation.navigate('Register')}
            >
              立即注册
            </Text>
          </Text>
        </View>
      </ScrollView>

      {loading && <Loading overlay text="正在登录..." />}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
  },
  form: {
    marginBottom: 32,
  },
  loginButton: {
    marginTop: 24,
  },
  footer: {
    alignItems: 'center',
  },
  footerText: {
    fontSize: 16,
    color: '#8E8E93',
  },
  linkText: {
    color: '#007AFF',
    fontWeight: '600',
  },
});

export default LoginScreen;
