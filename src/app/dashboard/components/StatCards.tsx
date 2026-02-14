'use client';

import type { LogEntry } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageSquare, CheckCircle, AlertCircle, Users } from 'lucide-react';

export function StatCards({ logs }: { logs: LogEntry[] }) {
  const totalMessages = logs.length;
  const successfulMessages = logs.filter((log) => log.providerResult.success).length;
  const failedMessages = totalMessages - successfulMessages;
  const successRate = totalMessages > 0 ? (successfulMessages / totalMessages) * 100 : 0;

  const providerCounts = logs.reduce((acc, log) => {
    acc[log.provider] = (acc[log.provider] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">إجمالي الرسائل</CardTitle>
          <MessageSquare className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalMessages.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground">خلال الفترة المحددة</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">الرسائل الناجحة</CardTitle>
          <CheckCircle className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{successfulMessages.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground">
            {successRate.toFixed(1)}% نسبة النجاح
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">الرسائل الفاشلة</CardTitle>
          <AlertCircle className="h-4 w-4 text-destructive" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{failedMessages.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground">
            {(100 - successRate).toFixed(1)}% نسبة الفشل
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">توزيع المزودين</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
            {Object.entries(providerCounts).map(([provider, count]) => (
              <div key={provider} className="capitalize">
                {provider}: <span className="font-bold">{count}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
