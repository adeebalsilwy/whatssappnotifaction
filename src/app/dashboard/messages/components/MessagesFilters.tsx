'use client';

import { SearchIcon, DownloadIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface MessagesFiltersProps {
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    statusFilter: string;
    setStatusFilter: (status: string) => void;
    dateFrom: string;
    setDateFrom: (date: string) => void;
    dateTo: string;
    setDateTo: (date: string) => void;
    onExport: () => void;
}

export function MessagesFilters({
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    onExport
}: MessagesFiltersProps) {
    return (
        <Card>
            <CardContent className="pt-6 space-y-4">
                <div className="relative">
                    <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="ابحث برقم المعاملة، الجوال، أو المحتوى..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                    />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                    <div className="grid gap-2">
                        <Label>الحالة</Label>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">الكل</SelectItem>
                                <SelectItem value="RECEIVED">مستلمة</SelectItem>
                                <SelectItem value="QUEUED">في الانتظار</SelectItem>
                                <SelectItem value="SENT">مرسلة</SelectItem>
                                <SelectItem value="FAILED">فاشلة</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid gap-2">
                        <Label>من تاريخ</Label>
                        <Input
                            type="date"
                            value={dateFrom}
                            onChange={(e) => setDateFrom(e.target.value)}
                        />
                    </div>

                    <div className="grid gap-2">
                        <Label>إلى تاريخ</Label>
                        <Input
                            type="date"
                            value={dateTo}
                            onChange={(e) => setDateTo(e.target.value)}
                        />
                    </div>

                    <div className="grid gap-2">
                        <Label>&nbsp;</Label>
                        <Button onClick={onExport} className="w-full">
                            <DownloadIcon className="mr-2 h-4 w-4" />
                            تصدير Excel
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
