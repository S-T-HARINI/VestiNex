import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../lib/store';
import { User } from '../types';

export class AuthService {
  async register(data: { name: string; email: string; password: string }): Promise<Omit<User, 'passwordHash'>> {
    const existing = db.findUserByEmail(data.email);
    if (existing) {
      throw new Error('An account with this email address already exists.');
    }

    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(data.password, salt);

    const newUser: User = {
      id: `usr_${uuidv4().substring(0, 8)}`,
      email: data.email.toLowerCase(),
      name: data.name,
      passwordHash,
      role: 'USER',
      avatarUrl: `https://avatar.vercel.sh/${encodeURIComponent(data.email)}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    db.users.push(newUser);

    // Auto-assign to first demo project as Developer for smooth on-boarding
    const firstProject = db.projects[0];
    if (firstProject) {
      db.projectMembers.push({
        id: `mem_${uuidv4().substring(0, 8)}`,
        userId: newUser.id,
        projectId: firstProject.id,
        role: 'DEVELOPER',
        joinedAt: new Date(),
      });
    }

    // Audit log
    db.auditLogs.push({
      id: `aud_${uuidv4().substring(0, 8)}`,
      userId: newUser.id,
      action: 'USER_REGISTERED',
      entityType: 'USER',
      entityId: newUser.id,
      changes: { email: newUser.email, name: newUser.name },
      createdAt: new Date(),
    });

    const { passwordHash: _, ...userWithoutPassword } = newUser;
    return userWithoutPassword;
  }

  async login(data: { email: string; password: string }): Promise<Omit<User, 'passwordHash'>> {
    const user = db.findUserByEmail(data.email);
    if (!user) {
      throw new Error('Invalid email or password.');
    }

    const isMatch = bcrypt.compareSync(data.password, user.passwordHash);
    if (!isMatch) {
      throw new Error('Invalid email or password.');
    }

    const { passwordHash: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async getMe(userId: string): Promise<Omit<User, 'passwordHash'>> {
    const user = db.findUserById(userId);
    if (!user) {
      throw new Error('User account not found.');
    }
    const { passwordHash: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async updateProfile(userId: string, data: { name?: string; avatarUrl?: string | null }) {
    const user = db.findUserById(userId);
    if (!user) throw new Error('User not found.');

    if (data.name !== undefined) user.name = data.name;
    if (data.avatarUrl !== undefined) user.avatarUrl = data.avatarUrl;
    user.updatedAt = new Date();

    const { passwordHash: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async listUsers(): Promise<Omit<User, 'passwordHash'>[]> {
    return db.users.map(({ passwordHash, ...rest }) => rest);
  }
}

export const authService = new AuthService();
