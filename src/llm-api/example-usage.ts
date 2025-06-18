/**
 * Example usage of the unified LLM service interface
 * This file demonstrates how to use both OpenAI and Ollama implementations
 * through the same interface
 */

import { 
  ILLMService, 
  LLMProvider, 
  LLMServiceConfig 
} from './ILLMService.js';
import { 
  LLMServiceFactory, 
  getLLMService, 
  switchLLMProvider, 
  getCurrentLLMProvider 
} from './LLMServiceFactory.js';
import { OpenAILLMService } from './llmTools.js';
import { OllamaLLMService } from './llmLocalTools.js';

/**
 * Example 1: Using the factory pattern
 */
async function exampleWithFactory() {
  console.log('=== Example 1: Using Factory Pattern ===');
  
  const factory = LLMServiceFactory.getInstance();
  
  // Get service with automatic provider detection
  const service = factory.getService();
  console.log(`Current provider: ${getCurrentLLMProvider()}`);
  
  // Generate a JQL query
  try {
    const jql = await service.getJQL("Show me all high priority bugs assigned to me");
    console.log('Generated JQL:', jql);
  } catch (error) {
    console.error('Error generating JQL:', error);
  }
}

/**
 * Example 2: Using convenience functions
 */
async function exampleWithConvenienceFunctions() {
  console.log('\n=== Example 2: Using Convenience Functions ===');
  
  // Get service using convenience function
  const service = getLLMService();
  
  try {
    // Determine which tool to call
    const toolResult = await service.getToolToCall("Show me all vendors");
    console.log('Tool to call:', toolResult);
  } catch (error) {
    console.error('Error determining tool:', error);
  }
}

/**
 * Example 3: Switching between providers
 */
async function exampleSwitchingProviders() {
  console.log('\n=== Example 3: Switching Between Providers ===');
  
  const factory = LLMServiceFactory.getInstance();
  
  // Check which providers are available
  const openaiAvailable = await factory.isProviderAvailable(LLMProvider.OPENAI);
  const ollamaAvailable = await factory.isProviderAvailable(LLMProvider.OLLAMA);
  
  console.log(`OpenAI available: ${openaiAvailable}`);
  console.log(`Ollama available: ${ollamaAvailable}`);
  
  // Try OpenAI first
  if (openaiAvailable) {
    console.log('\nSwitching to OpenAI...');
    switchLLMProvider(LLMProvider.OPENAI);
    
    const openaiService = getLLMService();
    try {
      const jql = await openaiService.getJQL("Find all tasks created this week");
      console.log('OpenAI JQL:', jql);
    } catch (error) {
      console.error('OpenAI error:', error);
    }
  }
  
  // Try Ollama
  if (ollamaAvailable) {
    console.log('\nSwitching to Ollama...');
    switchLLMProvider(LLMProvider.OLLAMA, {
      baseUrl: 'http://localhost:11434/api/chat',
      model: 'phi3'
    });
    
    const ollamaService = getLLMService();
    try {
      const jql = await ollamaService.getJQL("Find all open issues");
      console.log('Ollama JQL:', jql);
    } catch (error) {
      console.error('Ollama error:', error);
    }
  }
}

/**
 * Example 4: Direct instantiation
 */
async function exampleDirectInstantiation() {
  console.log('\n=== Example 4: Direct Instantiation ===');
  
  // Create specific service instances directly
  try {
    // OpenAI service
    const openaiService = new OpenAILLMService();
    console.log('Created OpenAI service directly');
    
    // Ollama service with custom configuration
    const ollamaService = new OllamaLLMService(
      'http://localhost:11434/api/chat',
      'phi3'
    );
    console.log('Created Ollama service directly');
    
    // Use the same interface for both
    const services: ILLMService[] = [openaiService, ollamaService];
    
    for (const service of services) {
      try {
        const toolResult = await service.getToolToCall("Get user by ID 123");
        console.log('Tool result:', toolResult);
        break; // Use the first working service
      } catch (error) {
        console.warn('Service failed, trying next...');
      }
    }
  } catch (error) {
    console.error('Error with direct instantiation:', error);
  }
}

/**
 * Example 5: Configuration-based approach
 */
async function exampleConfigurationBased() {
  console.log('\n=== Example 5: Configuration-Based Approach ===');
  
  // Define configurations for different environments
  const configurations: LLMServiceConfig[] = [
    {
      provider: LLMProvider.OPENAI,
      model: 'gpt-4',
      maxRetries: 3,
      retryDelayMs: 1000
    },
    {
      provider: LLMProvider.OLLAMA,
      model: 'phi3',
      baseUrl: 'http://localhost:11434/api/chat',
      maxRetries: 2,
      retryDelayMs: 500
    }
  ];
  
  const factory = LLMServiceFactory.getInstance();
  
  for (const config of configurations) {
    console.log(`\nTrying ${config.provider} configuration...`);
      try {
      const service = factory.createService(config);
      const jql = await service.getJQL("Show me completed tasks");
      console.log(`${config.provider} JQL:`, jql);
      break; // Use the first working configuration
    } catch (error) {
      console.warn(`${config.provider} failed:`, error instanceof Error ? error.message : String(error));
    }
  }
}

/**
 * Run all examples
 */
export async function runExamples() {
  console.log('🚀 LLM Service Interface Examples\n');
  
  try {
    await exampleWithFactory();
    await exampleWithConvenienceFunctions();
    await exampleSwitchingProviders();
    await exampleDirectInstantiation();
    await exampleConfigurationBased();
    
    console.log('\n✅ All examples completed!');
  } catch (error) {
    console.error('❌ Error running examples:', error);
  }
}

// Uncomment to run examples when this file is executed directly
// runExamples();
