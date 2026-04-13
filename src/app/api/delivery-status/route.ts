import { NextResponse } from 'next/server';
import { DeliveryTracker } from '@/lib/delivery-tracker';

export async function GET() {
  try {
    const deliveryTracker = DeliveryTracker.getInstance();
    
    // Get delivery statistics for last 24 hours
    const stats = await deliveryTracker.getDeliveryStats(24);
    
    // Get recent delivery status
    const recentStatus = await deliveryTracker.getRecentDeliveryStatus(50);
    
    // Get failed messages
    const failedMessages = await deliveryTracker.getFailedMessages(24);
    
    return NextResponse.json({
      success: true,
      data: {
        stats,
        recent_status: recentStatus,
        failed_messages: failedMessages,
        last_updated: new Date().toISOString()
      }
    });
  } catch (error: any) {
    console.error('Error fetching delivery status:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}