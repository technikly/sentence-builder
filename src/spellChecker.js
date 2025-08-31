// src/spellChecker.js

import nspell from 'nspell';
import { filterChildFriendly } from './utils/filterSuggestions.js';

let spell;

export const initializeSpellChecker = async () => {
  if (!spell) {
    const [aff, dic] = await Promise.all([
      fetch('https://cdn.jsdelivr.net/npm/dictionary-en/index.aff').then((r) =>
        r.text()
      ),
      fetch('https://cdn.jsdelivr.net/npm/dictionary-en/index.dic').then((r) =>
        r.text()
      )
    ]);
    spell = nspell(aff, dic);
  }
  return spell;
};

export const checkSpelling = (word) => {
  if (!spell) return true; // Assume correct if spell checker not initialized
  const sanitized = word.toLowerCase().replace(/[^a-z']/g, '');
  return spell.correct(sanitized);
};

export const getSuggestions = (word) => {
  if (!spell) return [];
  const sanitized = word.toLowerCase().replace(/[^a-z']/g, '');
  const suggestions = spell.suggest(sanitized);
  return filterChildFriendly(suggestions);
};
