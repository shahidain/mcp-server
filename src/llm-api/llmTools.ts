import { OpenAI } from 'openai';
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
 * Configuration constants for LLM API access
 * Supports both OPENAI_API_KEY and LLM_API_KEY for flexibility
 */
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const MODEL = process.env.LLM_MODEL;
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

// Log configuration status at startup
if (!OPENAI_API_KEY) {
  console.error('ERROR: OpenAI API key not found in environment variables.');
  console.error('Please set OPENAI_API_KEY or LLM_API_KEY in your .env file.');
  console.error('AI-powered insights will not be available until this is configured.');
} else {
  console.log(`LLM API initialized with model: ${MODEL}`);
}

// JSON-based persistent storage for JQL examples
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
      return promptSimilarity > 0.95; // 95% similarity threshold
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

  private calculatePromptMatch(prompt: string, jql: string): number {
    const normalize = (text: string) =>
      text.toLowerCase().replace(/[^a-z0-9 ]/g, '').split(/\s+/).filter(Boolean);

    const promptWords = new Set(normalize(prompt));
    const jqlWords = new Set(normalize(jql));

    let commonCount = 0;
    for (const word of promptWords) {
      if (jqlWords.has(word)) {
        commonCount++;
      }
    }

    const matchPercent = (commonCount / promptWords.size) * 100;
    return Math.round(matchPercent);
  };

  getSimilarExamples(prompt: string, limit: number = 5): JQLExample[] {
    const scoredExamples = this.examples.map(example => {
      // Use the new prompt matching algorithm
      const promptScore = this.calculatePromptMatch(prompt, example.prompt);
      const jqlScore = this.calculatePromptMatch(prompt, example.jql);
      
      // Take the higher score between prompt-to-prompt and prompt-to-jql matching
      const score = Math.max(promptScore, jqlScore) / 100; // Convert percentage to decimal
      
      return {
        ...example,
        score
      };
    });    
    
    return scoredExamples
      .filter(example => example.score >= 0.95)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  };

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
        return promptSimilarity > 0.95;
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

// Initialize the persistent JQL store
const jqlStore = new PersistentJQLStore();


/**
 * OpenAI-based LLM Service Implementation
 * Implements the ILLMService interface using OpenAI's API
 */
export class OpenAILLMService implements ILLMService {
  private openai: OpenAI;
  private model: string;
  private jqlStore: PersistentJQLStore;

  constructor() {
    this.validateApiKey();
    this.openai = new OpenAI({ 
      apiKey: OPENAI_API_KEY,
      timeout: 30000,
      maxRetries: MAX_RETRIES
    });
    this.model = MODEL || 'gpt-4.1-nano';
    this.jqlStore = new PersistentJQLStore();
  }

  private validateApiKey(): void {
    if (!OPENAI_API_KEY) {
      throw new Error('OpenAI API key is not configured. Please add OPENAI_API_KEY to your .env file.');
    }
  }

  private async callWithRetry(config: any): Promise<any> {
    let lastError = null;
    
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        return await this.openai.chat.completions.create(config);
      } catch (error) {
        lastError = error;
        const isRateLimitError = error instanceof Error && 
          ('message' in error) && 
          (error.message.includes('rate_limit') || error.message.includes('429'));
        
        if (isRateLimitError || error instanceof TypeError || error instanceof SyntaxError) {
          console.warn(`API call attempt ${attempt + 1} failed, retrying in ${RETRY_DELAY_MS}ms...`);
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS * (attempt + 1)));
          continue;
        }
        
        throw error;
      }
    }
    
    throw lastError || new Error('Maximum retry attempts reached');
  }

  private async streamWithRetry(config: any): Promise<any> {
    let lastError = null;
    
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const streamResponse = await this.openai.chat.completions.create({
          ...config,
          stream: true
        });
        
        return streamResponse;
      } catch (error) {
        lastError = error;
        const isRateLimitError = error instanceof Error && 
          ('message' in error) && 
          (error.message.includes('rate_limit') || error.message.includes('429'));
        
        if (isRateLimitError || error instanceof TypeError || error instanceof SyntaxError) {
          console.warn(`Streaming API call attempt ${attempt + 1} failed, retrying in ${RETRY_DELAY_MS}ms...`);
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS * (attempt + 1)));
          continue;
        }
        
        throw error;
      }
    }
    
    throw lastError || new Error('Maximum retry attempts reached for streaming');
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
      const similarJqlExamples = this.jqlStore.getSimilarExamples(userMessage, 7);
      
      /*if (similarJqlExamples.length > 0) {
        console.info(`Found ${similarJqlExamples.length} similar JQL examples for user message: "${userMessage}"`);
        return similarJqlExamples[0].jql;
      };*/

      console.info('Retrieved similar JQL examples:', similarJqlExamples);
      const fewShotExamples = similarJqlExamples.map(example => `User: ${example.prompt}\nJQL: ${example.jql}`).join('\n\n');
      const promptForJql = `${SystemPromptForJQL}Examples:\n\n${fewShotExamples}`;
      console.info('Prompt for JQL:', promptForJql);

      const config = {
        model: this.model,
        messages: [
          { role: 'system', content: promptForJql },
          { role: 'user', content: userMessage }
        ],
        temperature: 0,
        response_format: { type: "text" }
      };

      const response = await this.callWithRetry(config);
      console.log('OpenAI API response:', response);

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('Empty response from OpenAI API');
      }
      
      return content;
    } catch (error) {
      console.error('Error calling OpenAI API:', error);
      throw new Error(`Failed to process request with AI: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async saveExample(prompt: string, jql: string): Promise<void> {
    this.jqlStore.addExample(prompt, jql);
  }

  async getToolToCall(userMessage: string): Promise<{tool: string, parameters: Record<string, any>}> {
    if (!userMessage || typeof userMessage !== 'string') {
      throw new Error('Invalid user message provided');
    }
    
    try {
      const config = {
        model: this.model,
        messages: [
          { role: 'system', content: SystemPromtForTool },
          { role: 'user', content: userMessage }
        ],
        temperature: 0,
        response_format: { type: "json_object" }
      };

      const response = await this.callWithRetry(config);
      console.log('OpenAI API response:', response);

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('Empty response from OpenAI API');
      }
      
      try {
        const parsedContent = JSON.parse(content);
        return parsedContent;
      } catch (parseError) {
        throw new Error(`Failed to parse AI response: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
      }
    } catch (error) {
      console.error('Error calling OpenAI API:', error);
      throw new Error(`Failed to process request with AI: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async getMarkdownTableFromJson(inputJson: string, userPrompt: string, systemPrompt: string): Promise<string> {
    const config = {
      model: this.model,
      messages: [
        { 
          role: 'system', 
          content: [{"type": "input_text", "text": systemPrompt}] },
        { 
            role: 'user', content: [
            {"type": "input_text", "text": inputJson}, 
            {"type": "input_text", "text": userPrompt}
          ] 
        }
      ],
      text: {
        "format": {
          "type": "text"
        }
      },
      reasoning: {},
      tools: [],
      temperature: 0
    };

    const response = await this.callWithRetry(config);
    const content = response.choices[0]?.message?.content;
    console.log('OpenAI API data format response:', JSON.stringify(response, null, 2));
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
      if (!this.model) {
        throw new Error('OpenAI model is not configured');
      }
      
      const config = {
        model: this.model as string,
        messages: [
          { role: 'system', content: SystemPromptForText },
          { role: 'user', content: inputJson },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0,
        stream: true
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
      if (!this.model) {
        throw new Error('OpenAI model is not configured');
      }

      const config = {
        model: this.model as string,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `${inputJson}\n\n${userPrompt}` }
        ],
        temperature: 0,
        stream: true
      };

      console.log('LLM returned data format:', dataFormat);
      if (dataFormat !== DataFormat.MarkdownTable && dataFormat !== DataFormat.MarkdownText) { 
        config.messages[0] = {role: 'system', content: SystemPromptForChart};
        config.stream = false;
        const response = await this.callWithRetry(config);
        const content = response.choices[0]?.message?.content;
        console.log('OpenAI API chart format response:', content);
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
const defaultOpenAIService = new OpenAILLMService();

export async function getJQL(userMessage: string): Promise<string> {
  return defaultOpenAIService.getJQL(userMessage);
}

export async function saveExample(prompt: string, jql: string): Promise<void> {
  return defaultOpenAIService.saveExample(prompt, jql);
}

export async function getToolToCall(userMessage: string): Promise<{tool: string, parameters: Record<string, any>}> {
  return defaultOpenAIService.getToolToCall(userMessage);
}

export async function getMarkdownTableFromJson(inputJson: string, userPrompt: string, systemPrompt: string): Promise<string> {
  return defaultOpenAIService.getMarkdownTableFromJson(inputJson, userPrompt, systemPrompt);
}

export async function streamResponseText(responseText: string, res: Response): Promise<void> {
  return defaultOpenAIService.streamResponseText(responseText, res);
}

export async function streamMarkdownTextFromJson(inputJson: string, userPrompt: string, res: Response): Promise<void> {
  return defaultOpenAIService.streamMarkdownTextFromJson(inputJson, userPrompt, res);
}

export async function streamMarkdownTableFromJson(
  inputJson: string, 
  userPrompt: string, 
  systemPrompt: string,
  res: Response,
  dataFormat: DataFormat,
  additionalMessage?: string
): Promise<void> {
  return defaultOpenAIService.streamMarkdownTableFromJson(inputJson, userPrompt, systemPrompt, res, dataFormat, additionalMessage);
}