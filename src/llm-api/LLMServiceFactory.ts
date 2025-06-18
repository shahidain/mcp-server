import { ILLMService, LLMProvider, LLMServiceConfig } from './ILLMService.js';
import { OpenAILLMService } from './llmTools.js';
import { OllamaLLMService } from './llmLocalTools.js';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Factory class for creating and managing LLM service instances
 * Allows easy switching between OpenAI and Ollama implementations
 */
export class LLMServiceFactory {
  private static instance: LLMServiceFactory;
  private currentService: ILLMService | null = null;
  private currentProvider: LLMProvider | null = null;

  private constructor() {}

  /**
   * Get singleton instance of the factory
   */
  static getInstance(): LLMServiceFactory {
    if (!LLMServiceFactory.instance) {
      LLMServiceFactory.instance = new LLMServiceFactory();
    }
    return LLMServiceFactory.instance;
  }

  /**
   * Create an LLM service instance based on the provider
   * @param config - Configuration for the LLM service
   * @returns ILLMService implementation
   */
  createService(config: LLMServiceConfig): ILLMService {
    switch (config.provider) {
      case LLMProvider.OPENAI:
        return new OpenAILLMService();
      
      case LLMProvider.OLLAMA:
        return new OllamaLLMService(config.baseUrl, config.model);
      
      default:
        throw new Error(`Unsupported LLM provider: ${config.provider}`);
    }
  }

  /**
   * Get or create the current service instance
   * @param provider - Optional provider to switch to
   * @param config - Optional configuration for the service
   * @returns Current ILLMService instance
   */
  getService(provider?: LLMProvider, config?: Partial<LLMServiceConfig>): ILLMService {
    const targetProvider = provider || this.getDefaultProvider();
    
    // If we need to switch providers or don't have a service yet
    if (!this.currentService || this.currentProvider !== targetProvider) {
      const serviceConfig: LLMServiceConfig = {
        provider: targetProvider,
        model: config?.model,
        apiKey: config?.apiKey,
        baseUrl: config?.baseUrl,
        maxRetries: config?.maxRetries || 3,
        retryDelayMs: config?.retryDelayMs || 1000,
        ...config
      };

      this.currentService = this.createService(serviceConfig);
      this.currentProvider = targetProvider;
      
      console.log(`LLM Service switched to: ${targetProvider}`);
    }

    return this.currentService;
  }

  /**
   * Determine the default provider based on environment variables
   * @returns Default LLM provider
   */
  private getDefaultProvider(): LLMProvider {
    const envProvider = process.env.LLM_PROVIDER?.toLowerCase();
    
    switch (envProvider) {
      case 'ollama':
      case 'local':
        return LLMProvider.OLLAMA;
      case 'openai':
        return LLMProvider.OPENAI;
      default:
        // Default to OpenAI if API key is available, otherwise Ollama
        return process.env.OPENAI_API_KEY ? LLMProvider.OPENAI : LLMProvider.OLLAMA;
    }
  }

  /**
   * Force switch to a specific provider
   * @param provider - The provider to switch to
   * @param config - Optional configuration for the new service
   */
  switchProvider(provider: LLMProvider, config?: Partial<LLMServiceConfig>): void {
    this.currentService = null;
    this.currentProvider = null;
    this.getService(provider, config);
  }

  /**
   * Get the current provider name
   * @returns Current provider or null if no service is active
   */
  getCurrentProvider(): LLMProvider | null {
    return this.currentProvider;
  }

  /**
   * Check if a provider is available
   * @param provider - The provider to check
   * @returns Promise that resolves to true if available
   */
  async isProviderAvailable(provider: LLMProvider): Promise<boolean> {
    try {
      const tempService = this.createService({ provider });
      
      if (provider === LLMProvider.OLLAMA && 'validateOllamaService' in tempService) {
        // For Ollama, check if the service is running
        await (tempService as any).validateOllamaService();
      } else if (provider === LLMProvider.OPENAI) {
        // For OpenAI, check if API key is configured
        return !!process.env.OPENAI_API_KEY;
      }
      
      return true;
    } catch (error) {
      console.warn(`Provider ${provider} is not available:`, error);
      return false;
    }
  }
}

/**
 * Convenience function to get the current LLM service
 * @param provider - Optional provider to use
 * @param config - Optional configuration
 * @returns Current ILLMService instance
 */
export function getLLMService(provider?: LLMProvider, config?: Partial<LLMServiceConfig>): ILLMService {
  return LLMServiceFactory.getInstance().getService(provider, config);
}

/**
 * Convenience function to switch LLM provider
 * @param provider - The provider to switch to
 * @param config - Optional configuration
 */
export function switchLLMProvider(provider: LLMProvider, config?: Partial<LLMServiceConfig>): void {
  LLMServiceFactory.getInstance().switchProvider(provider, config);
}

/**
 * Get the current LLM provider
 * @returns Current provider name
 */
export function getCurrentLLMProvider(): LLMProvider | null {
  return LLMServiceFactory.getInstance().getCurrentProvider();
}
