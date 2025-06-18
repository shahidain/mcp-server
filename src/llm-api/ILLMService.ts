import { Response } from 'express';
import { DataFormat } from '../utils/utilities.js';

/**
 * Interface for LLM service implementations
 * Provides a unified contract for both OpenAI and Ollama implementations
 */
export interface ILLMService {
  /**
   * Generates JQL query from user message
   * @param userMessage - The user's message to convert to JQL
   * @returns JQL query string
   */
  getJQL(userMessage: string): Promise<string>;

  /**
   * Saves JQL example to persistent storage
   * @param prompt - The user's prompt
   * @param jql - The corresponding JQL query
   */
  saveExample(prompt: string, jql: string): Promise<void>;

  /**
   * Determines which tool to call based on user message
   * @param userMessage - The user's message to analyze
   * @returns Object containing tool name and parameters to use
   */
  getToolToCall(userMessage: string): Promise<{tool: string | null, parameters: Record<string, any>}>;

  /**
   * Generates a markdown table from JSON data
   * @param inputJson - The JSON data to convert to markdown
   * @param userPrompt - The user's prompt
   * @param systemPrompt - The system prompt for conversion
   * @returns Markdown table as string
   */
  getMarkdownTableFromJson(inputJson: string, userPrompt: string, systemPrompt: string): Promise<string>;

  /**
   * Streams response text in chunks
   * @param responseText - The text to stream
   * @param res - Express response object
   */
  streamResponseText(responseText: string, res: Response): Promise<void>;

  /**
   * Streams markdown text conversion
   * @param inputJson - The JSON data to convert
   * @param userPrompt - The user's prompt
   * @param res - Express response object for streaming
   */
  streamMarkdownTextFromJson(inputJson: string, userPrompt: string, res: Response): Promise<void>;

  /**
   * Streams the markdown table conversion directly to the client
   * @param inputJson - The JSON data to convert to markdown
   * @param userPrompt - The user's prompt
   * @param systemPrompt - The system prompt for conversion
   * @param res - Express response object for streaming
   * @param dataFormat - The requested data format
   * @param additionalMessage - Optional additional message to prepend
   */
  streamMarkdownTableFromJson(
    inputJson: string, 
    userPrompt: string, 
    systemPrompt: string,
    res: Response,
    dataFormat: DataFormat,
    additionalMessage?: string
  ): Promise<void>;
}

/**
 * Service provider types for LLM implementations
 */
export enum LLMProvider {
  OPENAI = 'openai',
  OLLAMA = 'ollama'
}

/**
 * Configuration options for LLM service
 */
export interface LLMServiceConfig {
  provider: LLMProvider;
  model?: string;
  apiKey?: string;
  baseUrl?: string;
  maxRetries?: number;
  retryDelayMs?: number;
}
