import { apiClient } from './api';
import type { Workflow, PaginatedResponse } from '../types';

class WorkflowService {
  // 获取工作流列表
  async getWorkflows(params?: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
  }): Promise<PaginatedResponse<Workflow>> {
    const queryParams = new URLSearchParams();

    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.status) queryParams.append('status', params.status);
    if (params?.search) queryParams.append('search', params.search);

    const endpoint = `/workflows?${queryParams.toString()}`;
    const response = await apiClient.get<PaginatedResponse<Workflow>>(endpoint);

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.message || '获取工作流列表失败');
  }

  // 获取工作流详情
  async getWorkflow(id: string): Promise<Workflow> {
    const response = await apiClient.get<Workflow>(`/workflows/${id}`);

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.message || '获取工作流详情失败');
  }

  // 创建工作流
  async createWorkflow(
    workflow: Omit<Workflow, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>,
  ): Promise<Workflow> {
    const response = await apiClient.post<Workflow>('/workflows', workflow);

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.message || '创建工作流失败');
  }

  // 更新工作流
  async updateWorkflow(
    id: string,
    updates: Partial<Workflow>,
  ): Promise<Workflow> {
    const response = await apiClient.put<Workflow>(`/workflows/${id}`, updates);

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.message || '更新工作流失败');
  }

  // 删除工作流
  async deleteWorkflow(id: string): Promise<void> {
    const response = await apiClient.delete(`/workflows/${id}`);

    if (!response.success) {
      throw new Error(response.message || '删除工作流失败');
    }
  }

  // 执行工作流
  async executeWorkflow(
    id: string,
    inputs?: Record<string, any>,
  ): Promise<{ executionId: string }> {
    const response = await apiClient.post<{ executionId: string }>(
      `/workflows/${id}/execute`,
      inputs,
    );

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.message || '执行工作流失败');
  }

  // 获取工作流执行历史
  async getWorkflowExecutions(
    workflowId: string,
    params?: {
      page?: number;
      limit?: number;
    },
  ): Promise<PaginatedResponse<any>> {
    const queryParams = new URLSearchParams();

    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());

    const endpoint = `/workflows/${workflowId}/executions?${queryParams.toString()}`;
    const response = await apiClient.get<PaginatedResponse<any>>(endpoint);

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.message || '获取执行历史失败');
  }

  // 获取我的工作流
  async getMyWorkflows(params?: {
    page?: number;
    limit?: number;
    status?: string;
  }): Promise<PaginatedResponse<Workflow>> {
    const queryParams = new URLSearchParams();

    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.status) queryParams.append('status', params.status);

    const endpoint = `/workflows/my?${queryParams.toString()}`;
    const response = await apiClient.get<PaginatedResponse<Workflow>>(endpoint);

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.message || '获取我的工作流失败');
  }

  // 复制工作流
  async duplicateWorkflow(id: string, name?: string): Promise<Workflow> {
    const response = await apiClient.post<Workflow>(
      `/workflows/${id}/duplicate`,
      { name },
    );

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.message || '复制工作流失败');
  }

  // 发布工作流
  async publishWorkflow(id: string): Promise<Workflow> {
    const response = await apiClient.patch<Workflow>(
      `/workflows/${id}/publish`,
    );

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.message || '发布工作流失败');
  }

  // 归档工作流
  async archiveWorkflow(id: string): Promise<Workflow> {
    const response = await apiClient.patch<Workflow>(
      `/workflows/${id}/archive`,
    );

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.message || '归档工作流失败');
  }
}

export const workflowService = new WorkflowService();
