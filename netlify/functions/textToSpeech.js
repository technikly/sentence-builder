/* eslint-env node */

import process from 'node:process';

const TTS_ENDPOINT = 'https://api.openai.com/v1/audio/speech';

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
  const voice = typeof payload.voice === 'string' && payload.voice.trim() ? payload.voice.trim() : 'alloy';

  if (!text) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Text is required for speech synthesis' })
    };
  }

  try {
    const response = await fetch(TTS_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini-tts',
        input: text,
        voice,
        format: 'mp3'
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('TTS request failed', response.status, errorText);
      return {
        statusCode: response.status,
        body: JSON.stringify({ error: 'Unable to synthesise speech' })
      };
    }

    const arrayBuffer = await response.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ audio: base64, format: 'mp3' })
    };
  } catch (error) {
    console.error('TTS exception', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Unexpected failure during speech synthesis' })
    };
  }
}
