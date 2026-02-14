import { IProvider, ProviderResponse } from '../providers/provider.interface';
import { BankTemplatesService } from './bank-templates.service';

export class DispatchService {
    private bankTemplates: BankTemplatesService;

    constructor() {
        this.bankTemplates = new BankTemplatesService();
    }

    async dispatch(
        transId: string,
        to: string,
        message: string,
        priority: string = 'NORMAL',
        channel: 'WHATSAPP' | 'SMS' = 'WHATSAPP'
    ): Promise<{ provider: string, result: ProviderResponse }> {

        // Get provider priorities from database
        const priorities = await this.bankTemplates.getProviderPriorities(channel);

        console.log(`[Dispatch] Starting dispatch for ${transId} via ${channel}`);
        console.log(`[Dispatch] Provider order:`, priorities.map(p => `${p.provider_id}(${p.priority})`).join(' -> '));

        const errors: string[] = [];

        for (const providerPriority of priorities) {
            const providerId = providerPriority.provider_id;

            // Dynamically load provider
            const provider = await this.loadProvider(providerId);

            if (!provider) {
                const msg = `Provider ${providerId} not available`;
                console.warn(`[Dispatch] ${msg}`);
                errors.push(msg);
                continue;
            }

            // Retry logic
            for (let attempt = 1; attempt <= providerPriority.retry_count; attempt++) {
                try {
                    console.log(`[Dispatch] Attempting ${providerId} (attempt ${attempt}/${providerPriority.retry_count})`);

                    const result = await provider.send(to, message, transId, priority);

                    if (result.success) {
                        console.log(`[Dispatch] ✅ Success via ${providerId}`);
                        return { provider: providerId, result };
                    }

                    const errorMsg = `Provider ${providerId} failed (attempt ${attempt}): ${result.error || 'Unknown'}`;
                    console.warn(`[Dispatch] ${errorMsg}`);
                    errors.push(errorMsg);

                    // Wait before retry
                    if (attempt < providerPriority.retry_count) {
                        await this.delay(providerPriority.retry_delay_ms);
                    }
                } catch (error: any) {
                    const errorMsg = `Provider ${providerId} exception (attempt ${attempt}): ${error.message}`;
                    console.error(`[Dispatch] ${errorMsg}`);
                    errors.push(errorMsg);
                }
            }

            // Try fallback if configured
            if (providerPriority.fallback_provider_id) {
                console.log(`[Dispatch] Trying fallback: ${providerPriority.fallback_provider_id}`);
            }
        }

        return {
            provider: 'none',
            result: {
                success: false,
                error: 'All providers failed. Details: ' + errors.join('; ')
            }
        };
    }

    private async loadProvider(providerId: string): Promise<IProvider | null> {
        try {
            const { ProvidersRepository } = await import('../storage/sqlite/repositories/providers.repo');
            const repo = new ProvidersRepository();
            const config = await repo.getById(providerId);

            if (!config || !config.enabled) {
                return null;
            }

            // Dynamically import provider
            switch (providerId) {
                case 'vonage': {
                    const { VonageProvider } = await import('../providers/vonage.provider');
                    return new VonageProvider(config.config);
                }
                case 'meta': {
                    const { MetaWhatsAppProvider } = await import('../providers/meta.provider');
                    return new MetaWhatsAppProvider(config.config);
                }
                case 'twilio': {
                    const { TwilioProvider } = await import('../providers/twilio.provider');
                    return new TwilioProvider(config.config);
                }
                case 'legacy': {
                    const { LegacySmsProvider } = await import('../providers/legacySms.provider');
                    return new LegacySmsProvider(config.config);
                }
                default:
                    return null;
            }
        } catch (error) {
            console.error(`[Dispatch] Failed to load provider ${providerId}:`, error);
            return null;
        }
    }

    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
