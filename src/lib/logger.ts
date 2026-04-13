import { promises as fs } from 'fs';
import path from 'path';
import type { LogEntry } from '@/lib/types';
import { generateMockLogs } from '@/app/dashboard/mock';

const baseLogsDir = path.join(process.cwd(), 'logs');

export type LogCategory = 'messages' | 'a2a' | 'api' | 'errors' | 'webhooks' | 'vonage_debug' | 'meta_debug' | 'fallback' | 'sms_delivery' | 'delivery_confirmation' | 'simultaneous_delivery' | 'meta_delivery' | 'fad_delivery';

/**
 * Creates the hierarchical logs directory structure if it doesn't exist.
 * Structure: logs/YYYY/MM/DD/
 */
async function ensureLogDirectory(year: number, month: number, day: number): Promise<string> {
  const logPath = path.join(baseLogsDir, year.toString(), month.toString().padStart(2, '0'), day.toString().padStart(2, '0'));
  try {
    await fs.access(logPath);
  } catch {
    await fs.mkdir(logPath, { recursive: true });
  }
  return logPath;
}

/**
 * Formats data for file logging.
 */
function formatLogData(data: any): string {
  if (typeof data === 'string') return data;
  try {
    return JSON.stringify(data, null, 2); // Pretty print JSON for better readability
  } catch {
    return String(data);
  }
}

/**
 * Generic file logger that writes to category-specific files in hierarchical folders.
 * Format: logs/YYYY/MM/DD/category.log
 */
export async function logToFile(category: LogCategory, data: any): Promise<void> {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const day = now.getDate();
  const timestamp = now.toISOString();

  // Ensure directory structure exists
  const logDir = await ensureLogDirectory(year, month, day);
  
  // File name: e.g., messages.log (within date-specific folder)
  const fileName = `${category}.log`;
  const filePath = path.join(logDir, fileName);

  // Create structured log entry
  const logEntry = {
    timestamp,
    category,
    ...data
  };

  const logLine = `${formatLogData(logEntry)}\n`;

  try {
    await fs.appendFile(filePath, logLine);
  } catch (error) {
    console.error(`Failed to write to log file ${filePath}:`, error);
  }
}

/**
 * Legacy wrapper to maintain compatibility with existing calls.
 * Logs to 'messages' category.
 */
export async function logMessage(logEntry: LogEntry): Promise<void> {
  await logToFile('messages', logEntry);
}

/**
 * Gets all available log dates (years, months, days) for navigation purposes.
 * @returns Promise resolving to hierarchical date structure
 */
export async function getLogDates(): Promise<{years: number[], months: Record<number, number[]>, days: Record<string, number[]>}> {
  try {
    await fs.access(baseLogsDir);
    
    const years = (await fs.readdir(baseLogsDir))
      .filter(item => /^\d{4}$/.test(item))
      .map(year => parseInt(year))
      .sort((a, b) => b - a);
    
    const months: Record<number, number[]> = {};
    const days: Record<string, number[]> = {};
    
    for (const year of years) {
      const yearPath = path.join(baseLogsDir, year.toString());
      const yearMonths = (await fs.readdir(yearPath))
        .filter(item => /^\d{2}$/.test(item))
        .map(month => parseInt(month))
        .sort((a, b) => b - a);
      
      months[year] = yearMonths;
      
      for (const month of yearMonths) {
        const monthPath = path.join(yearPath, month.toString().padStart(2, '0'));
        const monthDays = (await fs.readdir(monthPath))
          .filter(item => /^\d{2}$/.test(item))
          .map(day => parseInt(day))
          .sort((a, b) => b - a);
        
        days[`${year}-${month.toString().padStart(2, '0')}`] = monthDays;
      }
    }
    
    return { years, months, days };
  } catch {
    return { years: [], months: {}, days: {} };
  }
}

/**
 * Gets log entries for a specific date and category.
 * @param year Year (e.g., 2026)
 * @param month Month (1-12)
 * @param day Day (1-31)
 * @param category Log category
 * @param limit Maximum number of entries
 * @returns Array of log entries
 */
export async function getLogsByDate(year: number, month: number, day: number, category: LogCategory = 'messages', limit = 100): Promise<any[]> {
  try {
    const logPath = path.join(baseLogsDir, year.toString(), month.toString().padStart(2, '0'), day.toString().padStart(2, '0'), `${category}.log`);
    await fs.access(logPath);
    
    const fileContent = await fs.readFile(logPath, 'utf-8');
    const lines = fileContent.trim().split('\n').reverse();
    
    const logs: any[] = [];
    for (const line of lines) {
      if (logs.length >= limit) break;
      try {
        const logEntry = JSON.parse(line);
        logs.push(logEntry);
      } catch {
        // Skip malformed lines
      }
    }
    
    return logs;
  } catch {
    return [];
  }
}

/**
 * Reads log entries from the hierarchical log files.
 * Used by the dashboard to display recent messages.
 * Falls back to mock data if logs are unavailable.
 * @param limit The maximum number of log entries to return.
 * @returns A promise that resolves to an array of log entries.
 */
export async function getLogs(limit = 100): Promise<LogEntry[]> {
  try {
    await fs.access(baseLogsDir);
    
    // Get all year directories
    const years = (await fs.readdir(baseLogsDir))
      .filter(item => /^\d{4}$/.test(item))
      .sort((a, b) => parseInt(b) - parseInt(a)); // Sort descending by year

    const allLogs: LogEntry[] = [];

    // Process each year
    for (const year of years) {
      if (allLogs.length >= limit) break;
      
      const yearPath = path.join(baseLogsDir, year);
      const months = (await fs.readdir(yearPath))
        .filter(item => /^\d{2}$/.test(item))
        .sort((a, b) => parseInt(b) - parseInt(a)); // Sort descending by month
      
      // Process each month
      for (const month of months) {
        if (allLogs.length >= limit) break;
        
        const monthPath = path.join(yearPath, month);
        const days = (await fs.readdir(monthPath))
          .filter(item => /^\d{2}$/.test(item))
          .sort((a, b) => parseInt(b) - parseInt(a)); // Sort descending by day
        
        // Process each day
        for (const day of days) {
          if (allLogs.length >= limit) break;
          
          const dayPath = path.join(monthPath, day);
          
          // Try different log categories
          const categories: LogCategory[] = ['messages', 'a2a', 'simultaneous_delivery', 'meta_delivery', 'fad_delivery'];
          
          for (const category of categories) {
            if (allLogs.length >= limit) break;
            
            const logFilePath = path.join(dayPath, `${category}.log`);
            
            try {
              // Check if log file exists for this day
              await fs.access(logFilePath);
              
              const fileContent = await fs.readFile(logFilePath, 'utf-8');
              const lines = fileContent.trim().split('\n').reverse(); // Read lines from bottom to top
              
              for (const line of lines) {
                if (allLogs.length >= limit) break;
                try {
                  const logEntry = JSON.parse(line);
                  
                  // Convert to LogEntry format for dashboard compatibility
                  if (category === 'messages' || category === 'simultaneous_delivery') {
                    allLogs.push({
                      timestamp: logEntry.timestamp,
                      provider: logEntry.provider || 'simultaneous',
                      to: logEntry.payload?.to || logEntry.recipient || '',
                      body: logEntry.payload?.body || logEntry.message || '',
                      meta: {},
                      providerResult: {
                        success: logEntry.success || logEntry.meta?.success || logEntry.fad?.success,
                        provider: logEntry.provider || 'simultaneous',
                        providerMessageId: logEntry.providerMessageId || logEntry.meta?.providerMessageId || logEntry.fad?.providerMessageId,
                        rawResponse: logEntry.rawResponse || {},
                        errorCode: logEntry.errorCode,
                        errorMessage: logEntry.errorMessage
                      }
                    });
                  } else if (category === 'a2a') {
                    // Handle A2A logs
                    allLogs.push({
                      timestamp: logEntry.timestamp,
                      provider: 'a2a',
                      to: logEntry.mobileNo || '',
                      body: logEntry.message || logEntry.details?.response?.a2AResponse?.body?.ltsNotifications?.[0]?.MsgText || '',
                      meta: { sourceSystem: 'A2A' },
                      providerResult: {
                        success: logEntry.status?.toLowerCase().includes('success') || logEntry.status?.toLowerCase().includes('sent'),
                        provider: 'a2a',
                        providerMessageId: undefined,
                        rawResponse: logEntry.response || logEntry.details || {},
                        errorCode: logEntry.error ? 'A2A_ERROR' : undefined,
                        errorMessage: logEntry.error || undefined
                      }
                    });
                  }
                } catch (e) {
                  // Skip malformed lines
                }
              }
            } catch {
              // Log file doesn't exist for this category, continue to next
              continue;
            }
          }
        }
      }
    }

    if (allLogs.length > 0) {
      return allLogs;
    }

    // If we are here, it means logs folder exists but is empty.
    return generateMockLogs(limit);

  } catch (error) {
    // Could not read logs directory
    return generateMockLogs(limit);
  }
}