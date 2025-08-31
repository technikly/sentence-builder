// src/spellChecker.js

import nspell from 'nspell';
import dictionary from 'dictionary-en';
import { filterChildFriendly } from './utils/filterSuggestions.js';

let spell;

export const initializeSpellChecker = () => {
  return new Promise((resolve, reject) => {
    dictionary((err, dict) => {
      if (err) {
        reject(err);
      } else {
        spell = nspell(dict);
        resolve(spell);
      }
    });
  });
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
