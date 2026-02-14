import { NextResponse } from 'next/server';
import { validateSession } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  try {
    // Try Next.js cookie helper first; fall back to plain request header for test/runtime contexts
    let sessionToken: string | undefined;
    try {
      const cookieStore = await cookies();
      sessionToken = cookieStore.get('session_token')?.value;
    } catch (_) {
      // not running in Next runtime (tests) — try Cookie header
      const cookieHeader = (request.headers && request.headers.get && request.headers.get('cookie')) || '';
      const match = cookieHeader.match(/session_token=([^;\s]+)/);
      sessionToken = match ? match[1] : undefined;
    }

    if (!sessionToken) {
      return NextResponse.json(
        { valid: false, error: 'غير مصرح بالدخول' },
        { status: 401 }
      );
    }

    const user = await validateSession(sessionToken);

    if (!user) {
      return NextResponse.json(
        { valid: false, error: 'الجلسة غير صالحة' },
        { status: 401 }
      );
    }
    
    return NextResponse.json({
      valid: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        status: user.status,
        first_name: user.first_name,
        last_name: user.last_name
      }
    });
    
  } catch (error) {
    console.error('Session validation error:', error);
    return NextResponse.json(
      { valid: false, error: 'حدث خطأ أثناء التحقق من الجلسة' },
      { status: 500 }
    );
  }
}