'use client';

import type { LogEntry, Provider } from '@/lib/types';
import { useState, useMemo, useEffect } from 'react';
import { DateRange } from 'react-day-picker';
import { subDays } from 'date-fns';
import { StatCards } from './StatCards';
import { MessagesChart } from './MessagesChart';
import { RecentMessagesTable } from './RecentMessagesTable';
import { DashboardFilters } from './DashboardFilters';

type StatusFilter = 'all' | 'success' | 'failed';

export function DashboardClient({ initialLogs }: { initialLogs: LogEntry[] }) {
  const [logs] = useState<LogEntry[]>(initialLogs);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // State for filters
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 7),
    to: new Date(),
  });
  const [providerFilter, setProviderFilter] = useState<Provider | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

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

      return dateCondition && providerCondition && statusCondition;
    });
  }, [logs, dateRange, providerFilter, statusFilter, isClient]);

  return (
    <div className="space-y-4 md:space-y-6">
      <DashboardFilters
        dateRange={dateRange}
        setDateRange={setDateRange}
        providerFilter={providerFilter}
        setProviderFilter={setProviderFilter}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
      />
      <StatCards logs={filteredLogs} />
      <div className="grid gap-4 md:gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <MessagesChart logs={filteredLogs} />
        </div>
        <div className="lg:col-span-2">
          <RecentMessagesTable logs={filteredLogs} />
        </div>
      </div>
    </div>
  );
}
