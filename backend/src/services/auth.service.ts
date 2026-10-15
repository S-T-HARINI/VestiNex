import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { pgDb } from '../lib/postgres';
import { User } from '../types';
import { AppError } from '../middleware/errorHandler';

export class AuthService {
  async register(data: { name: string; email: string; password: string }): Promise<Omit<User, 'passwordHash'>> {
    const existing = await pgDb.query<User>(
      'SELECT id, email FROM users WHERE lower(email) = lower($1) LIMIT 1;',
      [data.email]
    );

    if (existing.length > 0) {
      throw new AppError('An account with this email address already exists.', 409, 'CONFLICT');
    }

    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(data.password, salt);
    const userId = `usr_${uuidv4().substring(0, 8)}`;
    const avatarUrl = `https://avatar.vercel.sh/${encodeURIComponent(data.email)}`;
    const now = new Date();

    return await pgDb.transaction(async (client) => {
      // 1. Insert user into PostgreSQL users table
      await client.query(
        `INSERT INTO users (id, email, name, password_hash, role, avatar_url, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8);`,
        [userId, data.email.toLowerCase(), data.name, passwordHash, 'USER', avatarUrl, now, now]
      );

      // 2. Assign to first active project if exists
      const projects = await client.query<{ id: string }>('SELECT id FROM projects LIMIT 1;');
      if (projects.length > 0) {
        await client.query(
          `INSERT INTO project_members (id, user_id, project_id, role, joined_at)
           VALUES ($1, $2, $3, $4, $5);`,
          [`mem_${uuidv4().substring(0, 8)}`, userId, projects[0].id, 'DEVELOPER', now]
        );
      }

      // 3. Audit log
      await client.query(
        `INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, changes, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7);`,
        [
          `aud_${uuidv4().substring(0, 8)}`,
          userId,
          'USER_REGISTERED',
          'USER',
          userId,
          JSON.stringify({ email: data.email, name: data.name }),
          now,
        ]
      );

      return {
        id: userId,
        email: data.email.toLowerCase(),
        name: data.name,
        role: 'USER',
        avatarUrl,
        createdAt: now,
        updatedAt: now,
      };
    });
  }

  async login(data: { email: string; password: string }): Promise<Omit<User, 'passwordHash'>> {
    const rows = await pgDb.query<any>(
      'SELECT id, email, name, password_hash, role, avatar_url, created_at, updated_at FROM users WHERE lower(email) = lower($1) LIMIT 1;',
      [data.email]
    );

    if (rows.length === 0) {
      throw new AppError('Invalid email or password.', 401, 'INVALID_CREDENTIALS');
    }

    const user = rows[0];
    const isMatch = bcrypt.compareSync(data.password, user.password_hash);
    if (!isMatch) {
      throw new AppError('Invalid email or password.', 401, 'INVALID_CREDENTIALS');
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      avatarUrl: user.avatar_url,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
    };
  }

  async getMe(userId: string): Promise<Omit<User, 'passwordHash'>> {
    const rows = await pgDb.query<any>(
      'SELECT id, email, name, role, avatar_url, created_at, updated_at FROM users WHERE id = $1 LIMIT 1;',
      [userId]
    );

    if (rows.length === 0) {
      throw new AppError('User account not found.', 404, 'NOT_FOUND');
    }

    const user = rows[0];
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      avatarUrl: user.avatar_url,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
    };
  }

  async updateProfile(userId: string, data: { name?: string; avatarUrl?: string | null }) {
    const existing = await this.getMe(userId);

    const updatedName = data.name !== undefined ? data.name : existing.name;
    const updatedAvatar = data.avatarUrl !== undefined ? data.avatarUrl : existing.avatarUrl;
    const now = new Date();

    await pgDb.query(
      'UPDATE users SET name = $1, avatar_url = $2, updated_at = $3 WHERE id = $4;',
      [updatedName, updatedAvatar, now, userId]
    );

    return {
      ...existing,
      name: updatedName,
      avatarUrl: updatedAvatar,
      updatedAt: now,
    };
  }

  async listUsers(): Promise<Omit<User, 'passwordHash'>[]> {
    const rows = await pgDb.query<any>(
      'SELECT id, email, name, role, avatar_url, created_at, updated_at FROM users ORDER BY name ASC;'
    );
    return rows.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      avatarUrl: u.avatar_url,
      createdAt: u.created_at,
      updatedAt: u.updated_at,
    }));
  }

  async findByIdOrEmail(identifier: string): Promise<User | null> {
    const rows = await pgDb.query<any>(
      'SELECT id, email, name, password_hash as "passwordHash", role, avatar_url as "avatarUrl", created_at as "createdAt", updated_at as "updatedAt" FROM users WHERE id = $1 OR lower(email) = lower($1) LIMIT 1;',
      [identifier]
    );
    if (rows.length === 0) return null;
    const u = rows[0];
    return {
      id: u.id,
      email: u.email,
      name: u.name,
      passwordHash: u.passwordHash,
      role: u.role,
      avatarUrl: u.avatarUrl,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
    };
  }
}

export const authService = new AuthService();
