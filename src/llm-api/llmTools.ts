import { OpenAI } from 'openai';
import dotenv from 'dotenv';
import { Response } from 'express';

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
    // Define comprehensive tool schema for the AI to use
    const systemPrompt = `
      You are an AI tool router. Available tools are:
      1. get-vendors(limit?: number, skip?: number)
      2. get-vendor-by-id(id: number)
      3. search-vendors(query: string)
      4. get-users(department?: string, role?: string, limit?: number, skip?: number)
      5. get-user-by-id(id: number)
      6. get-roles(limit?: number, skip?: number)
      7. get-role-by-id(id: number)
      8. get-commodities(skip?: number, limit?: number)
      9. get-commodity-by-id(id: number)
      10. search-commodities(query: string)
      11. get-products(skip?: number, limit?: number)
      
      Based on the user message, return JSON with the most appropriate tool name and parameters and requested format.
      Example output format:
      {
        "tool": "get-vendor-by-id",
        "parameters": {
          "id": 42,
          "query": "search term",
          "limit": 10,
          "skip": 0
        },
        "requested_format": "table"
      }
    `;

    const config = {
      model: MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ],
      temperature: 0,
      response_format: { type: "json_object" }
    };

    const response = await callWithRetry(config);

    // Parse and validate the response
    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('Empty response from OpenAI API');
    }
    
    try {
      const parsedContent = JSON.parse(content);
      
      // Validate response structure
      if (!parsedContent.tool || typeof parsedContent.tool !== 'string') {
        throw new Error('Invalid tool name in AI response');
      }
      
      if (!parsedContent.parameters || typeof parsedContent.parameters !== 'object') {
        // Use empty parameters if none provided
        parsedContent.parameters = {};
      }
      
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
export async function getMarkdownTableFromJson(inputJson: string, userPrompt: string): Promise<string> {
  const systemPrompt = `You are a data converter. Convert the provided JSON into a readable Markdown table. If it's an array, use the keys as table headers in proper case. If it's an object, present keys and values as rows. during conversion, for true use Yes and for false use No, treat same for boolean values. If the JSON is empty, return "No data available". null should be represented as blank string.`;

  const userPromptMessage = `${userPrompt}:\n\n${inputJson}`;

  const config = {
    model: MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPromptMessage }
    ],
    temperature: 0
  };

  const response = await callWithRetry(config);
  const content = response.choices[0]?.message?.content;
  return content;
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
  res: Response
): Promise<void> {
  const systemPrompt = `You are a data converter. Convert the provided JSON into a readable Markdown table. If it's an array, use the keys as table headers in proper case. If it's an object, present keys and values as rows. during conversion, for true use Yes and for false use No, treat same for boolean values. If the JSON is empty, return "No data available". null value should be represented as blank string.`;

  const userPromptMessage = `${userPrompt}:\n\n${inputJson}`;

  try {
    // Validate API key
    validateApiKey();
    
    if (!MODEL) {
      throw new Error('OpenAI model is not configured');
    }
    
    // Set appropriate headers for streaming text
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Transfer-Encoding', 'chunked');
    res.setHeader('connection', 'keep-alive');
    res.setHeader('Cache-Control', 'no-cache');
    res.flushHeaders();
    
    // Create streaming response
    const stream = await openai.chat.completions.create({
      model: MODEL as string,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPromptMessage }
      ],
      temperature: 0,
      stream: true
    });
    
    // Process the stream
    let responseText = '';
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) {
        responseText += content;
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