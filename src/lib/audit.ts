import { getDb, executeWrite } from '@/lib/db';
import type { AuditLog } from '@/lib/audit-types';
import { AuditAction } from '@/lib/audit-types';


export async function logAuditEvent(
  userId: number,
  action: AuditAction,
  resourceType: string,
  resourceId?: string,
  details?: string,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  try {
    const query = `
      INSERT INTO audit_log (user_id, action, resource_type, resource_id, details, ip_address, user_agent, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `;
    
    await executeWrite(query, [
      userId,
      action,
      resourceType,
      resourceId || null,
      details || null,
      ipAddress || null,
      userAgent || null
    ]);
  } catch (error) {
    console.error('Failed to log audit event:', error);
    // Don't throw error as audit logging shouldn't break main functionality
  }
}

export async function getAuditLogs(
  limit: number = 50,
  offset: number = 0,
  userId?: number,
  action?: AuditAction,
  resourceType?: string
): Promise<{ data: AuditLog[], total: number }> {
  let query = `
    SELECT al.*, u.username, u.first_name, u.last_name
    FROM audit_log al
    LEFT JOIN users u ON al.user_id = u.id
    WHERE 1=1
  `;
  
  const countQuery = `
    SELECT COUNT(*) as count
    FROM audit_log al
    WHERE 1=1
  `;
  
  const params: any[] = [];
  
  if (userId) {
    query += ' AND al.user_id = ?';
    params.push(userId);
  }
  
  if (action) {
    query += ' AND al.action = ?';
    params.push(action);
  }
  
  if (resourceType) {
    query += ' AND al.resource_type = ?';
    params.push(resourceType);
  }
  
  query += ' ORDER BY al.created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);
  
  try {
    const db = getDb();
    
    const data = db.prepare(query).all(...params) as AuditLog[];
    const countResult = db.prepare(countQuery).get(...params.slice(0, -2)) as { count: number };
    
    return {
      data,
      total: countResult.count
    };
  } catch (error) {
    console.error('Failed to fetch audit logs:', error);
    return { data: [], total: 0 };
  }
}

// Helper functions for common audit events
export async function logUserLogin(userId: number, ipAddress?: string, userAgent?: string): Promise<void> {
  await logAuditEvent(userId, AuditAction.USER_LOGIN, 'user', userId.toString(), 'User logged in', ipAddress, userAgent);
}

export async function logUserLogout(userId: number, ipAddress?: string, userAgent?: string): Promise<void> {
  await logAuditEvent(userId, AuditAction.USER_LOGOUT, 'user', userId.toString(), 'User logged out', ipAddress, userAgent);
}

export async function logUserCreated(userId: number, createdUserId: number, ipAddress?: string, userAgent?: string): Promise<void> {
  await logAuditEvent(userId, AuditAction.USER_CREATED, 'user', createdUserId.toString(), 'New user created', ipAddress, userAgent);
}

export async function logUserUpdated(userId: number, updatedUserId: number, changes: string, ipAddress?: string, userAgent?: string): Promise<void> {
  await logAuditEvent(userId, AuditAction.USER_UPDATED, 'user', updatedUserId.toString(), `User updated: ${changes}`, ipAddress, userAgent);
}

export async function logPasswordChanged(userId: number, targetUserId: number, ipAddress?: string, userAgent?: string): Promise<void> {
  await logAuditEvent(userId, AuditAction.PASSWORD_CHANGED, 'user', targetUserId.toString(), 'Password changed', ipAddress, userAgent);
}