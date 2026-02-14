import { Vonage } from '@vonage/server-sdk';
import { Auth } from '@vonage/auth';
import { IProvider, ProviderResponse } from './provider.interface';

/** Helper to create a Vonage client, useful for testing */
export function createVonageClient(config: any): Vonage {
    const apiKey = config.apiKey || process.env.VONAGE_API_KEY;
    const apiSecret = config.apiSecret || process.env.VONAGE_API_SECRET;
    const applicationId = config.applicationId || process.env.VONAGE_APPLICATION_ID;
    const credentials = new Auth({ apiKey, apiSecret, applicationId });
    return new Vonage(credentials);
}

export class VonageSDKProvider implements IProvider {
    id = 'vonage-sdk';
    private vonage: Vonage;
    private fromNumber: string;
    private applicationId?: string;

    constructor(config: any) {
        // Initialize Vonage SDK with credentials
        // Validate and fallback to environment variables if needed
        const apiKey = config.apiKey || process.env.VONAGE_API_KEY;
        const apiSecret = config.apiSecret || process.env.VONAGE_API_SECRET;
        const applicationId = config.applicationId || process.env.VONAGE_APPLICATION_ID || 'f1657174-aeb0-40bf-95c1-4feed0af22e4';
        let privateKey = config.privateKey || process.env.VONAGE_PRIVATE_KEY;

        if (!privateKey) {
            try {
                const fs = require('fs');
                const path = require('path');
                const cwd = process.cwd();
                console.log(`[Vonage SDK] Searching for private.key in CWD: ${cwd}`);

                const possiblePaths = [
                    path.join(cwd, 'private.key'),
                    path.join(cwd, '..', 'private.key'),
                    'e:\\DeeboDEV\\nodejs\\whatsapp\\private.key'
                ];

                for (const p of possiblePaths) {
                    if (fs.existsSync(p)) {
                        console.log(`[Vonage SDK] Found private key file at: ${p}`);
                        privateKey = fs.readFileSync(p, 'utf8');
                        break;
                    }
                }
            } catch (e) {
                console.error('[Vonage SDK] Failed to read private key file:', e);
            }
        }

        // Strict Requirement: If Application ID is used and no apiKey/apiSecret are present, Private Key is MANDATORY for Messages API v1
        if (applicationId && !privateKey && !(apiKey && apiSecret)) {
            throw new Error(`[Vonage SDK] FATAL: Application ID (${applicationId}) is configured, but NO PRIVATE KEY was found and no API key/secret were provided. Provide VONAGE_PRIVATE_KEY or VONAGE_API_KEY/VONAGE_API_SECRET.`);
        }

        if ((!apiKey || !apiSecret) && !privateKey) {
            throw new Error('Vonage API credentials are missing. Set VONAGE_API_KEY and VONAGE_API_SECRET, or provide a private.key file/VONAGE_PRIVATE_KEY.');
        }

        const authConfig: any = { applicationId };
        if (apiKey && apiSecret) {
            authConfig.apiKey = apiKey;
            authConfig.apiSecret = apiSecret;
        }
        if (privateKey) {
            if (privateKey.trim().includes('BEGIN PUBLIC KEY')) {
                throw new Error('FATAL: The provided key is a PUBLIC KEY. You must provide the PRIVATE KEY (starts with -----BEGIN PRIVATE KEY-----). Please check your private.key file or VONAGE_PRIVATE_KEY env var.');
            }
            authConfig.privateKey = privateKey;
        }

        const credentials = new Auth(authConfig);

        this.vonage = new Vonage(credentials);
        // Set the sending number, fallback to env or default sandbox number
        this.fromNumber = config.fromNumber || process.env.VONAGE_FROM_NUMBER || '12019404006';
        this.applicationId = applicationId;

        console.log('[Vonage SDK] Initialized with Application ID:', this.applicationId);
    }

    async send(to: string, message: string, transId: string): Promise<ProviderResponse> {
        const { logToFile } = require('@/lib/logger'); // Dynamic import to avoid circular dep if any

        // Fallback Template Configuration from Environment
        const templateName = process.env.VONAGE_WA_TEMPLATE_NAME;
        const templateLocale = process.env.VONAGE_WA_TEMPLATE_LOCALE || 'en';
        // Params separated by pipe |, e.g. "Valued Customer|1234"
        const templateParams = (process.env.VONAGE_WA_TEMPLATE_PARAMS || '').split('|').filter(Boolean);

        try {
            console.log(`[Vonage SDK] Sending WhatsApp message to ${to}`);

            // --- DEBUG: Log the attempt ---
            await logToFile('vonage_debug', {
                action: 'SEND_ATTEMPT_TEXT',
                to,
                from: this.fromNumber,
                appId: this.applicationId
            });

            // 1) Try sending standard free-form Text Message
            const response = await this.vonage.messages.send({
                messageType: 'text',
                channel: 'whatsapp',
                to,
                from: this.fromNumber,
                text: message,
                clientRef: transId
            });

            console.log('[Vonage SDK] ✅ Success! Response:', response);

            // --- DEBUG: Log success ---
            await logToFile('vonage_debug', {
                action: 'SEND_SUCCESS_TEXT',
                response
            });

            const msgId = (response as any).message_uuid || (response as any).messageUUID || (response as any).messageId;
            return {
                success: true,
                providerMessageId: msgId,
                rawResponse: response
            };

        } catch (error: any) {
            // Extract Error Details
            const code = error?.response?.data?.code || error?.response?.data?.error?.code;
            const title = error?.response?.data?.title || error?.message;

            console.error(`[Vonage SDK] ❌ Error Sending Text: Code=${code}, Title=${title}`);
            if (error?.response?.data) {
                console.error('[Vonage SDK] Error Response Data:', JSON.stringify(error.response.data, null, 2));
            }

            // --- DEBUG: Log failure ---
            await logToFile('vonage_debug', {
                action: 'SEND_FAILURE_TEXT',
                error: title,
                code: code,
                details: error?.response?.data || error
            });

            // 2) Check for Error 1340: Outside of allowed window (Need to use Template)
            const isPolicyViolation = String(code) === '1340' ||
                String(title).toLowerCase().includes('outside of the allowed window') ||
                JSON.stringify(error).includes('1340');

            if (isPolicyViolation) {
                console.log('[Vonage SDK] ⚠️ 1340 Error detected. Falling back to Template Message... (Template: ' + (templateName || 'NONE') + ')');

                if (!templateName) {
                    const err = 'WhatsApp requires a TEMPLATE (MTM) but VONAGE_WA_TEMPLATE_NAME is missing in env.';
                    console.error(err);
                    await logToFile('vonage_debug', { action: 'TEMPLATE_FALLBACK_FAILED', reason: 'MISSING_ENV_VAR' });
                    return {
                        success: false,
                        error: err,
                        rawResponse: error?.response?.data || error,
                    };
                }

                try {
                    // 3) Send Template Message (MTM)
                    const tplResp = await this.vonage.messages.send({
                        to,
                        from: this.fromNumber,
                        channel: 'whatsapp',
                        messageType: 'template',
                        whatsapp: {
                            policy: 'deterministic',
                            locale: templateLocale as any
                        },
                        template: {
                            name: templateName,
                            parameters: templateParams,
                        },
                        clientRef: transId,
                    });

                    console.log('[Vonage SDK] ✅ Template Fallback Success! Response:', tplResp);

                    await logToFile('vonage_debug', {
                        action: 'SEND_SUCCESS_TEMPLATE',
                        response: tplResp
                    });

                    const msgId = (tplResp as any).message_uuid || (tplResp as any).messageUUID || (tplResp as any).messageId;
                    return {
                        success: true,
                        providerMessageId: msgId,
                        rawResponse: tplResp,
                    };

                } catch (tplError: any) {
                    const tplCode = tplError?.response?.data?.code;
                    const tplMsg = tplError?.response?.data?.title || tplError.message;
                    console.error(`[Vonage SDK] ❌ Template Fallback Failed:`, tplMsg);

                    await logToFile('vonage_debug', {
                        action: 'SEND_FAILURE_TEMPLATE',
                        error: tplMsg,
                        code: tplCode,
                        details: tplError?.response?.data || tplError
                    });

                    return {
                        success: false,
                        error: `Template Fallback Failed: ${tplMsg}`,
                        rawResponse: tplError?.response?.data || tplError
                    };
                }
            }

            // Return original confirmation of failure if not 1340 or other error
            let errorMessage = error.message;
            let errorDetails = error;
            if (error.response) {
                errorMessage = error.response.data?.title || error.response.data?.detail || error.message;
                errorDetails = error.response.data;
            }
            return {
                success: false,
                error: errorMessage,
                rawResponse: errorDetails
            };
        }
    }

    /**
     * Send a template (MTM) message explicitly via Vonage Messages API
     */
    async sendTemplate(to: string, templateName: string, parameters: string[], transId: string, locale = 'en_US'): Promise<ProviderResponse> {
        const { logToFile } = require('@/lib/logger');
        try {
            await logToFile('vonage_debug', { action: 'SEND_ATTEMPT_TEMPLATE', to, templateName, parameters });

            const tplResp = await this.vonage.messages.send({
                to,
                from: this.fromNumber,
                channel: 'whatsapp',
                messageType: 'template',
                whatsapp: { policy: 'deterministic', locale: locale as any },
                template: { name: templateName, parameters },
                clientRef: transId
            });

            await logToFile('vonage_debug', { action: 'SEND_SUCCESS_TEMPLATE', response: tplResp });

            const msgId = (tplResp as any).message_uuid || (tplResp as any).messageUUID || (tplResp as any).messageId;
            return { success: true, providerMessageId: msgId, rawResponse: tplResp };
        } catch (err: any) {
            await logToFile('vonage_debug', { action: 'SEND_FAILURE_TEMPLATE', error: err?.message || err });
            return { success: false, error: err?.message || 'Template send failed', rawResponse: err?.response?.data || err };
        }
    }
}
