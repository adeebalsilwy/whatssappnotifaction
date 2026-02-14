import { NextResponse } from 'next/server';
import { getAuditLogs } from '@/lib/audit';
import { AuditAction } from '@/lib/audit-types';
import { validateSession } from '@/lib/auth';
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
    
    // Only admins can view audit logs
    if (user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'ليس لديك صلاحية لعرض سجلات التدقيق' },
        { status: 403 }
      );
    }
    
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const userId = searchParams.get('userId') ? parseInt(searchParams.get('userId')!) : undefined;
    const action = searchParams.get('action') as AuditAction | undefined;
    const resourceType = searchParams.get('resourceType') || undefined;
    
    const result = await getAuditLogs(limit, offset, userId, action, resourceType);
    
    return NextResponse.json({
      success: true,
      data: result.data,
      total: result.total,
      limit,
      offset
    });
    
  } catch (error) {
    console.error('Audit logs error:', error);
    return NextResponse.json(
      { success: false, error: 'حدث خطأ أثناء جلب سجلات التدقيق' },
      { status: 500 }
    );
  }
}