'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Filter, Calendar, User, Activity } from 'lucide-react';
import { AuditAction } from '@/lib/audit-types';

interface AuditLog {
  id: number;
  user_id: number;
  action: string;
  resource_type: string;
  resource_id?: string;
  details?: string;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
  username: string;
  first_name?: string;
  last_name?: string;
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAction, setSelectedAction] = useState<string>('');
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [users, setUsers] = useState<Array<{id: number, username: string}>>([]);
  
  const actionLabels: Record<string, string> = {
    'USER_LOGIN': 'تسجيل دخول',
    'USER_LOGOUT': 'تسجيل خروج',
    'USER_CREATED': 'إنشاء مستخدم',
    'USER_UPDATED': 'تحديث مستخدم',
    'USER_DELETED': 'حذف مستخدم',
    'USER_LOCKED': 'قفل حساب',
    'USER_UNLOCKED': 'فتح حساب',
    'PASSWORD_CHANGED': 'تغيير كلمة مرور',
    'PERMISSION_GRANTED': 'منح صلاحية',
    'PERMISSION_REVOKED': 'سحب صلاحية',
    'ROLE_ASSIGNED': 'تعيين دور',
    'ROLE_CHANGED': 'تغيير دور',
    'SETTINGS_UPDATED': 'تحديث الإعدادات',
    'MESSAGE_SENT': 'إرسال رسالة',
    'TEMPLATE_CREATED': 'إنشاء قالب',
    'TEMPLATE_UPDATED': 'تحديث قالب',
    'PROVIDER_CONFIGURED': 'إعداد مزود'
  };

  useEffect(() => {
    fetchLogs();
    fetchUsers();
  }, []);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/audit');
      const result = await response.json();
      
      if (result.success) {
        setLogs(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users');
      const result = await response.json();
      
      if (result.success) {
        setUsers(result.data.map((user: any) => ({
          id: user.id,
          username: user.username
        })));
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  };

  const filteredLogs = logs.filter(log => {
    const matchesSearch = searchTerm === '' || 
      log.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.details && log.details.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesAction = selectedAction === '' || log.action === selectedAction;
    const matchesUser = selectedUser === '' || log.user_id.toString() === selectedUser;
    
    return matchesSearch && matchesAction && matchesUser;
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ar-SA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'USER_LOGIN':
      case 'USER_CREATED':
      case 'PERMISSION_GRANTED':
        return 'bg-green-100 text-green-800';
      case 'USER_LOGOUT':
      case 'USER_UPDATED':
      case 'SETTINGS_UPDATED':
        return 'bg-blue-100 text-blue-800';
      case 'USER_LOCKED':
      case 'USER_DELETED':
      case 'PERMISSION_REVOKED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">سجلات التدقيق</h1>
        </div>
        
        <div className="grid gap-4">
          {[...Array(10)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="space-y-3">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">سجلات التدقيق</h1>
        <Badge variant="secondary">
          {logs.length} سجل
        </Badge>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            عوامل التصفية
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="بحث في السجلات..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-10"
              />
            </div>
            
            <Select value={selectedAction} onValueChange={setSelectedAction}>
              <SelectTrigger>
                <SelectValue placeholder="اختر نوع العملية" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">جميع العمليات</SelectItem>
                {Object.entries(AuditAction).map(([key, value]) => (
                  <SelectItem key={key} value={value}>
                    {actionLabels[value] || value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={selectedUser} onValueChange={setSelectedUser}>
              <SelectTrigger>
                <SelectValue placeholder="اختر المستخدم" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">جميع المستخدمين</SelectItem>
                {users.map(user => (
                  <SelectItem key={user.id} value={user.id.toString()}>
                    {user.username}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {(searchTerm || selectedAction || selectedUser) && (
            <Button 
              variant="outline" 
              className="mt-4"
              onClick={() => {
                setSearchTerm('');
                setSelectedAction('');
                setSelectedUser('');
              }}
            >
              مسح الفلاتر
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Audit Logs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            السجلات الحديثة
          </CardTitle>
          <CardDescription>
            قائمة بجميع الأنشطة المسجلة في النظام
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px] pr-4">
            <div className="space-y-4">
              {filteredLogs.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  لا توجد سجلات مطابقة للبحث
                </div>
              ) : (
                filteredLogs.map((log) => (
                  <div key={log.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className={getActionColor(log.action)}>
                            {actionLabels[log.action] || log.action}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {log.resource_type}
                            {log.resource_id && ` #${log.resource_id}`}
                          </span>
                        </div>
                        
                        <p className="font-medium">
                          {log.first_name && log.last_name 
                            ? `${log.first_name} ${log.last_name}`
                            : log.username
                          }
                        </p>
                        
                        {log.details && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {log.details}
                          </p>
                        )}
                        
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          {log.ip_address && (
                            <span>IP: {log.ip_address}</span>
                          )}
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDate(log.created_at)}
                          </span>
                        </div>
                      </div>
                      
                      <div className="text-right text-xs text-muted-foreground">
                        <div>المستخدم #{log.user_id}</div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}