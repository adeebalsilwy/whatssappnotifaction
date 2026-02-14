import { IProvider, ProviderResponse } from './provider.interface';
import axios from 'axios';

export class MetaWhatsAppProvider implements IProvider {
    id = 'meta';

    constructor(private config: any) {
        // Expected config: { accessToken, phoneNumberId, version }
    }

    async send(to: string, message: string, transId: string): Promise<ProviderResponse> {
        try {
            if (!this.config.phoneNumberId) {
                throw new Error('Meta Provider not configured (missing phoneNumberId)');
            }

            const url = `https://graph.facebook.com/${this.config.version || 'v17.0'}/${this.config.phoneNumberId}/messages`;

            const payload = {
                messaging_product: 'whatsapp',
                to: to,
                type: 'text',
                text: { body: message }
            };

            const response = await axios.post(url, payload, {
                headers: {
                    'Authorization': `Bearer ${this.config.accessToken}`,
                    'Content-Type': 'application/json'
                }
            });

            return {
                success: true,
                providerMessageId: response.data.messages?.[0]?.id,
                rawResponse: response.data
            };
        } catch (error: any) {
            return {
                success: false,
                error: error.message,
                rawResponse: error.response?.data
            };
        }
    }
}
