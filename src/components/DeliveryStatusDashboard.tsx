'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Eye, 
  AlertCircle,
  RefreshCw
} from 'lucide-react';

interface DeliveryStats {
  total_sent: number;
  delivered: number;
  read: number;
  failed: number;
  pending: number;
  delivery_rate: number;
}

interface MessageStatus {
  id: string;
  transId: string;
  message_id: string;
  provider_id: string;
  status: string;
  timestamp: string;
  message: string;
  mobileNo: string;
  error_message?: string;
}

export function DeliveryStatusDashboard() {
  const [stats, setStats] = useState<DeliveryStats | null>(null);
  const [recentMessages, setRecentMessages] = useState<MessageStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch delivery stats
      const statsResponse = await fetch('/api/webhooks/meta/status');
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData.stats);
      }

      // Fetch recent messages
      const recentResponse = await fetch('/api/webhooks/meta/recent?limit=20');
      if (recentResponse.ok) {
        const recentData = await recentResponse.json();
        setRecentMessages(recentData.data || []);
      }
    } catch (err) {
      setError('Failed to fetch delivery status');
      console.error('Error fetching status:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    // Refresh every 30 seconds
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'delivered':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'read':
        return <Eye className="h-4 w-4 text-blue-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'sent':
      case 'accepted':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'delivered':
        return <Badge variant="default" className="bg-green-100 text-green-800">Delivered</Badge>;
      case 'read':
        return <Badge variant="default" className="bg-blue-100 text-blue-800">Read</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      case 'sent':
      case 'accepted':
        return <Badge variant="secondary">Pending</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
        <span className="ml-2">Loading delivery status...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Delivery Status Dashboard</h2>
        <button
          onClick={fetchStatus}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Sent</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_sent}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Delivered</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.delivered}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Read</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.read}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Failed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Delivery Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.delivery_rate}%</div>
              <Progress value={stats.delivery_rate} className="mt-2" />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Recent Messages Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Message Delivery Status</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead>Message</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Provider</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Error</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentMessages.map((message) => (
                <TableRow key={message.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(message.status)}
                      {getStatusBadge(message.status)}
                    </div>
                  </TableCell>
                  <TableCell className="max-w-xs truncate">
                    {message.message}
                  </TableCell>
                  <TableCell>{message.mobileNo}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{message.provider_id}</Badge>
                  </TableCell>
                  <TableCell>
                    {new Date(message.timestamp).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    {message.error_message && (
                      <span className="text-red-500 text-sm">
                        {message.error_message}
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {recentMessages.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-gray-500">
                    No recent messages found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}