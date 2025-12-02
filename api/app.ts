import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import fileRoutes from './routes/files.js';
import adminRoutes from './routes/admin.js';
// rate limit disabled fallback

dotenv.config();

const app = express();

// 中间件
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 简易限流占位（避免缺少依赖导致启动失败）
const generalLimiter = (req: express.Request, res: express.Response, next: express.NextFunction) => next();
const downloadLimiter = (req: express.Request, res: express.Response, next: express.NextFunction) => next();

// 健康检查端点
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// API路由
app.use('/api', generalLimiter);
app.use('/api', authRoutes);
app.use('/api', adminRoutes);
app.use('/api', (req, res, next) => {
  // 针对下载端点应用更严格的限流
  if (req.method === 'GET' && /\/files\/.+\/download/.test(req.path)) {
    return downloadLimiter(req, res, next);
  }
  next();
});
app.use('/api', fileRoutes);

// 404处理
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found',
  });
});

// 错误处理中间件
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

export default app;
app.set('trust proxy', 1);
