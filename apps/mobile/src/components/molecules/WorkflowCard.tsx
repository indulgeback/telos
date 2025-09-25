import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Card, Avatar } from '../atoms';
import { formatDate } from '../../utils';
import type { Workflow } from '../../types';

interface WorkflowCardProps {
  workflow: Workflow;
  onPress: () => void;
  onExecute?: () => void;
}

const WorkflowCard: React.FC<WorkflowCardProps> = ({
  workflow,
  onPress,
  onExecute,
}) => {
  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'published':
        return '#34C759';
      case 'draft':
        return '#FF9500';
      case 'archived':
        return '#8E8E93';
      default:
        return '#8E8E93';
    }
  };

  const getStatusText = (status: string): string => {
    switch (status) {
      case 'published':
        return '已发布';
      case 'draft':
        return '草稿';
      case 'archived':
        return '已归档';
      default:
        return status;
    }
  };

  return (
    <Card onPress={onPress}>
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Text style={styles.title} numberOfLines={2}>
            {workflow.name}
          </Text>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: getStatusColor(workflow.status) },
            ]}
          >
            <Text style={styles.statusText}>
              {getStatusText(workflow.status)}
            </Text>
          </View>
        </View>
      </View>

      {workflow.description && (
        <Text style={styles.description} numberOfLines={3}>
          {workflow.description}
        </Text>
      )}

      <View style={styles.footer}>
        <View style={styles.metaInfo}>
          <Text style={styles.metaText}>
            创建于 {formatDate(workflow.createdAt)}
          </Text>
          <Text style={styles.metaText}>{workflow.steps.length} 个步骤</Text>
        </View>

        {workflow.status === 'published' && onExecute && (
          <TouchableOpacity style={styles.executeButton} onPress={onExecute}>
            <Text style={styles.executeButtonText}>执行</Text>
          </TouchableOpacity>
        )}
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  titleContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
    flex: 1,
    marginRight: 12,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  description: {
    fontSize: 14,
    color: '#666666',
    lineHeight: 20,
    marginBottom: 12,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaInfo: {
    flex: 1,
  },
  metaText: {
    fontSize: 12,
    color: '#8E8E93',
    marginBottom: 2,
  },
  executeButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  executeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default WorkflowCard;
