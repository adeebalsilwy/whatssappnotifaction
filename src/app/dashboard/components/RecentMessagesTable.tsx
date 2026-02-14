'use client';

import { useState, useEffect } from 'react';
import type { LogEntry } from '@/lib/types';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';

export function RecentMessagesTable({ logs }: { logs: LogEntry[] }) {
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>أحدث الرسائل</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="h-[400px] w-full bg-muted animate-pulse rounded-md"></div>
            </CardContent>
        </Card>
    );
  }
  
  // Show only the 10 most recent logs
  const recentLogs = logs.slice(0, 10);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>أحدث الرسائل</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px] w-full">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الحالة</TableHead>
                  <TableHead>المزوّد</TableHead>
                  <TableHead>الوجهة</TableHead>
                  <TableHead>نوع الحدث</TableHead>
                  <TableHead className="text-left">الوقت</TableHead>
                  <TableHead className="text-center">الإجراء</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentLogs.length > 0 ? recentLogs.map((log, index) => (
                  <TableRow key={`${log.meta.txnId}-${index}`}>
                    <TableCell>
                      {log.providerResult.success ? (
                        <Badge variant="default" className="bg-green-500 hover:bg-green-600">
                          ناجحة
                        </Badge>
                      ) : (
                        <Badge variant="destructive">فاشلة</Badge>
                      )}
                    </TableCell>
                    <TableCell className="font-medium capitalize">{log.provider}</TableCell>
                    <TableCell>{log.to}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{log.meta.eventType}</Badge>
                    </TableCell>
                    <TableCell className="text-left">
                      {format(new Date(log.timestamp), 'd MMM, h:mm a', { locale: ar })}
                    </TableCell>
                    <TableCell className="text-center">
                      <Dialog onOpenChange={(open) => !open && setSelectedLog(null)}>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm" onClick={() => setSelectedLog(log)}>
                            التفاصيل
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-3xl">
                          <DialogHeader>
                            <DialogTitle>تفاصيل الرسالة الخام</DialogTitle>
                          </DialogHeader>
                          <ScrollArea className="h-96 w-full rounded-md border p-4">
                            <pre className="text-sm" dir='ltr'>
                              {selectedLog && JSON.stringify(selectedLog.providerResult.rawResponse, null, 2)}
                            </pre>
                          </ScrollArea>
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      لا توجد رسائل لعرضها.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
      
    </>
  );
}
