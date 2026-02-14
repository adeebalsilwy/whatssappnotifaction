import { getLogs } from '@/lib/logger';
import { LogsClient } from './components/LogsClient';

export const dynamic = 'force-dynamic';

export default async function LogsPage() {
  // Fetch all logs for the detailed logs page
  const logs = await getLogs(1000); // High limit for the logs page

  return (
    <main className="flex-1 space-y-4 p-4 md:p-6 lg:p-8">
      <LogsClient initialLogs={logs} />
    </main>
  );
}
