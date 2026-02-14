'use client';

import { useState, useEffect } from 'react';
import { CalendarIcon, SearchIcon, DownloadIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import type { Provider } from '@/lib/types';
import { providers } from '@/lib/types';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { DateRange } from 'react-day-picker';

type StatusFilter = 'all' | 'success' | 'failed';

interface LogsFiltersProps {
  dateRange: DateRange | undefined;
  setDateRange: (date: DateRange | undefined) => void;
  providerFilter: Provider | 'all';
  setProviderFilter: (provider: Provider | 'all') => void;
  statusFilter: StatusFilter;
  setStatusFilter: (status: StatusFilter) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onExport: () => void;
  logDates?: {years: number[], months: Record<number, number[]>, days: Record<string, number[]>};
  onDateSelect?: (year: number, month: number, day: number) => void;
  loading?: boolean;
}

export function LogsFilters({
  dateRange,
  setDateRange,
  providerFilter,
  setProviderFilter,
  statusFilter,
  setStatusFilter,
  searchQuery,
  setSearchQuery,
  onExport,
  logDates = {years: [], months: {}, days: {}},
  onDateSelect,
  loading = false
}: LogsFiltersProps) {

  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);


  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="search-query"
            placeholder="ابحث بالرقم، المحتوى، رقم العملية..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
          <div className="grid gap-2">
            <Label htmlFor='date-range-picker'>النطاق الزمني</Label>

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id="date-range-picker"
                  variant={'outline'}
                  className={cn(
                    'w-full justify-start text-right font-normal',
                    !dateRange && 'text-muted-foreground'
                  )}
                  disabled={!isClient}
                >
                  <CalendarIcon className="ml-2 h-4 w-4" />
                  {dateRange?.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, 'LLL dd, y')} - {format(dateRange.to, 'LLL dd, y')}
                      </>
                    ) : (
                      format(dateRange.from, 'LLL dd, y')
                    )
                  ) : (
                    <span>اختر تاريخ</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={dateRange?.from}
                  selected={dateRange}
                  onSelect={setDateRange}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="grid gap-2">
            <Label htmlFor='provider-select'>المزوّد</Label>
            <Select value={providerFilter} onValueChange={(value) => setProviderFilter(value as Provider | 'all')} disabled={!isClient}>
              <SelectTrigger id='provider-select'>
                <SelectValue placeholder="الكل" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">الكل</SelectItem>
                {providers.map((p) => (
                  <SelectItem key={p} value={p} className="capitalize">
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor='status-select'>الحالة</Label>
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as StatusFilter)} disabled={!isClient}>
              <SelectTrigger id='status-select'>
                <SelectValue placeholder="الكل" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">الكل</SelectItem>
                <SelectItem value="success">ناجحة</SelectItem>
                <SelectItem value="failed">فاشلة</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
