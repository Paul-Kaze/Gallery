import { Router } from 'express';
import { AuthService } from '../services/authService.js';

const router = Router();
const authService = new AuthService();

// Google登录
router.post('/auth/google', async (req, res) => {
  try {
    const { google_token } = req.body;

    if (!google_token) {
      return res.status(400).json({
        success: false,
        message: 'Google token is required',
      });
    }

    const result = await authService.googleLogin(google_token);

    if (!result.success) {
      return res.status(401).json({
        success: false,
        message: result.message,
      });
    }

    res.json({
      success: true,
      data: {
        user: result.user,
        token: result.token,
        type: result.type,
        admin: result.admin,
      },
    });
  } catch (error) {
    console.error('Google login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

// 管理员登录
router.post('/auth/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username and password are required',
      });
    }

    const result = await authService.adminLogin(username, password);

    if (!result.success) {
      return res.status(401).json({
        success: false,
        message: result.message,
      });
    }

    res.json({
      success: true,
      data: {
        admin: result.admin,
        token: result.token,
      },
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

// 验证令牌
router.post('/auth/validate', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Token is required',
      });
    }

    // 先尝试验证为用户令牌
    const user = await authService.validateUserToken(token);
    if (user) {
      return res.json({
        success: true,
        data: {
          type: 'user',
          user,
        },
      });
    }

    // 再尝试验证为管理员令牌
    const admin = await authService.validateAdminToken(token);
    if (admin) {
      return res.json({
        success: true,
        data: {
          type: 'admin',
          admin,
        },
      });
    }

    res.status(401).json({
      success: false,
      message: 'Invalid or expired token',
    });
  } catch (error) {
    console.error('Validate token error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

// 创建管理员账户（仅用于初始化，生产环境应该限制访问）
router.post('/auth/admin/create', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username and password are required',
      });
    }

    // 密码强度验证
    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters long',
      });
    }

    const result = await authService.createAdmin(username, password);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message,
      });
    }

    res.json({
      success: true,
      data: result.admin,
    });
  } catch (error) {
    console.error('Create admin error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

export default router;
