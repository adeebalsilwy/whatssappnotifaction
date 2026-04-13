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
  const origin = request.nextUrl.origin;
  
  // Handle the specific dashboard API endpoint
  if (request.nextUrl.pathname === '/dashboard/api/whatsapp/send') {
    // Redirect to the working API endpoint
    const newUrl = new URL('/api/whatsapp/send', request.url);
    
    // Create a new request with the same body and headers
    const { body, headers } = request;
    const clonedHeaders = new Headers(headers);
    clonedHeaders.set('Content-Type', 'application/json');
    
    const response = await fetch(newUrl.toString(), {
      method: 'POST',
      headers: clonedHeaders,
      body: body
    });
    
    const responseData = await response.json();
    return NextResponse.json(responseData, { status: response.status });
  }
  
  // Paths that don't require authentication
  const publicPaths = [
    '/login', 
    '/api/auth/login', 
    '/api/auth/logout', 
    '/_next', 
    '/favicon.ico',
    // Public API endpoints
    '/api/whatsapp/send'
  ];
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

  // For API routes, validate session and return JSON error
  if (request.nextUrl.pathname.startsWith('/api/')) {
    if (!sessionToken) {
      return new NextResponse(
        JSON.stringify({ success: false, error: 'Authentication required' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // For user management APIs, check specific permissions
    if (request.nextUrl.pathname.startsWith('/api/users')) {
      const response = await checkUserPermissions(sessionToken, ['manage_users'], origin);
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
    const response = await checkUserPermissions(sessionToken, requiredPermissions, origin);
    
    if (!response.valid) {
      // Redirect to unauthorized page or dashboard home
      const unauthorizedUrl = new URL('/dashboard', request.url);
      return NextResponse.redirect(unauthorizedUrl);
    }
  }
  
  return NextResponse.next();
}

// Helper function to check user permissions
async function checkUserPermissions(sessionToken: string, requiredPermissions: string[], origin: string) {
  try {
    const response = await fetch(`${origin}/api/auth/profile`, {
      headers: {
        'Cookie': `session_token=${sessionToken}`
      }
    });
    
    if (!response.ok) {
      return { valid: false, error: 'Invalid session' };
    }
    
    const userData = await response.json();
    
    if (!userData.user) {
      return { valid: false, error: 'User not found' };
    }
    
    // Check if user has required permissions
    const userPermissions = userData.user.permissions || [];
    const hasPermission = requiredPermissions.some(permission => 
      userPermissions.includes(permission) || userData.user.role === 'admin'
    );
    
    return { valid: hasPermission, error: hasPermission ? null : 'Insufficient permissions' };
  } catch (error) {
    console.error('Error checking permissions:', error);
    return { valid: false, error: 'Error checking permissions' };
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (handled in the middleware logic)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};