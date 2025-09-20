/* eslint-env node */

import process from 'node:process';

const POS_TAGS = [
  'noun',
  'verb',
  'adjective',
  'adverb',
  'pronoun',
  'determiner',
  'preposition',
  'conjunction',
  'interjection',
  'number',
  'punctuation',
  'other'
];

export async function handler(event) {
  try {
    const { text = '', tokens = [] } = JSON.parse(event.body || '{}');

    if (!Array.isArray(tokens)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Tokens payload must be an array.' })
      };
    }

    const trimmed = text.trim();
    if (!trimmed || tokens.length === 0) {
      return {
        statusCode: 200,
        body: JSON.stringify({ suggestions: [], ghostSuggestion: '', tokenAnalyses: [] })
      };
    }

    const safeTokens = tokens.map((token) => String(token).replace(/\s+/g, ' '));

    const prompt = `You are a JSON API for a children's writing coach. Analyse the writing and tokens and respond ONLY with minified JSON.
The JSON shape must be:
{"suggestions": string[], "ghostSuggestion": string, "tokenAnalyses": {"index": number, "pos": string, "correct": boolean, "suggestions"?: string[]}[]}
- "suggestions" is up to 6 short words or phrases that could continue the writing.
- "ghostSuggestion" is the single best short continuation ('' if none).
- For every token index from 0 to ${tokens.length - 1}, provide an entry in tokenAnalyses. Use one of ${POS_TAGS.join(
      ', '
    )} for "pos".
- Set "correct" to false only if the token appears misspelled and give up to 3 lowercase correction suggestions.
- Never invent indices beyond the provided tokens.
- Do not include explanatory text.

WRITING:\n${trimmed}\n
TOKENS:\n${safeTokens.join(' | ')}`;

    const res = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        input: prompt,
        max_output_tokens: 600
      })
    });

    if (!res.ok) {
      const error = await res.text();
      console.error('languageInsights failed', res.status, error);
      return {
        statusCode: res.status,
        body: JSON.stringify({ error: 'Language insights request failed.' })
      };
    }

    const data = await res.json();
    const rawOutput = data?.output_text ?? '';

    try {
      const parsed = JSON.parse(rawOutput);
      return {
        statusCode: 200,
        body: JSON.stringify({
          suggestions: parsed.suggestions ?? [],
          ghostSuggestion: parsed.ghostSuggestion ?? '',
          tokenAnalyses: parsed.tokenAnalyses ?? []
        })
      };
    } catch (parseError) {
      console.error('languageInsights parse error', parseError, rawOutput);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Unable to parse language insights.' })
      };
    }
  } catch (error) {
    console.error('languageInsights handler error', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Unexpected language insights error.' })
    };
  }
}
