import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';

// GET - Fetch single message with events
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const db = getDb();
    
    // Get message details
    const message = db.prepare(`
      SELECT * FROM messages WHERE id = ?
    `).get(resolvedParams.id);
    
    if (!message) {
      return NextResponse.json(
        { success: false, error: 'Message not found' },
        { status: 404 }
      );
    }
    
    // Get message events
    const events = db.prepare(`
      SELECT * FROM message_events 
      WHERE messageId = ? 
      ORDER BY createdAt DESC
    `).all(resolvedParams.id);
    
    return NextResponse.json({
      success: true,
      data: {
        message,
        events
      }
    });
    
  } catch (error) {
    console.error('Error fetching message:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch message' },
      { status: 500 }
    );
  }
}

// PUT - Update message
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const body = await request.json();
    const { status, priority } = body;
    
    const db = getDb();
    
    // Check if message exists
    const existingMessage = db.prepare(`
      SELECT * FROM messages WHERE id = ?
    `).get(resolvedParams.id);
    
    if (!existingMessage) {
      return NextResponse.json(
        { success: false, error: 'Message not found' },
        { status: 404 }
      );
    }
    
    // Build update query
    let query = 'UPDATE messages SET ';
    const paramsArray: any[] = [];
    const updates: string[] = [];
    
    if (status) {
      updates.push('status = ?');
      paramsArray.push(status);
    }
    
    if (priority) {
      updates.push('priority = ?');
      paramsArray.push(priority);
    }
    
    if (updates.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No fields to update' },
        { status: 400 }
      );
    }
    
    query += updates.join(', ') + ', updatedAt = datetime(\'now\') WHERE id = ?';
    paramsArray.push(resolvedParams.id);
    
    const result = db.prepare(query).run(...paramsArray);
    
    // Insert event for status change
    if (status) {
      const eventStmt = db.prepare(`
        INSERT INTO message_events (messageId, eventType, eventPayload, createdAt)
        VALUES (?, ?, ?, datetime('now'))
      `);
      
      eventStmt.run(resolvedParams.id, 'STATUS_CHANGED', JSON.stringify({ 
        oldStatus: (existingMessage as any).status, 
        newStatus: status 
      }));
    }
    
    return NextResponse.json({
      success: true,
      data: {
        id: resolvedParams.id,
        updatedRows: result.changes
      }
    });
    
  } catch (error) {
    console.error('Error updating message:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update message' },
      { status: 500 }
    );
  }
}

// DELETE - Delete message
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const db = getDb();
    
    // Check if message exists
    const existingMessage = db.prepare(`
      SELECT * FROM messages WHERE id = ?
    `).get(resolvedParams.id);
    
    if (!existingMessage) {
      return NextResponse.json(
        { success: false, error: 'Message not found' },
        { status: 404 }
      );
    }
    
    // Delete message and related events
    const result = db.prepare(`
      DELETE FROM messages WHERE id = ?
    `).run(resolvedParams.id);
    
    // Delete related events
    db.prepare(`
      DELETE FROM message_events WHERE messageId = ?
    `).run(resolvedParams.id);
    
    return NextResponse.json({
      success: true,
      data: {
        id: resolvedParams.id,
        deletedRows: result.changes
      }
    });
    
  } catch (error) {
    console.error('Error deleting message:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete message' },
      { status: 500 }
    );
  }
}
