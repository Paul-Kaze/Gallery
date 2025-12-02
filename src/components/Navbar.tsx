import { useState } from 'react';
import { User, LogOut, Settings, UserCircle } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import LoginModal from './LoginModal';

interface NavbarProps {
  onLoginClick?: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ onLoginClick }) => {
  const { user, admin, logout } = useAuthStore();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const handleLoginClick = () => {
    if (onLoginClick) {
      onLoginClick();
    } else {
      setShowLoginModal(true);
    }
  };

  const handleLogout = () => {
    logout();
    setShowUserMenu(false);
  };

  const getUserDisplayName = () => {
    if (admin) {
      return admin.username;
    }
    if (user) {
      return user.name || user.email || 'User';
    }
    return '';
  };

  const getUserAvatar = () => {
    if (user?.avatar_url) {
      return user.avatar_url;
    }
    return null;
  };

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-200">
        <div className="px-2">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <h1 className="text-2xl font-bold text-gray-900">
                  AI Gallery
                </h1>
              </div>
            </div>

            {/* 用户区域 */}
            <div className="flex items-center space-x-4">
              {!user && !admin ? (
                <button
                  onClick={handleLoginClick}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                >
                  log in
                </button>
              ) : (
                <div className="relative">
                  <button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="flex items-center space-x-3 text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    {getUserAvatar() ? (
                      <img
                        className="w-8 h-8 rounded-full object-cover"
                        src={getUserAvatar()}
                        alt={getUserDisplayName()}
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center">
                        <UserCircle className="w-5 h-5 text-gray-600" />
                      </div>
                    )}
                    <span className="hidden md:block text-gray-700 font-medium">
                      {getUserDisplayName()}
                    </span>
                  </button>

                  {/* 用户菜单 */}
                  {showUserMenu && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 border border-gray-200">
                      <div className="px-4 py-2 text-sm text-gray-700 border-b border-gray-200">
                        {admin ? '管理员' : '用户'}: {getUserDisplayName()}
                      </div>
                      
                      {admin && (
                        <a
                          href="/admin"
                          className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          onClick={() => setShowUserMenu(false)}
                        >
                          <Settings className="w-4 h-4 mr-2" />
                          管理后台
                        </a>
                      )}
                      
                      <button
                        onClick={handleLogout}
                        className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        <LogOut className="w-4 h-4 mr-2" />
                        退出登录
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* 登录模态框 */}
      <LoginModal 
        isOpen={showLoginModal} 
        onClose={() => setShowLoginModal(false)} 
      />

      {/* 点击外部关闭用户菜单 */}
      {showUserMenu && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setShowUserMenu(false)}
        />
      )}
    </>
  );
};

export default Navbar;
