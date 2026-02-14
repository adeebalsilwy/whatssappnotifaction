import type { AppConfig } from '@/lib/types';
import { SettingsClient } from './components/SettingsClient';
import { getSettings as getSettingsFromSqlite } from '@/server/settingsRepo';

export const dynamic = 'force-dynamic';

async function getSettings(): Promise<AppConfig> {
  try {
    return getSettingsFromSqlite();
  } catch {
    return getSettingsFromSqlite();
  }
}

export default async function SettingsPage() {
  const settings = await getSettings();

  return (
    <main className="flex-1 space-y-4 p-4 md:p-6 lg:p-8">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">إعدادات مزودي الخدمة</h2>
      </div>
      <SettingsClient initialSettings={settings} />
    </main>
  );
}
