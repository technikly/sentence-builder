// src/components/tts.js

/**
 * Simple Text-to-Speech helper that uses an online service.
 * The function constructs a Google Translate TTS URL and plays it.
 * This requires an active internet connection.
 */
export const speakText = (text) => {
  if (!text) return;
  const encoded = encodeURIComponent(text);
  const url = `https://translate.googleapis.com/translate_tts?ie=UTF-8&client=tw-ob&tl=en&q=${encoded}`;
  const audio = new Audio(url);
  audio.play().catch((err) => {
    console.error('Failed to play TTS audio', err);
  });
};
