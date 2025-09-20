/* eslint-env node */

import process from 'node:process';

const fallbackResponse = (text = '') => {
  const trimmed = text.trim();
  if (!trimmed) {
    return {
      suggestedWords: [],
      spellingIssues: [],
      wordClasses: []
    };
  }

  const words = Array.from(new Set(trimmed.split(/\s+/g)));
  return {
    suggestedWords: words.slice(-5).map((word) => ({ text: word })),
    spellingIssues: [],
    wordClasses: words.map((word) => ({ text: word, partOfSpeech: 'other' }))
  };
};

export async function handler(event) {
  try {
    const { text = '', supportLevel = 'beginner' } = JSON.parse(event.body || '{}');

    if (!process.env.OPENAI_API_KEY) {
      return {
        statusCode: 200,
        body: JSON.stringify(fallbackResponse(text))
      };
    }

    const prompt = `Analyse the learner's writing sample and respond with JSON. Use short encouraging language levels.
Return the following keys:
- suggestedWords: array of up to 8 suggestions. Each suggestion should include "text" (string) and optional "hint" (string explaining why) keeping it very short.
- spellingIssues: array of objects with "word" (string) and "suggestions" (array of replacement strings). Only include when you are confident the word is misspelt.
- wordClasses: array of objects with "text" (string) and "partOfSpeech" (one of noun, verb, adjective, adverb, pronoun, determiner, preposition, conjunction, interjection, other). Focus on the most likely class in the current context.
Consider the learner support level: ${supportLevel}.
Always respond in valid JSON matching the schema.`;

    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        input: [
          {
            role: 'system',
            content: [
              {
                type: 'text',
                text: 'You are a supportive assistant helping young writers. Always return valid JSON that matches the provided schema.'
              }
            ]
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `${prompt}\n\nText to analyse:\n"""${text}"""`
              }
            ]
          }
        ],
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'writing_intel',
            schema: {
              type: 'object',
              additionalProperties: false,
              required: ['suggestedWords', 'spellingIssues', 'wordClasses'],
              properties: {
                suggestedWords: {
                  type: 'array',
                  maxItems: 8,
                  items: {
                    type: 'object',
                    required: ['text'],
                    additionalProperties: false,
                    properties: {
                      text: { type: 'string' },
                      hint: { type: 'string' }
                    }
                  }
                },
                spellingIssues: {
                  type: 'array',
                  items: {
                    type: 'object',
                    required: ['word', 'suggestions'],
                    additionalProperties: false,
                    properties: {
                      word: { type: 'string' },
                      suggestions: {
                        type: 'array',
                        items: { type: 'string' }
                      }
                    }
                  }
                },
                wordClasses: {
                  type: 'array',
                  items: {
                    type: 'object',
                    required: ['text', 'partOfSpeech'],
                    additionalProperties: false,
                    properties: {
                      text: { type: 'string' },
                      partOfSpeech: {
                        type: 'string',
                        enum: [
                          'noun',
                          'verb',
                          'adjective',
                          'adverb',
                          'pronoun',
                          'determiner',
                          'preposition',
                          'conjunction',
                          'interjection',
                          'other'
                        ]
                      }
                    }
                  }
                }
              }
            }
          }
        },
        max_output_tokens: 800
      })
    });

    if (!response.ok) {
      console.error('Writing intel request failed', await response.text());
      return {
        statusCode: response.status,
        body: JSON.stringify(fallbackResponse(text))
      };
    }

    const data = await response.json();
    const content = data.output?.[0]?.content?.[0]?.text;

    if (!content) {
      return {
        statusCode: 200,
        body: JSON.stringify(fallbackResponse(text))
      };
    }

    const parsed = JSON.parse(content);
    return {
      statusCode: 200,
      body: JSON.stringify(parsed)
    };
  } catch (error) {
    console.error('Writing intel handler error', error);
    return {
      statusCode: 200,
      body: JSON.stringify(fallbackResponse())
    };
  }
}
