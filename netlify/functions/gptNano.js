/* eslint-env node */

import process from 'node:process';

export async function handler(event) {
  const { sentence } = JSON.parse(event.body || '{}');
  const prompt = `You are a helpful writing assistant for children. Given the sentence fragment below, suggest improvements and the next word.
Return suggestions using the commands:

[SPELLING]: WORD INDEX
[IMPROVE]: WORD INDEX -> [IMPROVE_TO]: {NEW_WORD}
[ADDINNEWWORD]: {NEW_WORD} [AFTER]: WORD INDEX

Only include commands that apply.

Sentence: "${sentence}"`;

  try {
    const res = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        input: prompt,
        max_output_tokens: 150
      })
    });
    const data = await res.json();
    return {
      statusCode: res.status,
      body: JSON.stringify(data)
    };
  } catch (err) {
    console.error('Nano feedback failed', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Nano feedback failed' })
    };
  }
}
