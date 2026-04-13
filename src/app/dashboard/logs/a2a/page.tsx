'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Search,
  Clock,
  AlertTriangle,
  CheckCircle,
  Download,
  Calendar
} from 'lucide-react';

interface A2ALogEntry {
  timestamp: string;
  action: string;
  status: string;
  message?: string;
  details?: any;
  mode?: string;
  error?: string;
  count?: number;
  processedAt?: string;
}

export default function A2ALogsPage() {
  const [logs, setLogs] = useState<A2ALogEntry[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<A2ALogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: '',
    action: '',
    mode: '',
    search: ''
  });

  // Load A2A logs
  const loadLogs = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        limit: '100',
        offset: '0',
        ...filters
      });
      
      const response = await fetch(`/api/a2a/logs?${params}`, {
        cache: 'no-store'
      });
      const data = await response.json();
      setLogs(data.data || []);
      setFilteredLogs(data.data || []);
    } catch (error) {
      console.error('Error fetching A2A logs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Apply filters
  const applyFilters = () => {
    let result = [...logs];
    
    if (filters.status) {
      result = result.filter(log => log.status.toLowerCase().includes(filters.status.toLowerCase()));
    }
    
    if (filters.action) {
      result = result.filter(log => log.action.toLowerCase().includes(filters.action.toLowerCase()));
    }
    
    if (filters.mode) {
      result = result.filter(log => log.mode?.toLowerCase().includes(filters.mode.toLowerCase()));
    }
    
    if (filters.search) {
      result = result.filter(log => 
        log.message?.toLowerCase().includes(filters.search.toLowerCase()) ||
        log.error?.toLowerCase().includes(filters.search.toLowerCase()) ||
        log.action.toLowerCase().includes(filters.search.toLowerCase())
      );
    }
    
    setFilteredLogs(result);
  };

  // Reset filters
  const resetFilters = () => {
    setFilters({
      status: '',
      action: '',
      mode: '',
      search: ''
    });
    setFilteredLogs(logs);
  };

  // Initial load
  useEffect(() => {
    loadLogs();
  }, []);

  // Apply filters when they change
  useEffect(() => {
    applyFilters();
  }, [filters, logs]);

  // Status badge variant
  const getStatusVariant = (status: string) => {
    if (status.toLowerCase().includes('success') || status.toLowerCase().includes('sent')) {
      return 'default';
    } else if (status.toLowerCase().includes('error') || status.toLowerCase().includes('failed')) {
      return 'destructive';
    } else {
      return 'secondary';
    }
  };

  // Action badge variant
  const getActionVariant = (action: string) => {
    if (action.toLowerCase().includes('fetch') || action.toLowerCase().includes('process')) {
      return 'default';
    } else if (action.toLowerCase().includes('error')) {
      return 'destructive';
    } else {
      return 'secondary';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">A2A سجلات النظام</h1>
          <p className="text-muted-foreground">
            متابعة وتحليل سجلات استقبال واستعلام A2A
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 ml-2" />
            تصدير
          </Button>
          <Button variant="outline" size="sm" onClick={loadLogs}>
            <Search className="h-4 w-4 ml-2" />
            تحديث
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>المرشحات</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="status">الحالة</Label>
              <Input
                id="status"
                placeholder="البحث حسب الحالة..."
                value={filters.status}
                onChange={(e) => setFilters({...filters, status: e.target.value})}
              />
            </div>
            <div>
              <Label htmlFor="action">الحدث</Label>
              <Input
                id="action"
                placeholder="البحث حسب الحدث..."
                value={filters.action}
                onChange={(e) => setFilters({...filters, action: e.target.value})}
              />
            </div>
            <div>
              <Label htmlFor="mode">الوضع</Label>
              <Input
                id="mode"
                placeholder="البحث حسب الوضع..."
                value={filters.mode}
                onChange={(e) => setFilters({...filters, mode: e.target.value})}
              />
            </div>
            <div>
              <Label htmlFor="search">بحث</Label>
              <Input
                id="search"
                placeholder="البحث في السجل..."
                value={filters.search}
                onChange={(e) => setFilters({...filters, search: e.target.value})}
              />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <Button onClick={applyFilters}>تطبيق</Button>
            <Button variant="outline" onClick={resetFilters}>إعادة تعيين</Button>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">إجمالي السجلات</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredLogs.length}</div>
            <p className="text-xs text-muted-foreground">جميع السجلات</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">الناجحة</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {filteredLogs.filter(l => l.status.toLowerCase().includes('success')).length}
            </div>
            <p className="text-xs text-muted-foreground">العمليات الناجحة</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">الأخطاء</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {filteredLogs.filter(l => l.status.toLowerCase().includes('error')).length}
            </div>
            <p className="text-xs text-muted-foreground">الأخطاء فقط</p>
          </CardContent>
        </Card>
      </div>

      {/* Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle>سجلات A2A</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الوقت</TableHead>
                  <TableHead>الحدث</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>الوضع</TableHead>
                  <TableHead>التفاصيل</TableHead>
                  <TableHead>عدد العناصر</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      جاري تحميل السجلات...
                    </TableCell>
                  </TableRow>
                ) : filteredLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      لا توجد سجلات مطابقة للمرشحات
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLogs.map((log, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-mono text-sm">
                        {new Date(log.timestamp).toLocaleString('ar-EG')}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getActionVariant(log.action)}>
                          {log.action}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusVariant(log.status)}>
                          {log.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {log.mode ? (
                          <Badge variant={log.mode === 'live' ? 'default' : 'secondary'}>
                            {log.mode}
                          </Badge>
                        ) : (
                          <Badge variant="outline">-</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {log.error ? (
                          <div className="text-red-600 max-w-xs truncate" title={log.error}>
                            خطأ: {log.error.substring(0, 50)}...
                          </div>
                        ) : log.message ? (
                          <div className="max-w-xs truncate" title={log.message}>
                            {log.message.substring(0, 50)}...
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {log.count !== undefined ? (
                          <Badge variant="outline">{log.count}</Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}