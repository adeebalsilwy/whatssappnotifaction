import type { AppConfig } from '@/lib/types';
import { loadConfigSync } from '@/lib/config-loader';

/**
 * This configuration module loads the configuration dynamically.
 * In a real-world scenario, this might involve fetching from a secure vault,
 * a database, or a configuration service. For this project, it reads from a JSON file.
 * This is the central place to access provider credentials and endpoints.
 */

function getConfig(): AppConfig {
  return loadConfigSync();
}

export default getConfig;
