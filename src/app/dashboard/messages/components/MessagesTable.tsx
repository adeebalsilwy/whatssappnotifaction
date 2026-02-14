'use client';

import { Message } from '@/server/messagesRepo';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Eye, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { MessageDetailsDialog } from './MessageDetailsDialog';

interface MessagesTableProps {
    messages: Message[];
    currentPage: number;
    setCurrentPage: (page: number) => void;
    totalPages: number;
    totalMessages: number;
}

const statusColors = {
    RECEIVED: 'bg-blue-500',
    QUEUED: 'bg-yellow-500',
    SENT: 'bg-green-500',
    FAILED: 'bg-red-500'
};

const statusLabels = {
    RECEIVED: 'مستلمة',
    QUEUED: 'في الانتظار',
    SENT: 'مرسلة',
    FAILED: 'فاشلة'
};

export function MessagesTable({
    messages,
    currentPage,
    setCurrentPage,
    totalPages,
    totalMessages
}: MessagesTableProps) {
    const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);

    return (
        <>
            <Card>
                <CardHeader>
                    <CardTitle>الرسائل ({totalMessages})</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>رقم المعاملة</TableHead>
                                    <TableHead>رقم الجوال</TableHead>
                                    <TableHead>الرسالة</TableHead>
                                    <TableHead>الحالة</TableHead>
                                    <TableHead>المزود</TableHead>
                                    <TableHead>التاريخ</TableHead>
                                    <TableHead className="text-left">الإجراءات</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {messages.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center text-muted-foreground">
                                            لا توجد رسائل
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    messages.map((msg) => (
                                        <TableRow key={msg.transId}>
                                            <TableCell className="font-mono text-xs">{msg.transId}</TableCell>
                                            <TableCell className="font-mono">{msg.mobileNo}</TableCell>
                                            <TableCell className="max-w-xs truncate">{msg.message}</TableCell>
                                            <TableCell>
                                                <Badge className={statusColors[msg.status as keyof typeof statusColors]}>
                                                    {statusLabels[msg.status as keyof typeof statusLabels]}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>{msg.selectedProvider || '-'}</TableCell>
                                            <TableCell className="text-sm text-muted-foreground">
                                                {new Date(msg.createdAt).toLocaleString('ar-YE')}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex gap-2">
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => setSelectedMessage(msg)}
                                                    >
                                                        <Eye className="h-4 w-4" />
                                                    </Button>
                                                    {msg.status === 'FAILED' && (
                                                        <Button size="sm" variant="outline">
                                                            <RefreshCw className="h-4 w-4" />
                                                        </Button>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    {totalPages > 1 && (
                        <div className="flex items-center justify-between mt-4">
                            <p className="text-sm text-muted-foreground">
                                صفحة {currentPage} من {totalPages}
                            </p>
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentPage(currentPage - 1)}
                                    disabled={currentPage === 1}
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentPage(currentPage + 1)}
                                    disabled={currentPage === totalPages}
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {selectedMessage && (
                <MessageDetailsDialog
                    message={selectedMessage}
                    onClose={() => setSelectedMessage(null)}
                />
            )}
        </>
    );
}
