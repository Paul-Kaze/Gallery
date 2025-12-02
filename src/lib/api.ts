import { supabase } from './supabase';
import type { 
  FileItem, 
  FileListResponse, 
  FileDetailResponse, 
  UserLoginResponse, 
  AdminLoginResponse,
  FileQueryParams 
} from '../../shared/types';
import { getMockFileList, getMockFileDetail } from './mock';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
const USE_MOCK = import.meta.env.VITE_USE_MOCK === '1';

// API客户端类
class ApiClient {
  private async request<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const token = this.getAuthToken();
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }

    const json = await response.json();
    if (json && typeof json === 'object' && 'data' in json) {
      return json.data as T;
    }
    return json as T;
  }

  private getAuthToken(): string | null {
    // 从localStorage获取token，或者从状态管理获取
    return localStorage.getItem('auth_token');
  }

  // 文件相关API
  async getFiles(params: FileQueryParams = {}): Promise<FileListResponse> {
    if (USE_MOCK) {
      const page = Number(params.page || 1);
      const limit = Number(params.limit || 20);
      return getMockFileList(page, limit);
    }
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) qs.append(key, String(value));
    });
    return this.request<FileListResponse>(`/files?${qs.toString()}`);
  }

  async getFileDetail(id: string): Promise<FileDetailResponse> {
    if (USE_MOCK) {
      return getMockFileDetail(id);
    }
    return this.request<FileDetailResponse>(`/files/${id}`);
  }

  async downloadFile(id: string, type: 'original' | 'thumbnail' = 'original'): Promise<string> {
    if (USE_MOCK) {
      const detail = getMockFileDetail(id);
      return type === 'thumbnail' ? detail.file.thumbnail_path : detail.file.file_path;
    }
    const response = await fetch(`${API_BASE_URL}/files/${id}/download?type=${type}`);
    return response.url;
  }

  // 认证相关API
  async googleLogin(googleToken: string): Promise<UserLoginResponse> {
    return this.request<UserLoginResponse>('/auth/google', {
      method: 'POST',
      body: JSON.stringify({ google_token: googleToken }),
    });
  }

  async adminLogin(username: string, password: string): Promise<AdminLoginResponse> {
    return this.request<AdminLoginResponse>('/auth/admin/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
  }

  async validateToken(token: string): Promise<any> {
    return this.request('/auth/validate', {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
  }

  // 管理员相关API
  async getAdminFiles(params: FileQueryParams = {}): Promise<FileListResponse> {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) qs.append(key, String(value));
    });
    return this.request<FileListResponse>(`/admin/files?${qs.toString()}`);
  }

  async getAdminModels(): Promise<any[]> {
    return this.request('/admin/models');
  }

  async getAdminStats(): Promise<any> {
    return this.request('/admin/stats');
  }

  async uploadFile(file: File, metadata: {
    ai_model: string;
    prompt: string;
    reference_image_ids?: string[];
  }): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('ai_model', metadata.ai_model);
    formData.append('prompt', metadata.prompt);
    
    if (metadata.reference_image_ids) {
      formData.append('reference_image_ids', JSON.stringify(metadata.reference_image_ids));
    }

    const response = await fetch(`${API_BASE_URL}/files/upload`, {
      method: 'POST',
      body: formData,
      headers: {
        'Authorization': `Bearer ${this.getAuthToken() || ''}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`);
    }

    const json = await response.json();
    if (json && typeof json === 'object' && 'data' in json) {
      return json.data;
    }
    return json;
  }

  async updateFilePublishStatus(id: string, publishStatus: 'published' | 'unpublished'): Promise<any> {
    return this.request(`/files/${id}/publish`, {
      method: 'PATCH',
      body: JSON.stringify({ publish_status: publishStatus }),
    });
  }

  async deleteFile(id: string): Promise<any> {
    return this.request(`/files/${id}`, {
      method: 'DELETE',
    });
  }
}

export const apiClient = new ApiClient();
export default apiClient;
