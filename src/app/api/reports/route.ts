import { NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import path from 'path';

const dbPath = process.env.SQLITE_DB_PATH || path.join(process.cwd(), 'gateway.db');

// GET - Fetch report data
export async function GET(request: Request) {
  try {
    const db = new Database(dbPath);
    
    const { searchParams } = new URL(request.url);
    const reportType = searchParams.get('type') || 'summary';
    const startDate = searchParams.get('startDate') || '';
    const endDate = searchParams.get('endDate') || '';
    const groupBy = searchParams.get('groupBy') || 'day';
    
    let baseQuery = 'WHERE 1=1';
    const params: any[] = [];
    
    if (startDate) {
      baseQuery += ' AND createdAt >= ?';
      params.push(startDate);
    }
    
    if (endDate) {
      baseQuery += ' AND createdAt <= ?';
      params.push(endDate);
    }
    
    switch (reportType) {
      case 'summary':
        return await getSummaryReport(db, baseQuery, params);
      
      case 'status':
        return await getStatusReport(db, baseQuery, params);
      
      case 'provider':
        return await getProviderReport(db, baseQuery, params);
      
      case 'timeline':
        return await getTimelineReport(db, baseQuery, params, groupBy);
      
      case 'performance':
        return await getPerformanceReport(db, baseQuery, params);
      
      default:
        return NextResponse.json(
          { success: false, error: 'Invalid report type' },
          { status: 400 }
        );
    }
    
  } catch (error) {
    console.error('Error generating report:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate report' },
      { status: 500 }
    );
  }
}

async function getSummaryReport(db: Database.Database, baseQuery: string, params: any[]) {
  // Total messages
  const totalMessages = db.prepare(`
    SELECT COUNT(*) as total FROM messages ${baseQuery}
  `).get(...params) as { total: number };
  
  // Messages by status
  const statusStats = db.prepare(`
    SELECT status, COUNT(*) as count 
    FROM messages ${baseQuery} 
    GROUP BY status
    ORDER BY count DESC
  `).all(...params);
  
  // Messages by priority
  const priorityStats = db.prepare(`
    SELECT priority, COUNT(*) as count 
    FROM messages ${baseQuery} 
    GROUP BY priority
    ORDER BY count DESC
  `).all(...params);
  
  // Recent activity (last 7 days)
  const recentActivity = db.prepare(`
    SELECT DATE(createdAt) as date, COUNT(*) as count
    FROM messages 
    WHERE createdAt >= datetime('now', '-7 days')
    GROUP BY DATE(createdAt)
    ORDER BY date DESC
  `).all();
  
  // Top destinations
  const topDestinations = db.prepare(`
    SELECT [to], COUNT(*) as count
    FROM messages ${baseQuery}
    GROUP BY [to]
    ORDER BY count DESC
    LIMIT 10
  `).all(...params);
  
  return NextResponse.json({
    success: true,
    data: {
      totals: {
        totalMessages: totalMessages.total,
        statuses: statusStats,
        priorities: priorityStats
      },
      recentActivity,
      topDestinations
    }
  });
}

async function getStatusReport(db: Database.Database, baseQuery: string, params: any[]) {
  // Detailed status breakdown
  const statusDetails = db.prepare(`
    SELECT 
      status,
      COUNT(*) as count,
      MIN(createdAt) as firstOccurrence,
      MAX(createdAt) as lastOccurrence
    FROM messages ${baseQuery}
    GROUP BY status
    ORDER BY count DESC
  `).all(...params);
  
  // Status trend over time
  const statusTrend = db.prepare(`
    SELECT 
      DATE(createdAt) as date,
      status,
      COUNT(*) as count
    FROM messages 
    WHERE createdAt >= datetime('now', '-30 days')
    GROUP BY DATE(createdAt), status
    ORDER BY date DESC, count DESC
  `).all();
  
  return NextResponse.json({
    success: true,
    data: {
      statusDetails,
      statusTrend
    }
  });
}

async function getProviderReport(db: Database.Database, baseQuery: string, params: any[]) {
  // Extract provider information from metadata
  const providerStats = db.prepare(`
    SELECT 
      CASE 
        WHEN metadata LIKE '%"provider":"meta"%' THEN 'Meta'
        WHEN metadata LIKE '%"provider":"vonage"%' THEN 'Vonage'
        WHEN metadata LIKE '%"provider":"twilio"%' THEN 'Twilio'
        WHEN metadata LIKE '%"provider":"legacy"%' THEN 'Legacy SMS'
        ELSE 'Unknown'
      END as provider,
      COUNT(*) as count,
      AVG(CASE WHEN status = 'SENT' THEN 1 ELSE 0 END) * 100 as successRate
    FROM messages ${baseQuery}
    GROUP BY 
      CASE 
        WHEN metadata LIKE '%"provider":"meta"%' THEN 'Meta'
        WHEN metadata LIKE '%"provider":"vonage"%' THEN 'Vonage'
        WHEN metadata LIKE '%"provider":"twilio"%' THEN 'Twilio'
        WHEN metadata LIKE '%"provider":"legacy"%' THEN 'Legacy SMS'
        ELSE 'Unknown'
      END
    ORDER BY count DESC
  `).all(...params);
  
  return NextResponse.json({
    success: true,
    data: {
      providerStats
    }
  });
}

async function getTimelineReport(db: Database.Database, baseQuery: string, params: any[], groupBy: string) {
  let dateFormat: string;
  
  switch (groupBy) {
    case 'hour':
      dateFormat = '%Y-%m-%d %H:00';
      break;
    case 'day':
      dateFormat = '%Y-%m-%d';
      break;
    case 'week':
      dateFormat = '%Y-%W';
      break;
    case 'month':
      dateFormat = '%Y-%m';
      break;
    default:
      dateFormat = '%Y-%m-%d';
  }
  
  const timelineData = db.prepare(`
    SELECT 
      strftime('${dateFormat}', createdAt) as period,
      COUNT(*) as totalMessages,
      COUNT(CASE WHEN status = 'SENT' THEN 1 END) as sentMessages,
      COUNT(CASE WHEN status = 'FAILED' THEN 1 END) as failedMessages,
      COUNT(CASE WHEN status = 'DELIVERED' THEN 1 END) as deliveredMessages
    FROM messages ${baseQuery}
    GROUP BY strftime('${dateFormat}', createdAt)
    ORDER BY period ASC
  `).all(...params);
  
  return NextResponse.json({
    success: true,
    data: {
      timelineData,
      groupBy
    }
  });
}

async function getPerformanceReport(db: Database.Database, baseQuery: string, params: any[]) {
  // Calculate delivery rates and timing
  const performanceMetrics = db.prepare(`
    SELECT 
      COUNT(*) as totalMessages,
      COUNT(CASE WHEN status = 'SENT' THEN 1 END) as sentCount,
      COUNT(CASE WHEN status = 'DELIVERED' THEN 1 END) as deliveredCount,
      COUNT(CASE WHEN status = 'FAILED' THEN 1 END) as failedCount,
      ROUND(COUNT(CASE WHEN status = 'SENT' THEN 1 END) * 100.0 / COUNT(*), 2) as sendRate,
      ROUND(COUNT(CASE WHEN status = 'DELIVERED' THEN 1 END) * 100.0 / NULLIF(COUNT(CASE WHEN status = 'SENT' THEN 1 END), 0), 2) as deliveryRate,
      ROUND(COUNT(CASE WHEN status = 'FAILED' THEN 1 END) * 100.0 / COUNT(*), 2) as failureRate
    FROM messages ${baseQuery}
  `).get(...params) as any;
  
  // Time-based performance
  const timePerformance = db.prepare(`
    SELECT 
      strftime('%H', createdAt) as hour,
      COUNT(*) as messageCount,
      COUNT(CASE WHEN status = 'SENT' THEN 1 END) as sentCount,
      ROUND(COUNT(CASE WHEN status = 'SENT' THEN 1 END) * 100.0 / COUNT(*), 2) as successRate
    FROM messages 
    WHERE createdAt >= datetime('now', '-7 days')
    GROUP BY strftime('%H', createdAt)
    ORDER BY hour
  `).all();
  
  return NextResponse.json({
    success: true,
    data: {
      performanceMetrics,
      timePerformance
    }
  });
}