import { IProvider, ProviderResponse } from './provider.interface';
import axios from 'axios';

export class VonageProvider implements IProvider {
    id = 'vonage';
    private apiKey: string;
    private apiSecret: string;
    private fromNumber: string;
    private useSandbox: boolean;
    private applicationId?: string;

    constructor(config: any) {
        this.apiKey = config.apiKey;
        this.apiSecret = config.apiSecret;
        this.fromNumber = config.fromNumber || '14157386102';
        this.useSandbox = config.useSandbox !== false;
        this.applicationId = config.applicationId;
    }

    async send(to: string, message: string, transId: string): Promise<ProviderResponse> {
        try {
            // Use Sandbox or Production URL
            const baseUrl = this.useSandbox
                ? 'https://messages-sandbox.nexmo.com/v1/messages'
                : 'https://api.nexmo.com/v1/messages';

            // Vonage uses Basic Auth
            const auth = Buffer.from(`${this.apiKey}:${this.apiSecret}`).toString('base64');

            const payload: any = {
                from: this.fromNumber,
                to: to,
                message_type: 'text',
                text: message,
                channel: 'whatsapp',
                client_ref: transId
            };

            // Add application_id for production
            if (this.applicationId && !this.useSandbox) {
                payload.application_id = this.applicationId;
            }

            console.log(`[Vonage] Sending to ${to} via ${this.useSandbox ? 'Sandbox' : 'Production'}`);
            if (this.applicationId) {
                console.log(`[Vonage] Using Application ID: ${this.applicationId}`);
            }

            const response = await axios.post(baseUrl, payload, {
                headers: {
                    'Authorization': `Basic ${auth}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                timeout: 15000
            });

            console.log(`[Vonage] ✅ Success! Message UUID: ${response.data.message_uuid}`);

            return {
                success: true,
                providerMessageId: response.data.message_uuid,
                rawResponse: response.data
            };
        } catch (error: any) {
            console.error('[Vonage] ❌ Error:', error.response?.data || error.message);

            return {
                success: false,
                error: error.response?.data?.title || error.message,
                rawResponse: error.response?.data || { error: error.message }
            };
        }
    }
}
