import React, { useState } from 'react';
import { FileItem } from '@/types/file';
import { X, Download, Eye, Calendar, HardDrive, Tag, User } from 'lucide-react';

interface FileDetailModalProps {
  file: FileItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export const FileDetailModal: React.FC<FileDetailModalProps> = ({ 
  file, 
  isOpen, 
  onClose 
}) => {
  const [isDownloading, setIsDownloading] = useState(false);

  if (!isOpen || !file) return null;

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const response = await fetch(`/api/files/${file.id}/download`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('下载失败:', error);
      alert('下载失败，请重试');
    } finally {
      setIsDownloading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 p-4">
      <div className="bg-white rounded-lg max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* 头部 */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900 truncate flex-1">
            {file.file_name}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors duration-200"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* 内容区域 */}
        <div className="flex-1 overflow-auto">
          <div className="flex flex-col lg:flex-row">
            {/* 媒体预览 */}
            <div className="lg:w-2/3 p-4">
              <div className="bg-gray-100 rounded-lg overflow-hidden">
                {file.file_type === 'image' ? (
                  <img
                    src={file.file_path}
                    alt={file.file_name}
                    className="w-full h-auto max-h-[60vh] object-contain"
                  />
                ) : file.file_type === 'video' ? (
                  <video
                    src={file.file_path}
                    controls
                    className="w-full h-auto max-h-[60vh]"
                    poster={file.thumbnail_path}
                  />
                ) : (
                  <div className="aspect-video bg-gray-100 flex items-center justify-center">
                    <div className="text-gray-400 text-center">
                      <Eye className="w-16 h-16 mx-auto mb-4" />
                      <p className="text-lg">{file.file_name}</p>
                      <p className="text-sm mt-2">不支持的文件类型</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 文件信息 */}
            <div className="lg:w-1/3 p-4 border-t lg:border-t-0 lg:border-l">
              <div className="space-y-4">
                {/* 下载按钮 */}
                <button
                  onClick={handleDownload}
                  disabled={isDownloading}
                  className="w-full flex items-center justify-center space-x-2 bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                >
                  {isDownloading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>下载中...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      <span>下载文件</span>
                    </>
                  )}
                </button>

                {/* 文件详情 */}
                <div className="space-y-3">
                  <div className="flex items-center space-x-3 text-sm">
                    <HardDrive className="w-4 h-4 text-gray-400" />
                    <div>
                      <p className="text-gray-500">文件大小</p>
                      <p className="text-gray-900">{formatFileSize(file.file_size)}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 text-sm">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <div>
                      <p className="text-gray-500">创建时间</p>
                      <p className="text-gray-900">{formatDate(file.created_at)}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 text-sm">
                    <Tag className="w-4 h-4 text-gray-400" />
                    <div>
                      <p className="text-gray-500">文件类型</p>
                      <p className="text-gray-900">{file.file_type}</p>
                    </div>
                  </div>

                  {file.prompt && (
                    <div className="text-sm">
                      <div className="flex items-center space-x-3 mb-2">
                        <User className="w-4 h-4 text-gray-400" />
                        <p className="text-gray-500">生成提示词</p>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-gray-900 text-sm leading-relaxed">{file.prompt}</p>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center space-x-3 text-sm">
                    <Tag className="w-4 h-4 text-gray-400" />
                    <div>
                      <p className="text-gray-500">AI模型</p>
                      <p className="text-gray-900">{file.ai_model}</p>
                    </div>
                  </div>

                  {/* 分辨率信息暂不展示（后端不提供宽高字段） */}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
