# LLM Service Unified Interface

This directory contains a unified interface for LLM services that allows easy switching between OpenAI and Ollama implementations.

## Architecture Overview

The unified interface consists of several key components:

### 1. Core Interface (`ILLMService.ts`)
Defines the common contract that both OpenAI and Ollama implementations must follow:

```typescript
interface ILLMService {
  getJQL(userMessage: string): Promise<string>;
  saveExample(prompt: string, jql: string): Promise<void>;
  getToolToCall(userMessage: string): Promise<{tool: string, parameters: Record<string, any>}>;
  getMarkdownTableFromJson(inputJson: string, userPrompt: string, systemPrompt: string): Promise<string>;
  streamResponseText(responseText: string, res: Response): Promise<void>;
  streamMarkdownTextFromJson(inputJson: string, userPrompt: string, res: Response): Promise<void>;
  streamMarkdownTableFromJson(inputJson: string, userPrompt: string, systemPrompt: string, res: Response, dataFormat: DataFormat, additionalMessage?: string): Promise<void>;
}
```

### 2. Implementation Classes

#### OpenAI Implementation (`llmTools.ts`)
- **Class**: `OpenAILLMService`
- **Provider**: Uses OpenAI's GPT models
- **Features**: Full streaming support, retry logic, API key validation
- **Configuration**: Requires `OPENAI_API_KEY` environment variable

#### Ollama Implementation (`llmLocalTools.ts`)
- **Class**: `OllamaLLMService`
- **Provider**: Uses local Ollama service with Phi3 model
- **Features**: Local processing, no API key required, streaming support
- **Configuration**: Configurable base URL and model

### 3. Factory Pattern (`LLMServiceFactory.ts`)
Provides easy instantiation and switching between implementations:

```typescript
// Get service with automatic provider detection
const service = getLLMService();

// Switch to specific provider
switchLLMProvider(LLMProvider.OLLAMA);

// Create with custom configuration
const factory = LLMServiceFactory.getInstance();
const service = factory.createService({
  provider: LLMProvider.OPENAI,
  model: 'gpt-4'
});
```

## Usage Examples

### Basic Usage
```typescript
import { getLLMService, LLMProvider } from './LLMServiceFactory.js';

// Get default service (auto-detects available provider)
const llmService = getLLMService();

// Generate JQL query
const jql = await llmService.getJQL("Show me all high priority bugs");

// Determine which tool to call
const toolResult = await llmService.getToolToCall("Get all users");
```

### Provider Switching
```typescript
import { switchLLMProvider, LLMProvider } from './LLMServiceFactory.js';

// Switch to OpenAI
switchLLMProvider(LLMProvider.OPENAI);

// Switch to Ollama with custom config
switchLLMProvider(LLMProvider.OLLAMA, {
  baseUrl: 'http://localhost:11434/api/chat',
  model: 'phi3'
});
```

### Direct Instantiation
```typescript
import { OpenAILLMService } from './llmTools.js';
import { OllamaLLMService } from './llmLocalTools.js';

// Create specific implementations
const openaiService = new OpenAILLMService();
const ollamaService = new OllamaLLMService();

// Use same interface for both
const services = [openaiService, ollamaService];
for (const service of services) {
  try {
    const result = await service.getJQL("Find open issues");
    break; // Use first working service
  } catch (error) {
    console.warn('Service failed, trying next...');
  }
}
```

## Environment Configuration

### OpenAI Configuration
```env
LLM_PROVIDER=openai
OPENAI_API_KEY=your_openai_api_key
LLM_MODEL=gpt-4
```

### Ollama Configuration
```env
LLM_PROVIDER=ollama
OLLAMA_API_URL=http://localhost:11434/api/chat
LOCAL_MODEL=phi3
```

### Auto-Detection
If `LLM_PROVIDER` is not set, the system will:
1. Use OpenAI if `OPENAI_API_KEY` is available
2. Fall back to Ollama if OpenAI is not available

## Backward Compatibility

Both implementation files maintain backward compatibility by exporting the original function signatures:

```typescript
// These still work as before
import { getJQL, getToolToCall } from './llmTools.js';
import { getJQL, getToolToCall } from './llmLocalTools.js';
```

## Benefits

### 1. **Flexibility**
- Easy switching between cloud and local LLM providers
- No code changes required when switching providers
- Environment-based configuration

### 2. **Consistency**
- Same interface for all providers
- Consistent error handling
- Unified configuration approach

### 3. **Scalability**
- Easy to add new LLM providers
- Factory pattern for clean instantiation
- Configurable retry logic and timeouts

### 4. **Development Experience**
- Type safety with TypeScript interfaces
- Clear separation of concerns
- Comprehensive error handling

## Adding New Providers

To add a new LLM provider:

1. Create a new implementation class that implements `ILLMService`
2. Add the provider to the `LLMProvider` enum
3. Update the factory to handle the new provider
4. Add configuration options as needed

Example:
```typescript
export class CustomLLMService implements ILLMService {
  // Implement all required methods
  async getJQL(userMessage: string): Promise<string> {
    // Custom implementation
  }
  // ... other methods
}
```

## Files Overview

- **`ILLMService.ts`** - Core interface and types
- **`llmTools.ts`** - OpenAI implementation with class wrapper
- **`llmLocalTools.ts`** - Ollama implementation with class wrapper
- **`LLMServiceFactory.ts`** - Factory pattern for service creation
- **`example-usage.ts`** - Comprehensive usage examples
- **`README.md`** - This documentation

## Testing

Run the examples to test the unified interface:

```typescript
import { runExamples } from './example-usage.js';
await runExamples();
```

This will test all available providers and demonstrate various usage patterns.
