import { create } from 'zustand';
import apiClient from '../lib/api';
import type { FileItem, FileListResponse, FileQueryParams } from '../../shared/types';

interface FileState {
  files: FileItem[];
  loading: boolean;
  error: string | null;
  currentPage: number;
  hasNextPage: boolean;
  totalFiles: number;
  selectedFile: FileItem | null;
  selectedFileDetail: any | null;
  
  // Actions
  fetchFiles: (params?: FileQueryParams) => Promise<void>;
  fetchMoreFiles: (params?: FileQueryParams) => Promise<void>;
  fetchFileDetail: (id: string) => Promise<void>;
  setSelectedFile: (file: FileItem | null) => void;
  downloadFile: (id: string, type?: 'original' | 'thumbnail') => Promise<void>;
  clearError: () => void;
}

export const useFileStore = create<FileState>((set, get) => ({
  files: [],
  loading: false,
  error: null,
  currentPage: 1,
  hasNextPage: false,
  totalFiles: 0,
  selectedFile: null,
  selectedFileDetail: null,

  fetchFiles: async (params: FileQueryParams = {}) => {
    set({ loading: true, error: null });
    try {
      const response = await apiClient.getFiles({ ...params, page: 1 });
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
        error: error instanceof Error ? error.message : 'Failed to fetch files' 
      });
    }
  },

  fetchMoreFiles: async (params: FileQueryParams = {}) => {
    const { currentPage, files } = get();
    const nextPage = currentPage + 1;
    
    set({ loading: true, error: null });
    try {
      const response = await apiClient.getFiles({ ...params, page: nextPage });
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
        error: error instanceof Error ? error.message : 'Failed to fetch more files' 
      });
    }
  },

  fetchFileDetail: async (id: string) => {
    set({ loading: true, error: null });
    try {
      const response = await apiClient.getFileDetail(id);
      set({
        selectedFileDetail: response,
        loading: false,
        error: null,
      });
    } catch (error) {
      set({ 
        loading: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch file detail' 
      });
    }
  },

  setSelectedFile: (file: FileItem | null) => {
    set({ selectedFile: file });
  },

  downloadFile: async (id: string, type: 'original' | 'thumbnail' = 'original') => {
    try {
      const downloadUrl = await apiClient.downloadFile(id, type);
      
      // 创建临时链接并触发下载
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.target = '_blank';
      link.download = '';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Download file error:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to download file' 
      });
    }
  },

  clearError: () => set({ error: null }),
}));
