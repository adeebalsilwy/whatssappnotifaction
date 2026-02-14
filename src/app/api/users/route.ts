import { NextResponse } from 'next/server';
import { validateSession, getUserById } from '@/lib/auth';
import { getDb, executeQuery, executeSingleQuery } from '@/lib/db';
import { cookies } from 'next/headers';

interface UserListItem {
  id: number;
  username: string;
  email?: string;
  role: string;
  status: string;
  first_name?: string;
  last_name?: string;
  created_at: string;
  last_login?: string;
  failed_login_attempts: number;
}

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session_token')?.value;
    
    if (!sessionToken) {
      return NextResponse.json(
        { success: false, error: 'غير مصرح بالدخول' },
        { status: 401 }
      );
    }
    
    const currentUser = await validateSession(sessionToken);
    
    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: 'الجلسة غير صالحة' },
        { status: 401 }
      );
    }
    
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const role = searchParams.get('role') || '';
    const status = searchParams.get('status') || '';
    
    const offset = (page - 1) * limit;
    
    // Build query
    let query = `
      SELECT id, username, email, role, status, first_name, last_name, 
             created_at, last_login, failed_login_attempts
      FROM users 
      WHERE 1=1
    `;
    
    const params: any[] = [];
    
    if (search) {
      query += ' AND (username LIKE ? OR first_name LIKE ? OR last_name LIKE ? OR email LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }
    
    if (role) {
      query += ' AND role = ?';
      params.push(role);
    }
    
    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }
    
    // Get total count
    const countQuery = query.replace(
      'SELECT id, username, email, role, status, first_name, last_name, created_at, last_login, failed_login_attempts',
      'SELECT COUNT(*) as count'
    );
    
    const countResult = executeSingleQuery<{ count: number }>(countQuery, params);
    const total = countResult?.count || 0;
    
    // Add pagination
    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);
    
    const result = executeQuery<UserListItem>(query, params);
    
    return NextResponse.json({
      success: true,
      data: result.data,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
    
  } catch (error) {
    console.error('Users list error:', error);
    return NextResponse.json(
      { success: false, error: 'حدث خطأ أثناء جلب قائمة المستخدمين' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session_token')?.value;

    if (!sessionToken) {
      return NextResponse.json(
        { success: false, error: 'غير مصرح بالدخول' },
        { status: 401 }
      );
    }

    const currentUser = await validateSession(sessionToken);

    if (!currentUser || currentUser.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'ليس لديك صلاحية لإضافة مستخدمين' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { username, password, email, role, status, first_name, last_name } = body;

    if (!username || !password || !role) {
      return NextResponse.json(
        { success: false, error: 'اسم المستخدم وكلمة المرور والدور حقول مطلوبة' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = executeSingleQuery<any>('SELECT id FROM users WHERE username = ?', [username]);
    if (existingUser) {
      return NextResponse.json(
        { success: false, error: 'اسم المستخدم موجود بالفعل' },
        { status: 400 }
      );
    }

    // Hash password (using crude hashing for simplicity in this env if bcrypt isn't available,
    // but usually we'd use lib/auth hashPassword)
    const { hashPassword } = await import('@/lib/auth');
    const passwordHash = await hashPassword(password);

    const result = executeWrite(
      `INSERT INTO users (username, password_hash, email, role, status, first_name, last_name, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, datetime("now"), datetime("now"))`,
      [username, passwordHash, email || null, role, status || 'active', first_name || null, last_name || null]
    );

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'فشل في إنشاء المستخدم' },
        { status: 500 }
      );
    }

    // Log action
    const db = getDb();
    try {
      db.prepare(`
        INSERT INTO audit_log (user_id, action, resource_type, resource_id, details)
        VALUES (?, ?, ?, ?, ?)
      `).run(
        currentUser.id,
        'USER_CREATED',
        'USERS',
        result.lastInsertRowid?.toString(),
        `Created user: ${username}`
      );
    } finally {
      db.close();
    }

    return NextResponse.json({
      success: true,
      message: 'تم إنشاء المستخدم بنجاح',
      userId: result.lastInsertRowid
    });

  } catch (error) {
    console.error('Create user error:', error);
    return NextResponse.json(
      { success: false, error: 'حدث خطأ أثناء إنشاء المستخدم' },
      { status: 500 }
    );
  }
}