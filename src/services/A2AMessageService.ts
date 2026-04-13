import axios from 'axios';
import * as https from 'https';
import { logToFile } from '@/lib/logger';
import { getDb, executeWrite } from '@/lib/db';
import type { Message } from '@/server/messagesRepo';
import { loadA2AConfig, validateA2AConfig } from '@/lib/a2a-config';
import { WhatsAppNotificationService } from './WhatsAppNotificationService';
import { logA2A } from '@/lib/a2a-logger';

/**
 * Service for handling A2A message fetching and processing
 */
export class A2AMessageService {
  private isRunning = false;
  private intervalId: NodeJS.Timeout | null = null;

  /**
   * Fetch A2A notifications from the API server
   */
  async fetchA2ANotifications(configOverride?: any, mode: 'live' | 'test' = 'live'): Promise<any[]> {
    const config = configOverride || loadA2AConfig(mode);
    const a2aRequest = {
      a2ARequest: {
        header: {
          connectorID: configOverride?.connectorID || config.connectorID || "EN",
          srvID: configOverride?.srvID || config.srvID || "1",
          UserID: configOverride?.userId || configOverride?.UserID || config.userId || "User",
          Password: configOverride?.password || configOverride?.Password || config.password || "123",
          channel: configOverride?.channel || config.channel || "MW",
          BankCode: configOverride?.bankCodeHeader || config.bankCodeHeader || "A2A"
        },
        body: {
          BankCode: configOverride?.bankCode || config.bankCode || "1030200", // Default to live bank code
          Sender: configOverride?.sender || config.sender || "FADBank"
        },
        footer: {
          signature: null 
        }
      }
    };

    try {
      const response = await axios.post(
        `https://${config.host || 'A2A-SMS-CONNECTOR.mepspay.com'}:${config.port || 9312}${config.apiUrl || '/wsGetMailsNotification/API/A2A/GetbankNotificationsList'}`,
        a2aRequest,
        {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 30000,
          // Disable SSL verification if needed (only for development)
          httpsAgent: process.env.NODE_ENV === 'development' ? new https.Agent({ rejectUnauthorized: false }) : undefined
        }
      );

      // Log the A2A fetch operation using dedicated A2A logger
      await logA2A({
        timestamp: new Date().toISOString(),
        action: 'A2A_FETCH_NOTIFICATIONS',
        status: 'SUCCESS',
        details: {
          request: a2aRequest,
          response: response.data
        },
        mode: mode
      });
      
      // Also log to main messages log for visibility
      await logToFile('messages', {
        timestamp: new Date().toISOString(),
        action: 'A2A_FETCH_NOTIFICATIONS',
        status: 'SUCCESS',
        request: a2aRequest,
        response: response.data,
        mode: mode
      });

      const notifications = response.data.a2AResponse?.body?.ltsNotifications || [];
      console.log(`Fetched ${notifications.length} A2A notifications`);
      return notifications;
    } catch (error: any) {
      console.error('Error fetching A2A notifications:', error);
      
      // Log the error using dedicated A2A logger
      await logA2A({
        timestamp: new Date().toISOString(),
        action: 'A2A_FETCH_NOTIFICATIONS',
        status: 'ERROR',
        error: error.message,
        details: {
          request: a2aRequest
        },
        mode: mode
      });
      
      // Also log to main messages log for visibility
      await logToFile('messages', {
        timestamp: new Date().toISOString(),
        action: 'A2A_FETCH_NOTIFICATIONS',
        status: 'ERROR',
        error: error.message,
        request: a2aRequest,
        mode: mode
      });

      throw error;
    }
  }

  /**
   * Send A2A notifications as WhatsApp messages
   */
  async storeA2AMessages(notifications: any[]): Promise<void> {
    const whatsappService = new WhatsAppNotificationService();
    
    for (const notification of notifications) {
      try {
        // Prepare WhatsApp message payload
        const payload = {
          to: notification.MsgMobNo,
          body: notification.MsgText,
          messageType: 'TEXT' as const,
          provider: 'meta' as const, // Use the primary WhatsApp provider
          meta: {
            sourceSystem: 'A2A',
            txnId: `a2a-${Date.now()}-${notification.Seq}`,
            eventType: 'OTHER' as const,
          }
        };

        // Send message via WhatsApp
        const result = await whatsappService.send(payload);
        
        // Log the result
        if (result.success) {
          console.log(`WhatsApp message sent successfully to ${notification.MsgMobNo}`);
          
          // Store in messages table for tracking
          const db = getDb();
          const messageRecord = {
            transId: `a2a_${Date.now()}_${notification.Seq || Math.random().toString(36).substr(2, 9)}`,
            mobileNo: notification.MsgMobNo?.toString()?.trim() || '',
            message: notification.MsgText || '',
            priority: notification.MsgPriority?.toString() || 'NORMAL',
            selectedProvider: 'a2a',
            status: 'SENT',
            providerMessageId: result.providerMessageId || null,
            lastError: undefined
          };

          const storeResult = executeWrite(
            `INSERT INTO messages (referenceId, sender, [to], message, status, providerMessageId, priority, metadata, createdAt, updatedAt) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
            [
              messageRecord.transId,
              'A2A_System',
              messageRecord.mobileNo,
              messageRecord.message,
              messageRecord.status,
              messageRecord.providerMessageId,
              messageRecord.priority,
              JSON.stringify({ source: 'A2A', seq: notification.Seq, srvID: notification.SrvID, eDesc: notification.EDesc, providerResult: result })
            ]
          );

          if (!storeResult.success) {
            console.error('Failed to store A2A message in database:', storeResult.error);
          }
        } else {
          console.error(`Failed to send WhatsApp message to ${notification.MsgMobNo}:`, result.errorMessage);
          
          // Store failed message in database
          const db = getDb();
          const messageRecord = {
            transId: `a2a_${Date.now()}_${notification.Seq || Math.random().toString(36).substr(2, 9)}`,
            mobileNo: notification.MsgMobNo?.toString()?.trim() || '',
            message: notification.MsgText || '',
            priority: notification.MsgPriority?.toString() || 'NORMAL',
            selectedProvider: 'a2a',
            status: 'FAILED',
            providerMessageId: null,
            lastError: result.errorMessage || 'Unknown error'
          };

          const storeResult = executeWrite(
            `INSERT INTO messages (referenceId, sender, [to], message, status, providerMessageId, priority, metadata, createdAt, updatedAt) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
            [
              messageRecord.transId,
              'A2A_System',
              messageRecord.mobileNo,
              messageRecord.message,
              messageRecord.status,
              messageRecord.providerMessageId,
              messageRecord.priority,
              JSON.stringify({ source: 'A2A', seq: notification.Seq, srvID: notification.SrvID, eDesc: notification.EDesc, error: result.errorMessage })
            ]
          );

          if (!storeResult.success) {
            console.error('Failed to store failed A2A message in database:', storeResult.error);
          }
        }
      } catch (error: any) {
        console.error('Error sending A2A notification via WhatsApp:', error);
      }
    }
  }

  /**
   * Start periodic fetching of A2A notifications
   */
  startPolling(config: any, intervalMs: number = 30000, mode: 'live' | 'test' = 'live'): void {
    if (this.isRunning) {
      console.log('A2A polling is already running');
      return;
    }

    console.log(`Starting A2A polling every ${intervalMs}ms (mode: ${mode})`);
    this.isRunning = true;

    // Run immediately first time
    this.fetchAndProcessA2AMessages(undefined, mode);

    // Then run periodically
    this.intervalId = setInterval(async () => {
      await this.fetchAndProcessA2AMessages(undefined, mode);
    }, intervalMs);
  }

  /**
   * Stop periodic fetching
   */
  stopPolling(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    console.log('Stopped A2A polling');
  }

  /**
   * Fetch and process A2A messages
   */
  private async fetchAndProcessA2AMessages(config: any, mode: 'live' | 'test' = 'live'): Promise<void> {
    try {
      console.log(`Fetching A2A notifications (mode: ${mode})...`);
      
      // If config is not provided, load it based on mode
      const effectiveConfig = config || loadA2AConfig(mode);
      const notifications = await this.fetchA2ANotifications(effectiveConfig, mode);
      
      if (notifications.length > 0) {
        await this.storeA2AMessages(notifications);
        
        // Log summary
        await logToFile('messages', { // Using existing category
          timestamp: new Date().toISOString(),
          action: 'A2A_BATCH_PROCESSED',
          status: 'SUCCESS',
          count: notifications.length,
          processedAt: new Date().toISOString(),
          mode: mode
        });
      } else {
        console.log(`No new A2A notifications found (mode: ${mode})`);
      }
    } catch (error: any) {
      console.error(`Error in A2A fetch and process cycle (mode: ${mode}):`, error);
      
      // Log error
      await logToFile('messages', { // Using existing category
        timestamp: new Date().toISOString(),
        action: 'A2A_BATCH_ERROR',
        status: 'ERROR',
        error: error.message,
        processedAt: new Date().toISOString(),
        mode: mode
      });
    }
  }

  /**
   * Get A2A messages from database with filtering
   */
  getA2AMessages(filter: { status?: string; mobileNo?: string; dateFrom?: string; dateTo?: string } = {}, limit = 50, offset = 0) {
    let query = `SELECT * FROM messages WHERE selectedProvider = 'a2a'`;
    const params: any[] = [];

    if (filter.status) {
      query += ' AND status = ?';
      params.push(filter.status);
    }

    if (filter.mobileNo) {
      query += ' AND [to] LIKE ?';
      params.push(`%${filter.mobileNo}%`);
    }

    if (filter.dateFrom) {
      query += ' AND createdAt >= ?';
      params.push(filter.dateFrom);
    }
    if (filter.dateTo) {
      query += ' AND createdAt <= ?';
      params.push(filter.dateTo);
    }

    query += ' ORDER BY createdAt DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const db = getDb();
    const stmt = db.prepare(query);
    const messages = stmt.all(...params) as Message[];

    // Get total count
    let countQuery = `SELECT COUNT(*) as count FROM messages WHERE selectedProvider = 'a2a'`;
    const countParams: any[] = [];
    if (filter.status) {
      countQuery += ' AND status = ?';
      countParams.push(filter.status);
    }
    if (filter.mobileNo) {
      countQuery += ' AND [to] LIKE ?';
      countParams.push(`%${filter.mobileNo}%`);
    }
    if (filter.dateFrom) {
      countQuery += ' AND createdAt >= ?';
      countParams.push(filter.dateFrom);
    }
    if (filter.dateTo) {
      countQuery += ' AND createdAt <= ?';
      countParams.push(filter.dateTo);
    }
    
    const countStmt = db.prepare(countQuery);
    const countResult = countStmt.get(...countParams) as { count: number } | undefined;
    const total = countResult?.count || 0;

    return { data: messages, total };
  }
}