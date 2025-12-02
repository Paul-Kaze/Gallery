import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useFileStore } from '@/stores/fileStore';
import { FileItem } from '@/types/file';
import { Download, Eye, Heart } from 'lucide-react';

interface WaterfallGalleryProps {
  onFileClick: (file: FileItem) => void;
}

export const WaterfallGallery: React.FC<WaterfallGalleryProps> = ({ onFileClick }) => {
  const { files, loading, hasNextPage, fetchFiles, fetchMoreFiles } = useFileStore();
  const [columns, setColumns] = useState<FileItem[][]>([[], [], [], []]);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  // 初始化加载文件
  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  // 瀑布流布局算法
  useEffect(() => {
    if (files.length === 0) return;

    const newColumns = [[], [], [], []] as FileItem[][];
    const columnHeights = [0, 0, 0, 0];

    files.forEach((file) => {
      // 找到最短的列
      const minHeightIndex = columnHeights.indexOf(Math.min(...columnHeights));
      newColumns[minHeightIndex].push(file);
      
      // 简化高度估算，避免缺少宽高字段导致类型错误
      const estimatedHeight = 200;
      columnHeights[minHeightIndex] += estimatedHeight + 16; // 加上间距
    });

    setColumns(newColumns);
  }, [files]);

  // 无限滚动加载
  const handleObserver = useCallback((entries: IntersectionObserverEntry[]) => {
    const target = entries[0];
    if (target.isIntersecting && hasNextPage && !loading) {
      fetchMoreFiles();
    }
  }, [hasNextPage, loading, fetchMoreFiles]);

  useEffect(() => {
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    observerRef.current = new IntersectionObserver(handleObserver, {
      threshold: 0.1,
      rootMargin: '100px'
    });

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [handleObserver]);

  const handleDownload = async (e: React.MouseEvent, file: FileItem) => {
    e.stopPropagation();
    try {
      const a = document.createElement('a');
      a.href = file.file_path;
      a.target = '_blank';
      a.download = file.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (error) {
      console.error('下载失败:', error);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {columns.map((column, columnIndex) => (
          <div key={columnIndex} className="flex flex-col gap-4">
            {column.map((file) => (
              <div
                key={file.id}
                className="group relative bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer"
                onClick={() => onFileClick(file)}
              >
                {/* 图片/视频缩略图 */}
                <div className="relative overflow-hidden">
                  {file.file_type === 'image' ? (
                    <img
                      src={file.thumbnail_path}
                      alt={file.file_name}
                      className="w-full h-auto object-cover transition-transform duration-300 group-hover:scale-105"
                      loading="lazy"
                    />
                  ) : file.file_type === 'video' ? (
                    <div className="relative bg-gray-900">
                      <img
                        src={file.thumbnail_path}
                        alt={file.file_name}
                        className="w-full h-auto object-cover"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-12 h-12 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
                          <Eye className="w-6 h-6 text-white" />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="aspect-video bg-gray-100 flex items-center justify-center">
                      <div className="text-gray-400 text-center">
                        <Eye className="w-12 h-12 mx-auto mb-2" />
                        <p className="text-sm">{file.file_name}</p>
                      </div>
                    </div>
                  )}
                  
                  {/* 悬停遮罩 */}
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <div className="flex space-x-2">
                      <button
                        onClick={(e) => handleDownload(e, file)}
                        className="p-2 bg-white bg-opacity-90 rounded-full hover:bg-opacity-100 transition-all duration-200"
                        title="下载"
                      >
                        <Download className="w-4 h-4 text-gray-700" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* 文件信息 */}
                <div className="p-3">
                  <h3 className="text-sm font-medium text-gray-900 truncate mb-1">
                    {file.file_name}
                  </h3>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{formatFileSize(file.file_size)}</span>
                    <span>{new Date(file.created_at).toLocaleDateString()}</span>
                  </div>
                  {file.prompt && (
                    <p className="text-xs text-gray-600 mt-2 line-clamp-2">
                      {file.prompt}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* 加载更多触发器 */}
      <div ref={loadMoreRef} className="h-10 flex items-center justify-center mt-8">
        {loading && (
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
          </div>
        )}
        {!hasNextPage && files.length > 0 && (
          <p className="text-gray-500 text-sm">已加载全部内容</p>
        )}
        {!hasNextPage && files.length === 0 && (
          <p className="text-gray-500 text-sm">暂无内容</p>
        )}
      </div>
    </div>
  );
};
