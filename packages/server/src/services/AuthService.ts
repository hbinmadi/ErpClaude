import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db';
import { users, sessions } from '../db/schema';
import { eq, and, gt } from 'drizzle-orm';

const ACCESS_TTL = '15m';
const REFRESH_TTL = '7d';
const REFRESH_MS = 7 * 24 * 60 * 60 * 1000;

export class AuthService {
  static signAccess(user: { id: number; email: string; role: string; fullName: string }) {
    return jwt.sign(
      { id: user.id, email: user.email, role: user.role, fullName: user.fullName },
      process.env.JWT_SECRET!,
      { expiresIn: ACCESS_TTL }
    );
  }

  static async login(email: string, password: string) {
    const [user] = await db
      .select()
      .from(users)
      .where(and(eq(users.email, email), eq(users.isDeleted, false)));

    if (!user || !user.isActive) {
      throw Object.assign(new Error('Invalid credentials'), { status: 401 });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      throw Object.assign(new Error('Invalid credentials'), { status: 401 });
    }

    const refreshToken = uuidv4();
    const expiresAt = new Date(Date.now() + REFRESH_MS);

    await db.insert(sessions).values({ userId: user.id, refreshToken, expiresAt });

    const accessToken = this.signAccess(user);
    const { passwordHash: _, ...safeUser } = user;
    return { accessToken, refreshToken, user: safeUser };
  }

  static async refresh(refreshToken: string) {
    const [session] = await db
      .select()
      .from(sessions)
      .where(and(eq(sessions.refreshToken, refreshToken), gt(sessions.expiresAt, new Date())));

    if (!session) {
      throw Object.assign(new Error('Invalid refresh token'), { status: 401 });
    }

    const [user] = await db
      .select()
      .from(users)
      .where(and(eq(users.id, session.userId), eq(users.isActive, true)));

    if (!user) {
      throw Object.assign(new Error('User inactive'), { status: 401 });
    }

    const accessToken = this.signAccess(user);
    return { accessToken };
  }

  static async logout(refreshToken: string) {
    await db.delete(sessions).where(eq(sessions.refreshToken, refreshToken));
  }
}

// Suppress unused import warning
void REFRESH_TTL;
