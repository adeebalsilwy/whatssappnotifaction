'use client';

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Cell } from 'recharts';
import type { LogEntry } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useMemo, useEffect, useState } from 'react';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { Skeleton } from '@/components/ui/skeleton';

const chartConfig = {
  total: {
    label: 'Messages',
  },
  meta: {
    label: 'Meta',
    color: 'hsl(var(--chart-1))',
  },
  vonage: {
    label: 'Vonage',
    color: 'hsl(var(--chart-2))',
  },
  generic: {
    label: 'Generic',
    color: 'hsl(var(--chart-3))',
  },
  direct: {
    label: 'Direct',
    color: 'hsl(var(--chart-4))',
  },
} satisfies ChartConfig;

export function MessagesChart({ logs }: { logs: LogEntry[] }) {
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);

  const chartData = useMemo(() => {
    const counts = logs.reduce(
      (acc, log) => {
        const provider = log.provider || 'unknown';
        acc[provider] = (acc[provider] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    const data = (Object.keys(chartConfig) as Array<keyof typeof chartConfig>)
      .filter(key => key !== 'total')
      .map(name => ({
        name,
        total: counts[name] || 0,
      }));

    return data.filter(d => d.total > 0);

  }, [logs]);

  if (!isClient) {
      return (
        <Card>
            <CardHeader>
                <CardTitle>الرسائل لكل مزوّد</CardTitle>
            </CardHeader>
            <CardContent>
                <Skeleton className="h-[250px] w-full" />
            </CardContent>
        </Card>
      );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>الرسائل لكل مزوّد</CardTitle>
      </CardHeader>
      <CardContent>
        {chartData.length > 0 ? (
            <ChartContainer config={chartConfig} className="min-h-[250px] w-full">
            <BarChart accessibilityLayer data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                <XAxis
                dataKey="name"
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                className="capitalize"
                />
                <YAxis
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `${value}`}
                allowDecimals={false}
                />
                <ChartTooltip
                cursor={{ fill: 'hsl(var(--accent) / 0.2)' }}
                content={<ChartTooltipContent />}
                />
                <Bar
                    dataKey="total"
                    radius={[4, 4, 0, 0]}
                    barSize={40}
                >
                    {chartData.map((entry) => {
                        const config = chartConfig[entry.name as keyof typeof chartConfig];
                        return (
                            <Cell key={`cell-${entry.name}`} fill={config && 'color' in config ? config.color : 'hsl(var(--primary))'} />
                        );
                    })}
                </Bar>
            </BarChart>
            </ChartContainer>
        ) : (
            <div className="flex h-[250px] w-full items-center justify-center">
                <p className="text-muted-foreground">لا توجد بيانات لعرضها في هذه الفترة.</p>
            </div>
        )}
      </CardContent>
    </Card>
  );
}
