import { DatabaseService } from '../storage/sqlite/db';

export interface ProviderPriority {
    id: number;
    provider_id: string;
    priority: number;
    enabled: boolean;
    channel: 'WHATSAPP' | 'SMS';
    fallback_provider_id?: string;
    retry_count: number;
    retry_delay_ms: number;
}

export interface MessageTemplate {
    id: number;
    template_code: string;
    template_name_ar: string;
    template_name_en: string;
    template_body_ar: string;
    template_body_en: string;
    category: 'TRANSACTION' | 'ALERT' | 'OTP' | 'NOTIFICATION';
    variables: string[];
}

export class BankTemplatesService {
    async getProviderPriorities(channel: 'WHATSAPP' | 'SMS' = 'WHATSAPP'): Promise<ProviderPriority[]> {
        const db = await DatabaseService.getInstance();
        const rows = await db.all<any[]>(
            'SELECT * FROM provider_priority WHERE channel = ? AND enabled = 1 ORDER BY priority ASC',
            channel
        );

        return rows.map(row => ({
            ...row,
            enabled: !!row.enabled,
            variables: row.variables ? JSON.parse(row.variables) : []
        }));
    }

    async updateProviderPriority(providerId: string, priority: number, channel: string): Promise<void> {
        const db = await DatabaseService.getInstance();
        await db.run(
            'UPDATE provider_priority SET priority = ?, updated_at = CURRENT_TIMESTAMP WHERE provider_id = ? AND channel = ?',
            priority, providerId, channel
        );
    }

    async getTemplate(templateCode: string): Promise<MessageTemplate | null> {
        const db = await DatabaseService.getInstance();
        const row = await db.get<any>(
            'SELECT * FROM message_templates WHERE template_code = ?',
            templateCode
        );

        if (!row) return null;

        return {
            ...row,
            variables: JSON.parse(row.variables || '[]')
        };
    }

    async renderTemplate(templateCode: string, variables: Record<string, string>, language: 'ar' | 'en' = 'ar'): Promise<string> {
        const template = await this.getTemplate(templateCode);
        if (!template) {
            throw new Error(`Template ${templateCode} not found`);
        }

        let body = language === 'ar' ? template.template_body_ar : template.template_body_en;

        // Replace variables
        for (const [key, value] of Object.entries(variables)) {
            body = body.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
        }

        return body;
    }

    async getAllTemplates(): Promise<MessageTemplate[]> {
        const db = await DatabaseService.getInstance();
        const rows = await db.all<any[]>('SELECT * FROM message_templates ORDER BY category, template_code');

        return rows.map(row => ({
            ...row,
            variables: JSON.parse(row.variables || '[]')
        }));
    }
}
