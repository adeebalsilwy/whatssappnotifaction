import { NextResponse } from 'next/server';
import { destroySession } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session_token')?.value;
    
    if (sessionToken) {
      // Destroy session in database
      await destroySession(sessionToken);
    }
    
    // Create response and clear cookie
    const response = NextResponse.json({ success: true, message: 'تم تسجيل الخروج بنجاح' });
    
    // Clear session cookie
    response.cookies.set('session_token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 0,
      path: '/'
    });
    
    return response;
    
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { success: false, error: 'حدث خطأ أثناء تسجيل الخروج' },
      { status: 500 }
    );
  }
}