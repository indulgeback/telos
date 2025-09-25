import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Text, StyleSheet } from 'react-native';
import { HomeScreen, WorkflowsScreen, ProfileScreen } from '../screens';
import type { MainTabParamList } from '../types';

const Tab = createBottomTabNavigator<MainTabParamList>();
const Stack = createStackNavigator();

// Tab图标组件（由于没有图标库，暂时使用文字）
const TabIcon: React.FC<{ name: string; focused: boolean }> = ({
  name,
  focused,
}) => {
  const getIconText = (iconName: string): string => {
    switch (iconName) {
      case 'Home':
        return '🏠';
      case 'Workflows':
        return '⚙️';
      case 'Profile':
        return '👤';
      default:
        return '•';
    }
  };

  return (
    <Text style={[styles.tabIcon, { opacity: focused ? 1 : 0.6 }]}>
      {getIconText(name)}
    </Text>
  );
};

// Tab导航器
const TabNavigator: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }: { route: { name: string } }) => ({
        tabBarIcon: ({ focused }: { focused: boolean }) => (
          <TabIcon name={route.name} focused={focused} />
        ),
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: '#8E8E93',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#E5E5EA',
          height: 85,
          paddingBottom: 20,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
        headerStyle: {
          backgroundColor: '#FFFFFF',
          shadowColor: '#000000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.1,
          shadowRadius: 2,
          elevation: 2,
        },
        headerTitleStyle: {
          fontSize: 18,
          fontWeight: '600',
          color: '#1C1C1E',
        },
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          title: '首页',
          headerTitle: 'Telos',
        }}
      />
      <Tab.Screen
        name="Workflows"
        component={WorkflowsScreen}
        options={{
          title: '工作流',
          headerTitle: '工作流管理',
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: '我的',
          headerTitle: '个人资料',
        }}
      />
    </Tab.Navigator>
  );
};

// 主导航器（包含Tab和其他Stack页面）
const MainNavigator: React.FC = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainTabs" component={TabNavigator} />

      {/* 其他页面可以在这里添加 */}
      {/* 
      <Stack.Screen 
        name="WorkflowDetail" 
        component={WorkflowDetailScreen}
        options={{
          headerShown: true,
          title: '工作流详情',
        }}
      />
      <Stack.Screen 
        name="Settings" 
        component={SettingsScreen}
        options={{
          headerShown: true,
          title: '设置',
        }}
      />
      */}
    </Stack.Navigator>
  );
};

const styles = StyleSheet.create({
  tabIcon: {
    fontSize: 20,
  },
});

export default MainNavigator;
