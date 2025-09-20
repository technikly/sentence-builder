/* eslint-env node */

import { Buffer } from 'node:buffer';
import process from 'node:process';

export async function handler(event) {
  try {
    const { text = '', voice = 'alloy' } = JSON.parse(event.body || '{}');

    if (!text.trim()) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Text is required for speech synthesis.' })
      };
    }

    if (!process.env.OPENAI_API_KEY) {
      return {
        statusCode: 503,
        body: JSON.stringify({ error: 'Speech service unavailable.' })
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
        voice,
        input: text,
        format: 'mp3'
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI TTS failed', errorText);
      return {
        statusCode: response.status,
        body: JSON.stringify({ error: 'Speech synthesis failed.' })
      };
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    return {
      statusCode: 200,
      body: JSON.stringify({
        audioBase64: buffer.toString('base64'),
        mimeType: response.headers.get('content-type') || 'audio/mpeg'
      })
    };
  } catch (error) {
    console.error('Speech synthesis handler error', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Speech synthesis failed.' })
    };
  }
}
