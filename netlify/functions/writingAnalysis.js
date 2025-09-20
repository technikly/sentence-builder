/* eslint-env node */

import process from 'node:process';

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';

const WORD_CLASS_ENUM = [
  'noun',
  'verb',
  'adjective',
  'adverb',
  'pronoun',
  'determiner',
  'preposition',
  'conjunction',
  'interjection',
  'punctuation',
  'other'
];

const RESPONSE_SCHEMA = {
  name: 'WritingAnalysisResult',
  schema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      suggestions: {
        type: 'array',
        items: { type: 'string' },
        maxItems: 6,
        description: 'Short next word or phrase suggestions continuing the writing.'
      },
      word_classes: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            index: { type: 'integer', minimum: 0 },
            class: { type: 'string', enum: WORD_CLASS_ENUM }
          },
          required: ['index', 'class']
        }
      },
      spelling: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            index: { type: 'integer', minimum: 0 },
            reason: { type: 'string' },
            suggestions: {
              type: 'array',
              items: { type: 'string' },
              maxItems: 4
            }
          },
          required: ['index']
        }
      }
    },
    required: ['suggestions', 'word_classes', 'spelling']
  }
};

const sanitiseTokens = (tokens = []) =>
  tokens
    .filter((token) => typeof token === 'string')
    .map((token) => token.trim())
    .filter(Boolean)
    .slice(0, 200);

export async function handler(event) {
  if (event.httpMethod && event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch (error) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Invalid JSON payload' })
    };
  }

  const text = typeof payload.text === 'string' ? payload.text.trim() : '';
  const signature = typeof payload.signature === 'string' ? payload.signature : '';
  const tokens = sanitiseTokens(payload.tokens);

  if (!text) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Text is required for analysis', signature })
    };
  }

  const truncatedText = text.length > 800 ? text.slice(-800) : text;

  const systemPrompt =
    'You are a supportive literacy assistant for emerging writers. ' +
    'Given a child\'s writing you provide calm, encouraging scaffolds. ' +
    'Keep your responses concise and return only the requested JSON.';

  const userPrompt = `Here is the learner writing you are analysing:\n\nTEXT:\n"""${truncatedText}"""\n\nTOKENS (in order): ${JSON.stringify(tokens)}\n\nReturn a JSON object with:\n- \\"suggestions\\": Up to 6 short possible next words or phrases that would naturally continue the writing.\n- \\"word_classes\\": Identify the part of speech for relevant tokens using the provided token indices. Focus on meaningful words only.\n- \\"spelling\\": Highlight likely misspellings by token index with a friendly reason and up to four replacement ideas.\n\nOnly refer to the provided tokens when giving indices. If everything is correct, return empty arrays.`;

  try {
    const response = await fetch(OPENAI_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0.3,
        max_tokens: 450,
        response_format: {
          type: 'json_schema',
          json_schema: RESPONSE_SCHEMA
        },
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Writing analysis failed', response.status, errorText);
      return {
        statusCode: response.status,
        body: JSON.stringify({ error: 'OpenAI analysis request failed', signature })
      };
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content || '{}';
    let parsed;

    try {
      parsed = JSON.parse(content);
    } catch (error) {
      console.error('Failed to parse OpenAI JSON', error, content);
      return {
        statusCode: 502,
        body: JSON.stringify({ error: 'Invalid response from language model', signature })
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        signature,
        suggestions: parsed.suggestions ?? [],
        word_classes: parsed.word_classes ?? [],
        spelling: parsed.spelling ?? []
      })
    };
  } catch (error) {
    console.error('Writing analysis exception', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Unexpected failure during analysis', signature })
    };
  }
}
