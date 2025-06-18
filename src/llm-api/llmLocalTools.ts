import dotenv from 'dotenv';
import { Response } from 'express';
import { SystemPromtForTool, SystemPromptForChart, SystemPromptForText, SystemPromptForJQL } from './prompts.js';
import { DataFormat } from '../utils/utilities.js';
import { ILLMService } from './ILLMService.js';
import * as fs from 'fs';
import * as path from 'path';

// Ensure environment variables are loaded
dotenv.config();

/**
 * Configuration constants for Local LLM API access via Ollama
 */
const OLLAMA_API_URL = process.env.OLLAMA_API_URL || 'http://localhost:11434/api/chat';
const LOCAL_MODEL = process.env.LOCAL_MODEL || 'mistral';
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

// Log configuration status at startup
console.log(`Local LLM API initialized with model: ${LOCAL_MODEL} at ${OLLAMA_API_URL}`);

// JSON-based persistent storage for JQL examples (same as original)
interface JQLExample {
  prompt: string;
  jql: string;
  timestamp: number;
}

class PersistentJQLStore {
  private examples: JQLExample[] = [];
  private readonly filePath: string;
  
  constructor() {
    this.filePath = path.join(process.cwd(), 'data', 'jql-examples.json');
    this.ensureDataDirectory();
    this.loadExamples();
    this.cleanupDuplicates(); // Clean up any existing duplicates on startup
  }

  private ensureDataDirectory(): void {
    const dataDir = path.dirname(this.filePath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
  }

  private loadExamples(): void {
    try {
      if (fs.existsSync(this.filePath)) {
        const data = fs.readFileSync(this.filePath, 'utf8');
        if (data.trim()) {
          this.examples = JSON.parse(data);
          console.log(`Loaded ${this.examples.length} JQL examples from persistent storage`);
          return;
        }
      }
      
      // Initialize with default examples if file doesn't exist or is empty
      console.log('Initializing JQL examples with default data');
      this.initializeDefaultExamples();
    } catch (error) {
      console.error('Error loading JQL examples from file:', error);
      this.initializeDefaultExamples();
    }
  }

  private initializeDefaultExamples(): void {
    this.examples = [
      {
        prompt: "Show me open bugs",
        jql: 'project = SCRUM AND issuetype = Bug AND status != "Done" ORDER BY priority DESC',
        timestamp: Date.now()
      },
      {
        prompt: "Tasks assigned to me",
        jql: 'project = SCRUM AND issuetype = Task AND assignee = currentUser() ORDER BY priority DESC',
        timestamp: Date.now()
      },
      {
        prompt: "Issues created this week",
        jql: 'project = SCRUM AND created >= startOfWeek() ORDER BY created DESC',
        timestamp: Date.now()
      }
    ];
    this.saveToFile();
  }

  private saveToFile(): void {
    try {
      fs.writeFileSync(this.filePath, JSON.stringify(this.examples, null, 2), 'utf8');
      console.log(`Saved ${this.examples.length} JQL examples to persistent storage`);
    } catch (error) {
      console.error('Error saving JQL examples to file:', error);
    }
  }

  addExample(prompt: string, jql: string): void {
    // Check if this example already exists (by prompt similarity or exact JQL match)
    const existingExample = this.examples.find(example => {
      // Check for exact JQL match
      if (example.jql.trim().toLowerCase() === jql.trim().toLowerCase()) {
        return true;
      }
      
      // Check for very similar prompts (high similarity score)
      const promptSimilarity = this.calculateSimilarity(example.prompt, prompt);
      return promptSimilarity > 0.8; // 80% similarity threshold
    });

    if (existingExample) {
      console.log(`Skipping duplicate JQL example - similar to existing: "${existingExample.prompt}"`);
      return;
    }

    const newExample: JQLExample = {
      prompt,
      jql,
      timestamp: Date.now()
    };
    
    // Add new example at the beginning
    this.examples.unshift(newExample);
    
    // Keep only the most recent 50 examples to prevent file from growing too large
    if (this.examples.length > 50) {
      this.examples = this.examples.slice(0, 50);
    }
    
    // Immediately save to file to keep in sync
    this.saveToFile();
    console.log(`Added new JQL example: "${prompt}"`);
  }

  private calculateSimilarity(str1: string, str2: string): number {
    const words1 = str1.toLowerCase().split(' ').filter(word => word.length > 2);
    const words2 = str2.toLowerCase().split(' ').filter(word => word.length > 2);
    
    if (words1.length === 0 && words2.length === 0) return 1;
    if (words1.length === 0 || words2.length === 0) return 0;
    
    const commonWords = words1.filter(word => 
      words2.some(word2 => word2.includes(word) || word.includes(word2))
    );
    
    return commonWords.length / Math.max(words1.length, words2.length);
  }

  getSimilarExamples(prompt: string, limit: number = 5): JQLExample[] {
    const queryWords = prompt.toLowerCase().split(' ').filter(word => word.length > 2);
    
    const scoredExamples = this.examples.map(example => {
      const exampleWords = example.prompt.toLowerCase().split(' ');
      const matchCount = queryWords.reduce((count, word) => {
        return count + (exampleWords.some(exampleWord => 
          exampleWord.includes(word) || word.includes(exampleWord)
        ) ? 1 : 0);
      }, 0);
      
      return {
        ...example,
        score: matchCount / queryWords.length
      };
    });

    return scoredExamples
      .filter(example => example.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  getAllExamples(): JQLExample[] {
    return [...this.examples];
  }

  private cleanupDuplicates(): void {
    const uniqueExamples: JQLExample[] = [];
    
    for (const example of this.examples) {
      const isDuplicate = uniqueExamples.some(existing => {
        // Check for exact JQL match
        if (existing.jql.trim().toLowerCase() === example.jql.trim().toLowerCase()) {
          return true;
        }
        
        // Check for very similar prompts
        const promptSimilarity = this.calculateSimilarity(existing.prompt, example.prompt);
        return promptSimilarity > 0.8;
      });
      
      if (!isDuplicate) {
        uniqueExamples.push(example);
      }
    }
    
    if (uniqueExamples.length !== this.examples.length) {
      console.log(`Cleaned up ${this.examples.length - uniqueExamples.length} duplicate JQL examples`);
      this.examples = uniqueExamples;
      this.saveToFile();
    }
  }
}

/**
 * Interface for Ollama chat API request
 */
interface OllamaMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OllamaChatRequest {
  model: string;
  messages: OllamaMessage[];
  stream?: boolean;
  response_format?: {
    type: "json_object" | "text";
  };
  options?: {
    temperature?: number;
    top_p?: number;
    max_tokens?: number;
  };
}

interface OllamaChatResponse {
  message: {
    role: string;
    content: string;
  };
  done: boolean;
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}

/**
 * Ollama-based LLM Service Implementation
 * Implements the ILLMService interface using Ollama's local API
 */
export class OllamaLLMService implements ILLMService {
  private baseUrl: string;
  private model: string;
  private jqlStore: PersistentJQLStore;

  constructor(baseUrl?: string, model?: string) {
    this.baseUrl = baseUrl || OLLAMA_API_URL;
    this.model = model || LOCAL_MODEL;
    this.jqlStore = new PersistentJQLStore();
  }

  private async callWithRetry(config: OllamaChatRequest): Promise<any> {
    let lastError = null;
    
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const response = await fetch(this.baseUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...config,
            stream: false
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data: OllamaChatResponse = await response.json();
        
        // Convert to OpenAI-like format for compatibility
        return {
          choices: [{
            message: {
              content: data.message.content
            }
          }]
        };
      } catch (error) {
        lastError = error;
        
        // Retry on network errors or server errors
        if (error instanceof TypeError || (error instanceof Error && error.message.includes('HTTP error'))) {
          console.warn(`Local API call attempt ${attempt + 1} failed, retrying in ${RETRY_DELAY_MS}ms...`);
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS * (attempt + 1)));
          continue;
        }
        
        // Don't retry on other types of errors
        throw error;
      }
    }
    
    throw lastError || new Error('Maximum retry attempts reached');
  }

  private async streamWithRetry(config: OllamaChatRequest): Promise<any> {
    let lastError = null;
    
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const response = await fetch(this.baseUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...config,
            stream: true
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        // Create an async generator that yields OpenAI-like chunks
        async function* streamGenerator() {
          const reader = response.body?.getReader();
          if (!reader) {
            throw new Error('No readable stream available');
          }

          const decoder = new TextDecoder();
          let buffer = '';

          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split('\n');
              buffer = lines.pop() || '';

              for (const line of lines) {
                if (line.trim()) {
                  try {
                    const data: OllamaChatResponse = JSON.parse(line);
                    // Convert to OpenAI-like format
                    yield {
                      choices: [{
                        delta: {
                          content: data.message.content || ''
                        }
                      }]
                    };
                    
                    if (data.done) {
                      return;
                    }
                  } catch (parseError) {
                    console.warn('Failed to parse streaming response line:', line);
                  }
                }
              }
            }
          } finally {
            reader.releaseLock();
          }
        }

        return streamGenerator();
      } catch (error) {
        lastError = error;
        
        // Retry on network errors or server errors
        if (error instanceof TypeError || (error instanceof Error && error.message.includes('HTTP error'))) {
          console.warn(`Streaming API call attempt ${attempt + 1} failed, retrying in ${RETRY_DELAY_MS}ms...`);
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS * (attempt + 1)));
          continue;
        }
        
        // Don't retry on other types of errors
        throw error;
      }
    }
    
    throw lastError || new Error('Maximum retry attempts reached for streaming');
  }

  private async validateOllamaService(): Promise<void> {
    try {
      const response = await fetch(this.baseUrl.replace('/api/chat', '/api/tags'), {
        method: 'GET',
      });
      
      if (!response.ok) {
        throw new Error(`Ollama service not available at ${this.baseUrl}`);
      }
    } catch (error) {
      throw new Error(`Failed to connect to Ollama service: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private convertToOllamaMessages(messages: Array<{role: string, content: string}>): OllamaMessage[] {
    return messages.map(msg => ({
      role: msg.role as 'system' | 'user' | 'assistant',
      content: msg.content
    }));
  }

  private setStreamingHeaders(res: Response): void {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Transfer-Encoding', 'chunked');
    res.setHeader('connection', 'keep-alive');
    res.setHeader('Cache-Control', 'no-cache');
    res.flushHeaders();
  }

  async getJQL(userMessage: string): Promise<string> {
    if (!userMessage || typeof userMessage !== 'string') {
      throw new Error('Invalid user message provided');
    }
    
    try {
      const similarJqlExamples = this.jqlStore.getSimilarExamples(userMessage);
      // If similar examples are found then return JQL query from the first example rather using Local LLM
      if (similarJqlExamples.length > 0) {
        console.info(`Found ${similarJqlExamples.length} similar JQL examples for user message: "${userMessage}"`);
        return similarJqlExamples[0].jql;
      }
      
      console.info('Retrieved similar JQL examples:', similarJqlExamples);
      const fewShotExamples = similarJqlExamples.map(example => `User: ${example.prompt}\nJQL: ${example.jql}`).join('\n\n');
      const promptForJql = `${SystemPromptForJQL}Examples:\n\n${fewShotExamples}`;
      console.info('Prompt for JQL:', promptForJql);
        const config: OllamaChatRequest = {
        model: this.model,
        messages: this.convertToOllamaMessages([
          { role: 'system', content: promptForJql },
          { role: 'user', content: userMessage }
        ]),
        response_format: { type: "text" },
        options: {
          temperature: 0
        }
      };

      const response = await this.callWithRetry(config);
      console.log('Local LLM API response:', response);
      
      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('Empty response from Local LLM API');
      }
      
      return content;
    } catch (error) {
      console.error('Error calling Local LLM API:', error);
      throw new Error(`Failed to process request with Local AI: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async saveExample(prompt: string, jql: string): Promise<void> {
    this.jqlStore.addExample(prompt, jql);
  }

  async getToolToCall(userMessage: string): Promise<{tool: string, parameters: Record<string, any>}> {
    // Validate input
    if (!userMessage || typeof userMessage !== 'string') {
      throw new Error('Invalid user message provided');
    }
    
    try {      
      const config: OllamaChatRequest = {
        model: this.model,
        messages: [
          { role: 'system', content: SystemPromtForTool },
          { role: 'user', content: userMessage }
        ],
        response_format: { type: "json_object" },
        options: {
          temperature: 0
        }
      };

      const response = await this.callWithRetry(config);

      // Parse and validate the response      console.log('Local LLM API response:', JSON.stringify(response, null, 2));
      const content = response.choices[0]?.message?.content;
      console.log('Local LLM API tool response:', content);
      if (!content) {
        throw new Error('Empty response from Local LLM API');
      }
      
      try {
        // Try direct JSON parsing first (like OpenAI implementation)
        const parsedContent = JSON.parse(content);
        return parsedContent;
      } catch (parseError) {
        // Fallback: Extract JSON from response if it's wrapped in markdown code blocks
        try {
          const jsonMatch = content.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
          const jsonString = jsonMatch ? jsonMatch[1] : content;
          const parsedContent = JSON.parse(jsonString);
          return parsedContent;
        } catch (secondParseError) {
          console.error('Failed to parse response after trying both methods:', content);
          const jsonObject = {
            tool: null,
            parameters: {
              id: 0,
              query: null,
              limit: 0,
              skip: 0
            },
            requested_format: "markdown-text",
            response_text: content
          };
          return JSON.parse(JSON.stringify(jsonObject)); // Ensure we return a valid JSON object
        }
      }
    } catch (error) {
      console.error('Error calling Local LLM API:', error);
      throw new Error(`Failed to process request with Local AI: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  async getMarkdownTableFromJson(inputJson: string, userPrompt: string, systemPrompt: string): Promise<string> {
    const config: OllamaChatRequest = {
      model: this.model,
      messages: this.convertToOllamaMessages([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `${inputJson}\n\n${userPrompt}` }
      ]),
      response_format: { type: "text" },
      options: {
        temperature: 0
      }
    };

    const response = await this.callWithRetry(config);
    const content = response.choices[0]?.message?.content;
    console.log('Local LLM API data format response:', JSON.stringify(response, null, 2));
    return content;
  }

  async streamResponseText(responseText: string, res: Response): Promise<void> {
    try {
      this.setStreamingHeaders(res);
      
      const words = responseText.split(' ');
      const chunkSize = 3;
      for (let i = 0; i < words.length; i += chunkSize) {
        const chunk = words.slice(i, i + chunkSize).join(' ') + (i + chunkSize < words.length ? ' ' : '');
        res.write(chunk);
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      res.on('close', () => {
        console.log('Client closed connection during streaming');
        res.end();
      });
      
      res.end();
    } catch (error) {
      console.error('Error streaming response:', error);
      if (!res.headersSent) {
        res.status(500).send('Error generating response');
      } else {
        res.end();
      }
    }
  }

  async streamMarkdownTextFromJson(inputJson: string, userPrompt: string, res: Response): Promise<void> {
    try {
      await this.validateOllamaService();
        const config: OllamaChatRequest = {
        model: this.model,
        messages: this.convertToOllamaMessages([
          { role: 'system', content: SystemPromptForText },
          { role: 'user', content: inputJson },
          { role: 'user', content: userPrompt }
        ]),
        response_format: { type: "text" },
        options: {
          temperature: 0
        }
      };
      
      this.setStreamingHeaders(res);

      const stream = await this.streamWithRetry(config);
      
      let responseText = '';
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          responseText += content;
          res.write(content);
          const delay = Math.floor(Math.random() * 10) + 10;
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
      
      res.on('close', () => {
        console.log('Client closed connection during streaming');
      });
      
      res.end();
      console.log('Streaming response completed');
    } catch (error) {
      console.error('Error streaming response:', error);
      if (!res.headersSent) {
        res.status(500).send('Error generating response');
      } else {
        res.end();
      }
    }
  }

  async streamMarkdownTableFromJson(
    inputJson: string, 
    userPrompt: string, 
    systemPrompt: string,
    res: Response,
    dataFormat: DataFormat,
    additionalMessage?: string
  ): Promise<void> {
    try {
      await this.validateOllamaService();      const config: OllamaChatRequest = {
        model: this.model,
        messages: this.convertToOllamaMessages([
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `${inputJson}\n\n${userPrompt}` }
        ]),
        response_format: { type: "text" },
        options: {
          temperature: 0
        }
      };

      console.log('LLM returned data format:', dataFormat);
      if (dataFormat !== DataFormat.MarkdownTable && dataFormat !== DataFormat.MarkdownText) { 
        config.messages[0] = {
          role: 'system',
          content: SystemPromptForChart
        };
        
        const response = await this.callWithRetry(config);
        const content = response.choices[0]?.message?.content;
        console.log('Local LLM API chart format response:', content);
        res.status(200).send(content);
        res.end();
        return;
      }
      
      this.setStreamingHeaders(res);
      
      const stream = await this.streamWithRetry(config);
      
      let responseText = additionalMessage || '';
      if (responseText)
        res.write(responseText);
        
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          res.write(content);
        }
      }
      
      res.end();
      console.log('Streaming response completed');
      
      res.on('close', () => {
        console.log('Client closed connection during streaming');
        res.end();
      });
    } catch (error) {
      console.error('Error streaming response:', error);
      if (!res.headersSent) {
        res.status(500).send('Error generating response');
      } else {
        res.end();
      }
    }
  }
}

// Create default instance and export individual functions for backward compatibility
const defaultOllamaService = new OllamaLLMService();

export async function getJQL(userMessage: string): Promise<string> {
  return defaultOllamaService.getJQL(userMessage);
}

export async function saveExample(prompt: string, jql: string): Promise<void> {
  return defaultOllamaService.saveExample(prompt, jql);
}

export async function getToolToCall(userMessage: string): Promise<{tool: string, parameters: Record<string, any>}> {
  return defaultOllamaService.getToolToCall(userMessage);
}

export async function getMarkdownTableFromJson(inputJson: string, userPrompt: string, systemPrompt: string): Promise<string> {
  return defaultOllamaService.getMarkdownTableFromJson(inputJson, userPrompt, systemPrompt);
}

export async function streamResponseText(responseText: string, res: Response): Promise<void> {
  return defaultOllamaService.streamResponseText(responseText, res);
}

export async function streamMarkdownTextFromJson(inputJson: string, userPrompt: string, res: Response): Promise<void> {
  return defaultOllamaService.streamMarkdownTextFromJson(inputJson, userPrompt, res);
}

export async function streamMarkdownTableFromJson(
  inputJson: string, 
  userPrompt: string, 
  systemPrompt: string,
  res: Response,
  dataFormat: DataFormat,
  additionalMessage?: string
): Promise<void> {
  return defaultOllamaService.streamMarkdownTableFromJson(inputJson, userPrompt, systemPrompt, res, dataFormat, additionalMessage);
}
