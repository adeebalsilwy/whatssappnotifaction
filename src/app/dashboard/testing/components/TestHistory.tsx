'use client';

import type { TestRun } from './TestingClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { formatRelative } from 'date-fns';
import { ar } from 'date-fns/locale';

interface TestHistoryProps {
  history: TestRun[];
}

export function TestHistory({ history }: TestHistoryProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>سجل الاختبارات الأخيرة</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>الحالة</TableHead>
              <TableHead>المزود</TableHead>
              <TableHead>إلى</TableHead>
              <TableHead>الوقت</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {history.length > 0 ? (
              history.map((run) => (
                <TableRow key={run.id}>
                  <TableCell>
                    {run.status === 'success' ? (
                      <Badge className="bg-green-500 hover:bg-green-600">ناجح</Badge>
                    ) : (
                      <Badge variant="destructive">فاشل</Badge>
                    )}
                  </TableCell>
                  <TableCell className="capitalize">{run.provider}</TableCell>
                  <TableCell dir="ltr">{run.to}</TableCell>
                  <TableCell>
                    <span className="text-xs text-muted-foreground">
                      {formatRelative(new Date(run.timestamp), new Date(), { locale: ar })}
                    </span>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center">
                  لا توجد اختبارات سابقة.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
