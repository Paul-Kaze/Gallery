import { Router } from 'express';
import { supabaseAdmin } from '../config/supabase.js';
import { AuthService } from '../services/authService.js';

const router = Router();
const authService = new AuthService();

// 管理员专用的文件列表（包含未发布的文件）
router.get('/admin/files', async (req, res) => {
  try {
    // 验证管理员权限
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No authorization token provided',
      });
    }

    const token = authHeader.split(' ')[1];
    const admin = await authService.validateAdminToken(token);
    
    if (!admin) {
      return res.status(403).json({
        success: false,
        message: 'Invalid or expired token',
      });
    }

    const {
      page = 1,
      limit = 20,
      file_type = 'all',
      ai_model,
      search,
    } = req.query;

    let query = supabaseAdmin
      .from('files')
      .select('*', { count: 'exact' })
      .eq('user_id', admin.id); // 只显示当前管理员上传的文件

    // 文件类型筛选
    if (file_type !== 'all') {
      query = query.eq('file_type', file_type);
    }

    // AI模型筛选
    if (ai_model) {
      query = query.eq('ai_model', ai_model);
    }

    // 搜索功能
    if (search) {
      query = query.or(`ai_model.ilike.%${search}%,prompt.ilike.%${search}%`);
    }

    // 分页
    const offset = (Number(page) - 1) * Number(limit);
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + Number(limit) - 1);

    const { data: files, error, count } = await query;

    if (error) {
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch admin files',
        error: error.message,
      });
    }

    const hasNextPage = count ? count > Number(page) * Number(limit) : false;

    res.json({
      success: true,
      data: {
        files: files || [],
        total: count || 0,
        hasNextPage,
      },
    });
  } catch (error) {
    console.error('Get admin files error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

// 获取AI模型列表
router.get('/admin/models', async (req, res) => {
  try {
    // 验证管理员权限
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No authorization token provided',
      });
    }

    const token = authHeader.split(' ')[1];
    const admin = await authService.validateAdminToken(token);
    
    if (!admin) {
      return res.status(403).json({
        success: false,
        message: 'Invalid or expired token',
      });
    }

    // 从数据库中获取所有不同的AI模型
    const { data: models, error } = await supabaseAdmin
      .from('files')
      .select('ai_model, file_type')
      .eq('user_id', admin.id);

    if (error) {
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch models',
        error: error.message,
      });
    }

    // 统计模型信息
    const modelStats = models?.reduce((acc, file) => {
      if (!acc[file.ai_model]) {
        acc[file.ai_model] = {
          name: file.ai_model,
          image_count: 0,
          video_count: 0,
          total_count: 0,
        };
      }
      
      if (file.file_type === 'image') {
        acc[file.ai_model].image_count++;
      } else if (file.file_type === 'video') {
        acc[file.ai_model].video_count++;
      }
      acc[file.ai_model].total_count++;
      
      return acc;
    }, {} as Record<string, any>) || {};

    const modelList = Object.values(modelStats).map((model: any) => ({
      id: model.name,
      name: model.name,
      type: model.video_count > 0 && model.image_count > 0 ? 'all' : 
            model.video_count > 0 ? 'video' : 'image',
      description: `${model.total_count} files`,
      is_active: true,
    }));

    res.json({
      success: true,
      data: modelList,
    });
  } catch (error) {
    console.error('Get admin models error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

// 获取管理员统计信息
router.get('/admin/stats', async (req, res) => {
  try {
    // 验证管理员权限
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No authorization token provided',
      });
    }

    const token = authHeader.split(' ')[1];
    const admin = await authService.validateAdminToken(token);
    
    if (!admin) {
      return res.status(403).json({
        success: false,
        message: 'Invalid or expired token',
      });
    }

    // 获取统计信息
    const [
      totalRes,
      publishedRes,
      imageRes,
      videoRes,
    ] = await Promise.all([
      supabaseAdmin
        .from('files')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', admin.id),
      
      supabaseAdmin
        .from('files')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', admin.id)
        .eq('publish_status', 'published'),
      
      supabaseAdmin
        .from('files')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', admin.id)
        .eq('file_type', 'image'),
      
      supabaseAdmin
        .from('files')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', admin.id)
        .eq('file_type', 'video'),
    ]);

    res.json({
      success: true,
      data: {
        total_files: totalRes.count || 0,
        published_files: publishedRes.count || 0,
        image_files: imageRes.count || 0,
        video_files: videoRes.count || 0,
      },
    });
  } catch (error) {
    console.error('Get admin stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

export default router;
