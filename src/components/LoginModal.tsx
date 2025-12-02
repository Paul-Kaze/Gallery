import { useEffect, useRef, useState } from 'react';
import { X, Chrome } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const LoginModal = ({ isOpen, onClose }: LoginModalProps) => {
  const { loginWithGoogle, isLoading, error, clearError } = useAuthStore();
  const initializedRef = useRef(false);
  const promptingRef = useRef(false);
  const [gsiReady, setGsiReady] = useState(false);
  const [isPrompting, setIsPrompting] = useState(false);
  const [clientIdMissing, setClientIdMissing] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    const scriptId = 'google-identity-services';
    let script = document.getElementById(scriptId) as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.id = scriptId;
      document.body.appendChild(script);
    }
    const onload = () => {
      const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
      const g = (window as any).google?.accounts?.id;
      if (!clientId) {
        setClientIdMissing(true);
        setGsiReady(false);
        return;
      }
      if (clientId && g && !initializedRef.current) {

        g.initialize({
          client_id: clientId,
          use_fedcm_for_prompt: true,
          use_fedcm_for_button: true,
          callback: async (response: any) => {
            try {
              if (response?.credential) {
                await loginWithGoogle(response.credential);
                onClose();
              }
            } finally {
              promptingRef.current = false;
              setIsPrompting(false);
            }
          },
        });
        initializedRef.current = true;
        setGsiReady(true);
      }
    };
    if (script) {
      if ((window as any).google?.accounts?.id) onload();
      else script.addEventListener('load', onload, { once: true });
    }
    return () => {
      const g = (window as any).google?.accounts?.id;
      if (g) {
        try {
          g.cancel();
        } catch {}
      }
      promptingRef.current = false;
      setIsPrompting(false);
    };
  }, [loginWithGoogle, onClose]);

  if (!isOpen) return null;

  const handleGoogleLogin = async () => {
    try {
      const g = (window as any).google?.accounts?.id;
      if (clientIdMissing) {
        setLocalError('未配置 VITE_GOOGLE_CLIENT_ID');
        return;
      }
      if (!gsiReady || !g) {
        setLocalError('Google 登录未就绪，请稍后重试');
        return;
      }
      if (promptingRef.current) return;
      promptingRef.current = true;
      setIsPrompting(true);
      g.prompt(() => {
        promptingRef.current = false;
        setIsPrompting(false);
      });
    } catch (error) {
      promptingRef.current = false;
      setIsPrompting(false);
      console.error('Google login error:', error);
      setLocalError('登录失败，请重试');
    }
  };

  // 移除管理员登录表单，后端在Google登录后判定角色

  const handleClose = () => {
    const g = (window as any).google?.accounts?.id;
    if (g) {
      try {
        g.cancel();
      } catch {}
    }
    promptingRef.current = false;
    setIsPrompting(false);
    clearError();
    setLocalError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* 背景遮罩 */}
      <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" />
      
      {/* 模态框 */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:w-full sm:max-w-md">
          {/* 头部 */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              登录
            </h3>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 rounded-md"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* 仅保留Google登录 */}
          <div className="flex border-b border-gray-200">
            <div className="flex-1 px-4 py-3 text-sm font-medium text-center border-b-2 border-blue-500 text-blue-600">
              <Chrome className="w-4 h-4 inline-block mr-2" />
              Google登录
            </div>
          </div>

          {/* 错误信息 */}
          {(error || localError || clientIdMissing) && (
            <div className="mx-4 mt-4 p-3 text-sm text-red-700 bg-red-100 border border-red-200 rounded-md">
              {localError || error || (clientIdMissing ? '未配置 VITE_GOOGLE_CLIENT_ID，请在前端环境变量中设置' : '')}
            </div>
          )}

          {/* 内容 */}
          <div className="p-6">
            <div className="text-center">
              <p className="text-gray-600 mb-6">
                使用Google账号登录，后端将自动识别管理员身份。
              </p>
              <button
                onClick={handleGoogleLogin}
                disabled={!gsiReady || isLoading || isPrompting}
                className="w-full inline-flex items-center justify-center px-4 py-3 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Chrome className="w-5 h-5 mr-2" />
                使用Google账号登录
              </button>
            </div>
          </div>

          {/* 底部 */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center">
              登录即表示您同意我们的服务条款和隐私政策
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginModal;
