'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { CalendarIcon, PlusCircle, Search, Filter, Download, Eye, Edit, Trash2, Send, History } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

interface Message {
  id: number;
  referenceId: string;
  sender: string;
  to: string;
  message: string;
  status: string;
  providerMessageId: string;
  priority: string;
  metadata: string;
  createdAt: string;
  updatedAt: string;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function MessagesPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  });
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  
  // Form states
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newMessage, setNewMessage] = useState({
    to: '',
    message: '',
    priority: 'normal'
  });
  
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);

  // Fetch messages
  const fetchMessages = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString()
      });
      
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (priorityFilter !== 'all') params.append('priority', priorityFilter);
      if (searchTerm) params.append('phoneNumber', searchTerm);
      if (dateFrom) params.append('startDate', dateFrom.toISOString().split('T')[0]);
      if (dateTo) params.append('endDate', dateTo.toISOString().split('T')[0]);
      
      const response = await fetch(`/api/messages?${params}`);
      const data = await response.json();
      
      if (data.success) {
        setMessages(data.data);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle create message
  const handleCreateMessage = async () => {
    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMessage)
      });
      
      const data = await response.json();
      if (data.success) {
        setIsCreateDialogOpen(false);
        setNewMessage({ to: '', message: '', priority: 'normal' });
        toast({ title: 'تم الإرسال', description: 'تم إنشاء الرسالة بنجاح' });
        fetchMessages();
      }
    } catch (error) {
      toast({ title: 'خطأ', description: 'فشل إنشاء الرسالة', variant: 'destructive' });
    }
  };

  // Handle update message
  const handleUpdateMessage = async () => {
    if (!editingMessage) return;
    
    try {
      const response = await fetch(`/api/messages/${editingMessage.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: editingMessage.status,
          priority: editingMessage.priority
        })
      });
      
      const data = await response.json();
      if (data.success) {
        setIsEditDialogOpen(false);
        setEditingMessage(null);
        toast({ title: 'تم التحديث', description: 'تم تحديث حالة الرسالة' });
        fetchMessages();
      }
    } catch (error) {
        toast({ title: 'خطأ', description: 'فشل التحديث', variant: 'destructive' });
    }
  };

  // Handle delete message
  const handleDeleteMessage = async (id: number) => {
    if (!confirm('هل أنت متأكد من حذف هذه الرسالة من السجل؟')) return;
    
    try {
      const response = await fetch(`/api/messages/${id}`, {
        method: 'DELETE'
      });
      
      const data = await response.json();
      if (data.success) {
        toast({ title: 'تم الحذف', description: 'تم حذف السجل بنجاح' });
        fetchMessages();
      }
    } catch (error) {
        toast({ title: 'خطأ', description: 'فشل الحذف', variant: 'destructive' });
    }
  };

  // Effect to fetch messages when filters change
  useEffect(() => {
    fetchMessages();
  }, [pagination.page, statusFilter, priorityFilter, searchTerm, dateFrom, dateTo]);

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline', label: string }> = {
      'QUEUED': { variant: 'secondary', label: 'في الانتظار' },
      'SENT': { variant: 'default', label: 'تم الإرسال' },
      'DELIVERED': { variant: 'default', label: 'تم الاستلام' },
      'READ': { variant: 'default', label: 'تمت القراءة' },
      'FAILED': { variant: 'destructive', label: 'فشل' },
      'PENDING': { variant: 'outline', label: 'معلق' }
    };
    
    const statusInfo = statusMap[status] || { variant: 'secondary', label: status };
    return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>;
  };

  const getPriorityBadge = (priority: string) => {
    const priorityMap: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline', label: string }> = {
      'high': { variant: 'destructive', label: 'عالية' },
      'normal': { variant: 'default', label: 'عادية' },
      'low': { variant: 'secondary', label: 'منخفضة' }
    };
    
    const priorityInfo = priorityMap[priority] || { variant: 'default', label: priority };
    return <Badge variant={priorityInfo.variant}>{priorityInfo.label}</Badge>;
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">إدارة الرسائل</h1>
          <p className="text-muted-foreground">
            تتبع ومراقبة جميع الرسائل الصادرة والواردة عبر النظام
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="font-bold">
              <PlusCircle className="ml-2 h-4 w-4" />
              إرسال رسالة يدوية
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>إنشاء رسالة جديدة</DialogTitle>
              <DialogDescription>
                إرسال إشعار واتساب يدوي لعملاء البنك
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="to" className="text-right">
                  رقم الهاتف
                </Label>
                <Input
                  id="to"
                  value={newMessage.to}
                  onChange={(e) => setNewMessage({...newMessage, to: e.target.value})}
                  className="col-span-3"
                  placeholder="967774577134"
                  dir="ltr"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="message" className="text-right">
                  محتوى الرسالة
                </Label>
                <textarea
                  id="message"
                  value={newMessage.message}
                  onChange={(e) => setNewMessage({...newMessage, message: e.target.value})}
                  className="col-span-3 min-h-[120px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="اكتب نص الرسالة هنا..."
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="priority" className="text-right">
                  الأولوية
                </Label>
                <Select value={newMessage.priority} onValueChange={(value) => setNewMessage({...newMessage, priority: value})}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">منخفضة</SelectItem>
                    <SelectItem value="normal">عادية</SelectItem>
                    <SelectItem value="high">عالية</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleCreateMessage} className="w-full">إرسال الآن</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-xl">
            <Filter className="h-5 w-5 text-primary" />
            تصفية السجلات
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>رقم الهاتف</Label>
              <div className="relative">
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="بحث بالرقم..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pr-10"
                    dir="ltr"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>الحالة</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="كل الحالات" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">كل الحالات</SelectItem>
                  <SelectItem value="SENT">تم الإرسال</SelectItem>
                  <SelectItem value="DELIVERED">تم الاستلام</SelectItem>
                  <SelectItem value="FAILED">فشل</SelectItem>
                  <SelectItem value="PENDING">معلق</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>الأولوية</Label>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="كل الأولويات" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">كل الأولويات</SelectItem>
                  <SelectItem value="high">عالية</SelectItem>
                  <SelectItem value="normal">عادية</SelectItem>
                  <SelectItem value="low">منخفضة</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>نطاق التاريخ</Label>
              <div className="flex gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-right font-normal h-10",
                        !dateFrom && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="ml-2 h-4 w-4" />
                      {dateFrom ? format(dateFrom, "yyyy-MM-dd") : "من"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dateFrom}
                      onSelect={setDateFrom}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-right font-normal h-10",
                        !dateTo && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="ml-2 h-4 w-4" />
                      {dateTo ? format(dateTo, "yyyy-MM-dd") : "إلى"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dateTo}
                      onSelect={setDateTo}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Messages Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>الرسائل المرسلة</CardTitle>
            <CardDescription>
              عرض {(pagination.page - 1) * pagination.limit + 1} إلى {Math.min(pagination.page * pagination.limit, pagination.total)} من إجمالي {pagination.total} رسالة
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={fetchMessages}>
            <History className="ml-2 h-4 w-4" />
            تحديث القائمة
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <>
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead className="w-16">ID</TableHead>
                      <TableHead>المستلم</TableHead>
                      <TableHead className="w-1/3">الرسالة</TableHead>
                      <TableHead>الحالة</TableHead>
                      <TableHead>الأولوية</TableHead>
                      <TableHead>التاريخ</TableHead>
                      <TableHead className="text-left">الإجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {messages.map((message) => (
                      <TableRow key={message.id} className="hover:bg-muted/30">
                        <TableCell className="font-mono text-xs">{message.id}</TableCell>
                        <TableCell dir="ltr" className="text-right font-medium">{message.to}</TableCell>
                        <TableCell className="max-w-xs truncate text-sm">
                          {message.message}
                        </TableCell>
                        <TableCell>{getStatusBadge(message.status)}</TableCell>
                        <TableCell>{getPriorityBadge(message.priority)}</TableCell>
                        <TableCell className="text-xs whitespace-nowrap">
                            {format(new Date(message.createdAt), 'yyyy/MM/dd HH:mm', { locale: ar })}
                        </TableCell>
                        <TableCell className="text-left">
                          <div className="flex justify-start gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8"
                                onClick={() => {
                                    setEditingMessage(message);
                                    setIsEditDialogOpen(true);
                                }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 text-destructive hover:bg-destructive/10"
                                onClick={() => handleDeleteMessage(message.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              
              {/* Pagination */}
              <div className="mt-6">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious 
                        href="#" 
                        onClick={(e) => {
                          e.preventDefault();
                          if (pagination.page > 1) {
                            setPagination({...pagination, page: pagination.page - 1});
                          }
                        }}
                      />
                    </PaginationItem>
                    
                    {[...Array(Math.min(5, pagination.totalPages))].map((_, i) => {
                      const pageNum = i + 1;
                      return (
                        <PaginationItem key={pageNum}>
                          <PaginationLink 
                            href="#" 
                            isActive={pagination.page === pageNum}
                            onClick={(e) => {
                              e.preventDefault();
                              setPagination({...pagination, page: pageNum});
                            }}
                          >
                            {pageNum}
                          </PaginationLink>
                        </PaginationItem>
                      );
                    })}
                    
                    {pagination.totalPages > 5 && (
                      <PaginationItem>
                        <PaginationEllipsis />
                      </PaginationItem>
                    )}
                    
                    <PaginationItem>
                      <PaginationNext 
                        href="#" 
                        onClick={(e) => {
                          e.preventDefault();
                          if (pagination.page < pagination.totalPages) {
                            setPagination({...pagination, page: pagination.page + 1});
                          }
                        }}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>تعديل حالة الرسالة</DialogTitle>
            <DialogDescription>
              تعديل خصائص الرسالة المسجلة يدوياً
            </DialogDescription>
          </DialogHeader>
          {editingMessage && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-status" className="text-right">
                  الحالة
                </Label>
                <Select 
                  value={editingMessage.status} 
                  onValueChange={(value) => setEditingMessage({...editingMessage, status: value})}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="QUEUED">في الانتظار</SelectItem>
                    <SelectItem value="SENT">تم الإرسال</SelectItem>
                    <SelectItem value="DELIVERED">تم الاستلام</SelectItem>
                    <SelectItem value="FAILED">فشل</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-priority" className="text-right">
                  الأولوية
                </Label>
                <Select 
                  value={editingMessage.priority} 
                  onValueChange={(value) => setEditingMessage({...editingMessage, priority: value})}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">منخفضة</SelectItem>
                    <SelectItem value="normal">عادية</SelectItem>
                    <SelectItem value="high">عالية</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={handleUpdateMessage} className="w-full">حفظ التغييرات</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}