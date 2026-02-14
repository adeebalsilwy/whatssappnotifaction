'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface TemplateReport {
  templateName: string;
  sentCount: number;
  deliveredCount: number;
  readCount: number;
  successRate: number;
  lastUsed: string;
}

export default function TemplatesReport() {
  const [reports, setReports] = useState<TemplateReport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate fetching template usage reports
    setTimeout(() => {
      setReports([
        {
          templateName: 'account_opening_notification',
          sentCount: 1250,
          deliveredCount: 1240,
          readCount: 1200,
          successRate: 96.0,
          lastUsed: '2026-01-31 15:30:22'
        },
        {
          templateName: 'deposit_notification',
          sentCount: 2450,
          deliveredCount: 2420,
          readCount: 2350,
          successRate: 95.9,
          lastUsed: '2026-01-31 14:45:10'
        },
        {
          templateName: 'withdrawal_notification',
          sentCount: 1875,
          deliveredCount: 1850,
          readCount: 1780,
          successRate: 95.0,
          lastUsed: '2026-01-31 12:20:05'
        }
      ]);
      setLoading(false);
    }, 800);
  }, []);

  const chartData = reports.map(report => ({
    name: report.templateName,
    'Sent': report.sentCount,
    'Delivered': report.deliveredCount,
    'Read': report.readCount
  }));

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Template Reports</h2>
        <p className="text-muted-foreground">
          Performance metrics for Arabic WhatsApp banking templates
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Template Usage Overview</CardTitle>
          <CardDescription>Statistics for your WhatsApp templates</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
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
                <Bar dataKey="Sent" fill="#8884d8" />
                <Bar dataKey="Delivered" fill="#82ca9d" />
                <Bar dataKey="Read" fill="#ffc658" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Detailed Report</CardTitle>
          <CardDescription>Performance metrics for each template</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Template Name</TableHead>
                <TableHead>Sent</TableHead>
                <TableHead>Delivered</TableHead>
                <TableHead>Read</TableHead>
                <TableHead>Success Rate</TableHead>
                <TableHead>Last Used</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reports.map((report, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">{report.templateName}</TableCell>
                  <TableCell>{report.sentCount}</TableCell>
                  <TableCell>{report.deliveredCount}</TableCell>
                  <TableCell>{report.readCount}</TableCell>
                  <TableCell>
                    <Badge variant={report.successRate >= 95 ? "default" : "secondary"}>
                      {report.successRate}%
                    </Badge>
                  </TableCell>
                  <TableCell>{report.lastUsed}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}