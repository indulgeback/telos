import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  Alert,
} from 'react-native';
import { WorkflowCard, SearchBar } from '../components/molecules';
import { Loading, Button } from '../components/atoms';
import { workflowService } from '../services';
import { getErrorMessage, debounce } from '../utils';
import type { Workflow, PaginatedResponse } from '../types';

interface WorkflowsScreenProps {
  navigation: any;
}

const WorkflowsScreen: React.FC<WorkflowsScreenProps> = ({ navigation }) => {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [filter, setFilter] = useState<'all' | 'my' | 'published'>('all');

  useEffect(() => {
    loadWorkflows(true);
  }, [filter]);

  // 搜索防抖
  const debouncedSearch = useCallback(
    debounce((query: string) => {
      loadWorkflows(true, query);
    }, 500),
    [filter],
  );

  useEffect(() => {
    if (searchQuery) {
      debouncedSearch(searchQuery);
    } else {
      loadWorkflows(true);
    }
  }, [searchQuery, debouncedSearch]);

  const loadWorkflows = async (reset = false, search?: string) => {
    try {
      if (reset) {
        setLoading(true);
        setCurrentPage(1);
      } else {
        setLoadingMore(true);
      }

      const page = reset ? 1 : currentPage;
      const params = {
        page,
        limit: 20,
        status: filter === 'published' ? 'published' : undefined,
        search: search || searchQuery || undefined,
      };

      let response: PaginatedResponse<Workflow>;

      if (filter === 'my') {
        response = await workflowService.getMyWorkflows(params);
      } else {
        response = await workflowService.getWorkflows(params);
      }

      if (reset) {
        setWorkflows(response.items);
      } else {
        setWorkflows(prev => [...prev, ...response.items]);
      }

      setHasMore(response.hasNext);
      setCurrentPage(page + 1);
    } catch (error) {
      Alert.alert('加载失败', getErrorMessage(error));
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadWorkflows(true);
  };

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      loadWorkflows(false);
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

  const renderWorkflow = ({ item }: { item: Workflow }) => (
    <WorkflowCard
      workflow={item}
      onPress={() => handleWorkflowPress(item)}
      onExecute={() => handleExecuteWorkflow(item)}
    />
  );

  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <Loading text="加载更多..." />
      </View>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyText}>
        {searchQuery ? '没有找到匹配的工作流' : '暂无工作流'}
      </Text>
      {filter === 'my' && (
        <Button
          title="创建工作流"
          variant="outline"
          onPress={() => {
            // TODO: 导航到创建工作流页面
            Alert.alert('提示', '工作流创建功能即将上线！');
          }}
          style={styles.createButton}
        />
      )}
    </View>
  );

  const FilterButton: React.FC<{ type: typeof filter; title: string }> = ({
    type,
    title,
  }) => (
    <Button
      title={title}
      variant={filter === type ? 'primary' : 'outline'}
      size="small"
      onPress={() => setFilter(type)}
      style={styles.filterButton}
    />
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Loading text="正在加载工作流..." />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SearchBar
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholder="搜索工作流..."
      />

      <View style={styles.filterContainer}>
        <FilterButton type="all" title="全部" />
        <FilterButton type="my" title="我的" />
        <FilterButton type="published" title="已发布" />
      </View>

      <FlatList
        data={workflows}
        renderItem={renderWorkflow}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.1}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmpty}
        showsVerticalScrollIndicator={false}
      />
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
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  filterButton: {
    minWidth: 80,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 20,
  },
  createButton: {
    minWidth: 120,
  },
});

export default WorkflowsScreen;
