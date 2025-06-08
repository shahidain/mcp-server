import { OpenAI } from 'openai';
import dotenv from 'dotenv';
import { Response } from 'express';
import { SystemPromtForTool, SystemPromptForChart, SystemPromptForText, SystemPromptForJQL } from './prompts.js';
import { DataFormat } from '../utils/utilities.js';
import { format } from 'path';

// Ensure environment variables are loaded
dotenv.config();

/**
 * Configuration constants for LLM API access
 * Supports both OPENAI_API_KEY and LLM_API_KEY for flexibility
 */
const API_KEY = process.env.LLM_API_KEY;
const MODEL = process.env.LLM_MODEL;
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

// Log configuration status at startup
if (!API_KEY) {
  console.error('ERROR: OpenAI API key not found in environment variables.');
  console.error('Please set OPENAI_API_KEY or LLM_API_KEY in your .env file.');
  console.error('AI-powered insights will not be available until this is configured.');
} else {
  console.log(`LLM API initialized with model: ${MODEL}`);
}

// Create OpenAI client instance with configuration
const openai = new OpenAI({ 
  apiKey: API_KEY,
  timeout: 30000, // 30 second timeout
  maxRetries: MAX_RETRIES
});

/**
 * Makes an API call to OpenAI with retry logic
 * @param config - OpenAI API call configuration
 * @returns The API response
 * @throws Error if all retries fail
 */
async function callWithRetry(config: any): Promise<any> {
  let lastError = null;
  
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      return await openai.chat.completions.create(config);
    } catch (error) {
      lastError = error;
      const isRateLimitError = error instanceof Error && 
        ('message' in error) && 
        (error.message.includes('rate_limit') || error.message.includes('429'));
      
      // Only retry on rate limit or network errors
      if (isRateLimitError || error instanceof TypeError || error instanceof SyntaxError) {
        console.warn(`API call attempt ${attempt + 1} failed, retrying in ${RETRY_DELAY_MS}ms...`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS * (attempt + 1)));
        continue;
      }
      
      // Don't retry on other types of errors
      throw error;
    }
  }
  
  throw lastError || new Error('Maximum retry attempts reached');
}

/**
 * Makes a streaming API call to OpenAI
 * @param config - OpenAI API call configuration
 * @returns A stream of responses
 * @throws Error if API call fails
 */
async function streamWithRetry(config: any): Promise<any> {
  let lastError = null;
  
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      // Set stream to true for streaming responses
      const streamResponse = await openai.chat.completions.create({
        ...config,
        stream: true
      });
      
      return streamResponse;
    } catch (error) {
      lastError = error;
      const isRateLimitError = error instanceof Error && 
        ('message' in error) && 
        (error.message.includes('rate_limit') || error.message.includes('429'));
      
      // Only retry on rate limit or network errors
      if (isRateLimitError || error instanceof TypeError || error instanceof SyntaxError) {
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

/**
 * Validates that the API key is configured
 * @throws Error if API key is not configured
 */
function validateApiKey(): void {
  if (!API_KEY) {
    throw new Error('OpenAI API key is not configured. Please add OPENAI_API_KEY to your .env file.');
  }
}


export async function getJQL(userMessage: string): Promise<string> {
  
  if (!userMessage || typeof userMessage !== 'string') {
    throw new Error('Invalid user message provided');
  }
  validateApiKey();
  try {
    const config = {
      model: MODEL,
      messages: [
        { role: 'system', content: SystemPromptForJQL },
        { role: 'user', content: userMessage }
      ],
      temperature: 0,
      response_format: { type: "text" }
    };

    const response = await callWithRetry(config);

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
};

/**
 * Determines which tool to call based on user message using OpenAI
 * @param userMessage - The user's message to analyze
 * @returns Object containing tool name and parameters to use
 * @throws Error if API call fails or response cannot be parsed
 */
export async function getToolToCall(userMessage: string): Promise<{tool: string, parameters: Record<string, any>}> {
  // Validate input
  if (!userMessage || typeof userMessage !== 'string') {
    throw new Error('Invalid user message provided');
  }
  
  // Validate API key
  validateApiKey();
  
  try {
    
    const config = {
      model: MODEL,
      messages: [
        { role: 'system', content: SystemPromtForTool },
        { role: 'user', content: userMessage }
      ],
      temperature: 0,
      response_format: { type: "json_object" }
    };

    const response = await callWithRetry(config);

    // Parse and validate the response
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


/**
 * Generates a markdown table from JSON data, with streaming support
 * @param inputJson - The JSON data to convert to markdown
 * @param userPrompt - The user's prompt
 * @param res - Express response object for streaming (optional)
 * @returns Markdown table as string (if not streaming)
 */
export async function getMarkdownTableFromJson(inputJson: string, userPrompt: string, systemPrompt: string): Promise<string> {
  const config = {
    model: MODEL,
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

  const response = await callWithRetry(config);
  const content = response.choices[0]?.message?.content;
  console.log('OpenAI API data format response:', JSON.stringify(response, null, 2));
  return content;
}

export async function streamResponseText(responseText: string, res: Response): Promise<void> {
  try {
    // Set appropriate headers for streaming text
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Transfer-Encoding', 'chunked');
    res.setHeader('connection', 'keep-alive');
    res.setHeader('Cache-Control', 'no-cache');
    res.flushHeaders();
    
    // Write the response text in chunks
    const words = responseText.split(' ');
    const chunkSize = 3; // Number of words per chunk
    for (let i = 0; i < words.length; i += chunkSize) {
      const chunk = words.slice(i, i + chunkSize).join(' ') + (i + chunkSize < words.length ? ' ' : '');
      res.write(chunk);
      // Add a small delay to make streaming visible (optional)
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    res.on('close', () => {
      console.log('Client closed connection during streaming');
      res.end();
    });
    // End the response
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


export async function streamMarkdownTextFromJson(inputJson: string, 
  userPrompt: string, res: Response) {
    try {
      // Validate API key
      validateApiKey();
      
      if (!MODEL) {
        throw new Error('OpenAI model is not configured');
      }
      
      const config = {
        model: MODEL as string,
        messages: [
          { role: 'system', content: SystemPromptForText },
          { role: 'user', content: inputJson },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0,
        stream: true
      };
      
      // Set appropriate headers for streaming text
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Transfer-Encoding', 'chunked');
      res.setHeader('connection', 'keep-alive');
      res.setHeader('Cache-Control', 'no-cache');
      res.flushHeaders();
      
      // Create streaming response
      const stream = await streamWithRetry(config);
      
      // Process the stream
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
      // End the response
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

/**
 * Streams the markdown table conversion directly to the client
 * @param inputJson - The JSON data to convert to markdown
 * @param userPrompt - The user's prompt
 * @param res - Express response object for streaming
 */
export async function streamMarkdownTableFromJson(
  inputJson: string, 
  userPrompt: string, 
  systemPrompt: string,
  res: Response,
  dataFormat: DataFormat,
  additionalMessage?: string
): Promise<void> {
  
  try {
    // Validate API key
    validateApiKey();
    
    if (!MODEL) {
      throw new Error('OpenAI model is not configured');
    }
    
    const config = {
      model: MODEL as string,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: inputJson },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0,
      stream: true
    };

    console.log('LLM returned data format:', dataFormat);
    if (dataFormat !== DataFormat.MarkdownTable && dataFormat !== DataFormat.MarkdownText) { 
      config.messages[0] = {role: 'system', content: SystemPromptForChart};
      config.stream = false;
      const response = await callWithRetry(config);
      const content = response.choices[0]?.message?.content;
      console.log('OpenAI API chart format response:', content);
      res.status(200).send(content);
      res.end();
      return;
    }
    // Set appropriate headers for streaming text
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Transfer-Encoding', 'chunked');
    res.setHeader('connection', 'keep-alive');
    res.setHeader('Cache-Control', 'no-cache');
    res.flushHeaders();
    
    // Create streaming response
    const stream = await streamWithRetry(config);
    
    // Process the stream
    let responseText = additionalMessage || '';
    if (responseText)
      res.write(responseText);
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) {
        res.write(content);
      }
    }
    
    // End the response
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