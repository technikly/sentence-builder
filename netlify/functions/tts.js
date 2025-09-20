/* eslint-env node */

import { Buffer } from 'node:buffer';
import process from 'node:process';

export async function handler(event) {
  try {
    const { text = '', voice = 'alloy' } = JSON.parse(event.body || '{}');

    if (!text.trim()) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing text for synthesis.' })
      };
    }

    const response = await fetch('https://api.openai.com/v1/audio/speech', {
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
      const error = await response.text();
      console.error('tts request failed', response.status, error);
      return {
        statusCode: response.status,
        body: JSON.stringify({ error: 'Unable to generate speech.' })
      };
    }

    const buffer = Buffer.from(await response.arrayBuffer());

    return {
      statusCode: 200,
      body: JSON.stringify({
        audio: buffer.toString('base64'),
        format: 'mp3'
      })
    };
  } catch (error) {
    console.error('tts handler error', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Unexpected text-to-speech error.' })
    };
  }
}
