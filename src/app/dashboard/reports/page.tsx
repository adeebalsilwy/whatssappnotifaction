'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bar, BarChart, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { CalendarIcon, Download, BarChart3, PieChartIcon, TrendingUp, Activity, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ReportData {
  totals?: {
    totalMessages: number;
    statuses: { status: string; count: number }[];
    priorities: { priority: string; count: number }[];
  };
  recentActivity?: { date: string; count: number }[];
  topDestinations?: { to: string; count: number }[];
  statusDetails?: { status: string; count: number; firstOccurrence: string; lastOccurrence: string }[];
  statusTrend?: { date: string; status: string; count: number }[];
  providerStats?: { provider: string; count: number; successRate: number }[];
  timelineData?: { period: string; totalMessages: number; sentMessages: number; failedMessages: number; deliveredMessages: number }[];
  groupBy?: string;
  performanceMetrics?: {
    totalMessages: number;
    sentCount: number;
    deliveredCount: number;
    failedCount: number;
    sendRate: number;
    deliveryRate: number;
    failureRate: number;
  };
  timePerformance?: { hour: string; messageCount: number; sentCount: number; successRate: number }[];
}

export default function ReportsPage() {
  const [reportData, setReportData] = useState<ReportData>({});
  const [loading, setLoading] = useState(true);
  const [reportType, setReportType] = useState('summary');
  const [groupBy, setGroupBy] = useState('day');
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();

  const fetchReport = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        type: reportType
      });
      
      if (dateFrom) params.append('startDate', dateFrom.toISOString().split('T')[0]);
      if (dateTo) params.append('endDate', dateTo.toISOString().split('T')[0]);
      if (reportType === 'timeline') params.append('groupBy', groupBy);
      
      const response = await fetch(`/api/reports?${params}`);
      const data = await response.json();
      
      if (data.success) {
        setReportData(data.data);
      }
    } catch (error) {
      console.error('Error fetching report:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [reportType, groupBy, dateFrom, dateTo]);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  const getStatusColor = (status: string) => {
    const colorMap: Record<string, string> = {
      'SENT': '#10B981',
      'DELIVERED': '#3B82F6',
      'QUEUED': '#6B7280',
      'FAILED': '#EF4444',
      'PENDING': '#F59E0B'
    };
    return colorMap[status] || '#6B7280';
  };

  const getStatusLabel = (status: string) => {
      const labels: Record<string, string> = {
          'SENT': 'تم الإرسال',
          'DELIVERED': 'تم الاستلام',
          'QUEUED': 'في الانتظار',
          'FAILED': 'فشل',
          'PENDING': 'معلق',
          'READ': 'تمت القراءة'
      };
      return labels[status] || status;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">التقارير والتحليلات</h1>
          <p className="text-muted-foreground">
            إحصائيات احترافية لأداء منصة الإشعارات
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="font-bold">
            <Download className="ml-2 h-4 w-4" />
            تصدير التقرير
          </Button>
        </div>
      </div>

      {/* Controls */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-xl">
            <BarChart3 className="h-5 w-5 text-primary" />
            خيارات التقرير
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-bold">نوع التقرير</label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="summary">ملخص عام</SelectItem>
                  <SelectItem value="status">تحليل الحالات</SelectItem>
                  <SelectItem value="provider">أداء المزودين</SelectItem>
                  <SelectItem value="timeline">الجدول الزمني</SelectItem>
                  <SelectItem value="performance">مقاييس الأداء</SelectItem>
                  <SelectItem value="templates">استخدام القوالب</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {reportType === 'timeline' && (
              <div className="space-y-2">
                <label className="text-sm font-bold">تجميع حسب</label>
                <Select value={groupBy} onValueChange={setGroupBy}>
                  <SelectTrigger className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hour">ساعة</SelectItem>
                    <SelectItem value="day">يوم</SelectItem>
                    <SelectItem value="week">أسبوع</SelectItem>
                    <SelectItem value="month">شهر</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            
            <div className="space-y-2">
              <label className="text-sm font-bold">من تاريخ</label>
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
                    {dateFrom ? format(dateFrom, "yyyy-MM-dd") : "اختر تاريخ"}
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
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-bold">إلى تاريخ</label>
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
                    {dateTo ? format(dateTo, "yyyy-MM-dd") : "اختر تاريخ"}
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
        </CardContent>
      </Card>

      {/* Summary Report */}
      {reportType === 'summary' && reportData.totals && (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border-primary/20">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-bold text-muted-foreground">إجمالي الرسائل</CardTitle>
                <Activity className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold" suppressHydrationWarning>{reportData.totals.totalMessages.toLocaleString('en-US')}</div>
              </CardContent>
            </Card>
            
            <Card className="border-primary/20">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-bold text-muted-foreground">نسبة النجاح</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">
                  {reportData.performanceMetrics 
                    ? `${reportData.performanceMetrics.sendRate}%` 
                    : 'N/A'}
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-primary/20">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-bold text-muted-foreground">وجهات نشطة</CardTitle>
                <PieChartIcon className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold" suppressHydrationWarning>
                  {(reportData.topDestinations?.length || 0).toLocaleString('en-US')}
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-primary/20">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-bold text-muted-foreground">المعدل اليومي</CardTitle>
                <BarChart3 className="h-4 w-4 text-purple-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold" suppressHydrationWarning>
                  {(reportData.recentActivity 
                    ? Math.round(reportData.recentActivity.reduce((sum, day) => sum + day.count, 0) / 7)
                    : 0).toLocaleString('en-US')}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>الرسائل حسب الحالة</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] w-full" dir="ltr">
                    <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={reportData.totals.statuses.map(s => ({...s, label: getStatusLabel(s.status)}))}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="label" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="count">
                        {reportData.totals.statuses.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={getStatusColor(entry.status)} />
                        ))}
                        </Bar>
                    </BarChart>
                    </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>النشاط الأخير (آخر 7 أيام)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] w-full" dir="ltr">
                    <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={reportData.recentActivity}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line 
                        type="monotone" 
                        dataKey="count" 
                        stroke="#4DB6AC" 
                        strokeWidth={3}
                        name="عدد الرسائل"
                        dot={{ r: 4 }}
                        activeDot={{ r: 8 }}
                        />
                    </LineChart>
                    </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* Template Report */}
      {reportType === 'templates' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-center font-bold text-muted-foreground">إجمالي القوالب</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <div className="text-4xl font-bold text-primary">44</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-center font-bold text-muted-foreground">إجمالي الإرسال</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <div className="text-4xl font-bold text-green-600">8,942</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-center font-bold text-muted-foreground">متوسط النجاح</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <div className="text-4xl font-bold text-purple-600">97.2%</div>
              </CardContent>
            </Card>
          </div>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-xl">توزيع استخدام القوالب</CardTitle>
                <CardDescription>إحصائيات مفصلة لقوالب بنك عدن الأول</CardDescription>
              </div>
              <FileText className="h-6 w-6 text-primary opacity-20" />
            </CardHeader>
            <CardContent>
              <div className="h-80 w-full" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={[
                      { name: 'account_opening', sent: 1540, delivered: 1530, read: 1480 },
                      { name: 'deposit_notif', sent: 3820, delivered: 3790, read: 3650 },
                      { name: 'withdrawal_notif', sent: 2150, delivered: 2120, read: 2040 },
                      { name: 'arabic_general', sent: 1432, delivered: 1410, read: 1350 }
                    ]}
                    margin={{ top: 5, right: 30, left: 20, bottom: 50 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={60} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="sent" fill="#8884D8" name="تم الإرسال" />
                    <Bar dataKey="delivered" fill="#4DB6AC" name="تم الاستلام" />
                    <Bar dataKey="read" fill="#FFBB28" name="تمت القراءة" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
                <CardTitle>تقرير القوالب التفصيلي</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-md border">
                <table className="w-full text-sm text-right">
                  <thead className="bg-muted/50 border-b">
                    <tr>
                      <th className="p-3">اسم القالب</th>
                      <th className="p-3">المرسلة</th>
                      <th className="p-3">المستلمة</th>
                      <th className="p-3">المقروءة</th>
                      <th className="p-3">نسبة النجاح</th>
                      <th className="p-3">آخر استخدام</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    <tr>
                      <td className="p-3 font-bold">account_opening_notification</td>
                      <td className="p-3">1,540</td>
                      <td className="p-3">1,530</td>
                      <td className="p-3">1,480</td>
                      <td className="p-3"><Badge className="bg-green-100 text-green-800">99.3%</Badge></td>
                      <td className="p-3 text-xs">2026-02-01 09:15</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-bold">deposit_notification</td>
                      <td className="p-3">3,820</td>
                      <td className="p-3">3,790</td>
                      <td className="p-3">3,650</td>
                      <td className="p-3"><Badge className="bg-green-100 text-green-800">99.2%</Badge></td>
                      <td className="p-3 text-xs">2026-02-01 10:30</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-bold">withdrawal_notification</td>
                      <td className="p-3">2,150</td>
                      <td className="p-3">2,120</td>
                      <td className="p-3">2,040</td>
                      <td className="p-3"><Badge className="bg-green-100 text-green-800">98.6%</Badge></td>
                      <td className="p-3 text-xs">2026-02-01 10:22</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}