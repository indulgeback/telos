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
import { validateEmail, validatePassword, getErrorMessage } from '../utils';
import type { RegisterRequest } from '../types';

interface RegisterScreenProps {
  navigation: any;
}

const RegisterScreen: React.FC<RegisterScreenProps> = ({ navigation }) => {
  const [formData, setFormData] = useState<RegisterRequest>({
    email: '',
    password: '',
    name: '',
  });
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<
    Partial<RegisterRequest & { confirmPassword: string }>
  >({});
  const [loading, setLoading] = useState(false);

  const validateForm = (): boolean => {
    const newErrors: Partial<RegisterRequest & { confirmPassword: string }> =
      {};

    // 验证姓名
    if (!formData.name.trim()) {
      newErrors.name = '请输入姓名';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = '姓名长度至少2位';
    }

    // 验证邮箱
    if (!formData.email) {
      newErrors.email = '请输入邮箱地址';
    } else if (!validateEmail(formData.email)) {
      newErrors.email = '请输入有效的邮箱地址';
    }

    // 验证密码
    if (!formData.password) {
      newErrors.password = '请输入密码';
    } else {
      const passwordValidation = validatePassword(formData.password);
      if (!passwordValidation.isValid) {
        newErrors.password = passwordValidation.errors[0];
      }
    }

    // 验证确认密码
    if (!confirmPassword) {
      newErrors.confirmPassword = '请确认密码';
    } else if (confirmPassword !== formData.password) {
      newErrors.confirmPassword = '两次输入的密码不一致';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      await authService.register(formData);

      Alert.alert('注册成功', '欢迎加入 Telos！', [
        {
          text: '确定',
          onPress: () => {
            // 注册成功，导航将自动处理到主页面
          },
        },
      ]);
    } catch (error) {
      Alert.alert('注册失败', getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const updateFormData = (field: keyof RegisterRequest, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // 清除相关错误
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const updateConfirmPassword = (value: string) => {
    setConfirmPassword(value);
    if (errors.confirmPassword) {
      setErrors(prev => ({ ...prev, confirmPassword: undefined }));
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
          <Text style={styles.title}>创建账户</Text>
          <Text style={styles.subtitle}>开始您的 Telos 工作流之旅</Text>
        </View>

        <View style={styles.form}>
          <Input
            label="姓名"
            placeholder="请输入您的姓名"
            value={formData.name}
            onChangeText={text => updateFormData('name', text)}
            error={errors.name}
          />

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

          <Input
            label="确认密码"
            placeholder="请再次输入密码"
            value={confirmPassword}
            onChangeText={updateConfirmPassword}
            secureTextEntry
            error={errors.confirmPassword}
          />

          <Button
            title="注册"
            onPress={handleRegister}
            loading={loading}
            style={styles.registerButton}
          />
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            已有账户？{' '}
            <Text
              style={styles.linkText}
              onPress={() => navigation.navigate('Login')}
            >
              立即登录
            </Text>
          </Text>
        </View>
      </ScrollView>

      {loading && <Loading overlay text="正在注册..." />}
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
    paddingVertical: 40,
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
  registerButton: {
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

export default RegisterScreen;
