// src/components/tts.js

/**
 * Simple Text-to-Speech helper.
 * Uses the browser's SpeechSynthesis API when available.
 * Falls back to logging a warning if the API is unsupported.
 */
export const speakText = (text) => {
  if (!text) return;

  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    const utterance = new SpeechSynthesisUtterance(text);
    // Cancel any ongoing speech to avoid overlaps
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  } else {
    console.warn('SpeechSynthesis API is not supported in this browser');
  }
};
