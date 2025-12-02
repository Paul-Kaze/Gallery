import React, { useState } from 'react';
import Navbar from '@/components/Navbar';
import { WaterfallGallery } from '@/components/WaterfallGallery';
import { FileDetailModal } from '@/components/FileDetailModal';
import LoginModal from '@/components/LoginModal';
import { FileItem } from '@/types/file';

export default function Home() {
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  const handleFileClick = (file: FileItem) => {
    setSelectedFile(file);
  };

  const handleCloseModal = () => {
    setSelectedFile(null);
  };

  const handleLoginClick = () => {
    setIsLoginModalOpen(true);
  };

  const handleCloseLoginModal = () => {
    setIsLoginModalOpen(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 导航栏 */}
      <Navbar onLoginClick={handleLoginClick} />
      
      {/* 主内容区域 */}
      <main className="pt-16">
        {/* 页面标题 */}
        <div className="text-center py-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">AI 图像画廊</h1>
          <p className="text-gray-600">探索人工智能生成的精美图像和视频</p>
        </div>

        {/* 瀑布流画廊 */}
        <WaterfallGallery onFileClick={handleFileClick} />
      </main>

      {/* 文件详情弹窗 */}
      <FileDetailModal
        file={selectedFile}
        isOpen={!!selectedFile}
        onClose={handleCloseModal}
      />

      {/* 登录弹窗 */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={handleCloseLoginModal}
      />
    </div>
  );
}
