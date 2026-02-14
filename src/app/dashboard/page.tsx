import { getLogs } from '@/lib/logger';
import { DashboardClient } from './components/DashboardClient';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  // Fetch logs for the overview dashboard. A smaller limit is fine here.
  const logs = await getLogs(200);

  return (
    <main className="flex-1 space-y-4 p-4 md:p-6 lg:p-8">
      <DashboardClient initialLogs={logs} />
    </main>
  );
}
