export interface IProvider {
    id: string;
    send(to: string, message: string, transId: string, priority?: string): Promise<ProviderResponse>;
}

export interface ProviderResponse {
    success: boolean;
    providerMessageId?: string;
    rawResponse?: any;
    error?: string;
}
