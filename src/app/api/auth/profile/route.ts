import { NextResponse } from 'next/server';
import { validateSession, getUserById, updateUserProfile, changePassword } from '@/lib/auth';
import { cookies } from 'next/headers';

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
    
    const user = await validateSession(sessionToken);
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'الجلسة غير صالحة' },
        { status: 401 }
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
    console.error('Profile fetch error:', error);
    return NextResponse.json(
      { success: false, error: 'حدث خطأ أثناء جلب الملف الشخصي' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session_token')?.value;
    
    if (!sessionToken) {
      return NextResponse.json(
        { success: false, error: 'غير مصرح بالدخول' },
        { status: 401 }
      );
    }
    
    const user = await validateSession(sessionToken);
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'الجلسة غير صالحة' },
        { status: 401 }
      );
    }
    
    const body = await request.json();
    const { action, ...updates } = body;
    
    // Handle password change separately
    if (action === 'change_password') {
      const { current_password, new_password } = updates;
      
      if (!current_password || !new_password) {
        return NextResponse.json(
          { success: false, error: 'كلمة المرور الحالية والجديدة مطلوبتان' },
          { status: 400 }
        );
      }
      
      const result = await changePassword(user.id, current_password, new_password);
      
      if (!result.success) {
        return NextResponse.json(
          { success: false, error: result.error },
          { status: 400 }
        );
      }
      
      return NextResponse.json({
        success: true,
        message: 'تم تغيير كلمة المرور بنجاح'
      });
    }
    
    // Update profile
    const result = await updateUserProfile(user.id, updates);
    
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
        updated_at: result.updated_at
      },
      message: 'تم تحديث الملف الشخصي بنجاح'
    });
    
  } catch (error) {
    console.error('Profile update error:', error);
    return NextResponse.json(
      { success: false, error: 'حدث خطأ أثناء تحديث الملف الشخصي' },
      { status: 500 }
    );
  }
}