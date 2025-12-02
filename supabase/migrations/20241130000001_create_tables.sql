-- 创建文件表
CREATE TABLE files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    thumbnail_path VARCHAR(500) NOT NULL,
    file_size BIGINT NOT NULL,
    file_format VARCHAR(50) NOT NULL,
    file_type VARCHAR(20) NOT NULL CHECK (file_type IN ('image', 'video')),
    ai_model VARCHAR(100) NOT NULL,
    prompt TEXT NOT NULL,
    reference_image_ids TEXT[], -- 存储参考图ID数组
    duration INTEGER, -- 视频时长（秒）
    resolution VARCHAR(50), -- 视频分辨率
    user_id UUID,
    publish_status VARCHAR(20) DEFAULT 'unpublished' CHECK (publish_status IN ('published', 'unpublished')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建参考图片表
CREATE TABLE reference_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_id UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,
    image_path VARCHAR(500) NOT NULL,
    thumbnail_path VARCHAR(500) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建用户表（存储Google登录用户）
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    google_id VARCHAR(100) UNIQUE,
    email VARCHAR(255) UNIQUE,
    name VARCHAR(255),
    avatar_url VARCHAR(500),
    login_token VARCHAR(255),
    token_expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建管理员表
CREATE TABLE admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
    last_login_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引优化查询性能
CREATE INDEX idx_files_file_type ON files(file_type);
CREATE INDEX idx_files_publish_status ON files(publish_status);
CREATE INDEX idx_files_created_at ON files(created_at DESC);
CREATE INDEX idx_files_user_id ON files(user_id);
CREATE INDEX idx_files_ai_model ON files(ai_model);
CREATE INDEX idx_reference_images_file_id ON reference_images(file_id);
CREATE INDEX idx_users_google_id ON users(google_id);
CREATE INDEX idx_admins_username ON admins(username);

-- 启用行级安全（RLS）
ALTER TABLE files ENABLE ROW LEVEL SECURITY;
ALTER TABLE reference_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;

-- 创建文件表的RLS策略
CREATE POLICY "Files are viewable by everyone" ON files FOR SELECT USING (publish_status = 'published');
CREATE POLICY "Admins can view all files" ON files FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert files" ON files FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Admins can update files" ON files FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Admins can delete files" ON files FOR DELETE TO authenticated USING (true);

-- 创建参考图片表的RLS策略
CREATE POLICY "Reference images are viewable by everyone" ON reference_images FOR SELECT USING (true);
CREATE POLICY "Admins can manage reference images" ON reference_images FOR ALL TO authenticated USING (true);

-- 创建用户表的RLS策略
CREATE POLICY "Users can view own data" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Admins can view all users" ON users FOR SELECT TO authenticated USING (true);

-- 创建管理员表的RLS策略
CREATE POLICY "Admins can view admin data" ON admins FOR SELECT TO authenticated USING (true);

-- 授予权限
GRANT SELECT ON files TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON files TO authenticated;
GRANT SELECT ON reference_images TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON reference_images TO authenticated;
GRANT SELECT ON users TO anon, authenticated;
GRANT SELECT ON admins TO authenticated;