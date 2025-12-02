import { supabaseAdmin } from '../config/supabase.js';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';

const JWT_SECRET = process.env.JWT_SECRET || '';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';

const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

export class AuthService {
  // 用户Google登录
  async googleLogin(googleToken: string): Promise<{
    success: boolean;
    user?: any;
    token?: string;
    message?: string;
    type?: 'user' | 'admin';
    admin?: any;
  }> {
    try {
      // 验证Google令牌
      const ticket = await googleClient.verifyIdToken({
        idToken: googleToken,
        audience: GOOGLE_CLIENT_ID,
      });

      const payload = ticket.getPayload();
      if (!payload) {
        return { success: false, message: 'Invalid Google token' };
      }

      const { sub: googleId, email, name, picture } = payload;

      // 检查用户是否已存在
      const { data: existingUser } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('google_id', googleId)
        .single();

      let user;
      const loginToken = this.generateToken();
      const tokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24小时后过期

      if (existingUser) {
        // 更新用户信息和登录令牌
        const { data: updatedUser } = await supabaseAdmin
          .from('users')
          .update({
            email,
            name,
            avatar_url: picture,
            login_token: loginToken,
            token_expires_at: tokenExpiresAt.toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingUser.id)
          .select()
          .single();

        user = updatedUser;
      } else {
        // 创建新用户
        const { data: newUser } = await supabaseAdmin
          .from('users')
          .insert({
            google_id: googleId,
            email,
            name,
            avatar_url: picture,
            login_token: loginToken,
            token_expires_at: tokenExpiresAt.toISOString(),
          })
          .select()
          .single();

        user = newUser;
      }

      // 判断是否为管理员（通过 google_id 或 email 映射）
      let admin: any = null;
      try {
        const { data: adminMatch } = await supabaseAdmin
          .from('admins')
          .select('*')
          .or(`username.eq.${email},avatar_url.eq.${picture}`) // 兼容现有字段，建议后续新增 email/google_id 列
          .limit(1)
          .single();
        admin = adminMatch && adminMatch.status !== 'disabled' ? adminMatch : null;
      } catch {}

      return {
        success: true,
        user,
        token: loginToken,
        type: admin ? 'admin' : 'user',
        admin: admin || undefined,
      };
    } catch (error) {
      console.error('Google login error:', error);
      return {
        success: false,
        message: 'Google authentication failed',
      };
    }
  }

  // 管理员登录
  async adminLogin(username: string, password: string): Promise<{
    success: boolean;
    admin?: any;
    token?: string;
    message?: string;
  }> {
    try {
      // 查找管理员
      const { data: admin } = await supabaseAdmin
        .from('admins')
        .select('*')
        .eq('username', username)
        .single();

      if (!admin) {
        return { success: false, message: 'Invalid credentials' };
      }

      // 检查账户状态
      if (admin.status === 'disabled') {
        return { success: false, message: 'Account is disabled' };
      }

      // 验证密码
      const isPasswordValid = await bcrypt.compare(password, admin.password_hash);
      if (!isPasswordValid) {
        return { success: false, message: 'Invalid credentials' };
      }

      // 生成登录令牌（包含管理员ID与角色）
      const loginToken = this.generateAdminToken(admin.id);
      const tokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24小时后过期

      // 更新管理员登录信息
      const { data: updatedAdmin } = await supabaseAdmin
        .from('admins')
        .update({
          last_login_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', admin.id)
        .select()
        .single();

      return {
        success: true,
        admin: updatedAdmin,
        token: loginToken,
      };
    } catch (error) {
      console.error('Admin login error:', error);
      return {
        success: false,
        message: 'Login failed',
      };
    }
  }

  // 验证用户令牌
  async validateUserToken(token: string): Promise<any> {
    try {
      const { data: user } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('login_token', token)
        .single();

      if (!user) {
        return null;
      }

      // 检查令牌是否过期
      if (user.token_expires_at && new Date(user.token_expires_at) < new Date()) {
        return null;
      }

      return user;
    } catch (error) {
      console.error('Validate user token error:', error);
      return null;
    }
  }

  // 验证管理员令牌
  async validateAdminToken(token: string): Promise<any> {
    try {
      // 优先作为管理员JWT校验
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        const { data: adminJwt } = await supabaseAdmin
          .from('admins')
          .select('*')
          .eq('id', decoded.adminId)
          .single();
        if (adminJwt && adminJwt.status !== 'disabled') return adminJwt;
      } catch {}

      // 兼容：若是用户登录令牌，则映射管理员身份
      const { data: user } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('login_token', token)
        .single();
      if (!user) return null;

      const { data: adminFromUser } = await supabaseAdmin
        .from('admins')
        .select('*')
        .or(`username.eq.${user.email}`)
        .limit(1)
        .single();
      if (!adminFromUser || adminFromUser.status === 'disabled') return null;
      return adminFromUser;

      if (!admin || admin.status === 'disabled') {
        return null;
      }

      return admin;
    } catch (error) {
      console.error('Validate admin token error:', error);
      return null;
    }
  }

  // 创建管理员账户
  async createAdmin(username: string, password: string): Promise<{
    success: boolean;
    admin?: any;
    message?: string;
  }> {
    try {
      // 检查用户名是否已存在
      const { data: existingAdmin } = await supabaseAdmin
        .from('admins')
        .select('id')
        .eq('username', username)
        .single();

      if (existingAdmin) {
        return { success: false, message: 'Username already exists' };
      }

      // 加密密码
      const passwordHash = await bcrypt.hash(password, 10);

      // 创建管理员
      const { data: newAdmin } = await supabaseAdmin
        .from('admins')
        .insert({
          username,
          password_hash: passwordHash,
        })
        .select()
        .single();

      return {
        success: true,
        admin: newAdmin,
      };
    } catch (error) {
      console.error('Create admin error:', error);
      return {
        success: false,
        message: 'Failed to create admin account',
      };
    }
  }

  private generateToken(): string {
    return jwt.sign({ id: uuidv4() }, JWT_SECRET, { expiresIn: '24h' });
  }

  private generateAdminToken(adminId: string): string {
    return jwt.sign({ adminId, role: 'admin' }, JWT_SECRET, { expiresIn: '24h' });
  }
}
