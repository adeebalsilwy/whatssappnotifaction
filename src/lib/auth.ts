import { getDb, executeSingleQuery, executeWrite } from '@/lib/db';
import { logUserLogin, logUserLogout, logUserCreated, logPasswordChanged } from '@/lib/audit';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

export interface User {
  id: number;
  username: string;
  email?: string;
  role: 'admin' | 'manager' | 'user';
  status: 'active' | 'inactive' | 'locked';
  first_name?: string;
  last_name?: string;
  created_at: string;
  updated_at: string;
  last_login?: string;
  failed_login_attempts: number;
  locked_until?: string;
}

export interface Session {
  id: number;
  user_id: number;
  session_token: string;
  expires_at: string;
  created_at: string;
  last_activity: string;
  ip_address?: string;
  user_agent?: string;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface RegisterData {
  username: string;
  password: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  role?: 'user' | 'manager';
}

// Hash password
export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, 10);
}

// Verify password
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(password, hash);
}

// Generate session token
export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// Create session
export async function createSession(userId: number, ipAddress?: string, userAgent?: string): Promise<Session> {
  const db = getDb();
  
  try {
    // Expire existing sessions for this user
    db.prepare('DELETE FROM user_sessions WHERE user_id = ?').run(userId);
    
    const sessionToken = generateSessionToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    
    const stmt = db.prepare('INSERT INTO user_sessions (user_id, session_token, expires_at, ip_address, user_agent) VALUES (?, ?, ?, ?, ?)');

    const result = stmt.run(userId, sessionToken, expiresAt.toISOString(), ipAddress, userAgent);
    
    // Prefer selecting the created session by its token to avoid any driver-specific
    // behavior where lastInsertRowid may not be reliable in mocked DBs.
    const session = db.prepare('SELECT * FROM user_sessions WHERE session_token = ?').get(sessionToken) as Session;
    return session;
  } finally {
  }
}

// Validate session
export async function validateSession(sessionToken: string): Promise<User | null> {
  const db = getDb();
  
  try {
    const session = db.prepare(`
      SELECT us.*, u.id, u.username, u.email, u.role, u.status, u.first_name, u.last_name, 
             u.created_at, u.updated_at, u.last_login, u.failed_login_attempts, u.locked_until
      FROM user_sessions us
      JOIN users u ON us.user_id = u.id
      WHERE us.session_token = ? AND us.expires_at > datetime('now')
    `).get(sessionToken) as any;
    
    if (session) {
      // Update last activity
      db.prepare("UPDATE user_sessions SET last_activity = datetime('now') WHERE id = ?")
        .run(session.id);
      
      // Return user object without session data
      const { session_token, expires_at, ip_address, user_agent, ...user } = session;
      return user as User;
    }
    
    return null;
  } finally {
  }
}

// Destroy session
export async function destroySession(sessionToken: string, userId?: number): Promise<void> {
  const db = getDb();
  
  try {
    db.prepare('DELETE FROM user_sessions WHERE session_token = ?').run(sessionToken);
    
    // Log logout if user ID is provided
    if (userId) {
      await logUserLogout(userId);
    }
  } finally {
  }
}

// Authenticate user
export async function authenticateUser(credentials: LoginCredentials, ipAddress?: string, userAgent?: string): Promise<{ user: User; session: Session } | { error: string }> {
  const db = getDb();
  
  try {
    // Find user (allow env-based admin fallback)
    let user = db.prepare('SELECT * FROM users WHERE username = ?').get(credentials.username) as any;

    // If user not found, check for admin credentials in env and create an admin DB user on-demand
    if (!user) {
      const envAdminUser = process.env.ADMIN_USERNAME;
      const envAdminPass = process.env.ADMIN_PASSWORD;

      if (envAdminUser && envAdminPass && credentials.username === envAdminUser && credentials.password === envAdminPass) {
        // Create admin user in DB so sessions and audit logs work as normal
        const passwordHash = await hashPassword(envAdminPass);
        const insert = db.prepare(`
          INSERT INTO users (username, password_hash, role, status, created_at, updated_at, failed_login_attempts)
          VALUES (?, ?, 'admin', 'active', datetime('now'), datetime('now'), 0)
        `);
        const result = insert.run(envAdminUser, passwordHash);
        user = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid) as any;
      } else {
        return { error: 'اسم المستخدم أو كلمة المرور غير صحيحة' };
      }
    }

    // Check if user is locked
    if (user.status === 'locked') {
      if (user.locked_until && new Date(user.locked_until) > new Date()) {
        return { error: 'الحساب مقفل مؤقتاً. يرجى المحاولة لاحقاً' };
      } else {
        // Unlock account if lock period expired
        db.prepare('UPDATE users SET status = "active", failed_login_attempts = 0, locked_until = NULL WHERE id = ?')
          .run(user.id);
      }
    }
    
    if (user.status !== 'active') {
      return { error: 'الحساب غير مفعل' };
    }
    
    // Verify password
    let isValid = await verifyPassword(credentials.password, user.password_hash);

    // Allow env-based admin credentials to authenticate even if DB hash differs; sync DB hash when used
    if (!isValid) {
      const envAdminUser = process.env.ADMIN_USERNAME;
      const envAdminPass = process.env.ADMIN_PASSWORD;
      if (envAdminUser && envAdminPass && credentials.username === envAdminUser && credentials.password === envAdminPass) {
        // Sync DB password hash to match env admin (so subsequent logins behave normally)
        const newHash = await hashPassword(envAdminPass);
        db.prepare('UPDATE users SET password_hash = ?, failed_login_attempts = 0 WHERE id = ?').run(newHash, user.id);
        isValid = true;
      }
    }

    if (!isValid) {
      // Increment failed login attempts
      const newAttempts = user.failed_login_attempts + 1;
      let lockedUntil = null;
      
      if (newAttempts >= 5) {
        // Lock account for 30 minutes after 5 failed attempts
        lockedUntil = new Date(Date.now() + 30 * 60 * 1000);
        db.prepare('UPDATE users SET status = "locked", locked_until = ? WHERE id = ?')
          .run(lockedUntil.toISOString(), user.id);
      }
      
      db.prepare('UPDATE users SET failed_login_attempts = ? WHERE id = ?')
        .run(newAttempts, user.id);
      
      return { error: 'اسم المستخدم أو كلمة المرور غير صحيحة' };
    }
    
    // Reset failed attempts on successful login
    db.prepare("UPDATE users SET failed_login_attempts = 0, last_login = datetime('now') WHERE id = ?")
      .run(user.id);
    
    // Create session
    let session = await createSession(user.id, ipAddress, userAgent);

    // Fallback: if session creation unexpectedly returned null, try again to ensure tests
    // and edge-case drivers remain robust.
    if (!session) {
      session = await createSession(user.id, ipAddress, userAgent);
    }

    // Log successful login
    db.prepare(`
      INSERT INTO audit_log (user_id, action, resource_type, details, ip_address, user_agent)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(user.id, 'USER_LOGIN', 'AUTH', 'Successful login', ipAddress, userAgent);

    // Return user without password hash
    const { password_hash, ...safeUser } = user;

    // DEBUG: ensure session is present (kept short-term for test reliability troubleshooting)
    // console.debug && console.debug('AUTH RESULT', { user: safeUser?.username, session });

    return { user: safeUser as User, session };
    
  } catch (error: any) {
    console.error('Authentication error:', error);
    return { error: 'حدث خطأ أثناء تسجيل الدخول' };
  } finally {
  }
}

// Register new user (admin only)
export async function registerUser(userData: RegisterData, createdByUserId?: number): Promise<User | { error: string }> {
  const db = getDb();
  
  try {
    // Check if username already exists
    const existingUser = db.prepare('SELECT id FROM users WHERE username = ?').get(userData.username);
    if (existingUser) {
      return { error: 'اسم المستخدم مستخدم بالفعل' };
    }
    
    // Check if email already exists (if provided)
    if (userData.email) {
      const existingEmail = db.prepare('SELECT id FROM users WHERE email = ?').get(userData.email);
      if (existingEmail) {
        return { error: 'البريد الإلكتروني مستخدم بالفعل' };
      }
    }
    
    // Hash password
    const passwordHash = await hashPassword(userData.password);
    
    // Set default role if not provided
    const role = userData.role || 'user';
    
    // Insert new user
    const stmt = db.prepare(`
      INSERT INTO users (username, password_hash, email, first_name, last_name, role, status)
      VALUES (?, ?, ?, ?, ?, ?, 'active')
    `);
    
    const result = stmt.run(
      userData.username,
      passwordHash,
      userData.email || null,
      userData.first_name || null,
      userData.last_name || null,
      role
    );
    
    // Get created user
    const newUser = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid) as any;
    
    // Log user creation
    db.prepare(`
      INSERT INTO audit_log (user_id, action, resource_type, details)
      VALUES (?, ?, ?, ?)
    `).run(createdByUserId, 'USER_CREATED', 'USERS', `Created user: ${userData.username}`);
    
    // Return user without password hash
    const { password_hash, ...safeUser } = newUser;
    return safeUser as User;
    
  } catch (error: any) {
    console.error('Registration error:', error);
    return { error: 'حدث خطأ أثناء إنشاء المستخدم' };
  } finally {
  }
}

// Get user by ID
export async function getUserById(userId: number): Promise<User | null> {
  const db = getDb();
  
  try {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as any;
    if (user) {
      const { password_hash, ...safeUser } = user;
      return safeUser as User;
    }
    return null;
  } finally {
  }
}

// Update user profile
export async function updateUserProfile(userId: number, updates: Partial<User>): Promise<User | { error: string }> {
  const db = getDb();
  
  try {
    // Check if username is being updated and already exists
    if (updates.username) {
      const existingUser = db.prepare('SELECT id FROM users WHERE username = ? AND id != ?').get(updates.username, userId);
      if (existingUser) {
        return { error: 'اسم المستخدم مستخدم بالفعل' };
      }
    }
    
    // Check if email is being updated and already exists
    if (updates.email) {
      const existingEmail = db.prepare('SELECT id FROM users WHERE email = ? AND id != ?').get(updates.email, userId);
      if (existingEmail) {
        return { error: 'البريد الإلكتروني مستخدم بالفعل' };
      }
    }
    
    // Build update query
    const fields = [];
    const values = [];
    
    if (updates.username) {
      fields.push('username = ?');
      values.push(updates.username);
    }
    
    if (updates.email !== undefined) {
      fields.push('email = ?');
      values.push(updates.email || null);
    }
    
    if (updates.first_name !== undefined) {
      fields.push('first_name = ?');
      values.push(updates.first_name || null);
    }
    
    if (updates.last_name !== undefined) {
      fields.push('last_name = ?');
      values.push(updates.last_name || null);
    }
    
    if (fields.length === 0) {
      return { error: 'لا توجد بيانات للتحديث' };
    }
    
    fields.push("updated_at = datetime('now')");
    values.push(userId);
    
    const query = `UPDATE users SET ${fields.join(', ')} WHERE id = ?`;
    db.prepare(query).run(...values);
    
    // Get updated user
    const updatedUser = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as any;
    const { password_hash, ...safeUser } = updatedUser;
    
    return safeUser as User;
    
  } catch (error: any) {
    console.error('Profile update error:', error);
    return { error: 'حدث خطأ أثناء تحديث الملف الشخصي' };
  } finally {
  }
}

// Change user password
export async function changePassword(userId: number, currentPassword: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
  const db = getDb();
  
  try {
    // Get current user
    const user = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(userId) as any;
    if (!user) {
      return { success: false, error: 'المستخدم غير موجود' };
    }
    
    // Verify current password
    const isValid = await verifyPassword(currentPassword, user.password_hash);
    if (!isValid) {
      return { success: false, error: 'كلمة المرور الحالية غير صحيحة' };
    }
    
    // Hash new password
    const newPasswordHash = await hashPassword(newPassword);
    
    // Update password
    db.prepare("UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?")
      .run(newPasswordHash, userId);
    
    return { success: true };
    
  } catch (error: any) {
    console.error('Password change error:', error);
    return { success: false, error: 'حدث خطأ أثناء تغيير كلمة المرور' };
  } finally {
  }
}