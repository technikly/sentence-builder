/* eslint-env node */

import { validateAndNormalizeRequest, ValidationError } from './lib/requestValidator.js';
import { buildPrompt, PROMPT_VERSION } from './lib/promptBuilder.js';
import { callOpenAI, OpenAIRequestError } from './lib/openaiClient.js';
import { parseModelResponse, ResponseParseError } from './lib/responseParser.js';
import { checkRateLimit, RateLimitError } from './lib/rateLimiter.js';

const jsonResponse = (statusCode, body) => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(body)
});

export async function handler(event) {
  if (event.httpMethod && event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: {
        Allow: 'POST'
      },
      body: 'Method Not Allowed'
    };
  }

  let payload;
  try {
    payload = event.body ? JSON.parse(event.body) : {};
  } catch (error) {
    console.error('Invalid JSON payload received by /predict', { error });
    return jsonResponse(400, { error: 'Invalid JSON payload.' });
  }

  const requestId = event.headers?.['x-nf-request-id'] || `req_${Date.now()}`;
  const clientIdentifier =
    payload?.sessionId ||
    event.headers?.['x-client-id'] ||
    event.headers?.['x-forwarded-for'] ||
    event.headers?.['client-ip'] ||
    null;

  try {
    checkRateLimit(clientIdentifier);
  } catch (error) {
    if (error instanceof RateLimitError) {
      return jsonResponse(error.statusCode, { error: error.message });
    }
    throw error;
  }

  let normalized;
  try {
    normalized = validateAndNormalizeRequest(payload);
  } catch (error) {
    if (error instanceof ValidationError) {
      return jsonResponse(error.statusCode ?? 400, { error: error.message });
    }
    throw error;
  }

  const prompt = buildPrompt(normalized);
  const startTime = Date.now();

  try {
    const openAIResult = await callOpenAI({
      prompt,
      metadata: {
        request_id: requestId,
        prompt_version: PROMPT_VERSION
      }
    });

    const latencyMs = Date.now() - startTime;

    const structured = parseModelResponse(openAIResult, {
      promptVersion: PROMPT_VERSION,
      latencyMs,
      requestId,
      inputMetadata: normalized.metadata
    });

    return jsonResponse(200, structured);
  } catch (error) {
    if (error instanceof OpenAIRequestError) {
      console.error('OpenAI invocation failed', {
        requestId,
        statusCode: error.statusCode,
        details: error.details
      });
      return jsonResponse(error.statusCode ?? 502, {
        error: 'Upstream model request failed.'
      });
    }
    if (error instanceof ResponseParseError) {
      console.error('Failed to parse model response', {
        requestId,
        warnings: error.warnings
      });
      return jsonResponse(502, { error: 'Model response could not be parsed.' });
    }
    if (error instanceof RateLimitError) {
      return jsonResponse(error.statusCode ?? 429, { error: error.message });
    }
    if (error instanceof ValidationError) {
      return jsonResponse(error.statusCode ?? 400, { error: error.message });
    }

    console.error('Unexpected /predict error', { requestId, error });
    return jsonResponse(500, { error: 'Unexpected server error.' });
  }
}
