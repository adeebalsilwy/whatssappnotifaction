import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Define route permissions
const ROUTE_PERMISSIONS: Record<string, string[]> = {
  '/dashboard/users': ['manage_users'],
  '/dashboard/settings': ['manage_settings'],
  '/dashboard/reports': ['view_reports'],
  '/dashboard/messages': ['send_messages'],
  '/dashboard/templates': ['manage_templates'],
};

// Define role hierarchy
const ROLE_HIERARCHY: Record<string, number> = {
  'user': 1,
  'manager': 2,
  'admin': 3
};

export async function middleware(request: NextRequest) {
  const sessionToken = request.cookies.get('session_token')?.value;
  
  // Paths that don't require authentication
  const publicPaths = ['/login', '/api/auth/login', '/api/auth/logout', '/_next', '/favicon.ico'];
  const isPublicPath = publicPaths.some(path => request.nextUrl.pathname.startsWith(path));
  
  // If it's a public path, allow access
  if (isPublicPath) {
    return NextResponse.next();
  }
  
  // If no session token and trying to access protected routes, redirect to login
  if (!sessionToken && request.nextUrl.pathname.startsWith('/dashboard')) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }
  
  // For API routes that require authentication
  if (request.nextUrl.pathname.startsWith('/api/') && !request.nextUrl.pathname.startsWith('/api/auth/')) {
    if (!sessionToken) {
      return new NextResponse(
        JSON.stringify({ success: false, error: 'Authentication required' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // For user management APIs, check specific permissions
    if (request.nextUrl.pathname.startsWith('/api/users')) {
      const response = await checkUserPermissions(sessionToken, ['manage_users']);
      if (!response.valid) {
        return new NextResponse(
          JSON.stringify({ success: false, error: response.error || 'Insufficient permissions' }),
          { status: 403, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }
  }
  
  // Check route-specific permissions for dashboard routes
  const routePath = Object.keys(ROUTE_PERMISSIONS).find(path => 
    request.nextUrl.pathname.startsWith(path)
  );
  
  if (routePath && sessionToken) {
    const requiredPermissions = ROUTE_PERMISSIONS[routePath];
    const response = await checkUserPermissions(sessionToken, requiredPermissions);
    
    if (!response.valid) {
      // Redirect to unauthorized page or dashboard home
      const unauthorizedUrl = new URL('/dashboard', request.url);
      return NextResponse.redirect(unauthorizedUrl);
    }
  }
  
  return NextResponse.next();
}

// Helper function to check user permissions
async function checkUserPermissions(sessionToken: string, requiredPermissions: string[]): Promise<{ valid: boolean; error?: string }> {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || process.env.APINOTIFICATION_URL || 'http://localhost:9003'}/api/auth/validate`, {
      headers: {
        'Cookie': `session_token=${sessionToken}`
      }
    });
    
    if (!response.ok) {
      return { valid: false, error: 'Invalid session' };
    }
    
    const data = await response.json();
    
    if (!data.valid) {
      return { valid: false, error: 'Invalid session' };
    }
    
    // Check role hierarchy for basic access
    const userRole = data.user?.role || 'user';
    const userRoleLevel = ROLE_HIERARCHY[userRole] || 1;
    
    // Admins can access everything
    if (userRoleLevel >= 3) {
      return { valid: true };
    }
    
    // Check specific permissions (simplified - in production, fetch from DB)
    const hasRequiredPermission = requiredPermissions.some(permission => {
      // Simple role-based permission mapping
      switch (permission) {
        case 'manage_users':
          return userRoleLevel >= 3; // Only admins
        case 'manage_settings':
          return userRoleLevel >= 2; // Managers and admins
        case 'view_reports':
          return userRoleLevel >= 1; // All authenticated users
        case 'send_messages':
          return userRoleLevel >= 1; // All authenticated users
        case 'manage_templates':
          return userRoleLevel >= 2; // Managers and admins
        default:
          return false;
      }
    });
    
    return { 
      valid: hasRequiredPermission, 
      error: hasRequiredPermission ? undefined : 'Insufficient permissions' 
    };
    
  } catch (error) {
    console.error('Permission check error:', error);
    return { valid: false, error: 'Permission check failed' };
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};