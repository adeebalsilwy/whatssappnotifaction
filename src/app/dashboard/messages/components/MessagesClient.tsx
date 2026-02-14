'use client';

import { useState, useMemo } from 'react';
import { Message } from '@/server/messagesRepo';
import { MessagesFilters } from './MessagesFilters';
import { MessagesTable } from './MessagesTable';
import * as XLSX from 'xlsx';

interface MessagesClientProps {
    initialMessages: Message[];
    initialTotal: number;
}

export function MessagesClient({ initialMessages, initialTotal }: MessagesClientProps) {
    const [messages] = useState<Message[]>(initialMessages);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');

    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(25);

    const filteredMessages = useMemo(() => {
        return messages.filter((msg) => {
            const statusMatch = statusFilter === 'all' || msg.status === statusFilter;
            const searchMatch = !searchQuery ||
                msg.transId.toLowerCase().includes(searchQuery.toLowerCase()) ||
                msg.mobileNo.includes(searchQuery) ||
                msg.message.toLowerCase().includes(searchQuery.toLowerCase());

            const dateMatch = (!dateFrom || msg.createdAt >= dateFrom) &&
                (!dateTo || msg.createdAt <= dateTo);

            return statusMatch && searchMatch && dateMatch;
        });
    }, [messages, statusFilter, searchQuery, dateFrom, dateTo]);

    const paginatedMessages = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return filteredMessages.slice(start, start + itemsPerPage);
    }, [filteredMessages, currentPage, itemsPerPage]);

    const totalPages = Math.ceil(filteredMessages.length / itemsPerPage);

    const handleExport = () => {
        const exportData = filteredMessages.map(msg => ({
            'رقم المعاملة': msg.transId,
            'رقم الجوال': msg.mobileNo,
            'الرسالة': msg.message,
            'الحالة': msg.status,
            'المزود': msg.selectedProvider || '-',
            'الأولوية': msg.priority,
            'تاريخ الإنشاء': new Date(msg.createdAt).toLocaleString('ar-YE'),
            'آخر تحديث': new Date(msg.updatedAt).toLocaleString('ar-YE'),
            'الخطأ': msg.lastError || '-'
        }));

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'الرسائل');
        XLSX.writeFile(wb, `messages_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    return (
        <div className="space-y-4">
            <MessagesFilters
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                statusFilter={statusFilter}
                setStatusFilter={setStatusFilter}
                dateFrom={dateFrom}
                setDateFrom={setDateFrom}
                dateTo={dateTo}
                setDateTo={setDateTo}
                onExport={handleExport}
            />
            <MessagesTable
                messages={paginatedMessages}
                currentPage={currentPage}
                setCurrentPage={setCurrentPage}
                totalPages={totalPages}
                totalMessages={filteredMessages.length}
            />
        </div>
    );
}
