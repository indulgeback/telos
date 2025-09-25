import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { Card, Avatar, Button, Loading } from '../components/atoms';
import { authService } from '../services';
import { getErrorMessage, formatDate } from '../utils';
import type { User } from '../types';

interface ProfileScreenProps {
  navigation: any;
}

const ProfileScreen: React.FC<ProfileScreenProps> = ({ navigation }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      setLoading(true);

      // 先尝试从本地获取用户信息
      const storedUser = await authService.getStoredUser();
      if (storedUser) {
        setUser(storedUser);
        setLoading(false);
      }

      // 然后从服务器获取最新信息
      const currentUser = await authService.getCurrentUser();
      setUser(currentUser);
    } catch (error) {
      Alert.alert('加载失败', getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('确认登出', '您确定要登出当前账户吗？', [
      { text: '取消', style: 'cancel' },
      {
        text: '登出',
        style: 'destructive',
        onPress: performLogout,
      },
    ]);
  };

  const performLogout = async () => {
    try {
      setLoggingOut(true);
      await authService.logout();
      // 登出成功，导航将自动处理到登录页面
    } catch (error) {
      Alert.alert('登出失败', getErrorMessage(error));
    } finally {
      setLoggingOut(false);
    }
  };

  const getRoleText = (role: string): string => {
    switch (role) {
      case 'admin':
        return '管理员';
      case 'user':
        return '用户';
      case 'guest':
        return '访客';
      default:
        return role;
    }
  };

  const getRoleColor = (role: string): string => {
    switch (role) {
      case 'admin':
        return '#FF3B30';
      case 'user':
        return '#007AFF';
      case 'guest':
        return '#8E8E93';
      default:
        return '#8E8E93';
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Loading text="正在加载用户信息..." />
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>加载用户信息失败</Text>
        <Button title="重试" onPress={loadUser} style={styles.retryButton} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Card style={styles.userCard}>
        <View style={styles.userHeader}>
          <Avatar source={user.avatar} name={user.name} size={80} />
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{user.name}</Text>
            <Text style={styles.userEmail}>{user.email}</Text>
            <View
              style={[
                styles.roleBadge,
                { backgroundColor: getRoleColor(user.role) },
              ]}
            >
              <Text style={styles.roleText}>{getRoleText(user.role)}</Text>
            </View>
          </View>
        </View>
      </Card>

      <Card style={styles.infoCard}>
        <Text style={styles.cardTitle}>账户信息</Text>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>账户创建时间</Text>
          <Text style={styles.infoValue}>{formatDate(user.createdAt)}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>最后更新时间</Text>
          <Text style={styles.infoValue}>{formatDate(user.updatedAt)}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>用户ID</Text>
          <Text style={styles.infoValue}>{user.id}</Text>
        </View>
      </Card>

      <Card style={styles.actionsCard}>
        <Text style={styles.cardTitle}>操作</Text>

        <TouchableOpacity
          style={styles.actionItem}
          onPress={() => {
            // TODO: 导航到编辑资料页面
            Alert.alert('提示', '编辑资料功能即将上线！');
          }}
        >
          <Text style={styles.actionText}>编辑资料</Text>
          <Text style={styles.actionArrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionItem}
          onPress={() => {
            // TODO: 导航到修改密码页面
            Alert.alert('提示', '修改密码功能即将上线！');
          }}
        >
          <Text style={styles.actionText}>修改密码</Text>
          <Text style={styles.actionArrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionItem}
          onPress={() => navigation.navigate('Settings')}
        >
          <Text style={styles.actionText}>设置</Text>
          <Text style={styles.actionArrow}>›</Text>
        </TouchableOpacity>
      </Card>

      <View style={styles.logoutContainer}>
        <Button
          title="登出"
          variant="outline"
          onPress={handleLogout}
          loading={loggingOut}
          style={styles.logoutButton}
        />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  errorText: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    minWidth: 120,
  },
  userCard: {
    margin: 16,
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userInfo: {
    marginLeft: 16,
    flex: 1,
  },
  userName: {
    fontSize: 24,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 16,
    color: '#8E8E93',
    marginBottom: 8,
  },
  roleBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  roleText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  infoCard: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  actionsCard: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  infoLabel: {
    fontSize: 16,
    color: '#1C1C1E',
  },
  infoValue: {
    fontSize: 16,
    color: '#8E8E93',
  },
  actionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  actionText: {
    fontSize: 16,
    color: '#007AFF',
  },
  actionArrow: {
    fontSize: 20,
    color: '#C7C7CC',
  },
  logoutContainer: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  logoutButton: {
    borderColor: '#FF3B30',
  },
});

export default ProfileScreen;
