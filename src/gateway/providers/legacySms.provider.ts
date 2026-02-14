import { IProvider, ProviderResponse } from './provider.interface';
import axios from 'axios';

export class LegacySmsProvider implements IProvider {
    id = 'legacy';
    private url: string;

    constructor(config: any) {
        this.url = config.url || 'http://10.220.172.100:7070/API/Service/Interface/v3/SendSMS';
    }

    async send(to: string, message: string, transId: string): Promise<ProviderResponse> {
        try {
            const payload = {
                message: message,
                mobileNo: to, // Legacy API expects raw or normalized? Assuming normalized is safer or raw depending on legacy. 
                // But we should likely send what we normalized if legacy supports it, or check requirements.
                // Requirement says: "compatibility 100% with payload of old provider... send to old SMS API".
                // We will send the numeric part.
                transID: transId
            };

            const response = await axios.post(this.url, payload, { timeout: 5000 });

            return {
                success: response.status >= 200 && response.status < 300,
                rawResponse: response.data,
                providerMessageId: 'LEGACY-NO-ID' // Legacy might not return an ID easily or we have to parse it
            };
        } catch (error: any) {
            return {
                success: false,
                rawResponse: error.response?.data || error.message,
                error: error.message
            };
        }
    }
}
