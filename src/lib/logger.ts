import { promises as fs } from 'fs';
import path from 'path';
import type { LogEntry } from '@/lib/types';
import { generateMockLogs } from '@/app/dashboard/mock';

const baseLogsDir = path.join(process.cwd(), 'logs');

export type LogCategory = 'messages' | 'api' | 'errors' | 'webhooks' | 'vonage_debug' | 'meta_debug' | 'fallback' | 'sms_delivery' | 'delivery_confirmation';

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
    return JSON.stringify(data);
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

  const logLine = `[${timestamp}] ${formatLogData(data)}\n`;

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
        let jsonStr = line;
        if (line.trim().startsWith('[')) {
          const closingBracket = line.indexOf('] ');
          if (closingBracket > -1) {
            jsonStr = line.substring(closingBracket + 1).trim();
          }
        }
        logs.push(JSON.parse(jsonStr));
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
          const messagesFilePath = path.join(dayPath, 'messages.log');
          
          try {
            // Check if messages.log exists for this day
            await fs.access(messagesFilePath);
            
            const fileContent = await fs.readFile(messagesFilePath, 'utf-8');
            const lines = fileContent.trim().split('\n').reverse(); // Read lines from bottom to top
            
            for (const line of lines) {
              if (allLogs.length >= limit) break;
              try {
                // Extract JSON part from [TIMESTAMP] JSON format
                let jsonStr = line;
                if (line.trim().startsWith('[')) {
                  const closingBracket = line.indexOf('] ');
                  if (closingBracket > -1) {
                    jsonStr = line.substring(closingBracket + 1).trim();
                  }
                }
                
                const logEntry: LogEntry = JSON.parse(jsonStr);
                allLogs.push(logEntry);
              } catch (e) {
                // Skip malformed lines
              }
            }
          } catch {
            // messages.log doesn't exist for this day, continue to next day
            continue;
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
