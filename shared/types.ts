// 文件类型
export interface FileItem {
  id: string;
  file_name: string;
  file_path: string;
  thumbnail_path: string;
  file_size: number;
  file_format: string;
  file_type: 'image' | 'video';
  ai_model: string;
  prompt: string;
  reference_image_ids?: string[];
  duration?: number; // 视频时长（秒）
  resolution?: string; // 视频分辨率
  user_id?: string;
  publish_status: 'published' | 'unpublished';
  created_at: string;
  updated_at: string;
}

// 参考图片类型
export interface ReferenceImage {
  id: string;
  file_id: string;
  image_url: string;
  preview_url?: string;
  order_index: number;
  created_at: string;
}

// 用户类型
export interface User {
  id: string;
  google_id?: string;
  email?: string;
  name?: string;
  avatar_url?: string;
  login_token?: string;
  token_expires_at?: string;
  created_at: string;
  updated_at: string;
}

// 管理员类型
export interface Admin {
  id: string;
  username: string;
  status: 'active' | 'disabled';
  last_login_at?: string;
  created_at: string;
  updated_at: string;
}

// 文件列表响应
export interface FileListResponse {
  files: FileItem[];
  total: number;
  hasNextPage: boolean;
}

// 文件详情响应
export interface FileDetailResponse {
  file: FileItem;
  reference_images: ReferenceImage[];
}

// 用户登录响应
export interface UserLoginResponse {
  success: boolean;
  user?: User;
  token?: string;
  message?: string;
  type?: 'user' | 'admin';
  admin?: Admin;
}

// 管理员登录响应
export interface AdminLoginResponse {
  success: boolean;
  admin?: Admin;
  token?: string;
  message?: string;
}

// 分页参数
export interface PaginationParams {
  page?: number;
  limit?: number;
}

// 文件查询参数
export interface FileQueryParams extends PaginationParams {
  file_type?: 'image' | 'video' | 'all';
  ai_model?: string;
  search?: string;
  user_id?: string;
}

// AI模型类型
export interface AIModel {
  id: string;
  name: string;
  type: 'image' | 'video' | 'all';
  description?: string;
  is_active: boolean;
}
