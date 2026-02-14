import { User } from '@/lib/auth';

// Define permission keys
export type PermissionKey = 
  | 'manage_users'
  | 'manage_settings'
  | 'view_reports'
  | 'send_messages'
  | 'manage_templates'
  | 'view_audit_log'
  | 'export_data';

// Define role permissions
const ROLE_PERMISSIONS: Record<string, PermissionKey[]> = {
  'admin': [
    'manage_users',
    'manage_settings',
    'view_reports',
    'send_messages',
    'manage_templates',
    'view_audit_log',
    'export_data'
  ],
  'manager': [
    'view_reports',
    'send_messages',
    'manage_templates'
  ],
  'user': [
    'view_reports',
    'send_messages'
  ]
};

// Permission checker class
export class PermissionChecker {
  private user: User;
  private userPermissions: Set<PermissionKey>;

  constructor(user: User, userPermissions: PermissionKey[] = []) {
    this.user = user;
    this.userPermissions = new Set([
      ...ROLE_PERMISSIONS[user.role] || [],
      ...userPermissions
    ]);
  }

  // Check if user has specific permission
  hasPermission(permission: PermissionKey): boolean {
    return this.userPermissions.has(permission);
  }

  // Check if user has any of the specified permissions
  hasAnyPermission(permissions: PermissionKey[]): boolean {
    return permissions.some(permission => this.userPermissions.has(permission));
  }

  // Check if user has all of the specified permissions
  hasAllPermissions(permissions: PermissionKey[]): boolean {
    return permissions.every(permission => this.userPermissions.has(permission));
  }

  // Check if user can perform administrative actions
  isAdmin(): boolean {
    return this.user.role === 'admin';
  }

  // Check if user can manage other users
  canManageUsers(): boolean {
    return this.hasPermission('manage_users');
  }

  // Check if user can manage system settings
  canManageSettings(): boolean {
    return this.hasPermission('manage_settings');
  }

  // Check if user can view reports
  canViewReports(): boolean {
    return this.hasPermission('view_reports');
  }

  // Check if user can send messages
  canSendMessages(): boolean {
    return this.hasPermission('send_messages');
  }

  // Check if user can manage templates
  canManageTemplates(): boolean {
    return this.hasPermission('manage_templates');
  }

  // Check if user can view audit logs
  canViewAuditLog(): boolean {
    return this.hasPermission('view_audit_log');
  }

  // Get all user permissions
  getPermissions(): PermissionKey[] {
    return Array.from(this.userPermissions);
  }

  // Get role-based permissions
  getRolePermissions(): PermissionKey[] {
    return ROLE_PERMISSIONS[this.user.role] || [];
  }
}

// Middleware function for API routes
export function requirePermission(permission: PermissionKey) {
  return function(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function(...args: any[]) {
      const request = args[0];
      
      // Extract session token from request
      const sessionToken = await getSessionToken(request);
      
      if (!sessionToken) {
        return new Response(
          JSON.stringify({ success: false, error: 'غير مصرح بالدخول' }),
          { status: 401, headers: { 'Content-Type': 'application/json' } }
        );
      }
      
      // Validate session and get user
      const user = await validateSession(sessionToken);
      
      if (!user) {
        return new Response(
          JSON.stringify({ success: false, error: 'الجلسة غير صالحة' }),
          { status: 401, headers: { 'Content-Type': 'application/json' } }
        );
      }
      
      // Check permission
      const permissionChecker = new PermissionChecker(user);
      
      if (!permissionChecker.hasPermission(permission)) {
        return new Response(
          JSON.stringify({ success: false, error: 'ليس لديك الصلاحية المطلوبة' }),
          { status: 403, headers: { 'Content-Type': 'application/json' } }
        );
      }
      
      // Proceed with original method
      return originalMethod.apply(this, args);
    };
    
    return descriptor;
  };
}

// Helper function to extract session token from request
async function getSessionToken(request: Request): Promise<string | null> {
  // Try to get from cookies first
  const cookieHeader = request.headers.get('cookie');
  if (cookieHeader) {
    const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
      const [name, value] = cookie.trim().split('=');
      acc[name] = value;
      return acc;
    }, {} as Record<string, string>);
    
    if (cookies.session_token) {
      return cookies.session_token;
    }
  }
  
  // Try to get from authorization header
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  
  return null;
}

// Mock function - will be replaced with actual implementation
async function validateSession(sessionToken: string): Promise<User | null> {
  // This should call the actual validateSession function from auth.ts
  // For now, returning null to indicate unauthenticated
  return null;
}

// Permission guard for React components
export function usePermissionChecker(user: User | null): PermissionChecker | null {
  if (!user) return null;
  
  // In a real implementation, you would also fetch user-specific permissions from the database
  return new PermissionChecker(user);
}

// Hook to check specific permissions in components
export function useHasPermission(user: User | null, permission: PermissionKey): boolean {
  const checker = usePermissionChecker(user);
  return checker ? checker.hasPermission(permission) : false;
}

// Hook to check multiple permissions
export function useHasAnyPermission(user: User | null, permissions: PermissionKey[]): boolean {
  const checker = usePermissionChecker(user);
  return checker ? checker.hasAnyPermission(permissions) : false;
}

export function useHasAllPermissions(user: User | null, permissions: PermissionKey[]): boolean {
  const checker = usePermissionChecker(user);
  return checker ? checker.hasAllPermissions(permissions) : false;
}