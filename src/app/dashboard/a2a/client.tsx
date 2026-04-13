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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  PlayCircle, 
  PauseCircle, 
  RefreshCw, 
  Search,
  Phone,
  MessageSquare,
  Clock,
  Settings,
  Eye,
  Send
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface A2AMessage {
  transId: string;
  mobileNo: string;
  message: string;
  priority: string;
  selectedProvider: string;
  status: string;
  providerMessageId: string | null;
  createdAt: string;
  lastError: string | null;
}

export default function A2ADashboardClient() {
  const [a2aMessages, setA2aMessages] = useState<A2AMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pollingActive, setPollingActive] = useState(false);
  const [pollingInterval, setPollingInterval] = useState(30000); // 30 seconds
  const [a2aMode, setA2aMode] = useState<'live' | 'test'>('live');
  const [filters, setFilters] = useState({
    status: '',
    mobileNo: '',
    dateFrom: '',
    dateTo: ''
  });

  // Load A2A messages
  const loadMessages = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        limit: '50',
        offset: '0',
        ...filters
      });
      
      const response = await fetch(`/api/a2a?${params}`, {
        cache: 'no-store'
      });
      const data = await response.json();
      setA2aMessages(data.data || []);
    } catch (error) {
      console.error('Error fetching A2A messages:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle manual refresh
  const handleRefresh = () => {
    loadMessages();
  };

  // Toggle polling
  const togglePolling = async () => {
    if (pollingActive) {
      // Stop polling
      try {
        await fetch('/api/a2a', {
          method: 'DELETE'
        });
        setPollingActive(false);
      } catch (error) {
        console.error('Error stopping polling:', error);
      }
    } else {
      // Start polling
      try {
        const response = await fetch('/api/a2a', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ intervalMs: pollingInterval, mode: a2aMode })
        });
        
        if (response.ok) {
          setPollingActive(true);
        }
      } catch (error) {
        console.error('Error starting polling:', error);
      }
    }
  };

  // Trigger immediate fetch
  const triggerImmediateFetch = async () => {
    try {
      const response = await fetch('/api/a2a', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ mode: a2aMode })
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log(`Fetched ${result.count} messages (mode: ${result.mode || a2aMode})`);
        loadMessages(); // Reload the messages list
      }
    } catch (error) {
      console.error('Error triggering immediate fetch:', error);
    }
  };

  // Apply filters
  const applyFilters = () => {
    loadMessages();
  };

  // Reset filters
  const resetFilters = () => {
    setFilters({
      status: '',
      mobileNo: '',
      dateFrom: '',
      dateTo: ''
    });
    loadMessages();
  };

  // Initial load
  useEffect(() => {
    loadMessages();
  }, []);

  // Stats calculations
  const stats = {
    total: a2aMessages.length,
    received: a2aMessages.filter(m => m.status === 'RECEIVED').length,
    sent: a2aMessages.filter(m => m.status === 'SENT').length,
    uniqueNumbers: [...new Set(a2aMessages.map(m => m.mobileNo))].length
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">A2A الرسائل</h1>
          <p className="text-muted-foreground">
            متابعة وتحديثات الرسائل من نظام A2A
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ml-2 ${isLoading ? 'animate-spin' : ''}`} />
            {isLoading ? 'جاري التحميل...' : 'تحديث'}
          </Button>
          <Button 
            size="sm" 
            onClick={triggerImmediateFetch}
            disabled={isLoading}
          >
            <Send className="h-4 w-4 ml-2" />
            جلب فوري
          </Button>
          <Button 
            size="sm" 
            onClick={togglePolling}
            variant={pollingActive ? "destructive" : "default"}
          >
            {pollingActive ? (
              <>
                <PauseCircle className="h-4 w-4 ml-2" />
                إيقاف المراقبة
              </>
            ) : (
              <>
                <PlayCircle className="h-4 w-4 ml-2" />
                بدء المراقبة
              </>
            )}
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
              <Label htmlFor="mobileNo">رقم الجوال</Label>
              <Input
                id="mobileNo"
                placeholder="البحث حسب الرقم..."
                value={filters.mobileNo}
                onChange={(e) => setFilters({...filters, mobileNo: e.target.value})}
              />
            </div>
            <div>
              <Label htmlFor="status">الحالة</Label>
              <select
                id="status"
                className="w-full p-2 border rounded"
                value={filters.status}
                onChange={(e) => setFilters({...filters, status: e.target.value})}
              >
                <option value="">جميع الحالات</option>
                <option value="RECEIVED">جديدة</option>
                <option value="SENT">مرسلة</option>
                <option value="FAILED">فشل</option>
              </select>
            </div>
            <div>
              <Label htmlFor="dateFrom">من تاريخ</Label>
              <Input
                id="dateFrom"
                type="date"
                value={filters.dateFrom}
                onChange={(e) => setFilters({...filters, dateFrom: e.target.value})}
              />
            </div>
            <div>
              <Label htmlFor="dateTo">إلى تاريخ</Label>
              <Input
                id="dateTo"
                type="date"
                value={filters.dateTo}
                onChange={(e) => setFilters({...filters, dateTo: e.target.value})}
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">إجمالي الرسائل</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">جميع الرسائل</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">الجديدة</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.received}</div>
            <p className="text-xs text-muted-foreground">الرسائل الجديدة</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">المُرسلة</CardTitle>
            <Phone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.sent}</div>
            <p className="text-xs text-muted-foreground">الرسائل المرسلة</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">الأرقام</CardTitle>
            <Search className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.uniqueNumbers}</div>
            <p className="text-xs text-muted-foreground">أرقام فريدة</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="recent" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="recent">الرسائل الحديثة</TabsTrigger>
          <TabsTrigger value="monitoring">نظام المراقبة</TabsTrigger>
          <TabsTrigger value="settings">الإعدادات</TabsTrigger>
        </TabsList>
        
        <TabsContent value="recent" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>آخر الرسائل من A2A</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>الرقم</TableHead>
                      <TableHead>الرسالة</TableHead>
                      <TableHead>الحالة</TableHead>
                      <TableHead>الوقت</TableHead>
                      <TableHead>المصدر</TableHead>
                      <TableHead>الإجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {a2aMessages.slice(0, 10).map((message, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">
                          {message.mobileNo || 'N/A'}
                        </TableCell>
                        <TableCell>
                          <div className="max-w-xs truncate" title={message.message}>
                            {message.message?.substring(0, 50)}...
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={
                              message.status === 'SENT' ? 'default' : 
                              message.status === 'RECEIVED' ? 'secondary' : 
                              'destructive'
                            }
                          >
                            {message.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(message.createdAt).toLocaleString('ar-EG')}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">A2A</Badge>
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="monitoring" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>نظام مراقبة A2A</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">حالة المراقبة</h3>
                    <p className="text-sm text-muted-foreground">
                      المراقبة الآلية للحصول على الرسائل من نظام A2A
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setPollingInterval(prev => prev + 10000)}
                      disabled={pollingActive}
                    >
                      +
                    </Button>
                    <span>{pollingInterval / 1000} ثانية</span>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setPollingInterval(prev => Math.max(5000, prev - 10000))}
                      disabled={pollingActive}
                    >
                      -
                    </Button>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">الإعدادات</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex justify-between">
                        <span>الفاصل الزمني:</span>
                        <span>{pollingInterval / 1000} ثانية</span>
                      </div>
                      <div className="flex justify-between">
                        <span>عدد المحاولات:</span>
                        <span>3</span>
                      </div>
                      <div className="flex justify-between">
                        <span>وقت الانتظار:</span>
                        <span>5 ثوانٍ</span>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">الحالة الحالية</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex justify-between">
                        <span>الحالة:</span>
                        <Badge variant={pollingActive ? "default" : "secondary"}>
                          {pollingActive ? 'نشطة' : 'غير نشطة'}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>آخر تحديث:</span>
                        <span>الآن</span>
                      </div>
                      <div className="flex justify-between">
                        <span>الرسائل المُستلمة:</span>
                        <span>{stats.total}</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
                
                <div className="flex gap-2">
                  <Button 
                    onClick={togglePolling}
                    variant={pollingActive ? "destructive" : "default"}
                  >
                    {pollingActive ? (
                      <>
                        <PauseCircle className="h-4 w-4 ml-2" />
                        إيقاف المراقبة
                      </>
                    ) : (
                      <>
                        <PlayCircle className="h-4 w-4 ml-2" />
                        بدء المراقبة
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>إعدادات A2A</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <Label className="text-sm font-medium">وضع التشغيل</Label>
                  <select
                    className="w-full p-2 border rounded mt-1"
                    value={a2aMode}
                    onChange={(e) => setA2aMode(e.target.value as 'live' | 'test')}
                  >
                    <option value="live">البيئة الحية (Live)</option>
                    <option value="test">بيئة الاختبار (Test)</option>
                  </select>
                  <p className="text-xs text-muted-foreground mt-1">
                    حدد الوضع الذي سيتم استخدامه لجلب الرسائل
                  </p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">مخدم A2A (Live)</Label>
                    <Input 
                      type="text" 
                      className="w-full" 
                      placeholder="A2A-SMS-CONNECTOR.mepspay.com"
                      defaultValue="A2A-SMS-CONNECTOR.mepspay.com"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">مخدم A2A (Test)</Label>
                    <Input 
                      type="text" 
                      className="w-full" 
                      placeholder="172.125.65.7"
                      defaultValue="172.125.65.7"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">منفذ A2A (Live)</Label>
                    <Input 
                      type="text" 
                      className="w-full" 
                      placeholder="9312"
                      defaultValue="9312"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">منفذ A2A (Test)</Label>
                    <Input 
                      type="text" 
                      className="w-full" 
                      placeholder="8086"
                      defaultValue="8086"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">رمز البنك (Live)</Label>
                    <Input 
                      type="text" 
                      className="w-full" 
                      placeholder="1030200"
                      defaultValue="1030200"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">رمز البنك (Test)</Label>
                    <Input 
                      type="text" 
                      className="w-full" 
                      placeholder="1029420"
                      defaultValue="1029420"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-sm font-medium">مخدم SMS (مشترك)</Label>
                  <Input 
                    type="text" 
                    className="w-full" 
                    placeholder="10.220.172.100"
                    defaultValue="10.220.172.100"
                  />
                </div>
                
                <div className="flex gap-2 pt-4">
                  <Button>حفظ الإعدادات</Button>
                  <Button variant="outline" onClick={() => {
                    // Switch mode
                    setA2aMode(a2aMode === 'live' ? 'test' : 'live');
                  }}>
                    تبديل إلى {a2aMode === 'live' ? 'الاختبار' : 'الحية'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}