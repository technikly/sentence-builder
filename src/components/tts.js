// src/components/tts.js

const isBrowserSupported = () => typeof window !== 'undefined' && 'speechSynthesis' in window;

let cachedVoices = [];
let voiceRequest;

const chunkTextForSpeech = (text) => {
  if (!text) {
    return [];
  }

  const clean = text
    .replace(/\s+/g, ' ')
    .replace(/\s([,.!?;:])/g, '$1')
    .trim();

  if (!clean) {
    return [];
  }

  const sentenceChunks = clean.match(/[^.!?]+[.!?]?/g) ?? [clean];
  const merged = [];
  let buffer = '';

  sentenceChunks.forEach((chunk) => {
    const tentative = `${buffer} ${chunk}`.trim();
    if (tentative.length > 180 && buffer) {
      merged.push(buffer.trim());
      buffer = chunk;
    } else {
      buffer = tentative;
    }
  });

  if (buffer) {
    merged.push(buffer.trim());
  }

  return merged;
};

const resolvePreferredVoice = (preferredUri) => {
  if (!cachedVoices.length) {
    return null;
  }

  if (preferredUri) {
    const match = cachedVoices.find((voice) => voice.voiceURI === preferredUri);
    if (match) {
      return match;
    }
  }

  const ukVoice = cachedVoices.find((voice) => voice.lang?.toLowerCase().startsWith('en-gb'));
  if (ukVoice) {
    return ukVoice;
  }

  const englishVoice = cachedVoices.find((voice) => voice.lang?.toLowerCase().startsWith('en'));
  if (englishVoice) {
    return englishVoice;
  }

  return cachedVoices[0];
};

export const loadVoices = () => {
  if (!isBrowserSupported()) {
    return Promise.resolve([]);
  }

  if (cachedVoices.length) {
    return Promise.resolve(cachedVoices);
  }

  if (voiceRequest) {
    return voiceRequest;
  }

  voiceRequest = new Promise((resolve) => {
    const synth = window.speechSynthesis;

    const finish = (voices) => {
      cachedVoices = voices;
      resolve(cachedVoices);
    };

    const attempt = () => {
      const voices = synth.getVoices();
      if (voices.length) {
        finish(voices);
      }
    };

    attempt();

    const handleVoicesChanged = () => {
      const voices = synth.getVoices();
      if (voices.length) {
        synth.removeEventListener('voiceschanged', handleVoicesChanged);
        finish(voices);
      }
    };

    synth.addEventListener('voiceschanged', handleVoicesChanged);

    setTimeout(() => {
      const voices = synth.getVoices();
      if (voices.length) {
        synth.removeEventListener('voiceschanged', handleVoicesChanged);
        finish(voices);
      }
    }, 800);
  });

  return voiceRequest;
};

export const speakText = (text, options = {}) => {
  if (!isBrowserSupported() || !text?.trim()) {
    console.warn('SpeechSynthesis API is not available or text is empty.');
    return false;
  }

  const synth = window.speechSynthesis;
  const { voiceURI, rate = 1, pitch = 1, onend, onerror } = options;

  synth.cancel();

  const voice = resolvePreferredVoice(voiceURI);
  const chunks = chunkTextForSpeech(text);

  if (!chunks.length) {
    return false;
  }

  chunks.forEach((chunk, index) => {
    const utterance = new SpeechSynthesisUtterance(chunk);
    if (voice) {
      utterance.voice = voice;
    }
    utterance.rate = rate;
    utterance.pitch = pitch;
    if (index === chunks.length - 1 && typeof onend === 'function') {
      utterance.onend = onend;
    }
    if (typeof onerror === 'function') {
      utterance.onerror = onerror;
    }
    synth.speak(utterance);
  });

  return true;
};

export const cancelSpeech = () => {
  if (!isBrowserSupported()) {
    return;
  }
  window.speechSynthesis.cancel();
};

export const getCachedVoices = () => cachedVoices;
