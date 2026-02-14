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
import { CalendarIcon, Download, BarChart3, PieChartIcon, TrendingUp, Activity } from 'lucide-react';
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

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reports & Analytics</h1>
          <p className="text-muted-foreground">
            Professional insights and analytics for your messaging platform
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Report Controls
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Report Type</label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="summary">Summary Overview</SelectItem>
                  <SelectItem value="status">Status Analysis</SelectItem>
                  <SelectItem value="provider">Provider Performance</SelectItem>
                  <SelectItem value="timeline">Timeline Analysis</SelectItem>
                  <SelectItem value="performance">Performance Metrics</SelectItem>
                  <SelectItem value="templates">Template Usage</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {reportType === 'timeline' && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Group By</label>
                <Select value={groupBy} onValueChange={setGroupBy}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hour">Hour</SelectItem>
                    <SelectItem value="day">Day</SelectItem>
                    <SelectItem value="week">Week</SelectItem>
                    <SelectItem value="month">Month</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Start Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dateFrom && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateFrom ? format(dateFrom, "PPP") : "From"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
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
              <label className="text-sm font-medium">End Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dateTo && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateTo ? format(dateTo, "PPP") : "To"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
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
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Messages</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{reportData.totals.totalMessages.toLocaleString()}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {reportData.performanceMetrics 
                    ? `${reportData.performanceMetrics.sendRate}%` 
                    : 'N/A'}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Destinations</CardTitle>
                <PieChartIcon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {reportData.topDestinations?.length || 0}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Daily Volume</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {reportData.recentActivity 
                    ? Math.round(reportData.recentActivity.reduce((sum, day) => sum + day.count, 0) / 7)
                    : 0}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Messages by Status</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={reportData.totals.statuses}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="status" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count">
                      {reportData.totals.statuses.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={getStatusColor(entry.status)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity (Last 7 Days)</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={reportData.recentActivity}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="count" 
                      stroke="#8884d8" 
                      strokeWidth={2}
                      name="Messages"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Top Destinations */}
          <Card>
            <CardHeader>
              <CardTitle>Top Destinations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {reportData.topDestinations?.slice(0, 10).map((dest, index) => (
                  <div key={dest.to} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                        {index + 1}
                      </div>
                      <span className="font-medium">{dest.to}</span>
                    </div>
                    <Badge variant="secondary">{dest.count} messages</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Status Report */}
      {reportType === 'status' && reportData.statusDetails && (
        <Card>
          <CardHeader>
            <CardTitle>Status Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {reportData.statusDetails.map((status) => (
                <div key={status.status} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <div className="font-medium">{status.status}</div>
                    <div className="text-sm text-muted-foreground">
                      First: {format(new Date(status.firstOccurrence), 'MMM dd, yyyy')}
                      <br />
                      Last: {format(new Date(status.lastOccurrence), 'MMM dd, yyyy')}
                    </div>
                  </div>
                  <Badge 
                    variant={status.status === 'FAILED' ? 'destructive' : 'secondary'}
                    className="text-lg px-4 py-2"
                  >
                    {status.count}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Provider Report */}
      {reportType === 'provider' && reportData.providerStats && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Provider Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={reportData.providerStats}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="count"
                    nameKey="provider"
                    label={({ provider, percent }) => `${provider} ${(percent * 100).toFixed(0)}%`}
                  >
                    {reportData.providerStats.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Provider Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {reportData.providerStats.map((provider) => (
                  <div key={provider.provider} className="space-y-2">
                    <div className="flex justify-between">
                      <span className="font-medium">{provider.provider}</span>
                      <span className="text-sm text-muted-foreground">
                        Success: {provider.successRate.toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-2">
                      <div 
                        className="bg-primary h-2 rounded-full" 
                        style={{ width: `${provider.successRate}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Timeline Report */}
      {reportType === 'timeline' && reportData.timelineData && (
        <Card>
          <CardHeader>
            <CardTitle>Message Timeline</CardTitle>
            <CardDescription>Grouped by {reportData.groupBy}</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={reportData.timelineData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="sentMessages" stackId="a" fill="#10B981" name="Sent" />
                <Bar dataKey="deliveredMessages" stackId="a" fill="#3B82F6" name="Delivered" />
                <Bar dataKey="failedMessages" stackId="a" fill="#EF4444" name="Failed" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Performance Report */}
      {reportType === 'performance' && reportData.performanceMetrics && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-center">Delivery Rate</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <div className="text-4xl font-bold text-green-600">
                  {reportData.performanceMetrics.deliveryRate}%
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-center">Failure Rate</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <div className="text-4xl font-bold text-red-600">
                  {reportData.performanceMetrics.failureRate}%
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-center">Send Success Rate</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <div className="text-4xl font-bold text-blue-600">
                  {reportData.performanceMetrics.sendRate}%
                </div>
              </CardContent>
            </Card>
          </div>
          
          {reportData.timePerformance && (
            <Card>
              <CardHeader>
                <CardTitle>Performance by Hour</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={reportData.timePerformance}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="hour" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip />
                    <Legend />
                    <Line 
                      yAxisId="left"
                      type="monotone" 
                      dataKey="messageCount" 
                      stroke="#8884d8" 
                      strokeWidth={2}
                      name="Total Messages"
                    />
                    <Line 
                      yAxisId="right"
                      type="monotone" 
                      dataKey="successRate" 
                      stroke="#10B981" 
                      strokeWidth={2}
                      name="Success Rate %"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Template Report */}
      {reportType === 'templates' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-center">Total Templates</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <div className="text-4xl font-bold text-blue-600">3</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-center">Total Sent</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <div className="text-4xl font-bold text-green-600">5,575</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-center">Avg Success Rate</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <div className="text-4xl font-bold text-purple-600">95.6%</div>
              </CardContent>
            </Card>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>Template Usage Overview</CardTitle>
              <CardDescription>Statistics for Arabic WhatsApp banking templates</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={[
                      { name: 'account_opening', sent: 1250, delivered: 1240, read: 1200 },
                      { name: 'deposit_notif', sent: 2450, delivered: 2420, read: 2350 },
                      { name: 'withdrawal_notif', sent: 1875, delivered: 1850, read: 1780 }
                    ]}
                    margin={{
                      top: 5,
                      right: 30,
                      left: 20,
                      bottom: 50,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={60} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="sent" fill="#8884d8" name="Sent" />
                    <Bar dataKey="delivered" fill="#82ca9d" name="Delivered" />
                    <Bar dataKey="read" fill="#ffc658" name="Read" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Detailed Template Report</CardTitle>
              <CardDescription>Performance metrics for each Arabic template</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr>
                      <th className="text-left py-2">Template Name</th>
                      <th className="text-left py-2">Sent</th>
                      <th className="text-left py-2">Delivered</th>
                      <th className="text-left py-2">Read</th>
                      <th className="text-left py-2">Success Rate</th>
                      <th className="text-left py-2">Last Used</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="py-2 font-medium">account_opening_notification</td>
                      <td className="py-2">1,250</td>
                      <td className="py-2">1,240</td>
                      <td className="py-2">1,200</td>
                      <td className="py-2"><Badge variant="default">96.0%</Badge></td>
                      <td className="py-2">2026-01-31 15:30:22</td>
                    </tr>
                    <tr>
                      <td className="py-2 font-medium">deposit_notification</td>
                      <td className="py-2">2,450</td>
                      <td className="py-2">2,420</td>
                      <td className="py-2">2,350</td>
                      <td className="py-2"><Badge variant="default">95.9%</Badge></td>
                      <td className="py-2">2026-01-31 14:45:10</td>
                    </tr>
                    <tr>
                      <td className="py-2 font-medium">withdrawal_notification</td>
                      <td className="py-2">1,875</td>
                      <td className="py-2">1,850</td>
                      <td className="py-2">1,780</td>
                      <td className="py-2"><Badge variant="default">95.0%</Badge></td>
                      <td className="py-2">2026-01-31 12:20:05</td>
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