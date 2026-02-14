'use client';

import type { LogEntry, Provider } from '@/lib/types';
import { useState, useMemo, useEffect } from 'react';
import { DateRange } from 'react-day-picker';
import { subDays } from 'date-fns';
import { LogsFilters } from './LogsFilters';
import { LogsTable } from './LogsTable';

type StatusFilter = 'all' | 'success' | 'failed';

export function LogsClient({ initialLogs }: { initialLogs: LogEntry[] }) {
  const [logs, setLogs] = useState<LogEntry[]>(initialLogs);
  const [isClient, setIsClient] = useState(false);
  const [loading, setLoading] = useState(false);
  const [logDates, setLogDates] = useState<{years: number[], months: Record<number, number[]>, days: Record<string, number[]>}>({years: [], months: {}, days: {}});

  useEffect(() => {
    setIsClient(true);
    fetchLogDates();
  }, []);

  const fetchLogDates = async () => {
    try {
      const response = await fetch('/api/logs/dates');
      const data = await response.json();
      if (data.success) {
        setLogDates(data.data);
      }
    } catch (error) {
      console.error('Error fetching log dates:', error);
    }
  };

  const fetchLogsByDate = async (year: number, month: number, day: number) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/logs/date?year=${year}&month=${month}&day=${day}&category=messages&limit=1000`);
      const data = await response.json();
      if (data.success) {
        setLogs(data.data);
      }
    } catch (error) {
      console.error('Error fetching logs by date:', error);
    } finally {
      setLoading(false);
    }
  };

  // State for filters
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 30), // Default to last 30 days for logs
    to: new Date(),
  });
  const [providerFilter, setProviderFilter] = useState<Provider | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  // State for pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);


  const filteredLogs = useMemo(() => {
    if (!isClient) return [];

    return logs.filter((log) => {
      const logDate = new Date(log.timestamp);

      const dateCondition =
        !dateRange ||
        !dateRange.from ||
        !dateRange.to ||
        (logDate >= dateRange.from && logDate <= dateRange.to);

      const providerCondition = providerFilter === 'all' || log.provider === providerFilter;

      const statusCondition =
        statusFilter === 'all' ||
        (statusFilter === 'success' && log.providerResult.success) ||
        (statusFilter === 'failed' && !log.providerResult.success);

      const searchCondition =
        !searchQuery ||
        log.to.includes(searchQuery) ||
        log.body.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (log.meta?.txnId && log.meta.txnId.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (log.meta?.eventType && log.meta.eventType.toLowerCase().includes(searchQuery.toLowerCase()));

      return dateCondition && providerCondition && statusCondition && searchCondition;
    });
  }, [logs, dateRange, providerFilter, statusFilter, searchQuery, isClient]);

  const paginatedLogs = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredLogs.slice(startIndex, endIndex);
  }, [filteredLogs, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);

  const handleExport = () => {
    // TODO: Implement Excel export for logs
    console.log('Export logs to Excel');
  };

  return (
    <div className="space-y-4">
      <LogsFilters
        dateRange={dateRange}
        setDateRange={setDateRange}
        providerFilter={providerFilter}
        setProviderFilter={setProviderFilter}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onExport={handleExport}
        logDates={logDates}
        onDateSelect={fetchLogsByDate}
        loading={loading}
      />
      <LogsTable
        logs={paginatedLogs}
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        itemsPerPage={itemsPerPage}
        setItemsPerPage={setItemsPerPage}
        totalPages={totalPages}
        totalLogs={filteredLogs.length}
        loading={loading}
      />
    </div>
  );
}
