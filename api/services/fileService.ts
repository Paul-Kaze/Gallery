import { supabaseAdmin } from '../config/supabase.js';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs/promises';
// ffmpeg disabled in this environment

export class FileService {
  private readonly BUCKET_NAME = 'ai-gallery-files';
  private readonly THUMBNAIL_WIDTH = 800;
  private readonly MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

  constructor() {
    this.ensureBucketExists();
  }

  private async ensureBucketExists() {
    try {
      const { data: buckets } = await supabaseAdmin.storage.listBuckets();
      const bucketExists = buckets?.some(bucket => bucket.name === this.BUCKET_NAME);
      
      if (!bucketExists) {
        await supabaseAdmin.storage.createBucket(this.BUCKET_NAME, {
          public: true,
          fileSizeLimit: this.MAX_FILE_SIZE,
          allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm'],
        });
      }
    } catch (error) {
      console.error('Error ensuring bucket exists:', error);
    }
  }

  async uploadFile(file: Express.Multer.File, metadata: {
    ai_model: string;
    prompt: string;
    user_id?: string;
    reference_image_ids?: string[];
  }) {
    const fileId = uuidv4();
    const fileExtension = path.extname(file.originalname);
    const fileName = `${fileId}${fileExtension}`;
    const fileType = this.getFileType(file.mimetype);

    // 验证文件大小
    if (file.size > this.MAX_FILE_SIZE) {
      throw new Error('File size exceeds 50MB limit');
    }

    // 上传原始文件
    const { data: fileData, error: fileError } = await supabaseAdmin.storage
      .from(this.BUCKET_NAME)
      .upload(`original/${fileName}`, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      });

    if (fileError) {
      throw new Error(`Failed to upload file: ${fileError.message}`);
    }

    // 生成缩略图
    const thumbnailPath = await this.generateThumbnail(file, fileId, fileType);

    // 提取视频元信息
    let duration: number | undefined;
    let resolution: string | undefined;
    if (fileType === 'video') {
      const meta = await this.extractVideoMeta(file);
      duration = meta.duration;
      resolution = meta.resolution;
    }

    // 获取文件URL
    const { data: { publicUrl: fileUrl } } = supabaseAdmin.storage
      .from(this.BUCKET_NAME)
      .getPublicUrl(`original/${fileName}`);

    const { data: { publicUrl: thumbnailUrl } } = supabaseAdmin.storage
      .from(this.BUCKET_NAME)
      .getPublicUrl(thumbnailPath);

    // 保存文件元数据到数据库
    const { data: savedFile, error: dbError } = await supabaseAdmin
      .from('files')
      .insert({
        id: fileId,
        file_name: file.originalname,
        file_path: fileUrl,
        thumbnail_path: thumbnailUrl,
        file_size: file.size,
        file_format: fileExtension.slice(1),
        file_type: fileType,
        ai_model: metadata.ai_model,
        prompt: metadata.prompt,
        reference_image_ids: metadata.reference_image_ids || [],
        user_id: metadata.user_id,
        publish_status: 'unpublished',
        duration,
        resolution,
      })
      .select()
      .single();

    if (dbError) {
      throw new Error(`Failed to save file metadata: ${dbError.message}`);
    }

    return savedFile;
  }

  private async generateThumbnail(file: Express.Multer.File, fileId: string, fileType: 'image' | 'video'): Promise<string> {
    const thumbnailName = `${fileId}_thumb.jpg`;
    
    if (fileType === 'image') {
      // 为图片生成缩略图
      const thumbnailBuffer = await sharp(file.buffer)
        .resize(this.THUMBNAIL_WIDTH, undefined, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .jpeg({ quality: 85 })
        .toBuffer();

      const { error } = await supabaseAdmin.storage
        .from(this.BUCKET_NAME)
        .upload(`thumbnails/${thumbnailName}`, thumbnailBuffer, {
          contentType: 'image/jpeg',
          upsert: false,
        });

      if (error) {
        throw new Error(`Failed to upload thumbnail: ${error.message}`);
      }
    } else {
      const defaultThumbBuffer = await sharp({
        create: {
          width: this.THUMBNAIL_WIDTH,
          height: 450,
          channels: 3,
          background: { r: 64, g: 64, b: 64 }
        }
      })
      .jpeg({ quality: 85 })
      .toBuffer();

      const { error } = await supabaseAdmin.storage
        .from(this.BUCKET_NAME)
        .upload(`thumbnails/${thumbnailName}`, defaultThumbBuffer, {
          contentType: 'image/jpeg',
          upsert: false,
        });

      if (error) {
        throw new Error(`Failed to upload fallback video thumbnail: ${error.message}`);
      }
    }

    return `thumbnails/${thumbnailName}`;
  }

  private getFileType(mimetype: string): 'image' | 'video' {
    if (mimetype.startsWith('image/')) {
      return 'image';
    } else if (mimetype.startsWith('video/')) {
      return 'video';
    }
    throw new Error('Unsupported file type');
  }

  async getFileUrl(filePath: string): Promise<string> {
    const { data: { publicUrl } } = supabaseAdmin.storage
      .from(this.BUCKET_NAME)
      .getPublicUrl(filePath);
    return publicUrl;
  }

  private async extractVideoMeta(file: Express.Multer.File): Promise<{ duration?: number; resolution?: string }> {
    return {};
  }

  async deleteFile(fileId: string): Promise<void> {
    // 获取文件信息
    const { data: file } = await supabaseAdmin
      .from('files')
      .select('file_path, thumbnail_path')
      .eq('id', fileId)
      .single();

    if (!file) {
      throw new Error('File not found');
    }

    // 从存储中删除文件
    const fileName = file.file_path.split('/').pop();
    const thumbnailName = file.thumbnail_path.split('/').pop();

    await Promise.all([
      supabaseAdmin.storage.from(this.BUCKET_NAME).remove([`original/${fileName}`]),
      supabaseAdmin.storage.from(this.BUCKET_NAME).remove([`thumbnails/${thumbnailName}`]),
    ]);

    // 从数据库中删除记录
    await supabaseAdmin.from('files').delete().eq('id', fileId);
  }
}
