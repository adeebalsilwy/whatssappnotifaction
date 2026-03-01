import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { validateSession, getUserById, updateUserProfile } from '@/lib/auth';
import { getDb, executeSingleQuery, executeWrite } from '@/lib/db';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
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
    
    const userId = parseInt(resolvedParams.id);
    if (isNaN(userId)) {
      return NextResponse.json(
        { success: false, error: 'معرف المستخدم غير صحيح' },
        { status: 400 }
      );
    }
    
    // Regular users can only view their own profile, admins can view all
    if (currentUser.id !== userId && currentUser.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'ليس لديك صلاحية لعرض هذا المستخدم' },
        { status: 403 }
      );
    }
    
    const user = executeSingleQuery<any>(
      'SELECT id, username, email, role, status, first_name, last_name, created_at, updated_at, last_login FROM users WHERE id = ?',
      [userId]
    );
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'المستخدم غير موجود' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        status: user.status,
        first_name: user.first_name,
        last_name: user.last_name,
        created_at: user.created_at,
        updated_at: user.updated_at,
        last_login: user.last_login
      }
    });
    
  } catch (error) {
    console.error('Get user error:', error);
    return NextResponse.json(
      { success: false, error: 'حدث خطأ أثناء جلب بيانات المستخدم' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
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
    
    const userId = parseInt(resolvedParams.id);
    if (isNaN(userId)) {
      return NextResponse.json(
        { success: false, error: 'معرف المستخدم غير صحيح' },
        { status: 400 }
      );
    }
    
    // Only admins can modify other users
    if (currentUser.id !== userId && currentUser.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'ليس لديك صلاحية لتعديل هذا المستخدم' },
        { status: 403 }
      );
    }
    
    const body = await request.json();
    const { username, email, first_name, last_name, role, status } = body;
    
    // Validate inputs
    if (username && username.length < 3) {
      return NextResponse.json(
        { success: false, error: 'اسم المستخدم يجب أن يكون 3 أحرف على الأقل' },
        { status: 400 }
      );
    }
    
    if (email && !email.includes('@')) {
      return NextResponse.json(
        { success: false, error: 'البريد الإلكتروني غير صحيح' },
        { status: 400 }
      );
    }
    
    // Only admins can change roles
    if (role && currentUser.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'ليس لديك صلاحية لتغيير الدور' },
        { status: 403 }
      );
    }
    
    const validRoles = ['admin', 'manager', 'user'];
    if (role && !validRoles.includes(role)) {
      return NextResponse.json(
        { success: false, error: 'الدور غير صحيح' },
        { status: 400 }
      );
    }
    
    const validStatuses = ['active', 'inactive', 'locked'];
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json(
        { success: false, error: 'الحالة غير صحيحة' },
        { status: 400 }
      );
    }
    
    // Check if user exists
    const existingUser = executeSingleQuery<any>('SELECT id FROM users WHERE id = ?', [userId]);
    if (!existingUser) {
      return NextResponse.json(
        { success: false, error: 'المستخدم غير موجود' },
        { status: 404 }
      );
    }
    
    // Build update query
    const fields = [];
    const values = [];
    
    if (username !== undefined) {
      // Check if username is already taken by another user
      const usernameExists = executeSingleQuery<any>(
        'SELECT id FROM users WHERE username = ? AND id != ?',
        [username, userId]
      );
      if (usernameExists) {
        return NextResponse.json(
          { success: false, error: 'اسم المستخدم مستخدم بالفعل' },
          { status: 400 }
        );
      }
      fields.push('username = ?');
      values.push(username);
    }
    
    if (email !== undefined) {
      if (email) {
        // Check if email is already taken by another user
        const emailExists = executeSingleQuery<any>(
          'SELECT id FROM users WHERE email = ? AND id != ?',
          [email, userId]
        );
        if (emailExists) {
          return NextResponse.json(
            { success: false, error: 'البريد الإلكتروني مستخدم بالفعل' },
            { status: 400 }
          );
        }
      }
      fields.push('email = ?');
      values.push(email || null);
    }
    
    if (first_name !== undefined) {
      fields.push('first_name = ?');
      values.push(first_name || null);
    }
    
    if (last_name !== undefined) {
      fields.push('last_name = ?');
      values.push(last_name || null);
    }
    
    if (role !== undefined && currentUser.role === 'admin') {
      fields.push('role = ?');
      values.push(role);
    }
    
    if (status !== undefined && currentUser.role === 'admin') {
      fields.push('status = ?');
      values.push(status);
    }
    
    if (fields.length === 0) {
      return NextResponse.json(
        { success: false, error: 'لا توجد بيانات للتحديث' },
        { status: 400 }
      );
    }
    
    fields.push('updated_at = datetime("now")');
    values.push(userId);
    
    const query = `UPDATE users SET ${fields.join(', ')} WHERE id = ?`;
    const result = executeWrite(query, values);
    
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'فشل في تحديث المستخدم' },
        { status: 500 }
      );
    }
    
    // Get updated user
    const updatedUser = executeSingleQuery<any>(
      'SELECT id, username, email, role, status, first_name, last_name, created_at, updated_at, last_login FROM users WHERE id = ?',
      [userId]
    );
    
    // Log the action
    const db = getDb();
    try {
      db.prepare(`
        INSERT INTO audit_log (user_id, action, resource_type, resource_id, details)
        VALUES (?, ?, ?, ?, ?)
      `).run(
        currentUser.id,
        'USER_UPDATED',
        'USERS',
        userId.toString(),
        `Updated user: ${updatedUser?.username || userId}`
      );
    } finally {
    }
    
    return NextResponse.json({
      success: true,
      user: {
        id: updatedUser!.id,
        username: updatedUser!.username,
        email: updatedUser!.email,
        role: updatedUser!.role,
        status: updatedUser!.status,
        first_name: updatedUser!.first_name,
        last_name: updatedUser!.last_name,
        updated_at: updatedUser!.updated_at
      },
      message: 'تم تحديث المستخدم بنجاح'
    });
    
  } catch (error) {
    console.error('Update user error:', error);
    return NextResponse.json(
      { success: false, error: 'حدث خطأ أثناء تحديث المستخدم' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
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
    
    // Only admins can delete users
    if (currentUser.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'ليس لديك صلاحية لحذف المستخدمين' },
        { status: 403 }
      );
    }
    
    const userId = parseInt(resolvedParams.id);
    if (isNaN(userId)) {
      return NextResponse.json(
        { success: false, error: 'معرف المستخدم غير صحيح' },
        { status: 400 }
      );
    }
    
    // Cannot delete yourself
    if (currentUser.id === userId) {
      return NextResponse.json(
        { success: false, error: 'لا يمكنك حذف حسابك الخاص' },
        { status: 400 }
      );
    }
    
    // Check if user exists
    const user = executeSingleQuery<any>('SELECT username FROM users WHERE id = ?', [userId]);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'المستخدم غير موجود' },
        { status: 404 }
      );
    }
    
    // Delete user (this will cascade delete sessions and permissions due to foreign keys)
    const result = executeWrite('DELETE FROM users WHERE id = ?', [userId]);
    
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'فشل في حذف المستخدم' },
        { status: 500 }
      );
    }
    
    // Log the action
    const db = getDb();
    try {
      db.prepare(`
        INSERT INTO audit_log (user_id, action, resource_type, resource_id, details)
        VALUES (?, ?, ?, ?, ?)
      `).run(
        currentUser.id,
        'USER_DELETED',
        'USERS',
        userId.toString(),
        `Deleted user: ${user.username}`
      );
    } finally {
    }
    
    return NextResponse.json({
      success: true,
      message: 'تم حذف المستخدم بنجاح'
    });
    
  } catch (error) {
    console.error('Delete user error:', error);
    return NextResponse.json(
      { success: false, error: 'حدث خطأ أثناء حذف المستخدم' },
      { status: 500 }
    );
  }
}