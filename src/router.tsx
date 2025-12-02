import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { lazy, Suspense, useEffect, useState } from 'react';
import { useAuthStore } from './stores/authStore';

// 懒加载页面组件
const Home = lazy(() => import('./pages/Home'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const Login = lazy(() => import('./pages/Login'));

// 加载组件
const LoadingSpinner = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
  </div>
);

// 认证守卫组件
const AuthGuard = ({ children }: { children: React.ReactNode }) => {
  const { user, admin, validateToken, isLoading } = useAuthStore();
  const [isValidating, setIsValidating] = useState(true);
  
  useEffect(() => {
    const validate = async () => {
      await validateToken();
      setIsValidating(false);
    };
    validate();
  }, [validateToken]);
  
  if (isLoading || isValidating) {
    return <LoadingSpinner />;
  }
  
  if (!user && !admin) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
};

// 管理员守卫组件
const AdminGuard = ({ children }: { children: React.ReactNode }) => {
  const { admin, validateToken, isLoading } = useAuthStore();
  const [isValidating, setIsValidating] = useState(true);
  
  useEffect(() => {
    const validate = async () => {
      await validateToken();
      setIsValidating(false);
    };
    validate();
  }, [validateToken]);
  
  if (isLoading || isValidating) {
    return <LoadingSpinner />;
  }
  
  if (!admin) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
};

// 登录页面守卫
const LoginGuard = ({ children }: { children: React.ReactNode }) => {
  const { user, admin } = useAuthStore();
  
  if (user || admin) {
    return <Navigate to="/" replace />;
  }
  
  return <>{children}</>;
};

// 主路由组件
const AppRouter = () => {
  return (
    <BrowserRouter>
      <Suspense fallback={<LoadingSpinner />}>
        <Routes>
          {/* 首页 */}
          <Route 
            path="/" 
            element={
              <Home />
            } 
          />
          
          {/* 登录页面 */}
          <Route 
            path="/login" 
            element={
              <LoginGuard>
                <Login />
              </LoginGuard>
            } 
          />
          
          {/* 管理员仪表板 */}
          <Route 
            path="/admin" 
            element={
              <AdminGuard>
                <AdminDashboard />
              </AdminGuard>
            } 
          />
          
          {/* 认证回调 */}
          <Route path="/auth/callback" element={<AuthCallback />} />
          
          {/* 404页面 */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
};

// 认证回调组件
const AuthCallback = () => {
  const { validateToken } = useAuthStore();
  const navigate = useNavigate();
  
  useEffect(() => {
    const handleCallback = async () => {
      try {
        await validateToken();
        navigate('/');
      } catch (error) {
        console.error('Auth callback error:', error);
        navigate('/login');
      }
    };
    
    handleCallback();
  }, [validateToken, navigate]);
  
  return <LoadingSpinner />;
};

export default AppRouter;