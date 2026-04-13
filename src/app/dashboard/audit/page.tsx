'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Filter, Calendar, User, Activity, History } from 'lucide-react';
import { AuditAction } from '@/lib/audit-types';
import { cn } from '@/lib/utils';

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
    return new Date(dateString).toLocaleString('en-US', {
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
        return 'bg-green-100 text-green-800 border-green-200';
      case 'USER_LOGOUT':
      case 'USER_UPDATED':
      case 'SETTINGS_UPDATED':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'USER_LOCKED':
      case 'USER_DELETED':
      case 'PERMISSION_REVOKED':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6" dir="rtl">
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
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
            <h1 className="text-3xl font-bold tracking-tight">سجلات التدقيق</h1>
            <p className="text-muted-foreground mt-1">مراقبة كافة العمليات الإدارية في النظام لضمان الأمان والشفافية</p>
        </div>
        <Badge variant="outline" className="text-lg px-4 py-1 h-auto font-bold border-primary/20 bg-primary/5">
          {logs.length} سجل متاح
        </Badge>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-xl">
            <Filter className="h-5 w-5 text-primary" />
            تصفية العمليات
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="بحث في التفاصيل أو اسم المستخدم..."
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
                <SelectItem value="all">جميع العمليات</SelectItem>
                {Object.entries(AuditAction).map(([key, value]) => (
                  <SelectItem key={`action-${key}`} value={value}>
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
                <SelectItem value="all">جميع المستخدمين</SelectItem>
                {users.map(user => (
                  <SelectItem key={`user-${user.id || user.username}`} value={(user.id || '').toString()}>
                    {user.username}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {(searchTerm || (selectedAction && selectedAction !== 'all') || (selectedUser && selectedUser !== 'all')) && (
            <Button 
              variant="ghost" 
              className="mt-4 text-primary"
              onClick={() => {
                setSearchTerm('');
                setSelectedAction('');
                setSelectedUser('');
              }}
            >
              <History className="ml-2 h-4 w-4" />
              إعادة تعيين الفلاتر
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Audit Logs */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-xl">
            <Activity className="h-5 w-5 text-primary" />
            النشاطات الحديثة
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px] pl-4">
            <div className="space-y-4">
              {filteredLogs.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
                  لا توجد سجلات مطابقة لمعايير البحث
                </div>
              ) : (
                filteredLogs.map((log) => (
                  <div key={log.id} className="border border-primary/10 rounded-lg p-5 hover:bg-muted/30 transition-all shadow-sm">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <Badge variant="outline" className={cn("px-3 py-1 font-bold border", getActionColor(log.action))}>
                            {actionLabels[log.action] || log.action}
                          </Badge>
                          <span className="text-xs font-semibold px-2 py-0.5 bg-muted rounded-full text-muted-foreground uppercase tracking-wider">
                            {log.resource_type}
                            {log.resource_id && ` #${log.resource_id}`}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-2 mb-2">
                            <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
                                {log.username.charAt(0).toUpperCase()}
                            </div>
                            <p className="font-bold text-lg">
                            {log.first_name && log.last_name 
                                ? `${log.first_name} ${log.last_name}`
                                : log.username
                            }
                            </p>
                        </div>
                        
                        {log.details && (
                          <div className="text-sm bg-background/50 p-3 rounded-md border border-muted-foreground/10 mb-3 leading-relaxed">
                            {log.details}
                          </div>
                        )}
                        
                        <div className="flex items-center gap-6 text-xs text-muted-foreground font-medium">
                          {log.ip_address && (
                            <span className="flex items-center gap-1">
                                <Activity className="h-3 w-3" />
                                IP: {log.ip_address}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDate(log.created_at)}
                          </span>
                        </div>
                      </div>
                      
                      <div className="text-left text-[10px] text-muted-foreground font-mono">
                        UID: {log.user_id}
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
