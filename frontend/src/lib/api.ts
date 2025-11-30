import type { User, AuthResponse, Workflow, Execution } from './types';

export type { User, AuthResponse, Workflow, Execution };

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  errors?: Array<{ field: string; message: string }>;
}

interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

class ApiClient {
  private token: string | null = null;

  constructor() {
    this.token = localStorage.getItem('token');
  }

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Request failed');
    }

    return data;
  }

  async register(email: string, password: string, name: string): Promise<AuthResponse> {
    const response = await this.request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    });
    
    if (response.data) {
      this.setToken(response.data.token);
    }
    
    return response.data!;
  }

  async login(email: string, password: string): Promise<AuthResponse> {
    const response = await this.request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    
    if (response.data) {
      this.setToken(response.data.token);
    }
    
    return response.data!;
  }

  async getCurrentUser(): Promise<User> {
    const response = await this.request<User>('/auth/me');
    return response.data!;
  }

  logout() {
    this.setToken(null);
  }

  async getWorkflows(page = 1, limit = 10): Promise<PaginatedResponse<Workflow>> {
    const response = await this.request<PaginatedResponse<Workflow>>(
      `/workflows?page=${page}&limit=${limit}`
    );
    return response as unknown as PaginatedResponse<Workflow>;
  }

  async getWorkflow(id: string): Promise<Workflow> {
    const response = await this.request<Workflow>(`/workflows/${id}`);
    return response.data!;
  }

  async createWorkflow(workflow: Partial<Workflow>): Promise<Workflow> {
    const response = await this.request<Workflow>('/workflows', {
      method: 'POST',
      body: JSON.stringify(workflow),
    });
    return response.data!;
  }

  async updateWorkflow(id: string, workflow: Partial<Workflow>): Promise<Workflow> {
    const response = await this.request<Workflow>(`/workflows/${id}`, {
      method: 'PUT',
      body: JSON.stringify(workflow),
    });
    return response.data!;
  }

  async deleteWorkflow(id: string): Promise<void> {
    await this.request(`/workflows/${id}`, {
      method: 'DELETE',
    });
  }

  async publishWorkflow(id: string): Promise<Workflow> {
    const response = await this.request<Workflow>(`/workflows/${id}/publish`, {
      method: 'POST',
    });
    return response.data!;
  }

  async pauseWorkflow(id: string): Promise<Workflow> {
    const response = await this.request<Workflow>(`/workflows/${id}/pause`, {
      method: 'POST',
    });
    return response.data!;
  }

  async activateWorkflow(id: string): Promise<Workflow> {
    const response = await this.request<Workflow>(`/workflows/${id}/activate`, {
      method: 'POST',
    });
    return response.data!;
  }

  async deactivateWorkflow(id: string): Promise<Workflow> {
    const response = await this.request<Workflow>(`/workflows/${id}/deactivate`, {
      method: 'POST',
    });
    return response.data!;
  }

  async getActiveWorkflow(): Promise<Workflow | null> {
    const response = await this.request<Workflow | null>('/workflows/active');
    return response.data ?? null;
  }

  async executeWorkflow(workflowId: string): Promise<Execution> {
    const response = await this.request<Execution>(`/execute/${workflowId}`, {
      method: 'POST',
    });
    return response.data!;
  }

  async stopWorkflow(workflowId: string): Promise<void> {
    await this.request(`/execute/${workflowId}/stop`, {
      method: 'POST',
    });
  }

  async getWorkflowExecutionStatus(workflowId: string): Promise<{
    isRunning: boolean;
    executionId?: string;
    startedAt?: string;
  }> {
    const response = await this.request<any>(`/execute/${workflowId}/status`);
    return response.data!;
  }

  async getRunningWorkflows(): Promise<Array<{
    workflowId: string;
    executionId: string;
    startedAt: string;
  }>> {
    const response = await this.request<any>('/execute/running');
    return response.data!;
  }

  async getExecutionHistory(workflowId: string, limit = 10): Promise<Execution[]> {
    const response = await this.request<Execution[]>(
      `/execute/${workflowId}/history?limit=${limit}`
    );
    return response.data!;
  }

  async getSchedulerStatus(): Promise<{ isRunning: boolean; scheduledCount: number; workflows: any[] }> {
    const response = await this.request<any>('/scheduler/status');
    return response.data!;
  }

  async refreshScheduler(): Promise<void> {
    await this.request('/scheduler/refresh', { method: 'POST' });
  }
}

export const api = new ApiClient();
export default api;
