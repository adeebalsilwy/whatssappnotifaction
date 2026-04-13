import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

// GET - Fetch messages with pagination and filters
export async function GET(request: Request) {
  try {
    const db = getDb();
    
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status') || '';
    const phoneNumber = searchParams.get('phoneNumber') || '';
    const startDate = searchParams.get('startDate') || '';
    const endDate = searchParams.get('endDate') || '';
    const provider = searchParams.get('provider') || '';
    
    const offset = (page - 1) * limit;
    
    let query = `
      SELECT m.*, 
             me.eventType as lastEventType,
             me.createdAt as lastEventTime
      FROM messages m
      LEFT JOIN message_events me ON m.id = me.messageId 
      AND me.id = (
        SELECT MAX(id) FROM message_events WHERE messageId = m.id
      )
      WHERE 1=1
    `;
    
    const params: any[] = [];
    
    if (status) {
      query += ' AND m.status = ?';
      params.push(status);
    }
    
    if (phoneNumber) {
      query += ' AND m.[to] LIKE ?';
      params.push(`%${phoneNumber}%`);
    }
    
    if (startDate) {
      query += ' AND m.createdAt >= ?';
      params.push(startDate);
    }
    
    if (endDate) {
      query += ' AND m.createdAt <= ?';
      params.push(endDate);
    }
    
    if (provider) {
      query += ' AND m.metadata LIKE ?';
      params.push(`%"provider":"${provider}"%`);
    }
    
    query += ' ORDER BY m.createdAt DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);
    
    const messages = db.prepare(query).all(...params);
    
    // Get total count
    let countQuery = `
      SELECT COUNT(*) as total 
      FROM messages m 
      WHERE 1=1
    `;
    
    const countParams: any[] = [];
    
    if (status) {
      countQuery += ' AND m.status = ?';
      countParams.push(status);
    }
    
    if (phoneNumber) {
      countQuery += ' AND m.[to] LIKE ?';
      countParams.push(`%${phoneNumber}%`);
    }
    
    if (startDate) {
      countQuery += ' AND m.createdAt >= ?';
      countParams.push(startDate);
    }
    
    if (endDate) {
      countQuery += ' AND m.createdAt <= ?';
      countParams.push(endDate);
    }
    
    if (provider) {
      countQuery += ' AND m.metadata LIKE ?';
      countParams.push(`%"provider":"${provider}"%`);
    }
    
    const totalCount = db.prepare(countQuery).get(...countParams) as { total: number };
    
    return NextResponse.json({
      success: true,
      data: messages,
      pagination: {
        page,
        limit,
        total: totalCount.total,
        totalPages: Math.ceil(totalCount.total / limit)
      }
    });
    
  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch messages' },
      { status: 500 }
    );
  }
}

// POST - Create new message
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { to, message, priority = 'normal', sender = 'system' } = body;
    
    if (!to || !message) {
      return NextResponse.json(
        { success: false, error: 'Phone number and message are required' },
        { status: 400 }
      );
    }
    
    const db = getDb();
    
    const stmt = db.prepare(`
      INSERT INTO messages (referenceId, sender, [to], message, status, priority, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `);
    
    const referenceId = `MSG_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const result = stmt.run(referenceId, sender, to, message, 'QUEUED', priority);
    
    // Insert initial event
    const eventStmt = db.prepare(`
      INSERT INTO message_events (messageId, eventType, eventPayload, createdAt)
      VALUES (?, ?, ?, datetime('now'))
    `);
    
    eventStmt.run(result.lastInsertRowid, 'CREATED', JSON.stringify({ 
      referenceId, 
      sender, 
      to, 
      message, 
      priority 
    }));
    
    return NextResponse.json({
      success: true,
      data: {
        id: result.lastInsertRowid,
        referenceId,
        to,
        message,
        status: 'QUEUED',
        priority
      }
    });
    
  } catch (error) {
    console.error('Error creating message:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create message' },
      { status: 500 }
    );
  }
}