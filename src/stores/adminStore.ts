import { create } from 'zustand';
import apiClient from '../lib/api';
import type { FileItem, FileQueryParams } from '../../shared/types';

interface AdminState {
  files: FileItem[];
  models: any[];
  stats: {
    total_files: number;
    published_files: number;
    image_files: number;
    video_files: number;
  } | null;
  loading: boolean;
  error: string | null;
  currentPage: number;
  hasNextPage: boolean;
  totalFiles: number;
  selectedFileType: 'all' | 'image' | 'video';
  selectedModel: string;
  searchQuery: string;
  
  // Actions
  fetchAdminFiles: (params?: FileQueryParams) => Promise<void>;
  fetchMoreAdminFiles: (params?: FileQueryParams) => Promise<void>;
  fetchAdminModels: () => Promise<void>;
  fetchAdminStats: () => Promise<void>;
  uploadFile: (file: File, metadata: { ai_model: string; prompt: string }) => Promise<void>;
  updateFilePublishStatus: (id: string, publishStatus: 'published' | 'unpublished') => Promise<void>;
  deleteFile: (id: string) => Promise<void>;
  setSelectedFileType: (type: 'all' | 'image' | 'video') => void;
  setSelectedModel: (model: string) => void;
  setSearchQuery: (query: string) => void;
  clearError: () => void;
}

export const useAdminStore = create<AdminState>((set, get) => ({
  files: [],
  models: [],
  stats: null,
  loading: false,
  error: null,
  currentPage: 1,
  hasNextPage: false,
  totalFiles: 0,
  selectedFileType: 'all',
  selectedModel: '',
  searchQuery: '',

  fetchAdminFiles: async (params: FileQueryParams = {}) => {
    set({ loading: true, error: null });
    try {
      const response = await apiClient.getAdminFiles({ ...params, page: 1 });
      set({
        files: response.files,
        currentPage: 1,
        hasNextPage: response.hasNextPage,
        totalFiles: response.total,
        loading: false,
        error: null,
      });
    } catch (error) {
      set({ 
        loading: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch admin files' 
      });
    }
  },

  fetchMoreAdminFiles: async (params: FileQueryParams = {}) => {
    const { currentPage, files } = get();
    const nextPage = currentPage + 1;
    
    set({ loading: true, error: null });
    try {
      const response = await apiClient.getAdminFiles({ ...params, page: nextPage });
      set({
        files: [...files, ...response.files],
        currentPage: nextPage,
        hasNextPage: response.hasNextPage,
        totalFiles: response.total,
        loading: false,
        error: null,
      });
    } catch (error) {
      set({ 
        loading: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch more admin files' 
      });
    }
  },

  fetchAdminModels: async () => {
    set({ loading: true, error: null });
    try {
      const response = await apiClient.getAdminModels();
      set({
        models: response,
        loading: false,
        error: null,
      });
    } catch (error) {
      set({ 
        loading: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch admin models' 
      });
    }
  },

  fetchAdminStats: async () => {
    set({ loading: true, error: null });
    try {
      const response = await apiClient.getAdminStats();
      set({
        stats: response,
        loading: false,
        error: null,
      });
    } catch (error) {
      set({ 
        loading: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch admin stats' 
      });
    }
  },

  uploadFile: async (file: File, metadata: { ai_model: string; prompt: string }) => {
    set({ loading: true, error: null });
    try {
      const response = await apiClient.uploadFile(file, metadata);
      if (response.success && response.data) {
        // 重新获取文件列表
        await get().fetchAdminFiles();
        set({ loading: false, error: null });
      } else {
        set({ 
          loading: false, 
          error: response.message || 'Failed to upload file' 
        });
      }
    } catch (error) {
      set({ 
        loading: false, 
        error: error instanceof Error ? error.message : 'Failed to upload file' 
      });
      throw error;
    }
  },

  updateFilePublishStatus: async (id: string, publishStatus: 'published' | 'unpublished') => {
    set({ loading: true, error: null });
    try {
      await apiClient.updateFilePublishStatus(id, publishStatus);
        // 更新本地文件状态
        const { files } = get();
        const updatedFiles = files.map(file => 
          file.id === id ? { ...file, publish_status: publishStatus } : file
        );
        set({ 
          files: updatedFiles, 
          loading: false, 
          error: null 
        });
    } catch (error) {
      set({ 
        loading: false, 
        error: error instanceof Error ? error.message : 'Failed to update file publish status' 
      });
      throw error;
    }
  },

  deleteFile: async (id: string) => {
    set({ loading: true, error: null });
    try {
      await apiClient.deleteFile(id);
        // 从本地列表中删除文件
        const { files } = get();
        const updatedFiles = files.filter(file => file.id !== id);
        set({ 
          files: updatedFiles, 
          loading: false, 
          error: null 
        });
    } catch (error) {
      set({ 
        loading: false, 
        error: error instanceof Error ? error.message : 'Failed to delete file' 
      });
      throw error;
    }
  },

  setSelectedFileType: (type: 'all' | 'image' | 'video') => {
    set({ selectedFileType: type });
  },

  setSelectedModel: (model: string) => {
    set({ selectedModel: model });
  },

  setSearchQuery: (query: string) => {
    set({ searchQuery: query });
  },

  clearError: () => set({ error: null }),
}));
