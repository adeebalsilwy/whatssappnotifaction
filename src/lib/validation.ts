import { z } from 'zod';
import { providers } from './types';

/**
 * Zod schema for validating the incoming payload for sending a WhatsApp message.
 * This ensures that the data received from the Core Banking system is in the correct format.
 */
// Helper to map 'message' to 'body' if present
const preprocessor = (input: any) => {
    if (typeof input === 'object' && input !== null) {
        // If 'message' is provided but 'body' is not, use 'message' as 'body'
        if (input.message && !input.body) {
            return { ...input, body: input.message };
        }
    }
    return input;
};

export const OutgoingMessagePayloadSchema = z.preprocess(preprocessor, z.object({
    provider: z.enum(providers).optional(),
    messageType: z.enum(['TEXT','TEMPLATE']).optional().default('TEXT'),
    to: z.string().min(1, 'Recipient phone number (to) is required.'),
    from: z.string().optional(),
    templateId: z.string().optional(),
    variables: z.record(z.string()).optional(),
    body: z.string().min(1, 'Message content is required (use "message" or "body").'),
    // message field is handled by preprocess, so we don't strictly need it here, 
    // but if we want to allow it to pass through (though unused), we can add .strip() or just ignore.
    // We made meta optional for easier integration
    meta: z.object({
        sourceSystem: z.string().optional(),
        companyId: z.string().optional(),
        txnId: z.string().optional(),
        accountNo: z.string().optional(),
        eventType: z.enum(['DEBIT', 'CREDIT', 'TRANSFER', 'OTHER']).optional(),
        timestamp: z.string().datetime().optional(),
    }).optional().default({}),
}));


/**
 * Zod schema for validating the provider settings from the settings page.
 */
export const ProviderSettingsSchema = z.object({
    defaultProvider: z.enum(providers),
    providers: z.object({
        meta: z.object({
            url: z.string().url().optional().or(z.literal('')),
            token: z.string().optional(),
            numberId: z.string().optional(),
        }),
        vonage: z.object({
            url: z.string().url().optional().or(z.literal('')),
            apiKey: z.string().optional(),
            apiSecret: z.string().optional(),
            from: z.string().optional(),
        }),
        generic: z.object({
            url: z.string().url().optional().or(z.literal('')),
            token: z.string().optional(),
        }),
        direct: z.object({
            url: z.string().url().optional().or(z.literal('')),
            token: z.string().optional(),
            from: z.string().optional(),
        }),
    })
});
