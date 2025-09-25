import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  Alert,
} from 'react-native';
import { UserHeader, WorkflowCard, SearchBar } from '../components/molecules';
import { Loading, Button } from '../components/atoms';
import { authService, workflowService } from '../services';
import { getErrorMessage } from '../utils';
import type { User, Workflow } from '../types';

interface HomeScreenProps {
  navigation: any;
}

const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const [user, setUser] = useState<User | null>(null);
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      await Promise.all([loadUser(), loadWorkflows()]);
    } catch (error) {
      Alert.alert('加载失败', getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const loadUser = async () => {
    try {
      // 先尝试从本地获取用户信息
      const storedUser = await authService.getStoredUser();
      if (storedUser) {
        setUser(storedUser);
      }

      // 然后从服务器获取最新信息
      const currentUser = await authService.getCurrentUser();
      setUser(currentUser);
    } catch (error) {
      console.error('Failed to load user:', error);
    }
  };

  const loadWorkflows = async () => {
    try {
      const response = await workflowService.getWorkflows({
        page: 1,
        limit: 10,
        status: 'published',
      });
      setWorkflows(response.items);
    } catch (error) {
      console.error('Failed to load workflows:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await loadInitialData();
    } finally {
      setRefreshing(false);
    }
  };

  const handleWorkflowPress = (workflow: Workflow) => {
    navigation.navigate('WorkflowDetail', { workflowId: workflow.id });
  };

  const handleExecuteWorkflow = async (workflow: Workflow) => {
    try {
      const result = await workflowService.executeWorkflow(workflow.id);
      Alert.alert(
        '执行成功',
        `工作流已开始执行，执行ID: ${result.executionId}`,
      );
    } catch (error) {
      Alert.alert('执行失败', getErrorMessage(error));
    }
  };

  const filteredWorkflows = workflows.filter(
    workflow =>
      workflow.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      workflow.description?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Loading text="正在加载..." />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {user && (
          <UserHeader
            user={user}
            showGreeting
            onPress={() => navigation.navigate('Profile')}
          />
        )}

        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="搜索工作流..."
        />

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>推荐工作流</Text>
            <Button
              title="查看全部"
              variant="ghost"
              size="small"
              onPress={() => navigation.navigate('Workflows')}
            />
          </View>

          {filteredWorkflows.length > 0 ? (
            <View style={styles.workflowList}>
              {filteredWorkflows.map(workflow => (
                <WorkflowCard
                  key={workflow.id}
                  workflow={workflow}
                  onPress={() => handleWorkflowPress(workflow)}
                  onExecute={() => handleExecuteWorkflow(workflow)}
                />
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>
                {searchQuery ? '没有找到匹配的工作流' : '暂无推荐工作流'}
              </Text>
              <Button
                title="创建工作流"
                variant="outline"
                onPress={() => navigation.navigate('Workflows')}
                style={styles.createButton}
              />
            </View>
          )}
        </View>

        <View style={styles.quickActions}>
          <Text style={styles.sectionTitle}>快速操作</Text>
          <View style={styles.actionButtons}>
            <Button
              title="我的工作流"
              variant="outline"
              onPress={() => navigation.navigate('Workflows')}
              style={styles.actionButton}
            />
            <Button
              title="设置"
              variant="outline"
              onPress={() => navigation.navigate('Settings')}
              style={styles.actionButton}
            />
          </View>
        </View>
      </ScrollView>
    </View>
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
  scrollView: {
    flex: 1,
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  workflowList: {
    gap: 8,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 16,
  },
  createButton: {
    minWidth: 120,
  },
  quickActions: {
    paddingHorizontal: 16,
    marginBottom: 32,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  actionButton: {
    flex: 1,
  },
});

export default HomeScreen;
