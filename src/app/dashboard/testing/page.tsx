import { TestingClient } from './components/TestingClient';

export const dynamic = 'force-dynamic';

export default function TestingPage() {
  return (
    <main className="flex-1 space-y-4 p-4 md:p-6 lg:p-8">
      <TestingClient />
    </main>
  );
}
