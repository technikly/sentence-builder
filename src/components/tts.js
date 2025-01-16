// src/tts.js

/**
 * Text-to-Speech (TTS) Module
 * 
 * This module provides functions to handle Text-to-Speech functionalities using the Web Speech API.
 * 
 * Configurable Variables:
 * - rate: Speed at which the text is spoken. Range: 0.1 to 10 (default: 1)
 * - pitch: Pitch of the voice. Range: 0 to 2 (default: 1)
 * - volume: Volume of the speech. Range: 0 to 1 (default: 1)
 * - voiceURI: The URI of the voice to use. If not specified, the default voice is used.
 */

let selectedVoice = null;

// Configurable Variables
export const ttsConfig = {
  rate: 0.5,        // Speech rate (0.1 to 10)
  pitch: 1.8,     // Speech pitch (0 to 2) - Increased pitch for child-friendly voice
  volume: 1,      // Speech volume (0 to 1)
  voiceURI: 'Google UK English Female', // Default to Google UK English Female
};

/**
 * Initialize and set the selected voice based on the voiceURI.
 * This should be called once after the component mounts to populate available voices.
 */
export const initializeVoices = () => {
  return new Promise((resolve, reject) => {
    const synth = window.speechSynthesis;

    if (!synth) {
      reject(new Error('Speech Synthesis not supported in this browser.'));
      return;
    }

    const loadVoices = () => {
      const voices = synth.getVoices();
      if (ttsConfig.voiceURI) {
        selectedVoice = voices.find(voice => voice.name === ttsConfig.voiceURI) || null;
      } else {
        selectedVoice = voices.find(voice => voice.lang === 'en-US') || null; // Default to first English voice
      }
      resolve(voices);
    };

    if (synth.onvoiceschanged !== undefined) {
      synth.onvoiceschanged = loadVoices;
    } else {
      loadVoices();
    }
  });
};

/**
 * Speak the given text using the Web Speech API.
 * @param {string} text - The text to be spoken.
 */
export const speakText = (text) => {
  if (!('speechSynthesis' in window)) {
    alert('Sorry, your browser does not support Text-to-Speech.');
    return;
  }

  const synth = window.speechSynthesis;
  synth.cancel(); // Cancel any ongoing speech

  const utterance = new SpeechSynthesisUtterance(text);
  
  // Apply configurations
  utterance.rate = ttsConfig.rate;
  utterance.pitch = ttsConfig.pitch;
  utterance.volume = ttsConfig.volume;
  
  if (selectedVoice) {
    utterance.voice = selectedVoice;
  }

  synth.speak(utterance);
};

/**
 * Set the voice based on voice name.
 * @param {string} voiceName - The name of the desired voice.
 */
export const setVoice = (voiceName) => {
  const synth = window.speechSynthesis;
  const voices = synth.getVoices();
  selectedVoice = voices.find(voice => voice.name === voiceName) || null;
};

/**
 * Get all available voices.
 * @returns {SpeechSynthesisVoice[]} - Array of available voices.
 */
export const getAvailableVoices = () => {
  return window.speechSynthesis.getVoices();
};
