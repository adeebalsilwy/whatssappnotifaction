import { A2AMessageService } from '@/services/A2AMessageService';
import { loadA2AConfig } from '@/lib/a2a-config';

let a2aService: A2AMessageService | null = null;

export function initializeA2AService(): A2AMessageService {
  if (!a2aService) {
    a2aService = new A2AMessageService();
    
    // Load configuration and start polling if enabled
    const config = loadA2AConfig();
    const enablePolling = process.env.A2A_ENABLE_POLLING === 'true';
    
    if (enablePolling) {
      const intervalMs = parseInt(process.env.A2A_POLLING_INTERVAL || '30000', 10);
      a2aService.startPolling(config, intervalMs);
      console.log('A2A service initialized with polling enabled');
    } else {
      console.log('A2A service initialized (polling disabled)');
    }
  }
  
  return a2aService;
}

export function getA2AService(): A2AMessageService | null {
  return a2aService;
}

export function shutdownA2AService(): void {
  if (a2aService) {
    a2aService.stopPolling();
    a2aService = null;
    console.log('A2A service shut down');
  }
}