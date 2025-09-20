export const splitIntoSentences = (text = '') => {
  if (!text) {
    return [];
  }
  return text
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
};

export const tokenizeWords = (text = '') => {
  if (!text) {
    return [];
  }
  const matches = text.match(/[\p{L}'’-]+/gu);
  return matches ? matches.map((word) => word.trim()) : [];
};

export const getLastWords = (text = '', count = 3) => {
  const words = tokenizeWords(text);
  if (!words.length) {
    return [];
  }
  return words.slice(-count);
};

export const hasTerminalPunctuation = (sentence = '') => /[.!?]$/.test(sentence.trim());

export const countWords = (text = '') => tokenizeWords(text).length;

export const getWordFrequencyMap = (text = '') => {
  const frequency = new Map();
  tokenizeWords(text).forEach((word) => {
    const key = word.toLowerCase();
    frequency.set(key, (frequency.get(key) ?? 0) + 1);
  });
  return frequency;
};
