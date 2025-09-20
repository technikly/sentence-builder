import { initializeSpellChecker, checkSpelling, getSuggestions } from '../spellChecker.js';
import { getWordFrequencyMap } from './textAnalysis.js';

const MIN_WORD_LENGTH = 3;

export const analyseSpelling = async (text = '') => {
  const trimmed = text.trim();
  if (!trimmed) {
    return [];
  }

  await initializeSpellChecker();
  const frequencyMap = getWordFrequencyMap(trimmed);
  const issues = [];

  frequencyMap.forEach((count, word) => {
    if (word.length < MIN_WORD_LENGTH) {
      return;
    }
    if (!checkSpelling(word)) {
      const suggestions = getSuggestions(word).slice(0, 5);
      issues.push({
        word,
        count,
        suggestions
      });
    }
  });

  return issues.sort((a, b) => b.count - a.count || a.word.localeCompare(b.word));
};
