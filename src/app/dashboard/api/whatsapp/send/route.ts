/**
 * Proxy route for /dashboard/api/whatsapp/send to /api/whatsapp/send
 * This ensures that the URL used by the bank system works correctly.
 */

export { GET, POST } from '@/app/api/whatsapp/send/route';
