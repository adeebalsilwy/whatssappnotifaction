import fs from 'fs/promises';
import path from 'path';
import { mkdirSync } from 'fs';

interface A2ALogEntry {
  timestamp: string;
  action: string;
  status: string;
  message?: string;
  details?: any;
  mode?: string;
  error?: string;
  count?: number;
  processedAt?: string;
}

/**
 * Creates directory recursively if it doesn't exist
 */
async function ensureDirectory(dirPath: string): Promise<void> {
  try {
    await fs.access(dirPath);
  } catch {
    // Directory doesn't exist, create it
    await fs.mkdir(dirPath, { recursive: true });
  }
}

/**
 * Gets the log file path based on current date
 */
function getLogFilePath(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  
  const logsDir = path.join(process.cwd(), 'logs', 'a2a', year.toString(), month);
  const filePath = path.join(logsDir, `a2a-${year}-${month}-${day}.json`);
  
  return filePath;
}

/**
 * Writes a log entry to the A2A log file
 */
export async function logA2A(entry: A2ALogEntry): Promise<void> {
  try {
    const logPath = getLogFilePath();
    const logDir = path.dirname(logPath);
    
    // Ensure directory exists
    await ensureDirectory(logDir);
    
    // Read existing log file or create new one
    let logData: A2ALogEntry[] = [];
    try {
      const fileContent = await fs.readFile(logPath, 'utf8');
      logData = JSON.parse(fileContent);
    } catch (error) {
      // File doesn't exist or is invalid, start with empty array
      logData = [];
    }
    
    // Add new entry
    logData.push(entry);
    
    // Write back to file (limit to last 1000 entries to prevent huge files)
    if (logData.length > 1000) {
      logData = logData.slice(-1000);
    }
    
    await fs.writeFile(logPath, JSON.stringify(logData, null, 2));
  } catch (error) {
    console.error('Failed to write A2A log:', error);
  }
}

/**
 * Reads A2A log entries for a specific date
 */
export async function readA2ALogs(date?: Date): Promise<A2ALogEntry[]> {
  try {
    const targetDate = date || new Date();
    const year = targetDate.getFullYear();
    const month = String(targetDate.getMonth() + 1).padStart(2, '0');
    const day = String(targetDate.getDate()).padStart(2, '0');
    
    const logsDir = path.join(process.cwd(), 'logs', 'a2a', year.toString(), month);
    const filePath = path.join(logsDir, `a2a-${year}-${month}-${day}.json`);
    
    try {
      const fileContent = await fs.readFile(filePath, 'utf8');
      return JSON.parse(fileContent);
    } catch {
      // File doesn't exist, return empty array
      return [];
    }
  } catch (error) {
    console.error('Failed to read A2A logs:', error);
    return [];
  }
}

/**
 * Gets available log dates for A2A logs
 */
export async function getAvailableA2ALogDates(): Promise<Date[]> {
  const dates: Date[] = [];
  const logsRootDir = path.join(process.cwd(), 'logs', 'a2a');
  
  try {
    const years = await fs.readdir(logsRootDir);
    
    for (const year of years) {
      const yearPath = path.join(logsRootDir, year);
      const stat = await fs.stat(yearPath);
      
      if (stat.isDirectory()) {
        const months = await fs.readdir(yearPath);
        
        for (const month of months) {
          const monthPath = path.join(yearPath, month);
          const monthStat = await fs.stat(monthPath);
          
          if (monthStat.isDirectory()) {
            // Look for log files in this month
            const files = await fs.readdir(monthPath);
            for (const file of files) {
              if (file.startsWith(`a2a-${year}-${month}-`) && file.endsWith('.json')) {
                const dayMatch = file.match(/a2a-\d{4}-\d{2}-(\d{2})\.json$/);
                if (dayMatch) {
                  const day = parseInt(dayMatch[1]);
                  const date = new Date(parseInt(year), parseInt(month) - 1, day);
                  dates.push(date);
                }
              }
            }
          }
        }
      }
    }
  } catch (error) {
    // Directory doesn't exist or other error, return empty array
    console.error('Failed to read A2A log directory structure:', error);
  }
  
  // Sort dates in descending order (most recent first)
  dates.sort((a, b) => b.getTime() - a.getTime());
  return dates;
}

/**
 * Gets A2A log entries with filters
 */
export async function getFilteredA2ALogs(
  filters?: {
    startDate?: Date;
    endDate?: Date;
    status?: string;
    action?: string;
    mode?: string;
  }
): Promise<A2ALogEntry[]> {
  const allDates = await getAvailableA2ALogDates();
  let allLogs: A2ALogEntry[] = [];

  // Filter dates based on the provided date range
  const filteredDates = allDates.filter(date => {
    if (filters?.startDate && date < filters.startDate) return false;
    if (filters?.endDate && date > filters.endDate) return false;
    return true;
  });

  // Read logs from filtered dates
  for (const date of filteredDates) {
    const dailyLogs = await readA2ALogs(date);
    allLogs = allLogs.concat(dailyLogs);
  }

  // Apply additional filters
  if (filters?.status) {
    allLogs = allLogs.filter(log => log.status === filters.status);
  }
  if (filters?.action) {
    allLogs = allLogs.filter(log => log.action === filters.action);
  }
  if (filters?.mode) {
    allLogs = allLogs.filter(log => log.mode === filters.mode);
  }

  // Sort by timestamp (newest first)
  allLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return allLogs;
}