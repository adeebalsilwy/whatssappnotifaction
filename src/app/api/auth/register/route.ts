import { NextResponse } from 'next/server';
import { validateSession, registerUser } from '@/lib/auth';
import { cookies } from 'next/headers';

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
    
    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: 'الجلسة غير صالحة' },
        { status: 401 }
      );
    }
    
    // Only admins can register new users
    if (currentUser.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'ليس لديك صلاحية لإنشاء مستخدمين' },
        { status: 403 }
      );
    }
    
    const body = await request.json();
    const { username, password, email, first_name, last_name, role } = body;
    
    // Validate required fields
    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: 'اسم المستخدم وكلمة المرور مطلوبان' },
        { status: 400 }
      );
    }
    
    // Validate password strength
    if (password.length < 6) {
      return NextResponse.json(
        { success: false, error: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' },
        { status: 400 }
      );
    }
    
    // Validate role
    const validRoles = ['user', 'manager'];
    if (role && !validRoles.includes(role)) {
      return NextResponse.json(
        { success: false, error: 'الدور غير صحيح' },
        { status: 400 }
      );
    }
    
    const result = await registerUser({
      username,
      password,
      email,
      first_name,
      last_name,
      role: role || 'user'
    }, currentUser.id);
    
    if ('error' in result) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }
    
    return NextResponse.json({
      success: true,
      user: {
        id: result.id,
        username: result.username,
        email: result.email,
        role: result.role,
        status: result.status,
        first_name: result.first_name,
        last_name: result.last_name,
        created_at: result.created_at
      },
      message: 'تم إنشاء المستخدم بنجاح'
    });
    
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { success: false, error: 'حدث خطأ أثناء إنشاء المستخدم' },
      { status: 500 }
    );
  }
}