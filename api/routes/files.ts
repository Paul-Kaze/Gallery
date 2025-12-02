import { Router } from 'express';
import multer from 'multer';
import { FileService } from '../services/fileService.js';
import { supabaseAdmin } from '../config/supabase.js';
import { AuthService } from '../services/authService.js';

const router = Router();
const fileService = new FileService();
const authService = new AuthService();

// 配置multer用于文件上传
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'video/mp4',
      'video/webm',
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  },
});

// 获取文件列表
router.get('/files', async (req, res) => {
  try {
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
      .eq('publish_status', 'published'); // 只显示已发布的文件

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
        message: 'Failed to fetch files',
        error: error.message,
      });
    }

    const hasNextPage = count ? count > Number(page) * Number(limit) : false;

    // 缓存控制
    res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
    const etag = `files:${page}:${limit}:${file_type || 'all'}:${ai_model || ''}:${search || ''}:${count || 0}`;
    res.setHeader('ETag', etag);

    res.json({
      success: true,
      data: {
        files: files || [],
        total: count || 0,
        hasNextPage,
      },
    });
  } catch (error) {
    console.error('Get files error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

// 获取文件详情
router.get('/files/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // 获取文件信息
    const { data: file, error: fileError } = await supabaseAdmin
      .from('files')
      .select('*')
      .eq('id', id)
      .eq('publish_status', 'published') // 只显示已发布的文件
      .single();

    if (fileError || !file) {
      return res.status(404).json({
        success: false,
        message: 'File not found',
      });
    }

    // 获取参考图片
    const { data: referenceImages } = await supabaseAdmin
      .from('reference_images')
      .select('*')
      .eq('file_id', id)
      .order('order_index', { ascending: true });

    // 缓存控制
    res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
    const etag = `file:${id}:${file.updated_at}`;
    res.setHeader('ETag', etag);

    res.json({
      success: true,
      data: {
        file,
        reference_images: referenceImages || [],
      },
    });
  } catch (error) {
    console.error('Get file detail error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

// 文件下载
router.get('/files/:id/download', async (req, res) => {
  try {
    const { id } = req.params;
    const { type = 'original' } = req.query; // original or thumbnail

    // 获取文件信息
    const { data: file, error } = await supabaseAdmin
      .from('files')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !file) {
      return res.status(404).json({
        success: false,
        message: 'File not found',
      });
    }

    const filePath = type === 'thumbnail' ? file.thumbnail_path : file.file_path;
    
    // 获取文件URL
    const { data } = await supabaseAdmin.storage
      .from('ai-gallery-files')
      .createSignedUrl(filePath, 60); // 1分钟有效期的签名URL

    if (!data) {
      return res.status(404).json({
        success: false,
        message: 'File not found in storage',
      });
    }

    // 重定向到签名URL
    res.redirect(data.signedUrl);
  } catch (error) {
    console.error('Download file error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

// 上传文件（需要管理员权限）
router.post('/files/upload', upload.single('file'), async (req, res) => {
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

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded',
      });
    }

    const { ai_model, prompt, reference_image_ids } = req.body;

    if (!ai_model || !prompt) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: ai_model, prompt',
      });
    }

    // 上传文件
    const savedFile = await fileService.uploadFile(req.file, {
      ai_model,
      prompt,
      user_id: admin.id,
      reference_image_ids: reference_image_ids ? JSON.parse(reference_image_ids) : undefined,
    });

    res.json({
      success: true,
      data: savedFile,
    });
  } catch (error) {
    console.error('Upload file error:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Internal server error',
    });
  }
});

// 更新文件发布状态（需要管理员权限）
router.patch('/files/:id/publish', async (req, res) => {
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

    const { id } = req.params;
    const { publish_status } = req.body;

    if (!['published', 'unpublished'].includes(publish_status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid publish_status. Must be "published" or "unpublished"',
      });
    }

    // 更新文件发布状态
    const { data: updatedFile, error } = await supabaseAdmin
      .from('files')
      .update({
        publish_status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return res.status(500).json({
        success: false,
        message: 'Failed to update file publish status',
        error: error.message,
      });
    }

    res.json({
      success: true,
      data: updatedFile,
    });
  } catch (error) {
    console.error('Update file publish status error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

// 删除文件（需要管理员权限）
router.delete('/files/:id', async (req, res) => {
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

    const { id } = req.params;

    await fileService.deleteFile(id);

    res.json({
      success: true,
      message: 'File deleted successfully',
    });
  } catch (error) {
    console.error('Delete file error:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Internal server error',
    });
  }
});

export default router;
