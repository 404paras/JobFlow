import type { User, AuthResponse, Workflow, Execution, Job, JobCounts, JobFilters, ApplicationStatus } from './types';

export type { User, AuthResponse, Workflow, Execution, Job, JobCounts, JobFilters };

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

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

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
      });

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        if (!response.ok) {
          throw new Error(`Server error: ${response.status} ${response.statusText}`);
        }
        throw new Error('Unexpected response from server');
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Request failed');
      }

      return data;
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('Network error: Unable to connect to server. Please check your internet connection.');
      }
      throw error;
    }
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

  async getJobs(page = 1, limit = 20, filters?: JobFilters): Promise<PaginatedResponse<Job>> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });

    if (filters) {
      if (filters.source) params.append('source', filters.source);
      if (typeof filters.isUnread === 'boolean') params.append('isUnread', filters.isUnread.toString());
      if (typeof filters.isBookmarked === 'boolean') params.append('isBookmarked', filters.isBookmarked.toString());
      if (filters.applicationStatus) params.append('applicationStatus', filters.applicationStatus);
      if (filters.search) params.append('search', filters.search);
      if (filters.sortBy) params.append('sortBy', filters.sortBy);
      if (filters.sortOrder) params.append('sortOrder', filters.sortOrder);
    }

    const response = await this.request<PaginatedResponse<Job>>(`/jobs/user?${params}`);
    return response as unknown as PaginatedResponse<Job>;
  }

  async getJobCounts(): Promise<JobCounts> {
    const response = await this.request<JobCounts>('/jobs/user/counts');
    return response.data!;
  }

  async markJobAsRead(jobId: string): Promise<Job> {
    const response = await this.request<Job>(`/jobs/user/${jobId}/read`, {
      method: 'PATCH',
    });
    return response.data!;
  }

  async markAllJobsAsRead(): Promise<{ modifiedCount: number }> {
    const response = await this.request<{ modifiedCount: number }>('/jobs/user/read-all', {
      method: 'PATCH',
    });
    return response.data!;
  }

  async updateJobStatus(jobId: string, status: ApplicationStatus): Promise<Job> {
    const response = await this.request<Job>(`/jobs/user/${jobId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ applicationStatus: status }),
    });
    return response.data!;
  }

  async toggleJobBookmark(jobId: string): Promise<Job> {
    const response = await this.request<Job>(`/jobs/user/${jobId}/bookmark`, {
      method: 'PATCH',
    });
    return response.data!;
  }

  async deleteJob(jobId: string): Promise<void> {
    await this.request(`/jobs/user/${jobId}`, {
      method: 'DELETE',
    });
  }

  async calculateMatchScores(skills: string[]): Promise<{ updatedCount: number }> {
    const response = await this.request<{ updatedCount: number }>('/jobs/user/calculate-match', {
      method: 'POST',
      body: JSON.stringify({ skills }),
    });
    return response.data!;
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

  async uploadResume(content: string, fileName: string, fileType: 'pdf' | 'docx' | 'txt'): Promise<{
    id: string;
    fileName: string;
    skills: string[];
    experience: { title: string; company: string; duration: string }[];
    education: { degree: string; institution: string; year: string }[];
    keywords: string[];
    uploadedAt: string;
  }> {
    const response = await this.request<any>('/resume/upload', {
      method: 'POST',
      body: JSON.stringify({ content, fileName, fileType }),
    });
    return response.data!;
  }

  async getResume(): Promise<{
    id: string;
    fileName: string;
    fileType: string;
    skills: string[];
    experience: { title: string; company: string; duration: string }[];
    education: { degree: string; institution: string; year: string }[];
    keywords: string[];
    uploadedAt: string;
  } | null> {
    try {
      const response = await this.request<any>('/resume');
      return response.data;
    } catch {
      return null;
    }
  }

  async deleteResume(): Promise<void> {
    await this.request('/resume', { method: 'DELETE' });
  }

  async getResumeSkills(): Promise<{ skills: string[]; keywords: string[] } | null> {
    try {
      const response = await this.request<any>('/resume/skills');
      return response.data;
    } catch {
      return null;
    }
  }

  async submitFeedback(type: string, message: string, rating?: number, email?: string): Promise<void> {
    await this.request('/feedback', {
      method: 'POST',
      body: JSON.stringify({ type, message, rating, email }),
    });
  }

  async getAdminStats(): Promise<any> {
    const response = await this.request<any>('/admin/stats');
    return response.data!;
  }

  async getAdminUsers(page = 1, limit = 20): Promise<PaginatedResponse<any>> {
    const response = await this.request<PaginatedResponse<any>>(
      `/admin/users?page=${page}&limit=${limit}`
    );
    return response as unknown as PaginatedResponse<any>;
  }

  async toggleUserActive(userId: string): Promise<{ isActive: boolean }> {
    const response = await this.request<any>(`/admin/users/${userId}/toggle-active`, {
      method: 'PATCH',
    });
    return response.data!;
  }

  async getAdminFeedbacks(page = 1, limit = 20, status?: string): Promise<PaginatedResponse<any>> {
    let url = `/admin/feedbacks?page=${page}&limit=${limit}`;
    if (status) url += `&status=${status}`;
    const response = await this.request<PaginatedResponse<any>>(url);
    return response as unknown as PaginatedResponse<any>;
  }

  async updateFeedback(id: string, data: { status?: string; adminNotes?: string }): Promise<any> {
    const response = await this.request<any>(`/admin/feedbacks/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    return response.data!;
  }

  async getAdminWorkflows(page = 1, limit = 20): Promise<PaginatedResponse<any>> {
    const response = await this.request<PaginatedResponse<any>>(
      `/admin/workflows?page=${page}&limit=${limit}`
    );
    return response as unknown as PaginatedResponse<any>;
  }

  async deleteAdminWorkflow(id: string): Promise<void> {
    await this.request(`/admin/workflows/${id}`, { method: 'DELETE' });
  }

  async deleteAdminUser(id: string): Promise<void> {
    await this.request(`/admin/users/${id}`, { method: 'DELETE' });
  }

  async deleteAdminFeedback(id: string): Promise<void> {
    await this.request(`/admin/feedbacks/${id}`, { method: 'DELETE' });
  }
}

export const api = new ApiClient();
export default api;
