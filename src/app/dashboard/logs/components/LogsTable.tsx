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
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface LogsTableProps {
    logs: LogEntry[];
    currentPage: number;
    setCurrentPage: (page: number) => void;
    itemsPerPage: number;
    setItemsPerPage: (size: number) => void;
    totalPages: number;
    totalLogs: number;
    loading?: boolean;
}

export function LogsTable({
    logs,
    currentPage,
    setCurrentPage,
    itemsPerPage,
    setItemsPerPage,
    totalPages,
    totalLogs,
    loading = false
}: LogsTableProps) {
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  return (
    <>
      <Card>
        <CardContent className='p-0'>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className='whitespace-nowrap'>الحالة</TableHead>
                  <TableHead className='whitespace-nowrap'>المزوّد</TableHead>
                  <TableHead className='whitespace-nowrap'>الوجهة</TableHead>
                  <TableHead className='whitespace-nowrap'>محتوى الرسالة</TableHead>
                  <TableHead className='whitespace-nowrap'>نوع الحدث</TableHead>
                  <TableHead className='whitespace-nowrap'>رقم العملية</TableHead>
                  <TableHead className="text-left whitespace-nowrap">الوقت</TableHead>
                  <TableHead className="text-center whitespace-nowrap">الإجراء</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isClient && logs.length > 0 ? logs.map((log, index) => (
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
                    <TableCell className='max-w-[250px] truncate'>{log.body}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{log.meta.eventType}</Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{log.meta.txnId}</TableCell>
                    <TableCell className="text-left whitespace-nowrap">
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
                    <TableCell colSpan={8} className="h-24 text-center">
                      {loading ? "جاري التحميل..." : (isClient ? "لا توجد سجلات مطابقة لمعايير البحث." : "جاري التحميل...")}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
        <CardFooter className='flex-col-reverse items-center gap-4 sm:flex-row sm:justify-between p-4'>
            <div className='text-sm text-muted-foreground'>
                عرض {totalLogs > 0 ? ((currentPage - 1) * itemsPerPage) + 1 : 0}-{(Math.min(currentPage * itemsPerPage, totalLogs))} من أصل {totalLogs} سجل
            </div>
            <div className='flex items-center flex-col sm:flex-row gap-4 sm:gap-6 lg:gap-8'>
                <div className='flex items-center gap-2'>
                    <p className='text-sm font-medium'>الصفوف في الصفحة</p>
                    <Select
                        value={`${itemsPerPage}`}
                        onValueChange={(value) => {
                            setItemsPerPage(Number(value))
                            setCurrentPage(1)
                        }}
                    >
                        <SelectTrigger className="h-8 w-[70px]">
                            <SelectValue placeholder={itemsPerPage} />
                        </SelectTrigger>
                        <SelectContent side="top">
                            {[10, 25, 50, 100].map((pageSize) => (
                            <SelectItem key={pageSize} value={`${pageSize}`}>
                                {pageSize}
                            </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="flex items-center justify-center text-sm font-medium">
                    صفحة {totalPages > 0 ? currentPage : 0} من {totalPages}
                </div>
                <div className='flex items-center gap-2'>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(currentPage - 1)}
                        disabled={currentPage === 1}
                        >
                        <ChevronRight className="h-4 w-4" />
                        السابق
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(currentPage + 1)}
                        disabled={currentPage === totalPages || totalPages === 0}
                        >
                        التالي
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </CardFooter>
      </Card>
    </>
  );
}
