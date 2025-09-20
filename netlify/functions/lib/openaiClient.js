import process from 'node:process';

const OPENAI_URL = 'https://api.openai.com/v1/responses';
const DEFAULT_TIMEOUT_MS = 15000;
const DEFAULT_MODEL = 'gpt-4o-mini';
const MAX_RETRIES = 2;

class OpenAIRequestError extends Error {
  constructor(message, statusCode, options = {}) {
    super(message);
    this.name = 'OpenAIRequestError';
    this.statusCode = statusCode;
    this.retryable = Boolean(options.retryable);
    this.details = options.details;
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const buildResponseFormat = () => ({
  type: 'json_schema',
  json_schema: {
    name: 'WritingAssistantResponse',
    schema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        spellings: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['word', 'index', 'suggestion', 'reason', 'confidence'],
            properties: {
              word: { type: 'string' },
              index: { type: 'integer' },
              suggestion: { type: 'string' },
              reason: { type: 'string' },
              confidence: { type: 'number' }
            }
          }
        },
        improvements: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['from', 'index', 'to', 'reason', 'confidence'],
            properties: {
              from: { type: 'string' },
              index: { type: 'integer' },
              to: { type: 'string' },
              reason: { type: 'string' },
              confidence: { type: 'number' }
            }
          }
        },
        insertions: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['word', 'afterIndex', 'reason', 'confidence'],
            properties: {
              word: { type: 'string' },
              afterIndex: { type: 'integer' },
              reason: { type: 'string' },
              confidence: { type: 'number' }
            }
          }
        },
        notes: {
          type: 'array',
          items: { type: 'string' }
        }
      },
      required: ['spellings', 'improvements', 'insertions', 'notes']
    }
  }
});

const extractContent = (payload) => {
  if (!payload) return '';
  if (typeof payload.output_text === 'string') {
    return payload.output_text;
  }
  if (Array.isArray(payload.output_text)) {
    return payload.output_text.join('\n');
  }
  if (Array.isArray(payload.output)) {
    const textChunks = [];
    for (const item of payload.output) {
      if (Array.isArray(item.content)) {
        for (const block of item.content) {
          if (block.type === 'output_text' && typeof block.text === 'string') {
            textChunks.push(block.text);
          }
        }
      }
    }
    return textChunks.join('\n');
  }
  return '';
};

const performFetch = async ({ prompt, model, maxOutputTokens, temperature, timeoutMs, metadata }) => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new OpenAIRequestError('OpenAI API key is not configured.', 500);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs ?? DEFAULT_TIMEOUT_MS);

  try {
    const response = await fetch(OPENAI_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: model ?? DEFAULT_MODEL,
        input: prompt,
        max_output_tokens: maxOutputTokens ?? 400,
        temperature: temperature ?? 0.3,
        response_format: buildResponseFormat(),
        metadata
      })
    });

    const text = await response.text();
    let payload;
    try {
      payload = text ? JSON.parse(text) : {};
    } catch (error) {
      throw new OpenAIRequestError('OpenAI returned malformed JSON.', response.status || 500, {
        retryable: false,
        details: { raw: text, error: error?.message }
      });
    }

    if (!response.ok) {
      const errorMessage = payload?.error?.message || 'OpenAI request failed.';
      throw new OpenAIRequestError(errorMessage, response.status, {
        retryable: response.status >= 500 || response.status === 429,
        details: payload
      });
    }

    return {
      payload,
      content: extractContent(payload)
    };
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new OpenAIRequestError('OpenAI request timed out.', 504, { retryable: true });
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
};

export const callOpenAI = async ({
  prompt,
  model = DEFAULT_MODEL,
  maxOutputTokens,
  temperature,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  retries = MAX_RETRIES,
  metadata
}) => {
  let attempt = 0;
  let lastError;
  while (attempt <= retries) {
    try {
      return await performFetch({
        prompt,
        model,
        maxOutputTokens,
        temperature,
        timeoutMs,
        metadata
      });
    } catch (error) {
      lastError = error;
      if (error instanceof OpenAIRequestError && error.retryable && attempt < retries) {
        const backoff = 2 ** attempt * 250;
        await sleep(backoff);
        attempt += 1;
        continue;
      }
      throw error;
    }
  }
  throw lastError;
};

export { OpenAIRequestError };
